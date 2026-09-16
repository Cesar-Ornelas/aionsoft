<script>
  import { onDestroy, onMount } from 'svelte';
  import { Editor, EditorContent } from 'svelte-tiptap';
  import { mergeAttributes, Node } from '@tiptap/core';
  import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
  import { Placeholder } from '@tiptap/extensions';
  import StarterKit from '@tiptap/starter-kit';
  import BoldIcon from '@lucide/svelte/icons/bold';
  import ItalicIcon from '@lucide/svelte/icons/italic';
  import ListIcon from '@lucide/svelte/icons/list';
  import ListOrderedIcon from '@lucide/svelte/icons/list-ordered';
  import MinusIcon from '@lucide/svelte/icons/minus';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import SeparatorHorizontalIcon from '@lucide/svelte/icons/separator-horizontal';
  import Table2Icon from '@lucide/svelte/icons/table-2';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import UndoIcon from '@lucide/svelte/icons/undo-2';
  import RedoIcon from '@lucide/svelte/icons/redo-2';
  import Settings2Icon from '@lucide/svelte/icons/settings-2';
  import ImageIcon from '@lucide/svelte/icons/image';
  import DocumentResourcePicker from '$lib/components/DocumentResourcePicker.svelte';

  let {
    content = { type: 'doc', content: [{ type: 'paragraph' }] },
    availableFields = [],
    dateFormat = 'long',
    onChange = null,
    onEditorReady = null,
    onOpenConfiguration = null,
    resources = [],
    onUploadResource = null
  } = $props();

  const documentField = Node.create({
    name: 'documentField',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: false,
    addAttributes() {
      return {
        fieldId: { default: null },
        fieldKey: { default: null },
        label: { default: null },
        format: { default: null }
      };
    },
    parseHTML() {
      return [{ tag: 'span[data-document-field]' }];
    },
    renderHTML({ node, HTMLAttributes }) {
      return ['span', mergeAttributes(HTMLAttributes, { 'data-document-field': node.attrs.fieldKey || node.attrs.fieldId, class: 'document-field-token' }), `@${node.attrs.label || node.attrs.fieldKey || node.attrs.fieldId}`];
    }
  });

  const pageBreak = Node.create({
    name: 'pageBreak',
    group: 'block',
    atom: true,
    selectable: true,
    parseHTML() {
      return [{ tag: 'div[data-page-break]' }];
    },
    renderHTML() {
      return ['div', { 'data-page-break': 'true', class: 'document-page-break' }];
    }
  });

  const resourceImage = Node.create({
    name: 'image',
    group: 'inline',
    inline: true,
    draggable: true,
    atom: true,
    addAttributes() { return { resourceKey: { default: null }, alt: { default: '' }, width: { default: null }, src: { default: null } }; },
    parseHTML() { return [{ tag: 'img[data-resource-key]' }]; },
    renderHTML({ node, HTMLAttributes }) { return ['img', mergeAttributes(HTMLAttributes, { 'data-resource-key': node.attrs.resourceKey, alt: node.attrs.alt || '', src: node.attrs.src || '' })]; }
  });

  let editor = $state();
  let editorContainer = $state();
  let renderNonce = $state(0);
  let suggestionRange = $state(null);
  let suggestionQuery = $state('');
  let selectionMenu = $state({ visible: false, top: 8, left: 8 });
  let tableState = $state({ visible: false, rows: 0, columns: 0 });

  let matchingFields = $derived(availableFields.filter((field) => {
    const text = `${field.label} ${field.fieldKey || ''}`.toLowerCase();
    return text.includes(suggestionQuery.toLowerCase());
  }).slice(0, 6));
  let pageBreakMatches = $derived('page break'.includes(suggestionQuery.toLowerCase()) || 'page'.includes(suggestionQuery.toLowerCase()));

  function refresh() { renderNonce += 1; }

  function active(name, attributes) {
    renderNonce;
    return editor?.isActive(name, attributes) ?? false;
  }

  function can(command) {
    renderNonce;
    return editor ? command(editor.can().chain().focus()) : false;
  }

  function run(command) {
    if (!editor) return;
    command(editor.chain().focus()).run();
    sync(editor);
  }

  function updateTableState(nextEditor) {
    if (!nextEditor?.isFocused || !nextEditor.isActive('table')) {
      tableState = { visible: false, rows: 0, columns: 0 };
      return;
    }
    const resolvedSelection = nextEditor.state.selection.$from;
    for (let depth = resolvedSelection.depth; depth > 0; depth -= 1) {
      const node = resolvedSelection.node(depth);
      if (node.type.name !== 'table') continue;
      const firstRow = node.firstChild;
      tableState = { visible: true, rows: node.childCount, columns: firstRow?.childCount ?? 0 };
      return;
    }
    tableState = { visible: false, rows: 0, columns: 0 };
  }

  function tableRun(command) {
    if (!editor) return;
    command(editor.chain().focus()).run();
    sync(editor);
    updateTableState(editor);
  }

  function tableCan(command) {
    renderNonce;
    return tableState.visible && editor ? command(editor.can().chain().focus()) : false;
  }

  function insertTable() {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: false }).run();
    sync(editor);
  }

  function insertImage(resource) {
    if (!editor || !resource) return;
    const alt = window.prompt('Describe this image', resource.name) ?? resource.name;
    const widthInput = window.prompt('Image width as a percentage (1-100)', '100');
    const width = widthInput === null || widthInput.trim() === '' ? null : Math.min(100, Math.max(1, Number(widthInput)));
    if (widthInput !== null && width !== null && !Number.isFinite(width)) return;
    editor.chain().focus().insertContent({ type: 'image', attrs: { resourceKey: resource.resourceKey, alt: alt.trim().slice(0, 240), width, src: resource.url } }).run();
    sync(editor);
  }

  function insertPageBreak(range = null) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (range) chain.deleteRange(range);
    chain.insertContent({ type: 'pageBreak' }).run();
    suggestionRange = null;
    suggestionQuery = '';
    sync(editor);
  }

  function sync(nextEditor) {
    if (!nextEditor) return;
    updateSuggestion(nextEditor);
    onChange?.(toDocumentContent(nextEditor.getJSON()));
    refresh();
  }

  function updateSuggestion(nextEditor) {
    const { from } = nextEditor.state.selection;
    const beforeCursor = nextEditor.state.doc.textBetween(Math.max(0, from - 80), from, '\n', '\0');
    const match = beforeCursor.match(/@([a-zA-Z][a-zA-Z0-9_]*)?$/);
    if (!match) {
      suggestionRange = null;
      suggestionQuery = '';
      return;
    }
    suggestionRange = { from: from - match[0].length, to: from };
    suggestionQuery = match[1] || '';
  }

  function updateSelectionMenu(nextEditor) {
    if (!editorContainer || !nextEditor?.isFocused) {
      selectionMenu.visible = false;
      return;
    }
    const { from, to } = nextEditor.state.selection;
    if (from === to) {
      selectionMenu.visible = false;
      return;
    }
    const start = nextEditor.view.coordsAtPos(from);
    const end = nextEditor.view.coordsAtPos(to);
    const containerRect = editorContainer.getBoundingClientRect();
    const menuWidth = 184;
    const selectionCenter = (start.left + end.right) / 2 - containerRect.left;
    selectionMenu = {
      visible: true,
      top: Math.max(8, start.top - containerRect.top - 46),
      left: Math.max(8, Math.min(selectionCenter - menuWidth / 2, containerRect.width - menuWidth - 8))
    };
  }

  function insertField(field, range = null) {
    if (!editor) return;
    const target = range || suggestionRange;
    const attrs = { fieldId: field.id || null, fieldKey: field.fieldKey || field.id, label: field.label || field.fieldKey || field.id, ...(field.type === 'date' ? { format: dateFormat } : {}) };
    const chain = editor.chain().focus();
    if (target) chain.deleteRange(target);
    chain.insertContent({ type: 'documentField', attrs }).run();
    suggestionRange = null;
    suggestionQuery = '';
    sync(editor);
  }

  function handleKeydown(event) {
    if (!suggestionRange) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      suggestionRange = null;
      suggestionQuery = '';
    } else if (event.key === 'Enter' && pageBreakMatches) {
      event.preventDefault();
      insertPageBreak(suggestionRange);
    } else if (event.key === 'Enter' && matchingFields[0]) {
      event.preventDefault();
      insertField(matchingFields[0]);
    }
  }

  function toEditorContent(value) {
    if (!value || typeof value !== 'object') return { type: 'doc', content: [{ type: 'paragraph' }] };
    const node = { ...value };
    if (node.type === 'document_field') node.type = 'documentField';
    if (node.type === 'page_break') node.type = 'pageBreak';
    if (node.type === 'image') node.attrs = { ...node.attrs, src: resources.find((resource) => resource.resourceKey === node.attrs?.resourceKey)?.url || '' };
    if (Array.isArray(node.content)) node.content = node.content.map(toEditorContent);
    return node;
  }

  function toDocumentContent(value) {
    const node = { ...value };
    if (node.type === 'documentField') node.type = 'document_field';
    if (node.type === 'pageBreak') node.type = 'page_break';
    if (Array.isArray(node.content)) node.content = node.content.map(toDocumentContent);
    return node;
  }

  $effect(() => {
    if (editor) onEditorReady?.({ insertField: (field) => insertField(field, null) });
  });

  onMount(() => {
    editor = new Editor({
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Placeholder.configure({ placeholder: 'Start writing your document...' }),
        documentField,
        pageBreak,
        resourceImage,
        Table.configure({ resizable: true, HTMLAttributes: { class: 'document-table' } }),
        TableRow,
        TableHeader,
        TableCell
      ],
      content: toEditorContent(content),
      onCreate: ({ editor: nextEditor }) => sync(nextEditor),
      onSelectionUpdate: ({ editor: nextEditor }) => { updateSuggestion(nextEditor); updateSelectionMenu(nextEditor); updateTableState(nextEditor); refresh(); },
      onTransaction: ({ editor: nextEditor }) => { updateSelectionMenu(nextEditor); updateTableState(nextEditor); refresh(); },
      onUpdate: ({ editor: nextEditor }) => sync(nextEditor)
    });
    onEditorReady?.({ insertField: (field) => insertField(field, null) });
  });

  onDestroy(() => editor?.destroy());
</script>

<div bind:this={editorContainer} class="relative overflow-hidden rounded-2xl border border-input bg-background shadow-sm" onkeydown={handleKeydown}>
  <div class="flex flex-wrap items-center gap-1 border-b border-border bg-muted/30 p-2">
    <button type="button" class="editor-button" class:active={active('bold')} aria-label="Bold" title="Bold" disabled={!can((chain) => chain.toggleBold())} onclick={() => run((chain) => chain.toggleBold())}><BoldIcon size={17} /></button>
    <button type="button" class="editor-button" class:active={active('italic')} aria-label="Italic" title="Italic" disabled={!can((chain) => chain.toggleItalic())} onclick={() => run((chain) => chain.toggleItalic())}><ItalicIcon size={17} /></button>
    <span class="mx-1 h-5 w-px bg-border"></span>
    <button type="button" class="editor-button text-xs font-semibold" class:active={active('heading', { level: 2 })} aria-label="Heading" title="Heading" disabled={!can((chain) => chain.toggleHeading({ level: 2 }))} onclick={() => run((chain) => chain.toggleHeading({ level: 2 }))}>H2</button>
    <button type="button" class="editor-button" class:active={active('bulletList')} aria-label="Bullet list" title="Bullet list" disabled={!can((chain) => chain.toggleBulletList())} onclick={() => run((chain) => chain.toggleBulletList())}><ListIcon size={17} /></button>
    <button type="button" class="editor-button" class:active={active('orderedList')} aria-label="Numbered list" title="Numbered list" disabled={!can((chain) => chain.toggleOrderedList())} onclick={() => run((chain) => chain.toggleOrderedList())}><ListOrderedIcon size={17} /></button>
    <button type="button" class="editor-button" aria-label="Insert table" title="Insert table" onclick={insertTable}><Table2Icon size={17} /></button>
    <details class="resource-menu">
      <summary class="editor-button" aria-label="Insert image" title="Insert image"><ImageIcon size={17} /></summary>
      <div class="resource-popover"><DocumentResourcePicker {resources} onUpload={onUploadResource} onSelect={insertImage} /></div>
    </details>
    <button type="button" class="editor-button" aria-label="Insert page break" title="Insert page break" onclick={insertPageBreak}><SeparatorHorizontalIcon size={17} /></button>
    <button type="button" class="editor-button" aria-label="Document configurations" title="Document configurations" onclick={() => onOpenConfiguration?.()}><Settings2Icon size={17} /></button>
    <span class="mx-1 h-5 w-px bg-border"></span>
    <button type="button" class="editor-button" aria-label="Undo" title="Undo" disabled={!can((chain) => chain.undo())} onclick={() => run((chain) => chain.undo())}><UndoIcon size={17} /></button>
    <button type="button" class="editor-button" aria-label="Redo" title="Redo" disabled={!can((chain) => chain.redo())} onclick={() => run((chain) => chain.redo())}><RedoIcon size={17} /></button>
    {#if suggestionRange && (matchingFields.length || pageBreakMatches)}<span class="ml-auto text-xs text-muted-foreground">Choose a field or page break</span>{/if}
  </div>
  {#if tableState.visible}
    <div class="table-toolbar flex flex-wrap items-center gap-1 border-b border-border bg-muted/20 px-2 py-1.5" role="toolbar" aria-label="Table editing">
      <span class="mr-1 text-xs font-medium text-muted-foreground">{tableState.columns} columns x {tableState.rows} rows</span>
      <span class="hidden h-5 w-px bg-border sm:block"></span>
      <button type="button" class="table-action" aria-label="Add row below" title="Add row below" onmousedown={(event) => event.preventDefault()} disabled={!tableCan((chain) => chain.addRowAfter())} onclick={() => tableRun((chain) => chain.addRowAfter())}><PlusIcon data-icon="inline-start" />Row</button>
      <button type="button" class="table-action" aria-label="Add column after" title="Add column after" onmousedown={(event) => event.preventDefault()} disabled={!tableCan((chain) => chain.addColumnAfter())} onclick={() => tableRun((chain) => chain.addColumnAfter())}><PlusIcon data-icon="inline-start" />Column</button>
      <button type="button" class="table-action" aria-label="Delete current row" title="Delete current row" onmousedown={(event) => event.preventDefault()} disabled={tableState.rows <= 1 || !tableCan((chain) => chain.deleteRow())} onclick={() => tableRun((chain) => chain.deleteRow())}><MinusIcon data-icon="inline-start" />Row</button>
      <button type="button" class="table-action" aria-label="Delete current column" title="Delete current column" onmousedown={(event) => event.preventDefault()} disabled={tableState.columns <= 1 || !tableCan((chain) => chain.deleteColumn())} onclick={() => tableRun((chain) => chain.deleteColumn())}><MinusIcon data-icon="inline-start" />Column</button>
      <span class="hidden h-5 w-px bg-border sm:block"></span>
      <button type="button" class="table-action table-action-destructive" aria-label="Delete table" title="Delete table" onmousedown={(event) => event.preventDefault()} disabled={!tableCan((chain) => chain.deleteTable())} onclick={() => tableRun((chain) => chain.deleteTable())}><Trash2Icon data-icon="inline-start" />Delete table</button>
    </div>
  {/if}
  {#if selectionMenu.visible}
    <div class="selection-menu absolute z-20 flex items-center gap-1 rounded-lg border border-border bg-popover p-1 shadow-lg" style={`top:${selectionMenu.top}px;left:${selectionMenu.left}px`} role="toolbar" aria-label="Text formatting">
      <button type="button" class="editor-button" class:active={active('bold')} aria-label="Bold selection" title="Bold" onmousedown={(event) => event.preventDefault()} onclick={() => run((chain) => chain.toggleBold())}><BoldIcon size={16} /></button>
      <button type="button" class="editor-button" class:active={active('italic')} aria-label="Italic selection" title="Italic" onmousedown={(event) => event.preventDefault()} onclick={() => run((chain) => chain.toggleItalic())}><ItalicIcon size={16} /></button>
      <button type="button" class="editor-button text-xs font-semibold" class:active={active('heading', { level: 2 })} aria-label="Heading selection" title="Heading" onmousedown={(event) => event.preventDefault()} onclick={() => run((chain) => chain.toggleHeading({ level: 2 }))}>H2</button>
      <button type="button" class="editor-button" class:active={active('bulletList')} aria-label="Bullet list selection" title="Bullet list" onmousedown={(event) => event.preventDefault()} onclick={() => run((chain) => chain.toggleBulletList())}><ListIcon size={16} /></button>
      <button type="button" class="editor-button" class:active={active('orderedList')} aria-label="Numbered list selection" title="Numbered list" onmousedown={(event) => event.preventDefault()} onclick={() => run((chain) => chain.toggleOrderedList())}><ListOrderedIcon size={16} /></button>
    </div>
  {/if}
  {#if suggestionRange && (matchingFields.length || pageBreakMatches)}
    <div class="absolute inset-x-2 top-12 z-10 max-w-sm rounded-lg border border-border bg-popover p-1 shadow-lg" role="listbox" aria-label="Document fields">
      {#if pageBreakMatches}<button type="button" class="field-suggestion" onclick={() => insertPageBreak(suggestionRange)}><span class="font-medium text-foreground">@Page</span><span class="text-xs text-muted-foreground">Insert page break</span></button>{/if}
      {#each matchingFields as field}<button type="button" class="field-suggestion" onclick={() => insertField(field)}><span class="font-medium text-foreground">@{field.label}</span><span class="text-xs text-muted-foreground">{field.fieldKey || field.id}</span></button>{/each}
    </div>
  {/if}
  {#if editor}<EditorContent editor={editor} class="document-template-editor min-h-[42rem] px-8 py-8 text-base leading-8 text-foreground lg:min-h-[54rem] lg:px-14 lg:py-12" />{/if}
</div>

<style>
  .editor-button { display: inline-flex; height: 2rem; min-width: 2rem; align-items: center; justify-content: center; border-radius: 0.375rem; color: hsl(var(--muted-foreground)); }
  .editor-button:hover:not(:disabled), .editor-button.active { background: hsl(var(--accent)); color: hsl(var(--accent-foreground)); }
  .editor-button:disabled { cursor: not-allowed; opacity: 0.4; }
  .table-action { display: inline-flex; min-height: 1.875rem; align-items: center; gap: 0.3rem; border-radius: 0.375rem; padding: 0 0.5rem; color: hsl(var(--muted-foreground)); font-size: 0.75rem; font-weight: 600; }
  .table-action:hover:not(:disabled) { background: hsl(var(--accent)); color: hsl(var(--accent-foreground)); }
  .table-action:disabled { cursor: not-allowed; opacity: 0.4; }
  .table-action-destructive:hover:not(:disabled) { background: hsl(var(--destructive) / 0.1); color: hsl(var(--destructive)); }
  .field-suggestion { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 1rem; border-radius: 0.375rem; padding: 0.5rem 0.625rem; text-align: left; }
  .field-suggestion:hover { background: hsl(var(--accent)); }
  .resource-menu { position: relative; }
  .resource-menu summary { list-style: none; cursor: pointer; }
  .resource-menu summary::-webkit-details-marker { display: none; }
  .resource-popover { position: absolute; z-index: 30; top: 2.5rem; left: 0; width: 18rem; border: 1px solid var(--border); border-radius: 0.5rem; background: var(--popover); padding: 0.75rem; box-shadow: 0 12px 30px color-mix(in oklch, var(--foreground) 16%, transparent); }
  :global(.document-template-editor .tiptap) { min-height: inherit; outline: none; }
  :global(.document-template-editor .tiptap p.is-editor-empty:first-child::before) { float: left; height: 0; color: hsl(var(--muted-foreground)); content: attr(data-placeholder); pointer-events: none; }
  :global(.document-template-editor .tiptap img[data-resource-key]) { display: inline-block; max-width: 100%; height: auto; vertical-align: middle; }
  :global(.document-template-editor .tiptap img[data-resource-key].ProseMirror-selectednode) { outline: 2px solid var(--primary); outline-offset: 3px; }
  :global(.document-template-editor .tiptap h1), :global(.document-template-editor .tiptap h2), :global(.document-template-editor .tiptap h3) { margin: 1.25rem 0 0.75rem; font-weight: 650; line-height: 1.25; }
  :global(.document-template-editor .tiptap h1) { font-size: 2rem; }
  :global(.document-template-editor .tiptap h2) { font-size: 1.5rem; }
  :global(.document-template-editor .tiptap h3) { font-size: 1.25rem; }
  :global(.document-template-editor .tiptap ul), :global(.document-template-editor .tiptap ol) { padding-left: 1.5rem; }
  :global(.document-template-editor .tiptap ul), :global(.document-template-editor .tiptap ol) { margin: 0.75rem 0; padding-left: 1.75rem; }
  :global(.document-template-editor .tiptap ul) { list-style-type: disc; }
  :global(.document-template-editor .tiptap ol) { list-style-type: decimal; }
  :global(.document-template-editor .tiptap ul ul) { list-style-type: circle; }
  :global(.document-template-editor .tiptap li) { padding-left: 0.25rem; }
  :global(.document-template-editor .document-table), :global(.document-template-editor table) { width: 100%; margin: 1rem 0; border: 2px solid color-mix(in oklch, var(--primary) 55%, transparent); border-collapse: collapse; table-layout: fixed; background: var(--background); }
  :global(.document-template-editor .document-table td), :global(.document-template-editor .document-table th), :global(.document-template-editor table td), :global(.document-template-editor table th) { min-width: 5rem; border: 1px solid var(--input); padding: 0.75rem; vertical-align: top; background: color-mix(in oklch, var(--card) 35%, transparent); }
  :global(.document-template-editor .document-table td p), :global(.document-template-editor .document-table th p), :global(.document-template-editor table td p), :global(.document-template-editor table th p) { min-height: 1.5rem; margin: 0; }
  :global(.document-template-editor .document-table th), :global(.document-template-editor table th) { background: var(--muted); font-weight: 650; }
  :global(.document-template-editor .document-table td:hover), :global(.document-template-editor .document-table th:hover), :global(.document-template-editor table td:hover), :global(.document-template-editor table th:hover) { background: color-mix(in oklch, var(--accent) 70%, transparent); }
  :global(.document-template-editor .selectedCell) { background: color-mix(in oklch, var(--primary) 14%, transparent) !important; box-shadow: inset 0 0 0 2px color-mix(in oklch, var(--primary) 55%, transparent); }
  :global(.document-template-editor .column-resize-handle) { width: 4px; background: var(--primary); cursor: col-resize; transition: width 150ms ease, background-color 150ms ease; }
  :global(.document-template-editor .column-resize-handle:hover) { width: 6px; background: var(--primary); }
  :global(.document-template-editor .document-table p) { margin: 0; }
  :global(.document-template-editor .tiptap blockquote) { border-left: 3px solid hsl(var(--border)); padding-left: 1rem; color: hsl(var(--muted-foreground)); }
  :global(.document-field-token) { display: inline-block; border-radius: 0.375rem; background: hsl(var(--primary) / 0.12); padding: 0.05rem 0.4rem; color: hsl(var(--primary)); font-weight: 600; line-height: 1.5; }
  :global(.document-page-break) { display: flex; align-items: center; justify-content: center; min-height: 2rem; margin: 1.5rem 0; border-top: 1px dashed hsl(var(--primary) / 0.55); color: hsl(var(--primary)); }
  :global(.document-page-break)::after { content: 'Page break'; padding: 0 0.5rem; background: hsl(var(--background)); font-size: 0.7rem; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; }
</style>