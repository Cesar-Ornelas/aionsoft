import { DocumentDataAccessError } from '../../model/data-access-error.js';
import { renderDocumentHtml, validateFieldReferences } from '../../model/content.js';

const now = () => new Date().toISOString();

export function createDocumentService(repository, dependencies = {}) {
  const getTemplateVersion = dependencies.getTemplateVersion ?? (async () => null);
  const getFormVersion = dependencies.getFormVersion ?? (async () => null);
  const findAccount = dependencies.findAccount ?? (async () => null);
  const listResources = dependencies.listResources ?? (async () => []);
  const listVariables = dependencies.listVariables ?? (async () => []);

  return {
    list: () => repository.listDocuments(),
    generate: async (input) => {
      const templateVersion = await getTemplateVersion(input.templateVersionId);
      if (!templateVersion?.isPublished) throw new DocumentDataAccessError('CONFLICT', 'A published document template version is required.');
      const formVersion = templateVersion.formVersionId ? await getFormVersion(templateVersion.formVersionId) : null;
      if (templateVersion.formVersionId && !formVersion?.isPublished) throw new DocumentDataAccessError('CONFLICT', 'The document template form version is no longer published.');
      if (input.operationsAccountId && !(await findAccount(input.operationsAccountId))) throw new DocumentDataAccessError('NOT_FOUND', 'Operations Account was not found.');
      if (formVersion) validateFieldReferences(templateVersion.content, formVersion.schema);
      const renderedHtml = renderDocumentHtml(templateVersion.content, input.values ?? {}, formVersion?.schema ?? { fields: [] }, templateVersion.pageConfig, await listResources(templateVersion.templateId), await listVariables());
      return repository.createDocument({
        operationsAccountId: input.operationsAccountId || null,
        templateVersionId: templateVersion.id,
        formVersionId: formVersion?.id || null,
        status: 'generated',
        dataSnapshot: structuredClone(input.values ?? {}),
        renderedHtml,
        createdAt: now()
      });
    }
  };
}
