import { createCrmServices } from '$lib/crm/server/composition.js';

export async function load() {
  const services = await createCrmServices({ ensureManagement: true });
  const templates = await services.documents.templates.list();
  const publishedTemplates = (await Promise.all(templates.map(async (template) => (await services.documents.templates.versions(template.id)).filter((version) => version.isPublished).map((version) => ({ ...version, templateName: template.name }))))).flat();
  return { publishedTemplates, documents: await services.documents.instances.list() };
}
