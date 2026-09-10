import { getAdminPocketBaseClient } from '$lib/server/pocketbase.js';
import {
  createPocketBaseAccountRelationshipRepository,
  createPocketBaseCompanyRepository,
  createPocketBaseCompanyAddressRepository,
  createPocketBaseCompanyContactRepository
} from './adapters/pocketbase/repositories.js';
import { createPocketBaseOperationsAccountRepository, createPocketBaseOperationsCallRepository, createPocketBaseOperationsEventAttendeeRepository, createPocketBaseOperationsEventRepository } from '$lib/operations/server/adapters/pocketbase/repositories.js';
import { createAccountRelationshipService } from './services/account-relationship-service.js';
import { createCompanyService } from './services/company-service.js';
import { createCompanyAddressService } from './services/company-address-service.js';
import { createCompanyContactService } from './services/company-contact-service.js';
import { createOperationsAccountService } from '$lib/operations/server/services/account-service.js';
import { createOperationsEventService } from '$lib/operations/server/services/event-service.js';
import { createOperationsCallService } from '$lib/operations/server/services/call-service.js';
import { createPocketBaseCatalogServiceRepository } from '$lib/catalog/server/adapters/pocketbase/repositories.js';
import { createCatalogService } from '$lib/catalog/server/services/catalog-service.js';
import { createPocketBaseIssuesRepository } from '$lib/issues/server/adapters/pocketbase/repositories.js';
import { ensureCrmCompanyCollections } from '$lib/crm/server/adapters/pocketbase/schema.js';
import { createIssuesService } from '$lib/issues/server/services/issues-service.js';
import { createPocketBaseBillingAgreementRepository } from '$lib/billing/server/adapters/pocketbase/repositories.js';
import { createBillingAgreementService } from '$lib/billing/server/services/billing-agreement-service.js';
import { createPocketBaseFormRepository } from '$lib/management/server/adapters/pocketbase/repositories.js';
import { createFormService } from '$lib/management/server/services/form-service.js';
import { ensureDocumentCollections, ensureManagementFormCollections } from '$lib/server/management-bootstrap.js';
import { createPocketBaseDocumentRepository } from '$lib/documents/server/adapters/pocketbase/repositories.js';
import { createDocumentTemplateService } from '$lib/documents/server/services/document-template-service.js';
import { createDocumentService } from '$lib/documents/server/services/document-service.js';
import { createDocumentReviewService } from '$lib/documents/server/services/document-review-service.js';

export async function createCrmServices({ ensureManagement = false } = {}) {
  const client = await getAdminPocketBaseClient();
  client.autoCancellation(false);
  await ensureCrmCompanyCollections(client);
  if (ensureManagement) await ensureManagementFormCollections(client);
  if (ensureManagement) await ensureDocumentCollections(client);
  const accounts = createPocketBaseCompanyRepository(client);
  const contacts = createPocketBaseCompanyContactRepository(client);
  const addresses = createPocketBaseCompanyAddressRepository(client);
  const relationships = createPocketBaseAccountRelationshipRepository(client);
  const operationsAccounts = createPocketBaseOperationsAccountRepository(client);
  const operationsEvents = createPocketBaseOperationsEventRepository(client);
  const operationsEventAttendees = createPocketBaseOperationsEventAttendeeRepository(client);
  const operationsCalls = createPocketBaseOperationsCallRepository(client);
  const catalogServices = createPocketBaseCatalogServiceRepository(client);
  const catalog = createCatalogService(catalogServices);
  const issues = createPocketBaseIssuesRepository(client);
  const billingAgreements = createPocketBaseBillingAgreementRepository(client);
  const forms = createPocketBaseFormRepository(client);
  const formService = createFormService(forms);
  const documentRepository = createPocketBaseDocumentRepository(client);
  const documentTemplates = createDocumentTemplateService(documentRepository, {
    getFormVersion: (id) => formService.getVersion(id),
    createOwnedForm: async ({ name, description }) => {
      const form = await formService.createForm({ name: `${name} fields`, description, category: 'document' });
      await formService.saveDraft(form.id, { fields: [] });
      return form;
    },
    saveOwnedFormDraft: (formId, schema) => formService.saveDraft(formId, schema),
    getOwnedFormVersions: (formId) => formService.getVersions(formId),
    publishOwnedForm: (formId, versionId) => formService.publish(formId, versionId),
    deleteIssue: (id) => createIssuesService(issues).delete(id),
    archiveOwnedForm: (id) => formService.archive(id)
  });
  const documents = createDocumentService(documentRepository, {
    getTemplateVersion: (id) => documentRepository.findTemplateVersionById(id),
    getFormVersion: (id) => formService.getVersion(id),
    findAccount: async (id) => operationsAccounts.findById(id)
  });
  const documentReview = createDocumentReviewService(documentRepository);

  return {
    accounts: createCompanyService(accounts),
    contacts: createCompanyContactService(contacts, accounts),
    addresses: createCompanyAddressService(addresses, accounts),
    relationships: createAccountRelationshipService(relationships, accounts),
    operations: createOperationsAccountService(operationsAccounts, accounts),
    events: createOperationsEventService(operationsAccounts, operationsEvents, operationsEventAttendees),
    calls: createOperationsCallService(operationsAccounts, operationsCalls),
    catalog,
    issues: createIssuesService(issues),
    billing: createBillingAgreementService(billingAgreements, { operationsAccounts, catalog }),
    forms: formService,
    documents: { templates: documentTemplates, instances: documents, review: documentReview }
  };
}
