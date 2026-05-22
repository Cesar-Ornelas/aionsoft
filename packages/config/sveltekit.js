import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export function createSvelteConfig() {
	return {
		preprocess: vitePreprocess(),
		kit: {
			adapter: adapter(),
			prerender: {
				handleHttpError: ({ path, message }) => {
					if (path.startsWith('/img/') || path === '/favicon.ico') {
						console.warn(`Warning: missing static asset ${path}`);
						return;
					}

					throw new Error(message);
				},
				handleMissingId: 'warn'
			}
		}
	};
}