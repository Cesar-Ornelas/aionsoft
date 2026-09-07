<script>
  import { onDestroy, onMount } from 'svelte';
  import { Editor, EditorContent } from 'svelte-tiptap';
  import { Placeholder } from '@tiptap/extensions';
  import { Markdown } from '@tiptap/markdown';
  import StarterKit from '@tiptap/starter-kit';
  import BoldIcon from '@lucide/svelte/icons/bold';
  import ItalicIcon from '@lucide/svelte/icons/italic';
  import ListIcon from '@lucide/svelte/icons/list';
  import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
  import QuoteIcon from '@lucide/svelte/icons/quote';
  import CodeIcon from '@lucide/svelte/icons/code';
  import UndoIcon from '@lucide/svelte/icons/undo-2';
  import RedoIcon from '@lucide/svelte/icons/redo-2';

  let {
    value = '',
    placeholder = 'Start writing…',
    onChange = null,
    minHeight = 'min-h-80'
  } = $props();

  let editor = $state();
  let markdown = $state(String(value ?? ''));
  let appliedValue = markdown;
  let renderNonce = $state(0);

  function refresh() {
    renderNonce += 1;
  }

  function sync(nextEditor = editor) {
    if (!nextEditor) return;
    markdown = nextEditor.getMarkdown();
    appliedValue = markdown;
    onChange?.(markdown);
    refresh();
  }

  function run(command) {
    if (!editor) return;
    command(editor.chain().focus()).run();
    sync();
  }

  function active(name, attributes) {
    renderNonce;
    return editor?.isActive(name, attributes) ?? false;
  }

  function can(command) {
    renderNonce;
    return editor ? command(editor.can().chain().focus()) : false;
  }

  $effect(() => {
    const nextValue = String(value ?? '');
    if (!editor) {
      markdown = nextValue;
      appliedValue = nextValue;
      return;
    }
    if (nextValue === appliedValue) return;
    appliedValue = nextValue;
    if (nextValue !== editor.getMarkdown()) {
      editor.commands.setContent(nextValue, { contentType: 'markdown' });
    }
  });

  onMount(() => {
    editor = new Editor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          bulletList: { HTMLAttributes: { class: 'list-disc' } },
          orderedList: { HTMLAttributes: { class: 'list-decimal' } }
        }),
        Placeholder.configure({ placeholder }),
        Markdown
      ],
      content: markdown,
      contentType: 'markdown',
      onCreate: ({ editor: nextEditor }) => sync(nextEditor),
      onSelectionUpdate: refresh,
      onTransaction: refresh,
      onUpdate: ({ editor: nextEditor }) => sync(nextEditor)
    });
    sync();
  });

  onDestroy(() => editor?.destroy());
</script>

<div class="overflow-hidden rounded-lg border border-input bg-background shadow-sm">
  <div class="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-2">
    <button type="button" class:active={active('bold')} class="editor-button" aria-label="Bold" title="Bold" disabled={!can((chain) => chain.toggleBold())} onclick={() => run((chain) => chain.toggleBold())}><BoldIcon size={16} /></button>
    <button type="button" class:active={active('italic')} class="editor-button" aria-label="Italic" title="Italic" disabled={!can((chain) => chain.toggleItalic())} onclick={() => run((chain) => chain.toggleItalic())}><ItalicIcon size={16} /></button>
    <span class="mx-1 h-5 w-px bg-border"></span>
    <button type="button" class:active={active('heading', { level: 2 })} class="editor-button text-xs font-semibold" aria-label="Heading" title="Heading" disabled={!can((chain) => chain.toggleHeading({ level: 2 }))} onclick={() => run((chain) => chain.toggleHeading({ level: 2 }))}>H</button>
    <button type="button" class:active={active('bulletList')} class="editor-button" aria-label="Bullet list" title="Bullet list" disabled={!can((chain) => chain.toggleBulletList())} onclick={() => run((chain) => chain.toggleBulletList())}><ListIcon size={16} /></button>
    <button type="button" class:active={active('orderedList')} class="editor-button" aria-label="Numbered list" title="Numbered list" disabled={!can((chain) => chain.toggleOrderedList())} onclick={() => run((chain) => chain.toggleOrderedList())}><ListOrderedIcon size={16} /></button>
    <button type="button" class:active={active('blockquote')} class="editor-button" aria-label="Quote" title="Quote" disabled={!can((chain) => chain.toggleBlockquote())} onclick={() => run((chain) => chain.toggleBlockquote())}><QuoteIcon size={16} /></button>
    <button type="button" class:active={active('codeBlock')} class="editor-button" aria-label="Code block" title="Code block" disabled={!can((chain) => chain.toggleCodeBlock())} onclick={() => run((chain) => chain.toggleCodeBlock())}><CodeIcon size={16} /></button>
    <span class="mx-1 h-5 w-px bg-border"></span>
    <button type="button" class="editor-button" aria-label="Undo" title="Undo" disabled={!can((chain) => chain.undo())} onclick={() => run((chain) => chain.undo())}><UndoIcon size={16} /></button>
    <button type="button" class="editor-button" aria-label="Redo" title="Redo" disabled={!can((chain) => chain.redo())} onclick={() => run((chain) => chain.redo())}><RedoIcon size={16} /></button>
  </div>
  {#if editor}
    <EditorContent editor={editor} class={`issue-description-editor ${minHeight} px-4 py-3 text-sm leading-7 text-foreground`} />
  {/if}
</div>

<style>
  .editor-button {
    display: inline-flex;
    height: 2rem;
    width: 2rem;
    align-items: center;
    justify-content: center;
    border-radius: 0.375rem;
    color: hsl(var(--muted-foreground));
  }

  .editor-button:hover:not(:disabled),
  .editor-button.active {
    background: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
  }

  .editor-button:disabled {
    cursor: not-allowed;
    opacity: 0.4;
  }

  :global(.issue-description-editor .tiptap) {
    min-height: inherit;
    outline: none;
  }

  :global(.issue-description-editor .tiptap p.is-editor-empty:first-child::before) {
    float: left;
    height: 0;
    color: hsl(var(--muted-foreground));
    content: attr(data-placeholder);
    pointer-events: none;
  }

  :global(.issue-description-editor .tiptap h1),
  :global(.issue-description-editor .tiptap h2),
  :global(.issue-description-editor .tiptap h3) {
    margin: 1rem 0 0.5rem;
    font-weight: 600;
  }

  :global(.issue-description-editor .tiptap h1) { font-size: 1.5rem; }
  :global(.issue-description-editor .tiptap h2) { font-size: 1.25rem; }
  :global(.issue-description-editor .tiptap h3) { font-size: 1.125rem; }
  :global(.issue-description-editor .tiptap ul),
  :global(.issue-description-editor .tiptap ol) { padding-left: 1.5rem; }
  :global(.issue-description-editor .tiptap blockquote) { border-left: 3px solid hsl(var(--border)); padding-left: 1rem; color: hsl(var(--muted-foreground)); }
  :global(.issue-description-editor .tiptap pre) { overflow-x: auto; border-radius: 0.375rem; background: hsl(var(--muted)); padding: 0.75rem; }
</style>
