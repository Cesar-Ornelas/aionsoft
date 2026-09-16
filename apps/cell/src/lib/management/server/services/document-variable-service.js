import { DataAccessError } from '../../model/data-access-error.js';
import { normalizeDocumentVariable } from '../../model/document-variables.js';

const now = () => new Date().toISOString();

export function createDocumentVariableService(repository) {
  const find = async (id) => {
    const variable = await repository.findById(id);
    if (!variable) throw new DataAccessError('NOT_FOUND', `Document variable ${id} was not found.`);
    return variable;
  };

  return {
    list: async () => (await repository.list()).filter((variable) => variable.status !== 'archived'),
    get: find,
    create: async (input) => repository.create({
      ...normalizeDocumentVariable(input),
      status: 'active',
      createdAt: now(),
      updatedAt: now()
    }),
    update: async (id, input) => {
      const current = await find(id);
      if (current.status === 'archived') throw new DataAccessError('CONFLICT', 'Archived document variables cannot be updated.');
      return repository.update(id, { ...normalizeDocumentVariable({ ...current, ...input }, { partial: false }), updatedAt: now() });
    },
    archive: async (id) => {
      await find(id);
      return repository.update(id, { status: 'archived', updatedAt: now() });
    }
  };
}
