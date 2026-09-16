<script>
  import { onDestroy, onMount } from 'svelte';
  import { Editor, EditorContent } from 'svelte-tiptap';
  import { Mark, Node } from '@tiptap/core';
  import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
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
  import { normalizePageConfig, DEFAULT_PAGE_CONFIG } from '$lib/documents/model/page-config.js';

  let { open = $bindable(false), value = DEFAULT_PAGE_CONFIG, onApply = null, resources = [], onUploadResource = null } = $props();
  let draft = $state(normalizePageConfig(value));
  let errorMessage = $state('');
  let activeTab = $state('spacing');
  let headerEditor = $state();
  let footerEditor = $state();
  let editorRevision = $state(0);
  const fontSizes = ['10pt', '12pt', '14pt', '16pt', '18pt', '24pt', '32pt'];

  const layoutParagraph = Node.create({
    name: 'paragraph',
    group: 'block',
    content: 'inline*',
    addAttributes() {
      return { textAlign: { default: null } };
    },
    parseHTML() { return [{ tag: 'p' }]; },
    renderHTML({ node, HTMLAttributes }) {
      return ['p', { ...HTMLAttributes, ...(node.attrs.textAlign ? { style: `text-align:${node.attrs.textAlign}` } : {}) }, 0];
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
    addAttributes() { return { resourceKey: { default: null }, alt: { default: '' }, width: { default: null }, src: { default: null } }; },
    parseHTML() { return [{ tag: 'img[data-resource-key]' }]; },
    renderHTML({ node, HTMLAttributes }) { return ['img', { ...HTMLAttributes, 'data-resource-key': node.attrs.resourceKey, alt: node.attrs.alt || '', src: node.attrs.src || '' }]; }
  });

  function createEditor() {
    return new Editor({
      extensions: [StarterKit.configure({ paragraph: false, heading: false, bulletList: false, orderedList: false, blockquote: false, codeBlock: false, horizontalRule: false }), layoutParagraph, fontSize, resourceImage, Table.configure({ resizable: false, HTMLAttributes: { class: 'page-layout-table' } }), TableRow, TableHeader, TableCell],
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      onUpdate: ({ editor }) => {
        const next = editor.getJSON();
        if (editor === headerEditor) draft.header = next;
        if (editor === footerEditor) draft.footer = next;
        editorRevision += 1;
      }
    });
  }

  function loadDraft() {
    draft = normalizePageConfig(value);
    errorMessage = '';
    activeTab = 'spacing';
    headerEditor?.commands.setContent(toEditorContent(draft.header), false);
    footerEditor?.commands.setContent(toEditorContent(draft.footer), false);
  }

  function updateMargin(side, event) {
    draft.margins = { ...draft.margins, [side]: event.currentTarget.value };
  }

  function activeEditor() {
    return activeTab === 'header' ? headerEditor : footerEditor;
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
    if (node.type === 'image') node.attrs = { ...node.attrs, src: resources.find((resource) => resource.resourceKey === node.attrs?.resourceKey)?.url || '' };
    if (Array.isArray(node.content)) node.content = node.content.map(toEditorContent);
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
    headerEditor = createEditor();
    footerEditor = createEditor();
    loadDraft();
  });

  onDestroy(() => {
    headerEditor?.destroy();
    footerEditor?.destroy();
  });
</script>

<Dialog.Root bind:open onOpenChange={(nextOpen) => { if (nextOpen) loadDraft(); }}>
  <Dialog.Content class="!w-[min(94vw,760px)] !max-w-[760px]">
    <Dialog.Header>
      <Dialog.Title>Document configurations</Dialog.Title>
      <Dialog.Description>Set print margins and optional content that appears above and below each document page.</Dialog.Description>
    </Dialog.Header>

    <div class="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
      <div class="flex gap-1 border-b border-border" role="tablist" aria-label="Document configuration sections">
        {#each [['spacing', 'Spacing'], ['header', 'Header'], ['footer', 'Footer']] as [tab, label]}
          <button type="button" id={`${tab}-tab`} role="tab" aria-selected={activeTab === tab} class:active-tab={activeTab === tab} class="config-tab" onclick={() => (activeTab = tab)}>{label}</button>
        {/each}
      </div>

      <section role="tabpanel" aria-labelledby="spacing-tab" hidden={activeTab !== 'spacing'}>
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

      <section class="flex min-w-0 flex-col gap-2" role="tabpanel" aria-labelledby="header-tab" hidden={activeTab !== 'header'}>
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
            </div>
            {#if headerEditor}<EditorContent editor={headerEditor} class="page-config-editor min-h-24 px-3 py-2 text-sm" />{/if}
          </div>
      </section>

      <section class="flex min-w-0 flex-col gap-2" role="tabpanel" aria-labelledby="footer-tab" hidden={activeTab !== 'footer'}>
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
            </div>
            {#if footerEditor}<EditorContent editor={footerEditor} class="page-config-editor min-h-24 px-3 py-2 text-sm" />{/if}
          </div>
      </section>
    </div>

    {#if errorMessage}<p class="text-sm text-destructive" role="alert">{errorMessage}</p>{/if}
    <Dialog.Footer>
      <Button variant="outline" onclick={reset}><RotateCcwIcon data-icon="inline-start" />Reset</Button>
      <Dialog.Close><Button variant="outline">Cancel</Button></Dialog.Close>
      <Button onclick={apply}>Apply configurations</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  .config-tab { border-bottom: 2px solid transparent; padding: 0.625rem 0.75rem; color: var(--muted-foreground); font-size: 0.875rem; font-weight: 600; }
  .config-tab:hover, .config-tab.active-tab { border-bottom-color: var(--primary); color: var(--foreground); }
  .layout-tool { display: inline-flex; align-items: center; justify-content: center; border-radius: 0.375rem; padding: 0.5rem; color: var(--muted-foreground); }
  .layout-tool:hover:not(:disabled) { background: var(--accent); color: var(--accent-foreground); }
  .layout-tool:disabled { cursor: not-allowed; opacity: 0.35; }
  .layout-tool-destructive:hover:not(:disabled) { background: color-mix(in oklch, var(--destructive) 12%, transparent); color: var(--destructive); }
  .font-size-select { height: 2rem; border: 1px solid var(--input); border-radius: 0.375rem; background: var(--background); padding: 0 0.5rem; color: var(--foreground); font-size: 0.75rem; }
  .resource-menu { position: relative; }
  .resource-menu summary { list-style: none; cursor: pointer; }
  .resource-menu summary::-webkit-details-marker { display: none; }
  .resource-popover { position: absolute; z-index: 30; top: 2.5rem; left: 0; width: 18rem; border: 1px solid var(--border); border-radius: 0.5rem; background: var(--popover); padding: 0.75rem; box-shadow: 0 12px 30px color-mix(in oklch, var(--foreground) 16%, transparent); }
  :global(.page-config-editor .tiptap) { min-height: 5rem; outline: none; }
  :global(.page-config-editor .tiptap p) { margin: 0; }
  :global(.page-config-editor .tiptap img[data-resource-key]) { display: inline-block; max-width: 100%; height: auto; vertical-align: middle; }
  :global(.page-config-editor .tiptap img[data-resource-key].ProseMirror-selectednode) { outline: 2px solid var(--primary); outline-offset: 3px; }
  :global(.page-config-editor .page-layout-table) { width: 100%; border-collapse: collapse; border: 1px solid var(--input); table-layout: fixed; }
  :global(.page-config-editor .page-layout-table td), :global(.page-config-editor .page-layout-table th) { min-width: 4rem; border: 1px dashed var(--input); padding: 0.35rem; background: color-mix(in oklch, var(--muted) 25%, transparent); vertical-align: top; }
  :global(.page-config-editor .page-layout-table td:hover), :global(.page-config-editor .page-layout-table th:hover) { background: color-mix(in oklch, var(--accent) 60%, transparent); }
  :global(.page-config-editor .selectedCell) { background: color-mix(in oklch, var(--primary) 14%, transparent) !important; box-shadow: inset 0 0 0 2px color-mix(in oklch, var(--primary) 55%, transparent); }
</style>
