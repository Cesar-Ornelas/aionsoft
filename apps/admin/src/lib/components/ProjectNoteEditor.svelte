<script>
	import { onDestroy, onMount } from 'svelte';
	import { Editor, EditorContent } from 'svelte-tiptap';
	import { Placeholder } from '@tiptap/extensions';
	import { Markdown } from '@tiptap/markdown';
	import StarterKit from '@tiptap/starter-kit';

	let {
		name = 'bodyMarkdown',
		value = '',
		labelledBy,
		placeholder = 'Write in markdown...',
		disabled = false,
		includeHiddenInput = true,
		onChange = null,
		editorClass = ''
	} = $props();

	let editor = $state();
	let bodyMarkdown = $state('');
	let renderNonce = $state(0);
	let appliedExternalValue = '';

	function bumpRender() {
		renderNonce += 1;
	}

	function syncFromEditor(nextEditor = editor) {
		if (!nextEditor) {
			return;
		}

		bodyMarkdown = nextEditor.getMarkdown();
		onChange?.(bodyMarkdown);
		bumpRender();
	}

	function withRender(callback) {
		if (!editor) {
			return;
		}

		callback(editor.chain().focus()).run();
		syncFromEditor(editor);
	}

	function isActive(...args) {
		renderNonce;
		return editor?.isActive(...args) ?? false;
	}

	function canRun(callback) {
		renderNonce;
		return editor ? callback(editor.can().chain().focus()) : false;
	}

	$effect(() => {
		const nextValue = String(value ?? '');

		if (!editor) {
			bodyMarkdown = nextValue;
			appliedExternalValue = nextValue;
			return;
		}

		if (nextValue === appliedExternalValue) {
			return;
		}

		appliedExternalValue = nextValue;

		if (nextValue !== editor.getMarkdown()) {
			editor.commands.setContent(nextValue, {
				contentType: 'markdown'
			});
		}
	});

	onMount(() => {
		editor = new Editor({
			editable: !disabled,
			extensions: [
				StarterKit.configure({
					heading: {
						levels: [1, 2, 3, 4]
					},
					orderedList: {
						HTMLAttributes: {
							class: 'list-decimal'
						}
					},
					bulletList: {
						HTMLAttributes: {
							class: 'list-disc'
						}
					}
				}),
				Placeholder.configure({
					placeholder
				}),
				Markdown
			],
			content: bodyMarkdown,
			contentType: 'markdown',
			onCreate: ({ editor: nextEditor }) => {
				syncFromEditor(nextEditor);
			},
			onSelectionUpdate: bumpRender,
			onTransaction: bumpRender,
			onUpdate: ({ editor: nextEditor }) => {
				syncFromEditor(nextEditor);
			}
		});

		syncFromEditor(editor);
	});

	onDestroy(() => {
		editor?.destroy();
	});
</script>

{#if includeHiddenInput}
	<input type="hidden" name={name} value={bodyMarkdown} />
{/if}

<div class="space-y-3">
		<div class="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-sm shadow-slate-200/40 dark:border-white/10 dark:bg-white/5 dark:shadow-[0_12px_24px_-18px_rgba(2,6,23,0.7)]">
		<button
			type="button"
			class:selected={isActive('heading', { level: 1 })}
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/8"
			aria-label="Heading 1"
			title="Heading 1"
			disabled={!canRun((chain) => chain.toggleHeading({ level: 1 }))}
			onclick={() => withRender((chain) => chain.toggleHeading({ level: 1 }))}
		>
			<svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M3.5 5.5v9" />
				<path d="M8.5 5.5v9" />
				<path d="M3.5 10h5" />
				<path d="M13 7.25 15 5.5v9" />
				<path d="M12.25 14.5h5.25" />
			</svg>
		</button>
		<button
			type="button"
			class:selected={isActive('heading', { level: 2 })}
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/8"
			aria-label="Heading 2"
			title="Heading 2"
			disabled={!canRun((chain) => chain.toggleHeading({ level: 2 }))}
			onclick={() => withRender((chain) => chain.toggleHeading({ level: 2 }))}
		>
			<svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M3.5 5.5v9" />
				<path d="M8.5 5.5v9" />
				<path d="M3.5 10h5" />
				<path d="M12.5 8a2.5 2.5 0 0 1 5 0c0 2.75-5 3-5 6.5h5" />
			</svg>
		</button>
		<button
			type="button"
			class:selected={isActive('bold')}
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/8"
			aria-label="Bold"
			title="Bold"
			disabled={!canRun((chain) => chain.toggleBold())}
			onclick={() => withRender((chain) => chain.toggleBold())}
		>
			<svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M6 4.5h4.75a3 3 0 0 1 0 6H6z" />
				<path d="M6 10.5h5.75a3 3 0 0 1 0 6H6z" />
			</svg>
		</button>
		<button
			type="button"
			class:selected={isActive('italic')}
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/8"
			aria-label="Italic"
			title="Italic"
			disabled={!canRun((chain) => chain.toggleItalic())}
			onclick={() => withRender((chain) => chain.toggleItalic())}
		>
			<svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M12.75 4.5h-4.5" />
				<path d="M11.75 4.5 8.25 15.5" />
				<path d="M11.75 15.5h-4.5" />
			</svg>
		</button>
		<button
			type="button"
			class:selected={isActive('strike')}
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/8"
			aria-label="Strike"
			title="Strike"
			disabled={!canRun((chain) => chain.toggleStrike())}
			onclick={() => withRender((chain) => chain.toggleStrike())}
		>
			<svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M4 10h12" />
				<path d="M6 6.5c.7-1.2 2-2 4-2 2.5 0 4 1.1 4 2.75 0 1.4-1 2.2-2.8 2.75l-2.4.75C7.1 11.3 6 12.2 6 13.75 6 15.5 7.7 16.5 10 16.5c2 0 3.4-.7 4.2-2" />
			</svg>
		</button>
		<button
			type="button"
			class:selected={isActive('bulletList')}
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/8"
			aria-label="Bullet list"
			title="Bullet list"
			disabled={!canRun((chain) => chain.toggleBulletList())}
			onclick={() => withRender((chain) => chain.toggleBulletList())}
		>
			<svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" />
				<circle cx="5" cy="10" r="1" fill="currentColor" stroke="none" />
				<circle cx="5" cy="14" r="1" fill="currentColor" stroke="none" />
				<path d="M8 6h7" />
				<path d="M8 10h7" />
				<path d="M8 14h7" />
			</svg>
		</button>
		<button
			type="button"
			class:selected={isActive('orderedList')}
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/8"
			aria-label="Ordered list"
			title="Ordered list"
			disabled={!canRun((chain) => chain.toggleOrderedList())}
			onclick={() => withRender((chain) => chain.toggleOrderedList())}
		>
			<svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M4.5 5.5h1v3" />
				<path d="M4 8.5h2" />
				<path d="M4 12.5c0-1 1-1.5 1.75-1.5S7.5 11.5 7.5 12.5c0 .6-.3 1-.9 1.5L4 16h3.5" />
				<path d="M10 6h6" />
				<path d="M10 10h6" />
				<path d="M10 14h6" />
			</svg>
		</button>
		<button
			type="button"
			class:selected={isActive('blockquote')}
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/8"
			aria-label="Quote"
			title="Quote"
			disabled={!canRun((chain) => chain.toggleBlockquote())}
			onclick={() => withRender((chain) => chain.toggleBlockquote())}
		>
			<svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M6.5 7.5A2.5 2.5 0 0 0 4 10v2.5A1.5 1.5 0 0 0 5.5 14H8v-3H6.5A3.5 3.5 0 0 1 10 7.5" />
				<path d="M13 7.5a2.5 2.5 0 0 0-2.5 2.5v2.5a1.5 1.5 0 0 0 1.5 1.5h2.5v-3H13A3.5 3.5 0 0 1 16.5 7.5" />
			</svg>
		</button>
		<button
			type="button"
			class:selected={isActive('codeBlock')}
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/8"
			aria-label="Code block"
			title="Code block"
			disabled={!canRun((chain) => chain.toggleCodeBlock())}
			onclick={() => withRender((chain) => chain.toggleCodeBlock())}
		>
			<svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="m7.5 6-4 4 4 4" />
				<path d="m12.5 6 4 4-4 4" />
			</svg>
		</button>
		<button
			type="button"
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/8"
			aria-label="Undo"
			title="Undo"
			disabled={!canRun((chain) => chain.undo())}
			onclick={() => withRender((chain) => chain.undo())}
		>
			<svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M8 6 4 10l4 4" />
				<path d="M5 10h6a4 4 0 1 1 0 8h-1.5" />
			</svg>
		</button>
		<button
			type="button"
				class="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-600 transition hover:border-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:border-white/10 dark:hover:bg-white/8"
			aria-label="Redo"
			title="Redo"
			disabled={!canRun((chain) => chain.redo())}
			onclick={() => withRender((chain) => chain.redo())}
		>
			<svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="m12 6 4 4-4 4" />
				<path d="M15 10H9a4 4 0 1 0 0 8h1.5" />
			</svg>
		</button>
	</div>

	<div class="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900/92 dark:shadow-[0_12px_24px_-18px_rgba(2,6,23,0.7)]">
		{#if editor}
				<EditorContent editor={editor} class={`project-note-editor min-h-72 px-5 py-4 text-sm leading-7 text-slate-900 dark:text-slate-100 ${editorClass}`.trim()} />
		{/if}
	</div>
</div>

<style>
	.selected {
		border-color: rgb(15 23 42 / 0.12);
		background: rgb(241 245 249);
		color: rgb(15 23 42);
	}

	:global(.dark) .selected {
		border-color: rgb(255 255 255 / 0.12);
		background: rgb(255 255 255 / 0.08);
		color: rgb(248 250 252);
	}

	:global(.project-note-editor .tiptap) {
		min-height: 18rem;
		outline: none;
	}

	:global(.project-note-editor .tiptap p.is-editor-empty:first-child::before) {
		color: rgb(100 116 139);
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}

	:global(.dark .project-note-editor .tiptap p.is-editor-empty:first-child::before) {
		color: rgb(148 163 184);
	}

	:global(.project-note-editor .tiptap h1) {
		font-size: 1.5rem;
		font-weight: 700;
		line-height: 1.2;
		margin: 0 0 0.75rem;
	}

	:global(.project-note-editor .tiptap h2) {
		font-size: 1.25rem;
		font-weight: 700;
		line-height: 1.3;
		margin: 0 0 0.75rem;
	}

	:global(.project-note-editor .tiptap p),
	:global(.project-note-editor .tiptap ul),
	:global(.project-note-editor .tiptap ol),
	:global(.project-note-editor .tiptap blockquote),
	:global(.project-note-editor .tiptap pre) {
		margin: 0 0 0.9rem;
	}

	:global(.project-note-editor .tiptap ul),
	:global(.project-note-editor .tiptap ol) {
		padding-left: 1.5rem;
	}

	:global(.project-note-editor .tiptap blockquote) {
		border-left: 3px solid rgb(226 232 240);
		padding-left: 1rem;
		color: rgb(71 85 105);
	}

	:global(.dark .project-note-editor .tiptap blockquote) {
		border-left-color: rgb(51 65 85);
		color: rgb(148 163 184);
	}

	:global(.project-note-editor .tiptap pre) {
		border-radius: 1rem;
		background: rgb(15 23 42);
		color: white;
		padding: 1rem;
		overflow-x: auto;
	}

	:global(.project-note-editor .tiptap code) {
		font-family: 'SFMono-Regular', ui-monospace, monospace;
	}

	:global(.project-note-editor .tiptap hr) {
		border: 0;
		border-top: 1px solid rgb(226 232 240);
		margin: 1rem 0;
	}

	:global(.dark .project-note-editor .tiptap hr) {
		border-top-color: rgb(51 65 85);
	}

	:global(.project-note-editor .tiptap strong) {
		font-weight: 700;
	}

	:global(.project-note-editor .tiptap em) {
		font-style: italic;
	}

	:global(.project-note-editor .tiptap p:last-child) {
		margin-bottom: 0;
	}
</style>