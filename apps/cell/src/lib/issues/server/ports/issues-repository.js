/** @typedef {import('../../model/entities.js').Issue} Issue */
/** @typedef {import('../../model/entities.js').IssueComment} IssueComment */
/** @typedef {import('../../model/entities.js').IssueTag} IssueTag */

/**
 * @typedef {Object} IssuesRepository
 * @property {(filter: { search?: string, status?: string, priority?: string, type?: string, tag?: string }) => Promise<Issue[]>} list
 * @property {() => Promise<IssueTag[]>} listTags
 * @property {(id: string) => Promise<Issue | null>} findById
 * @property {(input: import('../../model/entities.js').SaveIssueInput) => Promise<Issue>} create
 * @property {(id: string, input: Partial<import('../../model/entities.js').SaveIssueInput>) => Promise<Issue>} update
 * @property {(id: string) => Promise<void>} delete
 * @property {(issueId: string) => Promise<IssueComment[]>} listComments
 * @property {(id: string) => Promise<IssueComment|null>} findCommentById
 * @property {(input: Object) => Promise<IssueComment>} createComment
 * @property {(id: string, input: Object) => Promise<IssueComment>} updateComment
 * @property {(id: string) => Promise<void>} deleteComment
 */

export {};