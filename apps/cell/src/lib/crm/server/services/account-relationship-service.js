import { CrmDataAccessError } from '../../model/data-access-error.js';

/** @typedef {import('../ports/company-repository.js').CompanyRepository} CompanyRepository */
/** @typedef {import('../ports/account-relationship-repository.js').AccountRelationshipRepository} AccountRelationshipRepository */
/** @typedef {import('../../model/entities.js').SaveAccountRelationshipInput} SaveAccountRelationshipInput */

const RELATIONSHIP_TYPES = new Set(['dba_of', 'subsidiary_of', 'affiliate_of']);
const HIERARCHY_TYPES = new Set(['dba_of', 'subsidiary_of']);

/**
 * @param {AccountRelationshipRepository} relationships
 * @param {CompanyRepository} accounts
 */
export function createAccountRelationshipService(relationships, accounts) {
  return {
    async list(accountId) {
      return relationships.listForAccount(String(accountId ?? '').trim());
    },

    /** @param {string} sourceAccountId @param {SaveAccountRelationshipInput} input */
    async create(sourceAccountId, input) {
      const sourceId = String(sourceAccountId ?? '').trim();
      const targetId = String(input?.targetAccountId ?? '').trim();

      if (!RELATIONSHIP_TYPES.has(input?.type)) {
        throw new CrmDataAccessError('INVALID_INPUT', 'Account relationship type is invalid.');
      }

      if (!sourceId || !targetId || sourceId === targetId) {
        throw new CrmDataAccessError('INVALID_INPUT', 'Related accounts must be different.');
      }

      const [source, target] = await Promise.all([accounts.findById(sourceId), accounts.findById(targetId)]);
      if (!source || !target) throw new CrmDataAccessError('NOT_FOUND', 'A related account was not found.');

      if (await relationships.findMatching(sourceId, targetId, input.type)) {
        throw new CrmDataAccessError('CONFLICT', 'This account relationship already exists.');
      }

      if (HIERARCHY_TYPES.has(input.type) && (await relationships.wouldCreateHierarchyCycle(sourceId, targetId))) {
        throw new CrmDataAccessError('CONFLICT', 'This account relationship would create a cycle.');
      }

      if (input.type === 'dba_of' && source.type !== 'dba') {
        throw new CrmDataAccessError('INVALID_INPUT', 'Only a DBA account can use the dba_of relationship.');
      }

      return relationships.create(sourceId, { targetAccountId: targetId, type: input.type });
    },

    /** @param {string} accountId @param {string} relationshipId */
    async remove(accountId, relationshipId) {
      const links = await relationships.listForAccount(String(accountId ?? '').trim());
      const relationship = links.find((item) => item.id === String(relationshipId ?? '').trim());
      if (!relationship) {
        throw new CrmDataAccessError('NOT_FOUND', 'Account relationship was not found for this company.');
      }
      await relationships.delete(relationship.id);
    }
  };
}
