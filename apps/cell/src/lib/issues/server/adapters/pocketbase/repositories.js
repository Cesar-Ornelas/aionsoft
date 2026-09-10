import { IssuesDataAccessError } from '../../../model/data-access-error.js';

const COLLECTION = 'operations_issues';
const TAG_COLLECTION = 'operations_issue_tags';
const TAG_LINK_COLLECTION = 'operations_issue_tag_links';
const COMMENT_VOTES = 'operations_issue_comment_votes';

function issueFromRecord(record) {
  return {
    id: record.id,
    title: record.title,
    descriptionMarkdown: record.description_markdown || '',
    type: record.type,
    priority: record.priority,
    status: record.status,
    companyId: record.company || '',
    operationsAccountId: record.operations_account || '',
    dueDate: record.due_date || '',
    createdBy: record.created_by || '',
    tags: [],
    createdAt: record.created || '',
    updatedAt: record.updated || record.created || ''
  };
}

function tagFromRecord(record) {
  return { id: record.id, name: record.name || '', color: record.color || '' };
}

function commentFromRecord(record) {
  const author = record.expand?.author;
  return {
    id: record.id,
    issueId: record.issue,
    parentId: record.parent || null,
    bodyMarkdown: record.body_markdown || '',
    authorId: record.author || record.author_id || '',
    authorName: record.author_name || author?.name || author?.email || record.author || record.author_id || '',
    createdAt: record.created || '',
    updatedAt: record.updated || record.created || '',
    edited: Boolean(record.edited)
  };
}

function commentVoteFromRecord(record) {
  const voter = record.expand?.voter;
  return {
    id: record.id,
    commentId: record.comment,
    voterId: record.voter,
    voterName: record.voter_name || voter?.name || voter?.email || record.voter || '',
    createdAt: record.created || record.created_at || ''
  };
}

function translateError(error, message) {
  if (error instanceof IssuesDataAccessError) return error;
  const status = Number(error?.status ?? error?.response?.status);
  if (status === 404) return new IssuesDataAccessError('NOT_FOUND', message, { cause: error });
  if (status === 400) return new IssuesDataAccessError('INVALID_INPUT', message, { cause: error });
  return new IssuesDataAccessError('UNAVAILABLE', message, { cause: error });
}

async function listIssueTags(client, issueId) {
  const links = await client.collection(TAG_LINK_COLLECTION).getFullList({
    filter: client.filter('issue = {:issue}', { issue: issueId }),
    expand: 'tag'
  });
  return links.map((link) => link.expand?.tag).filter(Boolean).map(tagFromRecord).sort((left, right) => left.name.localeCompare(right.name));
}

async function withTags(client, record) {
  return { ...issueFromRecord(record), tags: await listIssueTags(client, record.id) };
}

async function getOrCreateTag(client, name) {
  try {
    return await client.collection(TAG_COLLECTION).getFirstListItem(client.filter('name = {:name}', { name }));
  } catch (error) {
    if (Number(error?.status) !== 404) throw error;
    return client.collection(TAG_COLLECTION).create({ name, color: '' });
  }
}

async function syncIssueTags(client, issueId, tagNames = []) {
  const linksCollection = client.collection(TAG_LINK_COLLECTION);
  const existingLinks = await linksCollection.getFullList({
    filter: client.filter('issue = {:issue}', { issue: issueId }),
    expand: 'tag'
  });
  const desiredTags = await Promise.all(tagNames.map((name) => getOrCreateTag(client, name)));
  const desiredIds = new Set(desiredTags.map((tag) => tag.id));
  const existingByTag = new Map(existingLinks.map((link) => [link.tag, link]));

  for (const tag of desiredTags) {
    if (!existingByTag.has(tag.id)) await linksCollection.create({ issue: issueId, tag: tag.id });
  }
  for (const link of existingLinks) {
    if (!desiredIds.has(link.tag)) await linksCollection.delete(link.id);
  }
}

export function createPocketBaseIssuesRepository(client) {
  const records = client.collection(COLLECTION);

  return {
    async list(filter = {}) {
      try {
        const clauses = [];
        if (filter.search) clauses.push(client.filter('(title ~ {:search} || description_markdown ~ {:search})', { search: filter.search }));
        if (filter.status) clauses.push(client.filter('status = {:status}', { status: filter.status }));
        if (filter.priority) clauses.push(client.filter('priority = {:priority}', { priority: filter.priority }));
        if (filter.type) clauses.push(client.filter('type = {:type}', { type: filter.type }));
        const issues = await Promise.all((await records.getFullList({ filter: clauses.join(' && '), sort: '-updated,title' })).map((record) => withTags(client, record)));
        return filter.tag ? issues.filter((issue) => issue.tags.some((tag) => tag.name === filter.tag)) : issues;
      } catch (error) {
        throw translateError(error, 'Unable to list Operations issues.');
      }
    },

    async findById(id) {
      try {
        return withTags(client, await records.getOne(id));
      } catch (error) {
        if (Number(error?.status) === 404) return null;
        throw translateError(error, 'Unable to load the Operations issue.');
      }
    },

    async create(input) {
      try {
        const record = await records.create({
          title: input.title,
          description_markdown: input.descriptionMarkdown || '',
          type: input.type,
          priority: input.priority,
          status: input.status || 'open',
          company: input.companyId || '',
          operations_account: input.operationsAccountId || '',
          due_date: input.dueDate || '',
          created_by: input.createdBy || ''
        });
        await syncIssueTags(client, record.id, input.tags);
        return withTags(client, record);
      } catch (error) {
        throw translateError(error, 'Unable to create the Operations issue.');
      }
    },

    async update(id, input) {
      try {
        const record = await records.update(id, {
          title: input.title,
          description_markdown: input.descriptionMarkdown || '',
          type: input.type,
          priority: input.priority,
          status: input.status,
          company: input.companyId || '',
          operations_account: input.operationsAccountId || '',
          due_date: input.dueDate || '',
        });
        await syncIssueTags(client, record.id, input.tags);
        return withTags(client, record);
      } catch (error) {
        throw translateError(error, 'Unable to update the Operations issue.');
      }
    },

    async delete(id) {
      try {
        await records.delete(id);
      } catch (error) {
        throw translateError(error, 'Unable to delete the Operations issue.');
      }
    },

    async listTags() {
      try {
        return (await client.collection(TAG_COLLECTION).getFullList({ sort: 'name' })).map(tagFromRecord);
      } catch (error) {
        throw translateError(error, 'Unable to list issue tags.');
      }
    },

    async listComments(issueId) {
      try {
        return (await client.collection('operations_issue_comments').getFullList({
          filter: client.filter('issue = {:issue}', { issue: issueId }),
          sort: 'created',
          expand: 'author'
        })).map(commentFromRecord);
      } catch (error) {
        throw translateError(error, 'Unable to list issue comments.');
      }
    },

    async findCommentById(id) {
      try {
        return commentFromRecord(await client.collection('operations_issue_comments').getOne(id, { expand: 'author' }));
      } catch (error) {
        if (Number(error?.status) === 404) return null;
        throw translateError(error, 'Unable to load the issue comment.');
      }
    },

    async createComment(input) {
      try {
        return commentFromRecord(await client.collection('operations_issue_comments').create({
          issue: input.issueId,
          parent: input.parentId || '',
          body_markdown: input.bodyMarkdown,
          author: input.authorId,
          author_id: input.authorId,
          author_name: input.authorName,
          edited: false
        }, { expand: 'author' }));
      } catch (error) {
        throw translateError(error, 'Unable to create the issue comment.');
      }
    },

    async updateComment(id, input) {
      try {
        return commentFromRecord(await client.collection('operations_issue_comments').update(id, {
          body_markdown: input.bodyMarkdown,
          edited: Boolean(input.edited)
        }, { expand: 'author' }));
      } catch (error) {
        throw translateError(error, 'Unable to update the issue comment.');
      }
    },

    async deleteComment(id) {
      try {
        await client.collection('operations_issue_comments').delete(id);
      } catch (error) {
        throw translateError(error, 'Unable to delete the issue comment.');
      }
    },

    async listCommentVotes(commentId) {
      try {
        return (await client.collection(COMMENT_VOTES).getFullList({
          filter: client.filter('comment = {:comment}', { comment: commentId }),
          sort: 'created_at',
          expand: 'voter'
        })).map(commentVoteFromRecord);
      } catch (error) {
        throw translateError(error, 'Unable to list issue comment votes.');
      }
    },

    async findCommentVote(commentId, voterId) {
      try {
        return commentVoteFromRecord(await client.collection(COMMENT_VOTES).getFirstListItem(
          client.filter('comment = {:comment} && voter = {:voter}', { comment: commentId, voter: voterId }),
          { expand: 'voter' }
        ));
      } catch (error) {
        if (Number(error?.status) === 404) return null;
        throw translateError(error, 'Unable to load the issue comment vote.');
      }
    },

    async createCommentVote(input) {
      try {
        return commentVoteFromRecord(await client.collection(COMMENT_VOTES).create({
          comment: input.commentId,
          voter: input.voterId,
          voter_name: input.voterName,
          created_at: input.createdAt
        }, { expand: 'voter' }));
      } catch (error) {
        throw translateError(error, 'Unable to create the issue comment vote.');
      }
    },

    async deleteCommentVote(id) {
      try {
        await client.collection(COMMENT_VOTES).delete(id);
      } catch (error) {
        throw translateError(error, 'Unable to remove the issue comment vote.');
      }
    }
  };
}