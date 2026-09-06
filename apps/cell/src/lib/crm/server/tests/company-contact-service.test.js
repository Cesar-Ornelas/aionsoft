import { describe, expect, test } from 'bun:test';
import { CRM_DATA_ACCESS_ERROR_CODES } from '../../model/data-access-error.js';
import { createCompanyContactService } from '../services/company-contact-service.js';

function setup(primaryContactId = null) {
  const account = { id: 'account-1', type: 'legal_entity', primaryContactId };
  const contacts = new Map();
  let selectedPrimary = primaryContactId;

  const accountRepository = {
    async findById(id) {
      return id === account.id ? { ...account, primaryContactId: selectedPrimary } : null;
    },
    async setPrimaryContact(accountId, contactId) {
      selectedPrimary = contactId;
      return { ...account, id: accountId, primaryContactId: contactId };
    }
  };

  const contactRepository = {
    async listForAccount(accountId) {
      return [...contacts.values()].filter((contact) => contact.accountId === accountId);
    },
    async list() {
      return [...contacts.values()];
    },
    async findById(id) {
      return contacts.get(id) ?? null;
    },
    async create(accountId, input) {
      const contact = { id: `contact-${contacts.size + 1}`, accountId, ...input };
      contacts.set(contact.id, contact);
      return contact;
    },
    async update(id, input) {
      const contact = { ...contacts.get(id), ...input };
      contacts.set(id, contact);
      return contact;
    },
    async setAccount(id, accountId) {
      const contact = { ...contacts.get(id), accountId };
      contacts.set(id, contact);
      return contact;
    },
    async delete(id) {
      contacts.delete(id);
    }
  };

  return {
    service: createCompanyContactService(contactRepository, accountRepository),
    contacts,
    get selectedPrimary() {
      return selectedPrimary;
    }
  };
}

describe('company contact service', () => {
  test('requires at least email or phone', async () => {
    const context = setup();

    expect(context.service.create('account-1', { firstName: 'Ana', lastName: 'Diaz' })).rejects.toMatchObject({
      code: CRM_DATA_ACCESS_ERROR_CODES.INVALID_INPUT
    });
  });

  test('makes the first contact primary', async () => {
    const context = setup();
    const contact = await context.service.create('account-1', {
      firstName: ' Ana ',
      lastName: ' Diaz ',
      email: ' ANA@EXAMPLE.COM '
    });

    expect(contact.email).toBe('ana@example.com');
    expect(context.selectedPrimary).toBe(contact.id);
  });

  test('rejects a primary contact from another account', async () => {
    const context = setup();
    context.contacts.set('contact-2', { id: 'contact-2', accountId: 'account-2' });

    expect(context.service.setPrimary('account-1', 'contact-2')).rejects.toMatchObject({
      code: CRM_DATA_ACCESS_ERROR_CODES.NOT_FOUND
    });
  });

  test('blocks deleting the primary contact', async () => {
    const context = setup('contact-1');
    context.contacts.set('contact-1', { id: 'contact-1', accountId: 'account-1' });

    expect(context.service.remove('account-1', 'contact-1')).rejects.toMatchObject({
      code: CRM_DATA_ACCESS_ERROR_CODES.CONFLICT
    });
  });

  test('creates a standalone contact without a company', async () => {
    const context = setup();
    const contact = await context.service.createStandalone({
      firstName: 'Ana',
      lastName: 'Diaz',
      email: 'ANA@EXAMPLE.COM'
    });

    expect(contact.accountId).toBeNull();
    expect(contact.email).toBe('ana@example.com');
    expect(context.selectedPrimary).toBeNull();
  });

  test('allows a contact with phone but no email, title, or extension', async () => {
    const context = setup();
    const contact = await context.service.createStandalone({
      firstName: 'Luis',
      lastName: 'Garcia',
      phone: '512-555-0100'
    });

    expect(contact.phone).toBe('512-555-0100');
    expect(contact.email).toBeUndefined();
    expect(contact.jobTitle).toBeUndefined();
    expect(contact.extension).toBeUndefined();
  });

  test('links a standalone contact and makes it primary when needed', async () => {
    const context = setup();
    const contact = await context.service.createStandalone({
      firstName: 'Ana',
      lastName: 'Diaz',
      email: 'ana@example.com'
    });

    const linked = await context.service.link(contact.id, 'account-1');

    expect(linked.accountId).toBe('account-1');
    expect(context.selectedPrimary).toBe(contact.id);
  });

  test('prevents unlinking a company primary contact', async () => {
    const context = setup('contact-1');
    context.contacts.set('contact-1', { id: 'contact-1', accountId: 'account-1' });

    expect(context.service.unlink('contact-1')).rejects.toMatchObject({
      code: CRM_DATA_ACCESS_ERROR_CODES.CONFLICT
    });
  });
});
