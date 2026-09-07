import { IssuesDataAccessError } from '../../../model/data-access-error.js';

const COLLECTION = 'operations_issues';

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
    createdAt: record.created || '',
    updatedAt: record.updated || record.created || ''
  };
}

function translateError(error, message) {
  if (error instanceof IssuesDataAccessError) return error;
  const status = Number(error?.status ?? error?.response?.status);
  if (status === 404) return new IssuesDataAccessError('NOT_FOUND', message, { cause: error });
  if (status === 400) return new IssuesDataAccessError('INVALID_INPUT', message, { cause: error });
  return new IssuesDataAccessError('UNAVAILABLE', message, { cause: error });
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
        return (await records.getFullList({ filter: clauses.join(' && '), sort: '-updated,title' })).map(issueFromRecord);
      } catch (error) {
        throw translateError(error, 'Unable to list Operations issues.');
      }
    },

    async findById(id) {
      try {
        return issueFromRecord(await records.getOne(id));
      } catch (error) {
        if (Number(error?.status) === 404) return null;
        throw translateError(error, 'Unable to load the Operations issue.');
      }
    },

    async create(input) {
      try {
        return issueFromRecord(await records.create({
          title: input.title,
          description_markdown: input.descriptionMarkdown || '',
          type: input.type,
          priority: input.priority,
          status: input.status || 'open',
          company: input.companyId || '',
          operations_account: input.operationsAccountId || '',
          due_date: input.dueDate || '',
          created_by: input.createdBy || ''
        }));
      } catch (error) {
        throw translateError(error, 'Unable to create the Operations issue.');
      }
    },

    async update(id, input) {
      try {
        return issueFromRecord(await records.update(id, {
          title: input.title,
          description_markdown: input.descriptionMarkdown || '',
          type: input.type,
          priority: input.priority,
          status: input.status,
          company: input.companyId || '',
          operations_account: input.operationsAccountId || '',
          due_date: input.dueDate || '',
        }));
      } catch (error) {
        throw translateError(error, 'Unable to update the Operations issue.');
      }
    }
  };
}