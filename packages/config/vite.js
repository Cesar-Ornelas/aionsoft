import { defineConfig } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';

export function createViteConfig() {
	return defineConfig({
		plugins: [tailwindcss(), sveltekit()]
	});
}