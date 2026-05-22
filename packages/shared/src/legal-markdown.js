import { marked } from 'marked';

function slugifyHeading(text) {
	return text
		.replace(/^\s*\d+[.)]?\s+/, '')
		.replace(/&[^;]+;/g, ' ')
		.replace(/[^\w\s-]/g, '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
}

export function parseLegalMarkdown(content) {
	const normalizedContent = content.replace(/^\uFEFF/, '');
	const html = marked.parse(normalizedContent);
	const seenSlugs = new Map();

	return html.replace(/<h([1-6])>(.*?)<\/h\1>/g, (match, level, innerHtml) => {
		const textContent = innerHtml.replace(/<[^>]+>/g, '').trim();
		const baseSlug = slugifyHeading(textContent);

		if (!baseSlug) {
			return match;
		}

		const count = seenSlugs.get(baseSlug) ?? 0;
		seenSlugs.set(baseSlug, count + 1);

		const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;

		return `<h${level} id="${slug}">${innerHtml}</h${level}>`;
	});
}