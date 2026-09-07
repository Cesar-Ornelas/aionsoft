import { IssuesDataAccessError } from '../../model/data-access-error.js';

const TYPES = new Set(['customer', 'provider', 'internal']);
const PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);
const STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed', 'cancelled']);

function clean(value) {
  return String(value ?? '').trim();
}

function normalize(input) {
  return {
    title: clean(input.title),
    descriptionMarkdown: clean(input.descriptionMarkdown),
    type: input.type || 'internal',
    priority: input.priority || 'medium',
    status: input.status || 'open',
    companyId: clean(input.companyId),
    operationsAccountId: clean(input.operationsAccountId),
    dueDate: clean(input.dueDate),
    createdBy: clean(input.createdBy)
  };
}

function validate(input) {
  if (!input.title) throw new IssuesDataAccessError('INVALID_INPUT', 'Issue title is required.');
  if (input.title.length > 200) throw new IssuesDataAccessError('INVALID_INPUT', 'Issue title must be 200 characters or fewer.');
  if (!TYPES.has(input.type)) throw new IssuesDataAccessError('INVALID_INPUT', 'Issue type is invalid.');
  if (!PRIORITIES.has(input.priority)) throw new IssuesDataAccessError('INVALID_INPUT', 'Issue priority is invalid.');
  if (!STATUSES.has(input.status)) throw new IssuesDataAccessError('INVALID_INPUT', 'Issue status is invalid.');
  if (input.dueDate && Number.isNaN(new Date(input.dueDate).getTime())) throw new IssuesDataAccessError('INVALID_INPUT', 'Issue due date is invalid.');
}

export function createIssuesService(repository) {
  return {
    async list(filter = {}) {
      return repository.list({ search: clean(filter.search), status: clean(filter.status), priority: clean(filter.priority), type: clean(filter.type) });
    },
    async get(id) {
      const issue = await repository.findById(clean(id));
      if (!issue) throw new IssuesDataAccessError('NOT_FOUND', 'Issue was not found.');
      return issue;
    },
    async create(input = {}) {
      const normalized = normalize(input);
      validate(normalized);
      return repository.create(normalized);
    },
    async update(id, input = {}) {
      const existing = await this.get(id);
      const normalized = normalize({ ...existing, ...input });
      validate(normalized);
      if (['closed', 'cancelled'].includes(existing.status) && normalized.status !== existing.status) {
        throw new IssuesDataAccessError('CONFLICT', 'Closed or cancelled issues cannot be changed in this release.');
      }
      return repository.update(existing.id, normalized);
    }
  };
}

export { TYPES, PRIORITIES, STATUSES };