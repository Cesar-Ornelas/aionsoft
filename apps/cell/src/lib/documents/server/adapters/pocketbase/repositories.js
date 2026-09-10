import { DocumentDataAccessError } from '../../../model/data-access-error.js';

const TEMPLATES = 'documents_templates';
const VERSIONS = 'documents_template_versions';
const DOCUMENTS = 'documents';
const REVIEW_COMMENTS = 'documents_review_comments';
const REVIEW_COMMENT_VOTES = 'documents_review_comment_votes';

function parseJson(value, fallback) {
  if (typeof value !== 'string') return value ?? fallback;
  try { return JSON.parse(value); } catch { throw new DocumentDataAccessError('UNAVAILABLE', 'Stored document JSON is invalid.'); }
}

function templateFromRecord(record) {
  return { id: record.id, name: record.name, description: record.description || '', formId: record.form_id || null, status: record.status, createdAt: record.created || '', updatedAt: record.updated || record.created || '' };
}

function versionFromRecord(record) {
  return { id: record.id, templateId: record.template, versionNumber: Number(record.version_number || 0), content: parseJson(record.content, { type: 'doc', content: [] }), sampleData: parseJson(record.sample_data, {}), formVersionId: record.form_version || null, isPublished: Boolean(record.is_published), status: record.status, createdAt: record.created_at || record.created || '' };
}

function documentFromRecord(record) {
  return { id: record.id, operationsAccountId: record.operations_account || null, templateVersionId: record.template_version, formVersionId: record.form_version || null, status: record.status, dataSnapshot: parseJson(record.data_snapshot, {}), renderedHtml: record.rendered_html || '', createdAt: record.created_at || record.created || '' };
}

function reviewCommentFromRecord(record) {
  return { id: record.id, templateVersionId: record.template_version, body: record.body || '', excerpt: record.excerpt || '', anchor: parseJson(record.anchor, { start: 0, end: 0, text: '' }), issueId: record.issue_id || null, authorId: record.author_id || null, authorName: record.author_name || null, createdAt: record.created_at || record.created || '', updatedAt: record.updated || record.created_at || record.created || '' };
}

function reviewCommentVoteFromRecord(record) {
  const voter = record.expand?.voter;
  return {
    id: record.id,
    commentId: record.review_comment,
    voterId: record.voter,
    voterName: record.voter_name || voter?.name || voter?.email || record.voter || '',
    createdAt: record.created || record.created_at || ''
  };
}

function translateError(error, message) {
  if (error instanceof DocumentDataAccessError) return error;
  const status = Number(error?.status ?? error?.response?.status);
  const code = status === 404 ? 'NOT_FOUND' : status === 400 ? 'INVALID_INPUT' : status === 409 ? 'CONFLICT' : 'UNAVAILABLE';
  return new DocumentDataAccessError(code, message, { cause: error });
}

export function createPocketBaseDocumentRepository(client) {
  const templates = client.collection(TEMPLATES);
  const versions = client.collection(VERSIONS);
  const documents = client.collection(DOCUMENTS);
  const reviewComments = client.collection(REVIEW_COMMENTS);
  return {
    async listTemplates() { try { return (await templates.getFullList({ sort: 'name' })).map(templateFromRecord); } catch (error) { throw translateError(error, 'Unable to list document templates.'); } },
    async findTemplateById(id) { try { return templateFromRecord(await templates.getOne(id)); } catch (error) { if (Number(error?.status) === 404) return null; throw translateError(error, 'Unable to load the document template.'); } },
    async createTemplate(input) { try { return templateFromRecord(await templates.create({ name: input.name, description: input.description || '', form_id: input.formId || '', status: input.status })); } catch (error) { throw translateError(error, 'Unable to create the document template.'); } },
    async updateTemplate(id, input) { try { return templateFromRecord(await templates.update(id, { ...(input.name !== undefined && { name: input.name }), ...(input.description !== undefined && { description: input.description }), ...(input.formId !== undefined && { form_id: input.formId || '' }), ...(input.status !== undefined && { status: input.status }) })); } catch (error) { throw translateError(error, 'Unable to update the document template.'); } },
    async deleteTemplate(id) {
      try {
        const templateVersions = await versions.getFullList({ filter: client.filter('template = {:template}', { template: id }) });
        for (const version of templateVersions) {
          const generatedDocuments = await documents.getFullList({ filter: client.filter('template_version = {:version}', { version: version.id }) });
          for (const document of generatedDocuments) await documents.delete(document.id);
          const comments = await reviewComments.getFullList({ filter: client.filter('template_version = {:version}', { version: version.id }) });
          for (const comment of comments) await reviewComments.delete(comment.id);
          await versions.delete(version.id);
        }
        await templates.delete(id);
      } catch (error) { throw translateError(error, 'Unable to delete the document template and related records.'); }
    },
    async listTemplateVersions(templateId) { try { return (await versions.getFullList({ filter: client.filter('template = {:template}', { template: templateId }), sort: '-version_number' })).map(versionFromRecord); } catch (error) { throw translateError(error, 'Unable to list document template versions.'); } },
    async findTemplateVersionById(id) { try { return versionFromRecord(await versions.getOne(id)); } catch (error) { if (Number(error?.status) === 404) return null; throw translateError(error, 'Unable to load the document template version.'); } },
    async createTemplateVersion(input) { try { return versionFromRecord(await versions.create({ template: input.templateId, version_number: input.versionNumber, content: input.content, sample_data: input.sampleData ?? {}, form_version: input.formVersionId || '', is_published: Boolean(input.isPublished), status: input.status, created_at: input.createdAt })); } catch (error) { throw translateError(error, 'Unable to create the document template version.'); } },
    async updateTemplateVersion(id, input) { try { return versionFromRecord(await versions.update(id, { ...(input.isPublished !== undefined && { is_published: Boolean(input.isPublished) }), ...(input.status !== undefined && { status: input.status }) })); } catch (error) { throw translateError(error, 'Unable to update the document template version.'); } },
    async createDocument(input) { try { return documentFromRecord(await documents.create({ operations_account: input.operationsAccountId || '', template_version: input.templateVersionId, form_version: input.formVersionId || '', status: input.status, data_snapshot: input.dataSnapshot, rendered_html: input.renderedHtml, created_at: input.createdAt })); } catch (error) { throw translateError(error, 'Unable to create the document.'); } },
    async listDocuments() { try { return (await documents.getFullList({ sort: '-created_at' })).map(documentFromRecord); } catch (error) { throw translateError(error, 'Unable to list documents.'); } }
    ,async listReviewComments(templateVersionId) { try { return (await reviewComments.getFullList({ filter: client.filter('template_version = {:templateVersionId}', { templateVersionId }) })).map(reviewCommentFromRecord); } catch (error) { throw translateError(error, `Unable to list document review comments: ${error?.message || 'provider query failed'}`); } }
    ,async createReviewComment(input) { try { return reviewCommentFromRecord(await reviewComments.create({ template_version: input.templateVersionId, body: input.body, excerpt: input.excerpt || '', anchor: input.anchor, issue_id: input.issueId || '', author_id: input.authorId || '', author_name: input.authorName || '', created_at: input.createdAt })); } catch (error) { throw translateError(error, 'Unable to create document review comment.'); } }
    ,async findReviewCommentById(id) { try { return reviewCommentFromRecord(await reviewComments.getOne(id)); } catch (error) { if (Number(error?.status) === 404) return null; throw translateError(error, 'Unable to load document review comment.'); } }
    ,async updateReviewComment(id, input) { try { return reviewCommentFromRecord(await reviewComments.update(id, { ...(input.issueId !== undefined && { issue_id: input.issueId || '' }) })); } catch (error) { throw translateError(error, 'Unable to update document review comment.'); } }
    ,async deleteReviewComment(id) { try { await reviewComments.delete(id); } catch (error) { throw translateError(error, 'Unable to delete document review comment.'); } }
    ,async listReviewCommentVotes(commentId) { try { return (await client.collection(REVIEW_COMMENT_VOTES).getFullList({ filter: client.filter('review_comment = {:comment}', { comment: commentId }), sort: 'created_at', expand: 'voter' })).map(reviewCommentVoteFromRecord); } catch (error) { throw translateError(error, 'Unable to list document review comment votes.'); } }
    ,async findReviewCommentVote(commentId, voterId) { try { return reviewCommentVoteFromRecord(await client.collection(REVIEW_COMMENT_VOTES).getFirstListItem(client.filter('review_comment = {:comment} && voter = {:voter}', { comment: commentId, voter: voterId }), { expand: 'voter' })); } catch (error) { if (Number(error?.status) === 404) return null; throw translateError(error, 'Unable to load document review comment vote.'); } }
    ,async createReviewCommentVote(input) { try { return reviewCommentVoteFromRecord(await client.collection(REVIEW_COMMENT_VOTES).create({ review_comment: input.commentId, voter: input.voterId, voter_name: input.voterName, created_at: input.createdAt }, { expand: 'voter' })); } catch (error) { throw translateError(error, 'Unable to create document review comment vote.'); } }
    ,async deleteReviewCommentVote(id) { try { await client.collection(REVIEW_COMMENT_VOTES).delete(id); } catch (error) { throw translateError(error, 'Unable to remove document review comment vote.'); } }
  };
}
