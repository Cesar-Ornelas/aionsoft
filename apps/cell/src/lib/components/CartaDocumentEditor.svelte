<script>
  import { onDestroy, onMount } from 'svelte';
  import { Carta, MarkdownEditor } from 'carta-md';
  import { slash } from '@cartamd/plugin-slash';
  import DOMPurify from 'isomorphic-dompurify';
  import 'carta-md/default.css';
  import '@cartamd/plugin-slash/default.css';
  import { documentContentToMarkdown, markdownToDocumentContent } from '$lib/documents/model/document-markdown.js';
  import { listTableCarta } from '$lib/documents/model/list-table-carta.js';
  import { sectionsCarta } from '$lib/documents/model/sections-carta.js';
  import { documentSlashSnippets } from '$lib/documents/model/document-slash-snippets.js';

  let {
    value = '',
    content = null,
    onChange = null,
    onContentChange = null,
    onEditorReady = null,
    availableFields = [],
    availableVariables = [],
    placeholder = 'Write your document in Markdown...',
    minHeight = 'min-h-96'
  } = $props();

  const listFields = availableFields.filter((field) => field.type === 'list');
  const listChildIds = new Set(listFields.flatMap((field) => (field.fields ?? []).map((child) => child.id)));
  const insertableFields = availableFields.filter((field) => field.type !== 'list' && !listChildIds.has(field.id));

  const carta = new Carta({
    sanitizer: (html) => DOMPurify.sanitize(html),
    extensions: [listTableCarta(availableFields), sectionsCarta(), slash({ snippets: documentSlashSnippets(availableFields, availableVariables) })]
  });

  let markdown = $state(content ? documentContentToMarkdown(content) : String(value ?? ''));
  let ready = $state(false);
  let markdownError = $state('');
  let lastEmittedContentKey = '';

  function insertText(text) {
    const input = carta.input;
    if (!input) return false;
    const selection = input.getSelection();
    if (selection.end > selection.start) input.removeAt(selection.start, selection.end - selection.start);
    input.insertAt(selection.start, text);
    input.update();
    return true;
  }

  function insertToken(prefix, item) {
    insertText(`{{${prefix}${item.fieldKey || item.key || item.id}|${item.label || item.key || item.id}}}`);
  }

  $effect(() => {
    if (!ready) return;
    onChange?.(markdown);
    let nextContent;
    try {
      nextContent = markdownToDocumentContent(markdown);
      markdownError = '';
    } catch (error) {
      markdownError = error instanceof Error ? error.message : 'Invalid document Markdown.';
      return;
    }
    lastEmittedContentKey = JSON.stringify(nextContent);
    onContentChange?.(nextContent);
  });

  $effect(() => {
    const nextValue = content ? documentContentToMarkdown(content) : String(value ?? '');
    const contentKey = JSON.stringify(content ?? value ?? '');
    if (contentKey === lastEmittedContentKey) {
      lastEmittedContentKey = '';
      return;
    }
    if (nextValue !== markdown) markdown = nextValue;
  });

  onMount(() => {
    ready = true;
    onEditorReady?.({
      carta,
      getMarkdown: () => markdown,
      insertToken: ({ prefix, key, label, styles = '' }) => insertText(`{{${prefix}${key}|${label}${styles ? `|${styles}` : ''}}}`)
    });
  });

  onDestroy(() => carta.destroy?.());
</script>

<div class={`carta-document-editor ${minHeight}`}>
  <div class="carta-token-toolbar" aria-label="Insert document token">
    {#if insertableFields.length}
      <label>
        <span>Field</span>
        <select aria-label="Insert form field" onchange={(event) => { const item = availableFields.find((field) => field.id === event.currentTarget.value); if (item) insertToken('@', item); event.currentTarget.value = ''; }}>
          <option value="">Insert field</option>
          {#each insertableFields as field}<option value={field.id}>{field.label || field.fieldKey || field.id}</option>{/each}
        </select>
      </label>
    {/if}
    {#if availableVariables.length}
      <label>
        <span>Variable</span>
        <select aria-label="Insert management variable" onchange={(event) => { const item = availableVariables.find((variable) => variable.key === event.currentTarget.value); if (item) insertToken('#', item); event.currentTarget.value = ''; }}>
          <option value="">Insert variable</option>
          {#each availableVariables as variable}<option value={variable.key}>{variable.label || variable.key}</option>{/each}
        </select>
      </label>
    {/if}
  </div>
  {#if markdownError}<p class="carta-markdown-error" role="alert">{markdownError}</p>{/if}
  <MarkdownEditor bind:value={markdown} {carta} {placeholder} mode="tabs" />
</div>

<style>
  .carta-document-editor {
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    background: var(--background);
  }

  .carta-token-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.75rem;
    border-bottom: 1px solid var(--border);
    background: color-mix(in oklch, var(--muted) 20%, transparent);
  }

  .carta-token-toolbar label {
    display: grid;
    gap: 0.25rem;
    color: var(--muted-foreground);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .carta-token-toolbar select {
    min-width: 10rem;
    height: 2rem;
    border: 1px solid var(--input);
    border-radius: 0.375rem;
    background: var(--background);
    color: var(--foreground);
    font-size: 0.8125rem;
    font-weight: 400;
  }

  .carta-markdown-error {
    margin: 0;
    border-bottom: 1px solid var(--destructive);
    background: color-mix(in oklch, var(--destructive) 10%, transparent);
    padding: 0.5rem 0.75rem;
    color: var(--destructive);
    font-size: 0.8125rem;
  }

  :global(.carta-document-editor .carta-font-code) {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    letter-spacing: normal;
  }

  :global(.carta-document-editor .carta-theme__default) {
    --border-color: var(--border);
    --selection-color: var(--accent);
    --focus-outline: var(--ring);
    --hover-color: var(--muted);
    --caret-color: var(--primary);
    --text-color: var(--foreground);
    background: var(--background);
    color: var(--foreground);
  }

  :global(.carta-document-editor .carta-theme__default .carta-input),
  :global(.carta-document-editor .carta-theme__default .carta-renderer) {
    background: var(--background);
    color: var(--foreground);
  }

  :global(.carta-document-editor .carta-theme__default .carta-input textarea) {
    caret-color: var(--primary) !important;
  }

  :global(.carta-document-editor .carta-theme__default .carta-highlight),
  :global(.carta-document-editor .carta-theme__default .carta-highlight *) {
    color: var(--foreground) !important;
    text-shadow: none !important;
  }

  :global(.carta-document-editor .carta-theme__default .carta-renderer h1),
  :global(.carta-document-editor .carta-theme__default .carta-renderer h2),
  :global(.carta-document-editor .carta-theme__default .carta-renderer h3),
  :global(.carta-document-editor .carta-theme__default .carta-renderer h4),
  :global(.carta-document-editor .carta-theme__default .carta-renderer h5),
  :global(.carta-document-editor .carta-theme__default .carta-renderer h6),
  :global(.carta-document-editor .carta-theme__default .carta-renderer p),
  :global(.carta-document-editor .carta-theme__default .carta-renderer li),
  :global(.carta-document-editor .carta-theme__default .carta-renderer blockquote) {
    color: var(--foreground);
  }

  :global(.carta-document-editor .carta-theme__default .carta-renderer a) {
    color: var(--primary);
  }

  :global(.carta-document-editor .carta-theme__default .carta-renderer code),
  :global(.carta-document-editor .carta-theme__default .carta-renderer pre) {
    background: var(--muted);
    color: var(--foreground);
  }

  :global(.carta-document-editor .carta-slash) {
    --background: var(--popover);
    --group-color: var(--muted-foreground);
    --title-color: var(--popover-foreground);
    --description-color: var(--muted-foreground);
    --hover-background: var(--accent);
    z-index: 50;
    border: 1px solid var(--border);
    box-shadow: 0 10px 30px color-mix(in oklch, black 18%, transparent);
  }
</style>