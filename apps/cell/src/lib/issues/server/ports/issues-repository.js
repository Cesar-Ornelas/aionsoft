/** @typedef {import('../../model/entities.js').Issue} Issue */

/**
 * @typedef {Object} IssuesRepository
 * @property {(filter: { search?: string, status?: string, priority?: string, type?: string }) => Promise<Issue[]>} list
 * @property {(id: string) => Promise<Issue | null>} findById
 * @property {(input: import('../../model/entities.js').SaveIssueInput) => Promise<Issue>} create
 * @property {(id: string, input: Partial<import('../../model/entities.js').SaveIssueInput>) => Promise<Issue>} update
 */

export {};