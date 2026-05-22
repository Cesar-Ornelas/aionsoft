import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseLegalMarkdown } from '@aionsoft/shared/legal-markdown';

export function load() {
	const filePath = resolve('static/md/accessibility.md');
	const content = readFileSync(filePath, 'utf-8');
	return { html: parseLegalMarkdown(content) };
}
