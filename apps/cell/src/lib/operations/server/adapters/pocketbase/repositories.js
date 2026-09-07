import { CrmDataAccessError } from '$lib/crm/model/data-access-error.js';

const COLLECTION = 'operations_accounts';
const EVENTS_COLLECTION = 'operations_events';
const EVENT_ATTENDEES_COLLECTION = 'operations_event_attendees';
const CALLS_COLLECTION = 'operations_calls';
const COMPANIES_COLLECTION = 'crm_accounts';
const CONTACTS_COLLECTION = 'crm_contacts';

function clean(value) {
  return String(value ?? '').trim();
}

function fromRecord(record) {
  return {
    id: record.id,
    name: record.name,
    description: record.description || '',
    status: record.status,
    createdAt: record.created || '',
    updatedAt: record.updated || record.created || ''
  };
}

function eventFromRecord(record) {
  return {
    id: record.id,
    accountId: record.account,
    type: record.type,
    title: record.title,
    description: record.description || '',
    startsAt: record.starts_at || '',
    ...(record.ends_at && { endsAt: record.ends_at }),
    allDay: Boolean(record.all_day),
    ...(record.url && { url: record.url }),
    status: record.status,
    createdAt: record.created || '',
    updatedAt: record.updated || record.created || ''
  };
}

function callFromRecord(record) {
  return {
    id: record.id,
    accountId: record.account,
    startsAt: record.starts_at || '',
    durationMinutes: Number(record.duration_minutes || 0),
    direction: record.direction,
    outcome: record.outcome,
    notes: record.notes || '',
    ...(record.contact_id && {
      contact: {
        id: record.contact_id,
        participantId: record.contact_id,
        name: record.contact_name || 'Unnamed contact',
        ...(record.contact_email && { email: record.contact_email }),
        ...(record.contact_job_title && { jobTitle: record.contact_job_title })
      }
    }),
    createdAt: record.created || '',
    updatedAt: record.updated || record.created || ''
  };
}

function translateError(error, message) {
  if (error instanceof CrmDataAccessError) return error;
  const status = Number(error?.status ?? error?.response?.status);
  if (status === 404) return new CrmDataAccessError('NOT_FOUND', message, { cause: error });
  if (status === 400) return new CrmDataAccessError('INVALID_INPUT', message, { cause: error });
  return new CrmDataAccessError('UNAVAILABLE', message, { cause: error });
}

/** @param {import('pocketbase').default} client */
export function createPocketBaseOperationsAccountRepository(client) {
  const records = client.collection(COLLECTION);

  return {
    async list(filter = {}) {
      try {
        const clauses = [];
        if (filter.name) clauses.push(client.filter('name ~ {:name}', { name: clean(filter.name) }));
        if (filter.status) clauses.push(client.filter('status = {:status}', { status: filter.status }));
        const result = await records.getList(filter.page, filter.pageSize, {
          filter: clauses.join(' && '),
          sort: 'name'
        });
        return {
          items: result.items.map(fromRecord),
          page: result.page,
          pageSize: result.perPage,
          totalItems: result.totalItems,
          totalPages: result.totalPages
        };
      } catch (error) {
        throw translateError(error, 'Unable to list Operations Accounts.');
      }
    },

    async findById(id) {
      try {
        return fromRecord(await records.getOne(id));
      } catch (error) {
        if (Number(error?.status) === 404) return null;
        throw translateError(error, 'Unable to load the Operations Account.');
      }
    },

    async create(input) {
      try {
        return fromRecord(await records.create({
          name: input.name,
          description: input.description || '',
          status: input.status || 'active'
        }));
      } catch (error) {
        throw translateError(error, 'Unable to create the Operations Account.');
      }
    },

    async update(id, input) {
      try {
        return fromRecord(await records.update(id, {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.status !== undefined && { status: input.status })
        }));
      } catch (error) {
        throw translateError(error, 'Unable to update the Operations Account.');
      }
    }
  };
}

/** @param {import('pocketbase').default} client */
export function createPocketBaseOperationsEventRepository(client) {
  const records = client.collection(EVENTS_COLLECTION);

  function accountFilter(accountId) {
    return client.filter('account = {:accountId}', { accountId });
  }

  return {
    async listForAccount(accountId, filter = {}) {
      try {
        const clauses = [accountFilter(accountId)];
        if (filter.from) clauses.push(client.filter('starts_at >= {:from}', { from: filter.from }));
        if (filter.to) clauses.push(client.filter('starts_at <= {:to}', { to: filter.to }));
        if (filter.type) clauses.push(client.filter('type = {:type}', { type: filter.type }));
        if (filter.status) clauses.push(client.filter('status = {:status}', { status: filter.status }));
        const result = await records.getFullList({
          filter: clauses.join(' && '),
          sort: 'starts_at,title'
        });
        return result.map(eventFromRecord);
      } catch (error) {
        throw translateError(error, 'Unable to list Operations events.');
      }
    },

    async findForAccount(accountId, eventId) {
      try {
        const filter = [accountFilter(accountId), client.filter('id = {:eventId}', { eventId })].join(' && ');
        return eventFromRecord(await records.getFirstListItem(filter));
      } catch (error) {
        if (Number(error?.status) === 404) return null;
        throw translateError(error, 'Unable to load the Operations event.');
      }
    },

    async create(accountId, input) {
      try {
        return eventFromRecord(await records.create({
          account: accountId,
          type: input.type,
          title: input.title,
          description: input.description || '',
          starts_at: input.startsAt,
          ends_at: input.endsAt || '',
          all_day: Boolean(input.allDay),
          url: input.url || '',
          status: input.status || 'scheduled'
        }));
      } catch (error) {
        throw translateError(error, 'Unable to create the Operations event.');
      }
    },

    async update(accountId, eventId, input) {
      try {
        const current = await this.findForAccount(accountId, eventId);
        if (!current) throw new CrmDataAccessError('NOT_FOUND', 'Operations event was not found.');
        return eventFromRecord(await records.update(eventId, {
          ...(input.type !== undefined && { type: input.type }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.startsAt !== undefined && { starts_at: input.startsAt }),
          ...(input.endsAt !== undefined && { ends_at: input.endsAt || '' }),
          ...(input.allDay !== undefined && { all_day: Boolean(input.allDay) }),
          ...(input.url !== undefined && { url: input.url || '' }),
          ...(input.status !== undefined && { status: input.status })
        }));
      } catch (error) {
        throw translateError(error, 'Unable to update the Operations event.');
      }
    },

    async delete(accountId, eventId) {
      try {
        const current = await this.findForAccount(accountId, eventId);
        if (!current) throw new CrmDataAccessError('NOT_FOUND', 'Operations event was not found.');
        await records.delete(current.id);
      } catch (error) {
        throw translateError(error, 'Unable to delete the Operations event.');
      }
    }
  };
}

/** @param {import('pocketbase').default} client */
export function createPocketBaseOperationsEventAttendeeRepository(client) {
  const events = client.collection(EVENTS_COLLECTION);
  const attendees = client.collection(EVENT_ATTENDEES_COLLECTION);
  const companies = client.collection(COMPANIES_COLLECTION);
  const contacts = client.collection(CONTACTS_COLLECTION);
  const users = client.collection('users');

  function nameForUser(user) {
    return user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unnamed user';
  }

  function nameForContact(contact) {
    return `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unnamed contact';
  }

  async function requireEvent(accountId, eventId) {
    try {
      return await events.getFirstListItem(client.filter('id = {:eventId} && account = {:accountId}', { eventId, accountId }));
    } catch (error) {
      throw translateError(error, 'Unable to load the Operations event.');
    }
  }

  return {
    async listOptionsForAccount(accountId) {
      try {
        const [userRecords, companyRecords] = await Promise.all([
          users.getFullList({ filter: 'status = "active"', sort: 'name,email' }),
          companies.getFullList({ filter: client.filter('operations_account = {:accountId}', { accountId }), fields: 'id' })
        ]);
        const companyIds = companyRecords.map((company) => company.id);
        const contactRecords = companyIds.length
          ? await contacts.getFullList({ filter: `(${companyIds.map((id) => client.filter('account = {:companyId}', { companyId: id })).join(' || ')})`, sort: 'last_name,first_name' })
          : [];
        return {
          team: userRecords.map((user) => ({ id: user.id, participantId: user.id, kind: 'team', name: nameForUser(user), email: user.email || '' })),
          account: contactRecords.map((contact) => ({ id: contact.id, participantId: contact.id, kind: 'account', name: nameForContact(contact), email: contact.email || '', jobTitle: contact.job_title || '' }))
        };
      } catch (error) {
        throw translateError(error, 'Unable to list Operations event attendees.');
      }
    },

    async listForEvent(accountId, eventId) {
      try {
        const event = await requireEvent(accountId, eventId);
        const records = await attendees.getFullList({ filter: client.filter('event = {:eventId}', { eventId: event.id }), sort: 'kind,name' });
        return records.map((record) => ({
          id: record.id,
          participantId: record.participant_id,
          kind: record.kind,
          name: record.name,
          ...(record.email && { email: record.email }),
          ...(record.job_title && { jobTitle: record.job_title })
        }));
      } catch (error) {
        throw translateError(error, 'Unable to list Operations event attendees.');
      }
    },

    async replaceForEvent(accountId, eventId, selected) {
      try {
        const event = await requireEvent(accountId, eventId);
        const options = await this.listOptionsForAccount(accountId);
        const optionMap = new Map([...options.team, ...options.account].map((option) => [`${option.kind}:${option.participantId}`, option]));
        const existing = await attendees.getFullList({ filter: client.filter('event = {:eventId}', { eventId: event.id }), fields: 'id' });
        await Promise.all(existing.map((record) => attendees.delete(record.id)));
        const selectedOptions = [
          ...(selected.team || []).map((id) => optionMap.get(`team:${id}`)),
          ...(selected.account || []).map((id) => optionMap.get(`account:${id}`))
        ].filter(Boolean);
        await Promise.all(selectedOptions.map((option) => attendees.create({
          event: event.id,
          kind: option.kind,
          participant_id: option.participantId,
          name: option.name,
          email: option.email || '',
          job_title: option.jobTitle || ''
        })));
        return this.listForEvent(accountId, event.id);
      } catch (error) {
        throw translateError(error, 'Unable to save Operations event attendees.');
      }
    }
  };
}

/** @param {import('pocketbase').default} client */
export function createPocketBaseOperationsCallRepository(client) {
  const records = client.collection(CALLS_COLLECTION);
  const companies = client.collection(COMPANIES_COLLECTION);
  const contacts = client.collection(CONTACTS_COLLECTION);

  function accountFilter(accountId) {
    return client.filter('account = {:accountId}', { accountId });
  }

  async function contactOptions(accountId) {
    const companyRecords = await companies.getFullList({ filter: accountFilterForCompany(accountId), fields: 'id' });
    const companyIds = companyRecords.map((company) => company.id);
    if (!companyIds.length) return [];
    const filter = companyIds.map((id) => client.filter('account = {:companyId}', { companyId: id })).join(' || ');
    const contactRecords = await contacts.getFullList({ filter: `(${filter})`, sort: 'last_name,first_name' });
    return contactRecords.map((contact) => ({
      id: contact.id,
      participantId: contact.id,
      name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unnamed contact',
      email: contact.email || '',
      jobTitle: contact.job_title || ''
    }));
  }

  function accountFilterForCompany(accountId) {
    return client.filter('operations_account = {:accountId}', { accountId });
  }

  return {
    async listForAccount(accountId, filter = {}) {
      try {
        const clauses = [accountFilter(accountId)];
        if (filter.from) clauses.push(client.filter('starts_at >= {:from}', { from: filter.from }));
        if (filter.to) clauses.push(client.filter('starts_at <= {:to}', { to: filter.to }));
        return (await records.getFullList({ filter: clauses.join(' && '), sort: 'starts_at' })).map(callFromRecord);
      } catch (error) {
        throw translateError(error, 'Unable to list Operations calls.');
      }
    },

    async findForAccount(accountId, callId) {
      try {
        return callFromRecord(await records.getFirstListItem([accountFilter(accountId), client.filter('id = {:callId}', { callId })].join(' && ')));
      } catch (error) {
        if (Number(error?.status) === 404) return null;
        throw translateError(error, 'Unable to load the Operations call.');
      }
    },

    async create(accountId, input) {
      try {
        const contactsForAccount = await contactOptions(accountId);
        const contact = contactsForAccount.find((option) => option.participantId === input.contactId);
        return callFromRecord(await records.create({
          account: accountId,
          starts_at: input.startsAt,
          duration_minutes: String(input.durationMinutes || 0),
          contact_id: contact?.participantId || '',
          contact_name: contact?.name || '',
          contact_email: contact?.email || '',
          contact_job_title: contact?.jobTitle || '',
          direction: input.direction,
          outcome: input.outcome,
          notes: input.notes || ''
        }));
      } catch (error) {
        throw translateError(error, 'Unable to create the Operations call.');
      }
    },

    async update(accountId, callId, input) {
      try {
        const current = await this.findForAccount(accountId, callId);
        if (!current) throw new CrmDataAccessError('NOT_FOUND', 'Operations call was not found.');
        const payload = {};
        if (input.startsAt !== undefined) payload.starts_at = input.startsAt;
        if (input.durationMinutes !== undefined) payload.duration_minutes = String(input.durationMinutes);
        if (input.direction !== undefined) payload.direction = input.direction;
        if (input.outcome !== undefined) payload.outcome = input.outcome;
        if (input.notes !== undefined) payload.notes = input.notes;
        if (input.contactId !== undefined) {
          const contact = (await contactOptions(accountId)).find((option) => option.participantId === input.contactId);
          payload.contact_id = contact?.participantId || '';
          payload.contact_name = contact?.name || '';
          payload.contact_email = contact?.email || '';
          payload.contact_job_title = contact?.jobTitle || '';
        }
        return callFromRecord(await records.update(current.id, payload));
      } catch (error) {
        throw translateError(error, 'Unable to update the Operations call.');
      }
    },

    async delete(accountId, callId) {
      try {
        const current = await this.findForAccount(accountId, callId);
        if (!current) throw new CrmDataAccessError('NOT_FOUND', 'Operations call was not found.');
        await records.delete(current.id);
      } catch (error) {
        throw translateError(error, 'Unable to delete the Operations call.');
      }
    },

    async listContactsForAccount(accountId) {
      try {
        return await contactOptions(accountId);
      } catch (error) {
        throw translateError(error, 'Unable to list Operations call contacts.');
      }
    }
  };
}
