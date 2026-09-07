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

export async function createCrmServices() {
  const client = await getAdminPocketBaseClient();
  client.autoCancellation(false);
  const accounts = createPocketBaseCompanyRepository(client);
  const contacts = createPocketBaseCompanyContactRepository(client);
  const addresses = createPocketBaseCompanyAddressRepository(client);
  const relationships = createPocketBaseAccountRelationshipRepository(client);
  const operationsAccounts = createPocketBaseOperationsAccountRepository(client);
  const operationsEvents = createPocketBaseOperationsEventRepository(client);
  const operationsEventAttendees = createPocketBaseOperationsEventAttendeeRepository(client);
  const operationsCalls = createPocketBaseOperationsCallRepository(client);

  return {
    accounts: createCompanyService(accounts),
    contacts: createCompanyContactService(contacts, accounts),
    addresses: createCompanyAddressService(addresses, accounts),
    relationships: createAccountRelationshipService(relationships, accounts),
    operations: createOperationsAccountService(operationsAccounts, accounts),
    events: createOperationsEventService(operationsAccounts, operationsEvents, operationsEventAttendees),
    calls: createOperationsCallService(operationsAccounts, operationsCalls)
  };
}
