<script>
  import { onDestroy, onMount } from 'svelte';
  import { Editor, EditorContent } from 'svelte-tiptap';
  import { Mark, Node } from '@tiptap/core';
  import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
  import { TableMap } from '@tiptap/pm/tables';
  import StarterKit from '@tiptap/starter-kit';
  import BoldIcon from '@lucide/svelte/icons/bold';
  import ItalicIcon from '@lucide/svelte/icons/italic';
  import AlignCenterIcon from '@lucide/svelte/icons/align-center';
  import AlignLeftIcon from '@lucide/svelte/icons/align-left';
  import AlignRightIcon from '@lucide/svelte/icons/align-right';
  import MinusIcon from '@lucide/svelte/icons/minus';
  import PlusIcon from '@lucide/svelte/icons/plus';
  import Table2Icon from '@lucide/svelte/icons/table-2';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import ImageIcon from '@lucide/svelte/icons/image';
  import DocumentResourcePicker from '$lib/components/DocumentResourcePicker.svelte';
  import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
  import { Button } from '$lib/components/ui/button/index.js';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import * as Field from '$lib/components/ui/field/index.js';
  import { Input } from '$lib/components/ui/input/index.js';
  import DocumentTemplateEditor from '$lib/components/DocumentTemplateEditor.svelte';
  import { normalizePageConfig, DEFAULT_PAGE_CONFIG } from '$lib/documents/model/page-config.js';
  import { TABLE_COLOR_PALETTE } from '$lib/documents/model/table-cell.js';
  import { paragraphStyleCss, tokenStyleCss } from '$lib/documents/model/token-style.js';
  import { insertInlineToken } from '$lib/documents/model/inline-token-insertion.js';

  let { inline = false, open = $bindable(false), value = DEFAULT_PAGE_CONFIG, content = { type: 'doc', content: [{ type: 'paragraph' }] }, availableFields = [], dateFormat = 'long', onContentChange = null, onEditorReady = null, onTokenSelection = null, onOpenConfiguration = null, onApply = null, onPageConfigChange = null, resources = [], onUploadResource = null, availableVariables = [] } = $props();
  let draft = $state(normalizePageConfig(value));
  let errorMessage = $state('');
  let activeTab = $state(inline ? 'content' : 'spacing');
  let headerEditor = $state();
  let footerEditor = $state();
  let editorRevision = $state(0);
  let suggestionRange = $state(null);
  let suggestionQuery = $state('');
  let suggestionEditor = $state(null);
  let suggestionPosition = $state(null);
  let tableState = $state({ visible: false, selectedColumn: 0, columns: 0, rows: 0, settings: {} });
  const fontSizes = ['8pt', '10pt', '12pt', '14pt', '16pt', '18pt', '24pt', '32pt'];
  const tableCellAttrs = () => ({ widthMode: { default: 'default' }, widthPercent: { default: null }, backgroundColor: { default: null }, textColor: { default: null }, textAlign: { default: 'left' }, verticalAlign: { default: 'top' } });

  const layoutParagraph = Node.create({
    name: 'paragraph',
    group: 'block',
    content: 'inline*',
    addAttributes() {
      return { textAlign: { default: null }, lineHeight: { default: null } };
    },
    parseHTML() { return [{ tag: 'p' }]; },
    renderHTML({ node, HTMLAttributes }) {
      return ['p', { ...HTMLAttributes, style: paragraphStyleCss(node.attrs) }, 0];
    }
  });

  const fontSize = Mark.create({
    name: 'fontSize',
    addAttributes() {
      return { size: { default: null } };
    },
    parseHTML() {
      return [{ tag: 'span[style*="font-size"]' }];
    },
    renderHTML({ HTMLAttributes }) {
      return ['span', { style: `font-size:${HTMLAttributes.size}` }, 0];
    }
  });

  const resourceImage = Node.create({
    name: 'image',
    group: 'inline',
    inline: true,
    draggable: true,
    atom: true,
    addAttributes() { return { resourceKey: { default: null }, alt: { default: '' }, width: { default: null }, widthPx: { default: null }, heightPx: { default: null }, src: { default: null } }; },
    parseHTML() { return [{ tag: 'img[data-resource-key]' }]; },
    renderHTML({ node, HTMLAttributes }) {
      const width = node.attrs.widthPx ? `width:${node.attrs.widthPx}px;` : node.attrs.width ? `width:${node.attrs.width}%;` : 'max-width:100%;';
      const height = node.attrs.heightPx ? `height:${node.attrs.heightPx}px;` : 'height:auto;';
      return ['img', { ...HTMLAttributes, 'data-resource-key': node.attrs.resourceKey, alt: node.attrs.alt || '', src: node.attrs.src || '', style: `${width}${height}display:block` }];
    }
  });

  function createTokenNodeView(node, getPos, editor, prefix, dataName) {
    const dom = document.createElement('span');
    dom.className = 'document-token-node-view';
    dom.setAttribute(`data-${dataName}`, node.attrs.fieldKey || node.attrs.fieldId || node.attrs.variableKey || '');
    dom.style.cssText = tokenStyleCss(node.attrs);
    const label = document.createElement('span');
    const tokenLabel = () => `${prefix}${node.attrs.label || node.attrs.fieldKey || node.attrs.fieldId || node.attrs.variableKey || ''}`;
    label.textContent = tokenLabel();
    dom.append(label);
    const remove = document.createElement('button');
    remove.type = 'button'; remove.className = 'document-token-remove'; remove.textContent = 'x';
    remove.setAttribute('aria-label', `Remove ${tokenLabel()}`);
    remove.addEventListener('mousedown', (event) => event.preventDefault());
    remove.addEventListener('click', () => { if (typeof getPos === 'function') editor.view.dispatch(editor.state.tr.delete(getPos(), getPos() + node.nodeSize)); });
    dom.append(remove);
    return { dom, update(nextNode) { if (nextNode.type !== node.type) return false; node = nextNode; dom.style.cssText = tokenStyleCss(node.attrs); label.textContent = tokenLabel(); return true; } };
  }

  const documentVariable = Node.create({
    name: 'documentVariable',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    addAttributes() { return { variableKey: { default: null }, label: { default: null }, fontSize: { default: null }, textColor: { default: null }, backgroundColor: { default: null }, bold: { default: false }, italic: { default: false }, underline: { default: false }, strike: { default: false } }; },
    parseHTML() { return [{ tag: 'span[data-document-variable]' }]; },
    addNodeView() {
      return ({ node, getPos, editor }) => {
        const dom = document.createElement('span');
        dom.className = 'document-token-node-view';
        dom.dataset.documentVariable = node.attrs.variableKey || '';
        dom.style.cssText = tokenStyleCss(node.attrs);
        const label = document.createElement('span');
        label.textContent = `#${node.attrs.label || node.attrs.variableKey || ''}`;
        dom.append(label);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'document-token-remove';
        remove.setAttribute('aria-label', `Remove ${label.textContent}`);
        remove.textContent = 'x';
        remove.addEventListener('mousedown', (event) => event.preventDefault());
        remove.addEventListener('click', () => {
          if (typeof getPos !== 'function') return;
          editor.view.dispatch(editor.state.tr.delete(getPos(), getPos() + node.nodeSize));
        });
        dom.append(remove);
        return { dom, update(nextNode) { if (nextNode.type !== node.type) return false; node = nextNode; dom.style.cssText = tokenStyleCss(node.attrs); label.textContent = `#${node.attrs.label || node.attrs.variableKey || ''}`; return true; } };
      };
    },
    renderHTML({ node, HTMLAttributes }) { return ['span', { ...HTMLAttributes, 'data-document-variable': node.attrs.variableKey, class: 'document-variable-token', style: tokenStyleCss(node.attrs) }, `#${node.attrs.label || node.attrs.variableKey}`]; }
  });

  const documentField = Node.create({
    name: 'documentField', group: 'inline', inline: true, atom: true, selectable: true,
    addAttributes() { return { fieldId: { default: null }, fieldKey: { default: null }, label: { default: null }, format: { default: null }, fontSize: { default: null }, textColor: { default: null }, backgroundColor: { default: null }, bold: { default: false }, italic: { default: false }, underline: { default: false }, strike: { default: false } }; },
    parseHTML() { return [{ tag: 'span[data-document-field]' }]; },
    addNodeView() { return ({ node, getPos, editor }) => createTokenNodeView(node, getPos, editor, '@', 'document-field'); },
    renderHTML({ node, HTMLAttributes }) { return ['span', { ...HTMLAttributes, 'data-document-field': node.attrs.fieldKey || node.attrs.fieldId, class: 'document-field-token', style: tokenStyleCss(node.attrs) }, `@${node.attrs.label || node.attrs.fieldKey || node.attrs.fieldId}`]; }
  });

  function updateTokenSelection(editor, clearWhenUnselected = true, lineHeightOverride) {
    const selection = editor?.state.selection;
    const node = selection?.node;
    if (!node || !['documentField', 'documentVariable', 'image'].includes(node.type.name)) {
      if (clearWhenUnselected) onTokenSelection?.(null);
      return;
    }
    let alignment = 'left';
    for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
      const parent = selection.$from.node(depth);
      if (['paragraph', 'heading'].includes(parent.type.name)) { alignment = parent.attrs.textAlign || 'left'; break; }
    }
    let lineHeight = lineHeightOverride;
    if (lineHeight === undefined) {
      lineHeight = null;
      for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
        const parent = selection.$from.node(depth);
        if (['paragraph', 'heading'].includes(parent.type.name)) { lineHeight = parent.attrs.lineHeight || null; break; }
      }
    }
    const position = selection.from;
    const selectionData = { type: node.type.name, attrs: { ...node.attrs }, alignment, lineHeight, update: (attrs) => {
      const current = editor.state.doc.nodeAt(position);
      if (!current) return;
      editor.view.dispatch(editor.state.tr.setNodeMarkup(position, current.type, { ...current.attrs, ...attrs }));
    }, align: (nextAlignment) => {
      const transaction = editor.state.tr;
      for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
        const parent = selection.$from.node(depth);
        if (['paragraph', 'heading'].includes(parent.type.name)) { transaction.setNodeMarkup(selection.$from.before(depth), parent.type, { ...parent.attrs, textAlign: nextAlignment }); break; }
      }
      editor.view.dispatch(transaction);
    }, lineHeight: (nextLineHeight) => {
      const transaction = editor.state.tr;
      for (let depth = selection.$from.depth; depth > 0; depth -= 1) {
        const parent = selection.$from.node(depth);
        if (['paragraph', 'heading'].includes(parent.type.name)) { transaction.setNodeMarkup(selection.$from.before(depth), parent.type, { ...parent.attrs, lineHeight: nextLineHeight }); break; }
      }
      editor.view.dispatch(transaction);
      selectionData.lineHeight = nextLineHeight;
      onTokenSelection?.({ ...selectionData });
    } };
    onTokenSelection?.(selectionData);
  }

  function createEditor() {
    const StyledTableCell = TableCell.extend({ addAttributes() { return { ...this.parent?.(), ...tableCellAttrs() }; } });
    const StyledTableHeader = TableHeader.extend({ addAttributes() { return { ...this.parent?.(), ...tableCellAttrs() }; } });
    return new Editor({
      extensions: [StarterKit.configure({ paragraph: false, heading: false, bulletList: false, orderedList: false, blockquote: false, codeBlock: false, horizontalRule: false }), layoutParagraph, fontSize, resourceImage, documentField, documentVariable, Table.configure({ resizable: false, HTMLAttributes: { class: 'page-layout-table' } }), TableRow, StyledTableHeader, StyledTableCell],
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      onUpdate: ({ editor }) => {
        const next = toDocumentContent(editor.getJSON());
        if (editor === headerEditor) draft.header = next;
        if (editor === footerEditor) draft.footer = next;
        onPageConfigChange?.(normalizePageConfig(draft));
        editorRevision += 1;
        updateSuggestion(editor);
        updateTableState(editor);
      },
      onCreate: ({ editor }) => updateTableState(editor),
      onSelectionUpdate: ({ editor }) => { updateSuggestion(editor); updateTokenSelection(editor); updateTableState(editor); },
      onTransaction: ({ editor }) => { updateTokenSelection(editor, false); updateTableState(editor); }
    });
  }

  function loadDraft() {
    draft = normalizePageConfig(value);
    errorMessage = '';
    activeTab = inline ? 'content' : 'spacing';
    headerEditor?.commands.setContent(toEditorContent(draft.header), false);
    footerEditor?.commands.setContent(toEditorContent(draft.footer), false);
  }

  function updateMargin(side, event) {
    draft.margins = { ...draft.margins, [side]: event.currentTarget.value };
  }

  function activeEditor() {
    return activeTab === 'header' ? headerEditor : footerEditor;
  }

  function updateTableState(editor) {
    if (!editor) {
      tableState = { visible: false, selectedColumn: 0, columns: 0, rows: 0, settings: {} };
      return;
    }
    const selection = editor.state.selection.$from;
    for (let depth = selection.depth; depth > 0; depth -= 1) {
      const table = selection.node(depth);
      if (table.type.name !== 'table') continue;
      const tableStart = selection.start(depth);
      const map = TableMap.get(table);
      const cellDepth = findCellDepth(selection, depth);
      const cellPosition = cellDepth ? selection.before(cellDepth) : null;
      const cell = cellPosition === null ? null : map.findCell(cellPosition - tableStart);
      const selectedCell = cellDepth ? selection.node(cellDepth) : null;
      tableState = { visible: true, selectedColumn: cell?.left ?? 0, columns: map.width, rows: map.height, settings: selectedCell?.attrs || {} };
      return;
    }
    tableState = { visible: false, selectedColumn: 0, columns: 0, rows: 0, settings: {} };
  }

  function findCellDepth(resolvedSelection, tableDepth) {
    for (let depth = resolvedSelection.depth; depth > tableDepth; depth -= 1) {
      const typeName = resolvedSelection.node(depth).type.name;
      if (typeName === 'tableCell' || typeName === 'tableHeader') return depth;
    }
    return null;
  }

  function applyTableSetting(name, value) {
    const editor = activeEditor();
    if (!editor || !tableState.visible) return;
    const selection = editor.state.selection.$from;
    for (let depth = selection.depth; depth > 0; depth -= 1) {
      const table = selection.node(depth);
      if (table.type.name !== 'table') continue;
      const tableStart = selection.start(depth);
      const map = TableMap.get(table);
      const cellDepth = findCellDepth(selection, depth);
      const cellPosition = cellDepth ? selection.before(cellDepth) : null;
      const cell = cellPosition === null ? null : map.findCell(cellPosition - tableStart);
      if (!cell) return;
      const transaction = editor.state.tr;
      const positions = new Set();
      for (let column = cell.left; column < cell.right; column += 1) for (let row = 0; row < map.height; row += 1) positions.add(map.map[row * map.width + column]);
      for (const position of positions) {
        const node = editor.state.doc.nodeAt(tableStart + position);
        if (!node) continue;
        const attrs = { ...node.attrs, [name]: value };
        if (name === 'widthMode' && value !== 'custom') attrs.widthPercent = null;
        transaction.setNodeMarkup(tableStart + position, node.type, attrs);
      }
      editor.view.dispatch(transaction);
      editorRevision += 1;
      updateTableState(editor);
      return;
    }
  }

  function resetTableColumn() {
    for (const [name, value] of Object.entries({ widthMode: 'default', widthPercent: null, backgroundColor: null, textColor: null, textAlign: 'left', verticalAlign: 'top' })) applyTableSetting(name, value);
  }

  function runEditor(command) {
    const editor = activeEditor();
    if (!editor) return;
    command(editor.chain().focus()).run();
    editorRevision += 1;
  }

  function canEditor(command) {
    editorRevision;
    const editor = activeEditor();
    return editor ? command(editor.can().chain().focus()) : false;
  }

  function setAlignment(alignment) {
    runEditor((chain) => chain.updateAttributes('paragraph', { textAlign: alignment }));
  }

  function insertLayoutTable() {
    runEditor((chain) => chain.insertTable({ rows: 1, cols: 2, withHeaderRow: false }));
  }

  function toEditorContent(value) {
    if (!value || typeof value !== 'object') return { type: 'doc', content: [{ type: 'paragraph' }] };
    const node = { ...value };
    if (node.type === 'document_variable') node.type = 'documentVariable';
    if (node.type === 'document_field') node.type = 'documentField';
    if (node.type === 'image') node.attrs = { ...node.attrs, src: resources.find((resource) => resource.resourceKey === node.attrs?.resourceKey)?.url || '' };
    if (Array.isArray(node.content)) node.content = node.content.map(toEditorContent);
    return node;
  }

  function toDocumentContent(value) {
    if (!value || typeof value !== 'object') return value;
    const node = { ...value };
    if (node.type === 'documentVariable') node.type = 'document_variable';
    if (node.type === 'documentField') node.type = 'document_field';
    if (Array.isArray(node.content)) node.content = node.content.map(toDocumentContent);
    return node;
  }

  function insertImage(resource) {
    const editor = activeEditor();
    if (!editor || !resource) return;
    const alt = window.prompt('Describe this image', resource.name) ?? resource.name;
    const widthInput = window.prompt('Image width as a percentage (1-100)', '100');
    const width = widthInput === null || widthInput.trim() === '' ? null : Math.min(100, Math.max(1, Number(widthInput)));
    if (widthInput !== null && width !== null && !Number.isFinite(width)) return;
    editor.chain().focus().insertContent({ type: 'image', attrs: { resourceKey: resource.resourceKey, alt: alt.trim().slice(0, 240), width, src: resource.url } }).run();
    editorRevision += 1;
  }

  function updateSuggestion(editor) {
    if (!editor.isFocused) return;
    const { from } = editor.state.selection;
    const beforeCursor = editor.state.doc.textBetween(Math.max(0, from - 80), from, '\n', '\0');
    const match = beforeCursor.match(/#([a-zA-Z0-9_]*)?$/);
    if (!match) {
      suggestionRange = null;
      suggestionQuery = '';
      suggestionEditor = null;
      suggestionPosition = null;
      return;
    }
    const host = editor.view.dom.closest('.page-config-editor-host');
    const cursor = host ? editor.view.coordsAtPos(from) : null;
    const hostRect = host?.getBoundingClientRect();
    suggestionRange = { from: from - match[0].length, to: from };
    suggestionQuery = match[1] || '';
    suggestionEditor = editor;
    suggestionPosition = cursor && hostRect ? { top: cursor.bottom - hostRect.top + 6, left: cursor.left - hostRect.left } : null;
  }

  function insertVariable(variable) {
    const editor = suggestionEditor || activeEditor();
    if (!editor || !variable) return;
    const target = suggestionRange || { from: editor.state.selection.from, to: editor.state.selection.to };
    insertInlineToken(editor, target, { type: 'documentVariable', attrs: { variableKey: variable.key, label: variable.label || variable.key } });
    suggestionRange = null;
    suggestionQuery = '';
    suggestionEditor = null;
    suggestionPosition = null;
    editorRevision += 1;
  }

  function insertField(field) {
    const editor = activeEditor();
    if (!editor || !field) return;
    const target = suggestionRange && suggestionEditor === editor ? suggestionRange : { from: editor.state.selection.from, to: editor.state.selection.to };
    insertInlineToken(editor, target, { type: 'documentField', attrs: { fieldId: field.id || null, fieldKey: field.fieldKey || field.id, label: field.label || field.fieldKey || field.id, ...(field.type === 'date' ? { format: dateFormat } : {}) } });
    editorRevision += 1;
  }

  function handleEditorKeydown(event) {
    if (event.key === 'Escape') { suggestionRange = null; suggestionQuery = ''; suggestionEditor = null; suggestionPosition = null; return; }
    const match = availableVariables.find((variable) => `${variable.label} ${variable.key}`.toLowerCase().includes(suggestionQuery.toLowerCase()));
    if (event.key === 'Enter' && suggestionRange && match) { event.preventDefault(); insertVariable(match); }
  }

  function setFontSize(size) {
    runEditor((chain) => size ? chain.setMark('fontSize', { size }) : chain.unsetMark('fontSize'));
  }

  function reset() {
    draft = normalizePageConfig(DEFAULT_PAGE_CONFIG);
    headerEditor?.commands.setContent(toEditorContent(draft.header), false);
    footerEditor?.commands.setContent(toEditorContent(draft.footer), false);
    errorMessage = '';
  }

  function apply() {
    const normalized = normalizePageConfig(draft);
    const margins = Object.values(normalized.margins);
    if (margins.some((margin) => margin < 0 || margin > 4)) {
      errorMessage = 'Margins must be between 0 and 4 inches.';
      return;
    }
    onApply?.(normalized);
    open = false;
  }

  onMount(() => {
    if (inline) {
      headerEditor = createEditor();
      footerEditor = createEditor();
      loadDraft();
    }
  });

  onDestroy(() => {
    headerEditor?.destroy();
    footerEditor?.destroy();
  });
</script>

{#snippet canvasBody()}
    <div class="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
      {#if inline}
        <div class="flex gap-1 border-b border-border" role="tablist" aria-label="Document canvas sections">
          {#each [['content', 'Content'], ['header', 'Header'], ['footer', 'Footer']] as [tab, label]}
            <button type="button" id={`${tab}-tab`} role="tab" aria-selected={activeTab === tab} class:active-tab={activeTab === tab} class="config-tab" onclick={() => { activeTab = tab; suggestionRange = null; suggestionQuery = ''; suggestionEditor = null; suggestionPosition = null; updateTableState(tab === 'header' ? headerEditor : footerEditor); }}>{label}{#if tab === 'header' || tab === 'footer'}<span class="tab-status">optional</span>{/if}</button>
          {/each}
        </div>
      {/if}

      {#if inline}
        <section class="min-w-0" role="tabpanel" aria-labelledby="content-tab" hidden={activeTab !== 'content'}>
          <div class="mb-3">
            <p class="text-sm text-muted-foreground">Type @ for a field or # for a global variable.</p>
          </div>
          <DocumentTemplateEditor
            {content}
            {availableFields}
            {availableVariables}
            {dateFormat}
            onChange={onContentChange}
            onEditorReady={onEditorReady}
            onTokenSelection={onTokenSelection}
            onOpenConfiguration={() => onOpenConfiguration?.()}
            {resources}
            onUploadResource={onUploadResource}
          />
        </section>
      {/if}

      {#if !inline}
        <section role="tabpanel" aria-labelledby="spacing-tab">
          <Field.FieldGroup>
            <Field.Field>
              <Field.Label>Page margins</Field.Label>
              <Field.Description>Measured in inches. These settings are saved with the next document version.</Field.Description>
              <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {#each [['top', 'Top'], ['right', 'Right'], ['bottom', 'Bottom'], ['left', 'Left']] as [side, label]}
                  <Field.Field>
                    <Field.Label for={`margin-${side}`}>{label}</Field.Label>
                    <Input id={`margin-${side}`} type="number" min="0" max="4" step="0.05" value={draft.margins[side]} oninput={(event) => updateMargin(side, event)} />
                  </Field.Field>
                {/each}
              </div>
            </Field.Field>
          </Field.FieldGroup>
        </section>
      {/if}

      {#if inline}<section class="flex min-w-0 flex-col gap-2" role="tabpanel" aria-labelledby="header-tab" hidden={activeTab !== 'header'}>
          <div>
            <h3 class="text-sm font-semibold text-foreground">Header</h3>
            <p class="text-xs text-muted-foreground">Optional rich text shown at the top of printed pages.</p>
          </div>
          <div class="rounded-xl border border-border bg-background">
            <div class="flex flex-wrap items-center gap-1 border-b border-border p-1">
              <button type="button" class="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground" aria-label="Bold header text" onclick={() => headerEditor?.chain().focus().toggleBold().run()}><BoldIcon size={16} /></button>
              <button type="button" class="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground" aria-label="Italic header text" onclick={() => headerEditor?.chain().focus().toggleItalic().run()}><ItalicIcon size={16} /></button>
              <select class="font-size-select" aria-label="Header font size" title="Font size" onchange={(event) => setFontSize(event.currentTarget.value)}>
                <option value="">Font size</option>
                {#each fontSizes as size}<option value={size}>{size}</option>{/each}
              </select>
              <details class="resource-menu"><summary class="layout-tool" aria-label="Insert header image" title="Insert image"><ImageIcon size={16} /></summary><div class="resource-popover"><DocumentResourcePicker {resources} onUpload={onUploadResource} onSelect={insertImage} /></div></details>
              <details class="resource-menu"><summary class="layout-tool" aria-label="Insert header field" title="Insert field">@</summary><div class="resource-popover variable-popover">{#each availableFields as field}<button type="button" class="variable-choice" onmousedown={(event) => event.preventDefault()} onclick={() => insertField(field)}>@{field.label}<span>{field.fieldKey || field.id}</span></button>{/each}</div></details>
              <details class="resource-menu"><summary class="layout-tool" aria-label="Insert header variable" title="Insert global variable">#</summary><div class="resource-popover variable-popover">{#each availableVariables as variable}<button type="button" class="variable-choice" onmousedown={(event) => event.preventDefault()} onclick={() => insertVariable(variable)}>#{variable.label}<span>{variable.key}</span></button>{/each}</div></details>
              <span class="mx-1 h-5 w-px bg-border"></span>
              <button type="button" class="layout-tool" aria-label="Align header text left" title="Align left" disabled={!canEditor((chain) => chain.updateAttributes('paragraph', { textAlign: 'left' }))} onclick={() => setAlignment('left')}><AlignLeftIcon size={16} /></button>
              <button type="button" class="layout-tool" aria-label="Center header text" title="Align center" disabled={!canEditor((chain) => chain.updateAttributes('paragraph', { textAlign: 'center' }))} onclick={() => setAlignment('center')}><AlignCenterIcon size={16} /></button>
              <button type="button" class="layout-tool" aria-label="Align header text right" title="Align right" disabled={!canEditor((chain) => chain.updateAttributes('paragraph', { textAlign: 'right' }))} onclick={() => setAlignment('right')}><AlignRightIcon size={16} /></button>
              <span class="mx-1 h-5 w-px bg-border"></span>
              <button type="button" class="layout-tool" aria-label="Insert header layout table" title="Insert layout table" onclick={insertLayoutTable}><Table2Icon size={16} /></button>
              <button type="button" class="layout-tool" aria-label="Add layout table row" title="Add row" disabled={!canEditor((chain) => chain.addRowAfter())} onclick={() => runEditor((chain) => chain.addRowAfter())}><PlusIcon size={16} /></button>
              <button type="button" class="layout-tool" aria-label="Remove layout table row" title="Remove row" disabled={!canEditor((chain) => chain.deleteRow())} onclick={() => runEditor((chain) => chain.deleteRow())}><MinusIcon size={16} /></button>
              <button type="button" class="layout-tool" aria-label="Add layout table column" title="Add column" disabled={!canEditor((chain) => chain.addColumnAfter())} onclick={() => runEditor((chain) => chain.addColumnAfter())}><PlusIcon size={16} /></button>
              <button type="button" class="layout-tool" aria-label="Remove layout table column" title="Remove column" disabled={!canEditor((chain) => chain.deleteColumn())} onclick={() => runEditor((chain) => chain.deleteColumn())}><MinusIcon size={16} /></button>
              <button type="button" class="layout-tool layout-tool-destructive" aria-label="Delete layout table" title="Delete layout table" disabled={!canEditor((chain) => chain.deleteTable())} onclick={() => runEditor((chain) => chain.deleteTable())}><Trash2Icon size={16} /></button>
              {#if tableState.visible && activeTab === 'header'}
                <details class="table-settings-menu"><summary class="layout-tool" aria-label="Configure header table column" title="Configure table column">Column {tableState.selectedColumn + 1}</summary><div class="table-settings-popover"><strong>Column {tableState.selectedColumn + 1}</strong><label>Width<select value={tableState.settings.widthMode || 'default'} onchange={(event) => applyTableSetting('widthMode', event.currentTarget.value)}><option value="default">Default</option><option value="fill">Fill</option><option value="custom">Custom %</option></select></label>{#if tableState.settings.widthMode === 'custom'}<label>Width %<input type="number" min="5" max="100" value={tableState.settings.widthPercent || 50} oninput={(event) => applyTableSetting('widthPercent', Math.min(100, Math.max(5, Number(event.currentTarget.value) || 5)))} /></label>{/if}<label>Background<select value={tableState.settings.backgroundColor || ''} onchange={(event) => applyTableSetting('backgroundColor', event.currentTarget.value || null)}><option value="">Default</option>{#each Object.entries(TABLE_COLOR_PALETTE) as [key, color]}<option value={key}>{key}</option>{/each}</select></label><label>Text color<select value={tableState.settings.textColor || ''} onchange={(event) => applyTableSetting('textColor', event.currentTarget.value || null)}><option value="">Default</option>{#each Object.entries(TABLE_COLOR_PALETTE) as [key, color]}<option value={key}>{key}</option>{/each}</select></label><label>Horizontal<select value={tableState.settings.textAlign || 'left'} onchange={(event) => applyTableSetting('textAlign', event.currentTarget.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select></label><label>Vertical<select value={tableState.settings.verticalAlign || 'top'} onchange={(event) => applyTableSetting('verticalAlign', event.currentTarget.value)}><option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option></select></label><button type="button" class="layout-tool" onclick={resetTableColumn}><RotateCcwIcon size={14} />Reset</button></div></details>
              {/if}
            </div>
              {#if headerEditor}<div class="page-config-editor-host" onkeydown={handleEditorKeydown}><EditorContent editor={headerEditor} class="page-config-editor min-h-[42rem] px-3 py-2 text-sm lg:min-h-[54rem]" />{#if suggestionEditor === headerEditor && suggestionRange}<div class="variable-suggestions" style={`top:${suggestionPosition?.top || 0}px;left:${suggestionPosition?.left || 0}px`}>{#each availableVariables.filter((variable) => `${variable.label} ${variable.key}`.toLowerCase().includes(suggestionQuery.toLowerCase())).slice(0, 6) as variable}<button type="button" class="variable-choice" onclick={() => insertVariable(variable)}>#{variable.label}<span>{variable.key}</span></button>{/each}</div>{/if}</div>{/if}
          </div>
      </section>{/if}

      {#if inline}<section class="flex min-w-0 flex-col gap-2" role="tabpanel" aria-labelledby="footer-tab" hidden={activeTab !== 'footer'}>
          <div>
            <h3 class="text-sm font-semibold text-foreground">Footer</h3>
            <p class="text-xs text-muted-foreground">Optional rich text shown at the bottom of printed pages.</p>
          </div>
          <div class="rounded-xl border border-border bg-background">
            <div class="flex flex-wrap items-center gap-1 border-b border-border p-1">
              <button type="button" class="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground" aria-label="Bold footer text" onclick={() => footerEditor?.chain().focus().toggleBold().run()}><BoldIcon size={16} /></button>
              <button type="button" class="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground" aria-label="Italic footer text" onclick={() => footerEditor?.chain().focus().toggleItalic().run()}><ItalicIcon size={16} /></button>
              <select class="font-size-select" aria-label="Footer font size" title="Font size" onchange={(event) => setFontSize(event.currentTarget.value)}>
                <option value="">Font size</option>
                {#each fontSizes as size}<option value={size}>{size}</option>{/each}
              </select>
              <details class="resource-menu"><summary class="layout-tool" aria-label="Insert footer image" title="Insert image"><ImageIcon size={16} /></summary><div class="resource-popover"><DocumentResourcePicker {resources} onUpload={onUploadResource} onSelect={insertImage} /></div></details>
              <details class="resource-menu"><summary class="layout-tool" aria-label="Insert footer field" title="Insert field">@</summary><div class="resource-popover variable-popover">{#each availableFields as field}<button type="button" class="variable-choice" onmousedown={(event) => event.preventDefault()} onclick={() => insertField(field)}>@{field.label}<span>{field.fieldKey || field.id}</span></button>{/each}</div></details>
              <details class="resource-menu"><summary class="layout-tool" aria-label="Insert footer variable" title="Insert global variable">#</summary><div class="resource-popover variable-popover">{#each availableVariables as variable}<button type="button" class="variable-choice" onmousedown={(event) => event.preventDefault()} onclick={() => insertVariable(variable)}>#{variable.label}<span>{variable.key}</span></button>{/each}</div></details>
              <span class="mx-1 h-5 w-px bg-border"></span>
              <button type="button" class="layout-tool" aria-label="Align footer text left" title="Align left" disabled={!canEditor((chain) => chain.updateAttributes('paragraph', { textAlign: 'left' }))} onclick={() => setAlignment('left')}><AlignLeftIcon size={16} /></button>
              <button type="button" class="layout-tool" aria-label="Center footer text" title="Align center" disabled={!canEditor((chain) => chain.updateAttributes('paragraph', { textAlign: 'center' }))} onclick={() => setAlignment('center')}><AlignCenterIcon size={16} /></button>
              <button type="button" class="layout-tool" aria-label="Align footer text right" title="Align right" disabled={!canEditor((chain) => chain.updateAttributes('paragraph', { textAlign: 'right' }))} onclick={() => setAlignment('right')}><AlignRightIcon size={16} /></button>
              <span class="mx-1 h-5 w-px bg-border"></span>
              <button type="button" class="layout-tool" aria-label="Insert footer layout table" title="Insert layout table" onclick={insertLayoutTable}><Table2Icon size={16} /></button>
              <button type="button" class="layout-tool" aria-label="Add layout table row" title="Add row" disabled={!canEditor((chain) => chain.addRowAfter())} onclick={() => runEditor((chain) => chain.addRowAfter())}><PlusIcon size={16} /></button>
              <button type="button" class="layout-tool" aria-label="Remove layout table row" title="Remove row" disabled={!canEditor((chain) => chain.deleteRow())} onclick={() => runEditor((chain) => chain.deleteRow())}><MinusIcon size={16} /></button>
              <button type="button" class="layout-tool" aria-label="Add layout table column" title="Add column" disabled={!canEditor((chain) => chain.addColumnAfter())} onclick={() => runEditor((chain) => chain.addColumnAfter())}><PlusIcon size={16} /></button>
              <button type="button" class="layout-tool" aria-label="Remove layout table column" title="Remove column" disabled={!canEditor((chain) => chain.deleteColumn())} onclick={() => runEditor((chain) => chain.deleteColumn())}><MinusIcon size={16} /></button>
              <button type="button" class="layout-tool layout-tool-destructive" aria-label="Delete layout table" title="Delete layout table" disabled={!canEditor((chain) => chain.deleteTable())} onclick={() => runEditor((chain) => chain.deleteTable())}><Trash2Icon size={16} /></button>
              {#if tableState.visible && activeTab === 'footer'}
                <details class="table-settings-menu"><summary class="layout-tool" aria-label="Configure footer table column" title="Configure table column">Column {tableState.selectedColumn + 1}</summary><div class="table-settings-popover"><strong>Column {tableState.selectedColumn + 1}</strong><label>Width<select value={tableState.settings.widthMode || 'default'} onchange={(event) => applyTableSetting('widthMode', event.currentTarget.value)}><option value="default">Default</option><option value="fill">Fill</option><option value="custom">Custom %</option></select></label>{#if tableState.settings.widthMode === 'custom'}<label>Width %<input type="number" min="5" max="100" value={tableState.settings.widthPercent || 50} oninput={(event) => applyTableSetting('widthPercent', Math.min(100, Math.max(5, Number(event.currentTarget.value) || 5)))} /></label>{/if}<label>Background<select value={tableState.settings.backgroundColor || ''} onchange={(event) => applyTableSetting('backgroundColor', event.currentTarget.value || null)}><option value="">Default</option>{#each Object.entries(TABLE_COLOR_PALETTE) as [key, color]}<option value={key}>{key}</option>{/each}</select></label><label>Text color<select value={tableState.settings.textColor || ''} onchange={(event) => applyTableSetting('textColor', event.currentTarget.value || null)}><option value="">Default</option>{#each Object.entries(TABLE_COLOR_PALETTE) as [key, color]}<option value={key}>{key}</option>{/each}</select></label><label>Horizontal<select value={tableState.settings.textAlign || 'left'} onchange={(event) => applyTableSetting('textAlign', event.currentTarget.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option><option value="justify">Justify</option></select></label><label>Vertical<select value={tableState.settings.verticalAlign || 'top'} onchange={(event) => applyTableSetting('verticalAlign', event.currentTarget.value)}><option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option></select></label><button type="button" class="layout-tool" onclick={resetTableColumn}><RotateCcwIcon size={14} />Reset</button></div></details>
              {/if}
            </div>
              {#if footerEditor}<div class="page-config-editor-host" onkeydown={handleEditorKeydown}><EditorContent editor={footerEditor} class="page-config-editor min-h-[42rem] px-3 py-2 text-sm lg:min-h-[54rem]" />{#if suggestionEditor === footerEditor && suggestionRange}<div class="variable-suggestions" style={`top:${suggestionPosition?.top || 0}px;left:${suggestionPosition?.left || 0}px`}>{#each availableVariables.filter((variable) => `${variable.label} ${variable.key}`.toLowerCase().includes(suggestionQuery.toLowerCase())).slice(0, 6) as variable}<button type="button" class="variable-choice" onclick={() => insertVariable(variable)}>#{variable.label}<span>{variable.key}</span></button>{/each}</div>{/if}</div>{/if}
          </div>
      </section>{/if}
    </div>

    {#if errorMessage}<p class="text-sm text-destructive" role="alert">{errorMessage}</p>{/if}
    {#if !inline}<Dialog.Footer>
      <Button variant="outline" onclick={reset}><RotateCcwIcon data-icon="inline-start" />Reset</Button>
      <Dialog.Close><Button variant="outline">Cancel</Button></Dialog.Close>
      <Button onclick={apply}>Apply configurations</Button>
    </Dialog.Footer>{/if}
{/snippet}

{#if inline}
  <div class="document-canvas-inline">
    <div class="mb-4">
      <h2 class="text-lg font-semibold text-foreground">Document canvas</h2>
      <p class="text-sm text-muted-foreground">Edit the document body, optional header, and optional footer from one focused workspace.</p>
    </div>
    {@render canvasBody()}
  </div>
{:else}
  <Dialog.Root bind:open onOpenChange={(nextOpen) => { if (nextOpen) loadDraft(); }}>
    <Dialog.Content class="!w-[min(94vw,760px)] !max-w-[760px]">
      <Dialog.Header>
        <Dialog.Title>Document configurations</Dialog.Title>
        <Dialog.Description>Set print margins for each document page.</Dialog.Description>
      </Dialog.Header>
      {@render canvasBody()}
    </Dialog.Content>
  </Dialog.Root>
{/if}

<style>
  .config-tab { display: inline-flex; align-items: center; gap: 0.35rem; border-bottom: 2px solid transparent; padding: 0.625rem 0.75rem; color: var(--muted-foreground); font-size: 0.875rem; font-weight: 600; }
  .config-tab:hover, .config-tab.active-tab { border-bottom-color: var(--primary); color: var(--foreground); }
  .tab-status { color: var(--muted-foreground); font-size: 0.65rem; font-weight: 500; }
  .layout-tool { display: inline-flex; align-items: center; justify-content: center; border-radius: 0.375rem; padding: 0.5rem; color: var(--muted-foreground); }
  .layout-tool:hover:not(:disabled) { background: var(--accent); color: var(--accent-foreground); }
  .layout-tool:disabled { cursor: not-allowed; opacity: 0.35; }
  .layout-tool-destructive:hover:not(:disabled) { background: color-mix(in oklch, var(--destructive) 12%, transparent); color: var(--destructive); }
  .table-settings-menu { position: relative; }
  .table-settings-menu summary { cursor: pointer; list-style: none; }
  .table-settings-menu summary::-webkit-details-marker { display: none; }
  .table-settings-popover { position: absolute; z-index: 40; top: 2.25rem; left: 0; display: grid; width: 14rem; gap: 0.5rem; border: 1px solid var(--border); border-radius: 0.5rem; background: var(--popover); padding: 0.7rem; box-shadow: 0 12px 30px color-mix(in oklch, var(--foreground) 16%, transparent); color: var(--foreground); font-size: 0.75rem; }
  .table-settings-popover label { display: grid; gap: 0.25rem; color: var(--muted-foreground); font-weight: 600; }
  .table-settings-popover select, .table-settings-popover input { min-height: 1.8rem; border: 1px solid var(--input); border-radius: 0.35rem; background: var(--background); padding: 0 0.4rem; color: var(--foreground); font-size: 0.75rem; }
  .font-size-select { height: 2rem; border: 1px solid var(--input); border-radius: 0.375rem; background: var(--background); padding: 0 0.5rem; color: var(--foreground); font-size: 0.75rem; }
  .resource-menu { position: relative; }
  .resource-menu summary { list-style: none; cursor: pointer; }
  .resource-menu summary::-webkit-details-marker { display: none; }
  .resource-popover { position: absolute; z-index: 30; top: 2.5rem; left: 0; width: 18rem; border: 1px solid var(--border); border-radius: 0.5rem; background: var(--popover); padding: 0.75rem; box-shadow: 0 12px 30px color-mix(in oklch, var(--foreground) 16%, transparent); }
  .variable-popover { display: flex; flex-direction: column; gap: 0.25rem; max-height: 16rem; overflow-y: auto; }
  .variable-choice { display: flex; width: 100%; justify-content: space-between; gap: 1rem; border-radius: 0.375rem; padding: 0.5rem; text-align: left; color: var(--foreground); font-size: 0.8rem; }
  .variable-choice:hover { background: var(--accent); }
  .variable-choice span { color: var(--muted-foreground); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.7rem; }
  .variable-suggestions { position: absolute; z-index: 20; width: min(20rem, calc(100% - 1rem)); border: 1px solid var(--border); border-radius: 0.5rem; background: var(--popover); padding: 0.25rem; box-shadow: 0 10px 25px color-mix(in oklch, var(--foreground) 14%, transparent); }
  .page-config-editor-host { position: relative; overflow: visible; }
  :global(.page-config-editor .tiptap) { min-height: 5rem; outline: none; }
  :global(.page-config-editor .tiptap p) { margin: 0; }
  :global(.page-config-editor .tiptap img[data-resource-key]) { display: inline-block; max-width: 100%; height: auto; vertical-align: middle; }
  :global(.page-config-editor .tiptap img[data-resource-key].ProseMirror-selectednode) { outline: 2px solid var(--primary); outline-offset: 3px; }
  :global(.page-config-editor .tiptap .document-variable-token) { display: inline-block; border-radius: 0.25rem; background: color-mix(in oklch, var(--primary) 12%, transparent); color: var(--primary); padding: 0 0.2rem; }
  :global(.page-config-editor .tiptap .document-token-node-view) { display: inline-flex; align-items: center; gap: 0.2rem; border: 1px solid color-mix(in oklch, var(--primary) 58%, var(--border)); border-radius: 0.25rem; background: color-mix(in oklch, var(--accent) 78%, var(--primary) 22%); color: var(--accent-foreground); padding: 0 0.2rem 0 0.35rem; font-weight: 700; line-height: 1.5; white-space: nowrap; box-shadow: 0 1px 2px color-mix(in oklch, var(--primary) 18%, transparent); }
  :global(.page-config-editor .tiptap .document-token-remove) { display: inline-flex; height: 1rem; width: 1rem; align-items: center; justify-content: center; border-radius: 999px; color: currentColor; font-size: 0.75rem; line-height: 1; }
  :global(.page-config-editor .tiptap .document-token-remove:hover) { background: color-mix(in oklch, var(--primary) 24%, transparent); }
  :global(.page-config-editor .page-layout-table) { width: 100%; border-collapse: collapse; border: 1px solid var(--input); table-layout: fixed; }
  :global(.page-config-editor .page-layout-table td), :global(.page-config-editor .page-layout-table th) { min-width: 4rem; border: 1px dashed var(--input); padding: 0.35rem; background: color-mix(in oklch, var(--muted) 25%, transparent); vertical-align: top; }
  :global(.page-config-editor .page-layout-table td:hover), :global(.page-config-editor .page-layout-table th:hover) { background: color-mix(in oklch, var(--accent) 60%, transparent); }
  :global(.page-config-editor .selectedCell) { background: color-mix(in oklch, var(--primary) 14%, transparent) !important; box-shadow: inset 0 0 0 2px color-mix(in oklch, var(--primary) 55%, transparent); }
</style>
