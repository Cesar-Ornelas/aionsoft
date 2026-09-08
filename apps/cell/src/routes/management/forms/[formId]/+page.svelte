<script>
  import { goto } from '$app/navigation';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import CheckIcon from '@lucide/svelte/icons/check';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
  import CirclePlusIcon from '@lucide/svelte/icons/circle-plus';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import FilePenLineIcon from '@lucide/svelte/icons/file-pen-line';
  import GitBranchIcon from '@lucide/svelte/icons/git-branch';
  import SaveIcon from '@lucide/svelte/icons/save';
  import UploadCloudIcon from '@lucide/svelte/icons/upload-cloud';
  import * as Field from '$lib/components/ui/field';
  import * as Table from '$lib/components/ui/table';
  import { Badge } from '$lib/components/ui/badge';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Textarea } from '$lib/components/ui/textarea';
  import { toast } from '$lib/stores/toast.js';

  let { data } = $props();
  let fields = $state(structuredClone(data.versions?.[0]?.schema?.fields ?? []));
  let selectedIndex = $state(fields.length ? 0 : -1);
  let isSaving = $state(false);
  let saveError = $state('');
  let editorOpen = $state(true);

  const fieldTypes = [
    { value: 'text', label: 'Short text' },
    { value: 'textarea', label: 'Long text' },
    { value: 'number', label: 'Number' },
    { value: 'money', label: 'Money' },
    { value: 'percent', label: 'Percent' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Dropdown' },
    { value: 'checkbox', label: 'Multiple choice' },
    { value: 'section', label: 'Section' }
  ];

  let selectedField = $derived(selectedIndex >= 0 ? fields[selectedIndex] : null);
  let latestVersion = $derived(data.versions?.[0] ?? null);
  const statusVariant = (status) => status === 'published' ? 'default' : status === 'deleted' ? 'destructive' : 'secondary';
  const typeLabel = (type) => fieldTypes.find((item) => item.value === type)?.label || type;

  function createField(type) {
    const suffix = Date.now().toString(36);
    return {
      id: `field-${suffix}`,
      fieldKey: `field_${suffix}`,
      type,
      label: typeLabel(type),
      validation: {},
      ...(type === 'select' || type === 'checkbox' ? { options: [{ label: 'Option 1', value: 'option_1' }] } : {}),
      ...(type === 'section' ? { fields: [] } : {})
    };
  }

  function addField(type) {
    fields = [...fields, createField(type)];
    selectedIndex = fields.length - 1;
    editorOpen = true;
  }

  function moveField(direction) {
    const nextIndex = selectedIndex + direction;
    if (nextIndex < 0 || nextIndex >= fields.length) return;
    const next = [...fields];
    [next[selectedIndex], next[nextIndex]] = [next[nextIndex], next[selectedIndex]];
    fields = next;
    selectedIndex = nextIndex;
  }

  function removeField() {
    if (selectedIndex < 0) return;
    fields = fields.filter((_, index) => index !== selectedIndex);
    selectedIndex = Math.min(selectedIndex, fields.length - 1);
  }

  function addOption() {
    if (!selectedField) return;
    selectedField.options = [...(selectedField.options ?? []), { label: `Option ${(selectedField.options?.length ?? 0) + 1}`, value: `option_${(selectedField.options?.length ?? 0) + 1}` }];
  }

  function removeOption(index) {
    if (!selectedField) return;
    selectedField.options = selectedField.options.filter((_, optionIndex) => optionIndex !== index);
  }

  async function saveDraft() {
    isSaving = true;
    saveError = '';
    try {
      const response = await fetch(`/management/forms/${data.form.id}/versions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fields })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Unable to save form draft.');
      toast.success(`Draft version ${result.versionNumber} saved.`);
      await goto(`/management/forms/${data.form.id}`, { invalidateAll: true, replaceState: true });
    } catch (error) {
      saveError = error.message;
      toast.error(saveError);
    } finally {
      isSaving = false;
    }
  }

  async function publishDraft() {
    if (!latestVersion || latestVersion.isPublished) return;
    isSaving = true;
    saveError = '';
    try {
      const response = await fetch(`/management/forms/${data.form.id}/versions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'publish', versionId: latestVersion.id })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.error || 'Unable to publish form version.');
      toast.success(`Version ${result.versionNumber} published and available to Documents.`);
      await goto(`/management/forms/${data.form.id}`, { invalidateAll: true, replaceState: true });
    } catch (error) {
      saveError = error.message;
      toast.error(saveError);
    } finally {
      isSaving = false;
    }
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-wrap items-center gap-3">
    <Button variant="ghost" size="icon" href="/management/forms" title="Back to forms" aria-label="Back to forms">
      <ArrowLeftIcon />
    </Button>
    <div class="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"><FilePenLineIcon /></div>
    <div>
      <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-500">Form Builder <Badge variant={statusVariant(data.form.status)}>{data.form.status.replace('_', ' ')}</Badge></div>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">{data.form.name}</h1>
    </div>
  </div>

  <div class="flex flex-col gap-6">
    <section class="rounded-2xl border border-border bg-card shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 class="text-lg font-semibold text-foreground">Schema editor</h2>
          <p class="mt-1 text-sm text-muted-foreground">Add fields, arrange their order, and configure the selected field.</p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onclick={() => (editorOpen = !editorOpen)}><ChevronDownIcon class={editorOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />{editorOpen ? 'Collapse' : 'Expand'}</Button>
          <Button size="sm" onclick={saveDraft} disabled={isSaving}><SaveIcon data-icon="inline-start" />{isSaving ? 'Saving...' : 'Save draft'}</Button>
          {#if latestVersion && !latestVersion.isPublished}<Button variant="outline" size="sm" onclick={publishDraft} disabled={isSaving}><UploadCloudIcon data-icon="inline-start" />Publish</Button>{/if}
        </div>
      </div>

      {#if editorOpen}
        <div class="grid gap-0 lg:grid-cols-[13rem_minmax(0,1fr)_20rem]">
          <aside class="border-b border-border p-4 lg:border-b-0 lg:border-r">
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Add field</p>
            <div class="mt-3 flex flex-col gap-1.5">
              {#each fieldTypes as item}
                <Button variant="ghost" size="sm" class="justify-start" onclick={() => addField(item.value)}><CirclePlusIcon data-icon="inline-start" />{item.label}</Button>
              {/each}
            </div>
          </aside>

          <div class="min-h-72 border-b border-border p-4 lg:border-b-0 lg:border-r">
            <div class="flex items-center justify-between gap-3">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Form fields</p>
              <span class="text-xs text-muted-foreground">{fields.length} fields</span>
            </div>
            {#if fields.length}
              <div class="mt-3 flex flex-col gap-2">
                {#each fields as field, index (field.id)}
                  <button type="button" class="flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-colors {selectedIndex === index ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/60'}" onclick={() => (selectedIndex = index)}>
                    <span class="min-w-0"><span class="block truncate font-medium text-foreground">{field.label}</span><span class="mt-0.5 block text-xs text-muted-foreground">{typeLabel(field.type)}</span></span>
                    <span class="flex shrink-0 items-center gap-1">
                      <span class="text-xs text-muted-foreground">{index + 1}</span>
                      {#if field.validation?.required}<CheckIcon class="text-emerald-600" />{/if}
                    </span>
                  </button>
                {/each}
              </div>
            {:else}
              <div class="mt-3 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Choose a field type to begin.</div>
            {/if}
          </div>

          <aside class="p-4">
            {#if selectedField}
              <div class="flex items-start justify-between gap-3">
                <div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected field</p><h3 class="mt-1 font-semibold text-foreground">{typeLabel(selectedField.type)}</h3></div>
                <div class="flex gap-1">
                  <Button variant="ghost" size="icon-xs" title="Move field up" aria-label="Move field up" onclick={() => moveField(-1)} disabled={selectedIndex === 0}><ChevronUpIcon /></Button>
                  <Button variant="ghost" size="icon-xs" title="Move field down" aria-label="Move field down" onclick={() => moveField(1)} disabled={selectedIndex === fields.length - 1}><ChevronDownIcon /></Button>
                  <Button variant="ghost" size="icon-xs" title="Remove field" aria-label="Remove field" onclick={removeField}><Trash2Icon /></Button>
                </div>
              </div>
              <Field.FieldGroup class="mt-4">
                <Field.Field><Field.FieldLabel for="field-label">Label</Field.FieldLabel><Input id="field-label" bind:value={selectedField.label} /></Field.Field>
                <Field.Field><Field.FieldLabel for="field-key">Field key</Field.FieldLabel><Input id="field-key" bind:value={selectedField.fieldKey} /><Field.FieldDescription>Use lowercase letters, numbers, and underscores.</Field.FieldDescription></Field.Field>
                {#if !['section', 'divider', 'calculation'].includes(selectedField.type)}
                  <label class="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" bind:checked={selectedField.validation.required} /> Required field</label>
                {/if}
                {#if selectedField.type === 'select' || selectedField.type === 'checkbox'}
                  <Field.Field><Field.FieldLabel>Options</Field.FieldLabel><div class="flex flex-col gap-2">{#each selectedField.options ?? [] as option, optionIndex}<div class="flex gap-2"><Input bind:value={option.label} aria-label={`Option ${optionIndex + 1} label`} /><Input bind:value={option.value} aria-label={`Option ${optionIndex + 1} value`} /><Button variant="ghost" size="icon-xs" title="Remove option" aria-label="Remove option" onclick={() => removeOption(optionIndex)}><Trash2Icon /></Button></div>{/each}<Button variant="outline" size="sm" onclick={addOption}><CirclePlusIcon data-icon="inline-start" />Add option</Button></div></Field.Field>
                {/if}
                {#if ['text', 'textarea'].includes(selectedField.type)}<Field.Field><Field.FieldLabel for="field-placeholder">Placeholder</Field.FieldLabel><Input id="field-placeholder" bind:value={selectedField.placeholder} /></Field.Field>{/if}
                {#if selectedField.type === 'textarea'}<Field.Field><Field.FieldLabel for="field-help">Help text</Field.FieldLabel><Textarea id="field-help" bind:value={selectedField.helpText} rows={2} /></Field.Field>{/if}
              </Field.FieldGroup>
            {:else}
              <div class="flex min-h-56 items-center justify-center text-center text-sm text-muted-foreground">Select a field to configure it.</div>
            {/if}
          </aside>
        </div>
      {/if}
      {#if saveError}<p class="border-t border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">{saveError}</p>{/if}
    </section>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
    <section class="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div class="flex items-start gap-3">
        <GitBranchIcon class="mt-0.5 text-sky-500" />
        <div>
          <h2 class="text-lg font-semibold text-foreground">Version history</h2>
          <p class="mt-1 text-sm text-muted-foreground">Published versions stay immutable. New schema changes will create draft revisions.</p>
        </div>
      </div>

      {#if data.versions.length}
        <Table.Root class="mt-6">
          <Table.Header>
            <Table.Row><Table.Head>Version</Table.Head><Table.Head>Status</Table.Head><Table.Head>Created</Table.Head></Table.Row>
          </Table.Header>
          <Table.Body>
            {#each data.versions as version (version.id)}
              <Table.Row>
                <Table.Cell class="font-medium text-foreground">Version {version.versionNumber}</Table.Cell>
                <Table.Cell><Badge variant={statusVariant(version.status)}>{version.status.replace('_', ' ')}</Badge></Table.Cell>
                <Table.Cell class="text-muted-foreground">{version.createdAt ? new Date(version.createdAt).toLocaleDateString() : 'Not available'}</Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      {:else}
        <div class="mt-6 rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <p class="font-medium text-foreground">No versions yet</p>
          <p class="mt-1 text-sm text-muted-foreground">The schema editor will create the first draft version here.</p>
        </div>
      {/if}
    </section>

    <aside class="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h2 class="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Form details</h2>
      <dl class="mt-5 flex flex-col gap-4 text-sm">
        <div><dt class="text-muted-foreground">Category</dt><dd class="mt-1 font-medium text-foreground">{data.form.category || 'Uncategorized'}</dd></div>
        <div><dt class="text-muted-foreground">Description</dt><dd class="mt-1 text-foreground">{data.form.description || 'No description'}</dd></div>
        <div><dt class="text-muted-foreground">Last updated</dt><dd class="mt-1 text-foreground">{data.form.updatedAt ? new Date(data.form.updatedAt).toLocaleDateString() : 'Not available'}</dd></div>
      </dl>
    </aside>
  </div>
</div>
</div>