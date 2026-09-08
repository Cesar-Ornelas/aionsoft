<script>
  import CheckIcon from '@lucide/svelte/icons/check';
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
  import ChevronUpIcon from '@lucide/svelte/icons/chevron-up';
  import CirclePlusIcon from '@lucide/svelte/icons/circle-plus';
  import EyeIcon from '@lucide/svelte/icons/eye';
  import Trash2Icon from '@lucide/svelte/icons/trash-2';
  import * as Field from '$lib/components/ui/field';
  import { Button } from '$lib/components/ui/button';
  import * as Dialog from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';

  let { fields = [], onChange = () => {}, onPreviewValuesChange = () => {}, onPreviewDocument = () => {}, sampleMode = false, sampleValues = {} } = $props();
  const cloneFields = (value) => JSON.parse(JSON.stringify(value));
  let localFields = $state(cloneFields(fields));
  let selectedIndex = $state(localFields.length ? 0 : -1);
  let draggedIndex = $state(-1);
  let previewOpen = $state(false);
  let previewValues = $state(cloneFields(sampleValues));
  let syncedSampleFields = '';

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

  let selectedField = $derived(selectedIndex >= 0 ? localFields[selectedIndex] : null);
  const typeLabel = (type) => fieldTypes.find((item) => item.value === type)?.label || type;
  const notify = () => onChange(cloneFields(localFields));
  const previewLabel = (field) => `${field.label}${field.validation?.required ? ' *' : ''}`;
  const isChoiceField = (field) => ['radio', 'select', 'button-select', 'checkbox', 'button-multi-select'].includes(field.type);
  const isReadOnlyField = (field) => ['calculation', 'derived-hidden', 'hidden', 'divider', 'template-section'].includes(field.type);

  $effect(() => {
    if (!sampleMode) return;
    const nextFields = JSON.stringify(fields);
    if (nextFields === syncedSampleFields) return;
    syncedSampleFields = nextFields;
    localFields = cloneFields(fields);
    selectedIndex = localFields.length ? 0 : -1;
  });

  function openPreview() {
    previewValues = {};
    onPreviewValuesChange({});
    previewOpen = true;
  }

  function updatePreviewValue(field, value) {
    const key = field.fieldKey || field.id;
    previewValues = { ...previewValues, [key]: value };
    onPreviewValuesChange(previewValues);
  }

  function togglePreviewOption(field, optionValue, checked) {
    const key = field.fieldKey || field.id;
    const current = Array.isArray(previewValues[key]) ? previewValues[key] : [];
    const next = checked ? [...current, optionValue] : current.filter((value) => value !== optionValue);
    updatePreviewValue(field, next);
  }

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
    localFields = [...localFields, createField(type)];
    selectedIndex = localFields.length - 1;
    notify();
  }

  function moveField(direction) {
    const nextIndex = selectedIndex + direction;
    if (nextIndex < 0 || nextIndex >= localFields.length) return;
    const next = [...localFields];
    [next[selectedIndex], next[nextIndex]] = [next[nextIndex], next[selectedIndex]];
    localFields = next;
    selectedIndex = nextIndex;
    notify();
  }

  function removeField() {
    if (selectedIndex < 0) return;
    localFields = localFields.filter((_, index) => index !== selectedIndex);
    selectedIndex = Math.min(selectedIndex, localFields.length - 1);
    notify();
  }

  function startDragging(index) {
    draggedIndex = index;
  }

  function finishDragging() {
    draggedIndex = -1;
  }

  function dropField(targetIndex) {
    if (draggedIndex < 0 || draggedIndex === targetIndex) {
      finishDragging();
      return;
    }
    const next = [...localFields];
    const [draggedField] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, draggedField);
    localFields = next;
    selectedIndex = targetIndex;
    notify();
    finishDragging();
  }

  function addOption() {
    if (!selectedField) return;
    selectedField.options = [...(selectedField.options ?? []), { label: `Option ${(selectedField.options?.length ?? 0) + 1}`, value: `option_${(selectedField.options?.length ?? 0) + 1}` }];
    notify();
  }

  function removeOption(index) {
    if (!selectedField) return;
    selectedField.options = selectedField.options.filter((_, optionIndex) => optionIndex !== index);
    notify();
  }
</script>

<section class="rounded-2xl border border-border bg-card shadow-sm">
  {#if sampleMode}
    <div class="border-b border-border p-4"><div class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="text-lg font-semibold text-foreground">Sample data</h2><p class="mt-1 text-sm text-muted-foreground">Enter test values for this document package. They are saved with the next draft revision.</p></div><Button variant="outline" size="sm" onclick={onPreviewDocument}><EyeIcon data-icon="inline-start" />Preview document</Button></div></div>
    <div class="p-4"><div class="flex flex-col gap-5">{#if localFields.length}{#each localFields as field (field.id)}{@render renderField(field)}{/each}{:else}<div class="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">Add form fields first to create sample data.</div>{/if}</div></div>
  {:else}
  <div class="border-b border-border p-4">
    <div class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="text-lg font-semibold text-foreground">Form fields</h2><p class="mt-1 text-sm text-muted-foreground">These fields belong to this document package and are saved with its draft.</p></div><Button variant="outline" size="sm" onclick={openPreview}><EyeIcon data-icon="inline-start" />Preview form</Button></div>
  </div>
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
      <div class="flex items-center justify-between gap-3"><p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Package fields</p><span class="text-xs text-muted-foreground">{localFields.length} fields</span></div>
      {#if localFields.length}
        <div class="mt-3 flex flex-col gap-2">
          {#each localFields as field, index (field.id)}
            <button type="button" draggable="true" class="flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left transition-colors {selectedIndex === index ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/60'} {draggedIndex === index ? 'opacity-50' : ''}" title="Drag to reorder field" aria-label={`Drag to reorder ${field.label}`} onclick={() => (selectedIndex = index)} ondragstart={() => startDragging(index)} ondragover={(event) => event.preventDefault()} ondrop={() => dropField(index)} ondragend={finishDragging}>
              <span class="min-w-0"><span class="block truncate font-medium text-foreground">{field.label}</span><span class="mt-0.5 block text-xs text-muted-foreground">{typeLabel(field.type)}</span></span>
              <span class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><span>{index + 1}</span>{#if field.validation?.required}<span class="inline-flex items-center gap-1 font-medium text-emerald-600" title="Required field" aria-label="Required field"><CheckIcon class="size-3.5" /><span class="hidden sm:inline">Required</span></span>{/if}</span>
            </button>
          {/each}
        </div>
      {:else}
        <div class="mt-3 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Choose a field type to begin.</div>
      {/if}
    </div>

    <aside class="p-4">
      {#if selectedField}
        <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Selected field</p><h3 class="mt-1 font-semibold text-foreground">{typeLabel(selectedField.type)}</h3></div><div class="flex gap-1"><Button variant="ghost" size="icon-xs" title="Move field up" aria-label="Move field up" onclick={() => moveField(-1)} disabled={selectedIndex === 0}><ChevronUpIcon /></Button><Button variant="ghost" size="icon-xs" title="Move field down" aria-label="Move field down" onclick={() => moveField(1)} disabled={selectedIndex === localFields.length - 1}><ChevronDownIcon /></Button><Button variant="ghost" size="icon-xs" title="Remove field" aria-label="Remove field" onclick={removeField}><Trash2Icon /></Button></div></div>
        <Field.FieldGroup class="mt-4">
          <Field.Field><Field.FieldLabel for="package-field-label">Label</Field.FieldLabel><Input id="package-field-label" bind:value={selectedField.label} oninput={notify} /></Field.Field>
          <Field.Field><Field.FieldLabel for="package-field-key">Field key</Field.FieldLabel><Input id="package-field-key" bind:value={selectedField.fieldKey} oninput={notify} /><Field.FieldDescription>Use lowercase letters, numbers, and underscores.</Field.FieldDescription></Field.Field>
          {#if !['section', 'divider', 'calculation'].includes(selectedField.type)}<label class="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" bind:checked={selectedField.validation.required} onchange={notify} /> Required field</label>{/if}
          {#if selectedField.type === 'select' || selectedField.type === 'checkbox'}
            <Field.Field><Field.FieldLabel>Options</Field.FieldLabel><div class="flex flex-col gap-2">{#each selectedField.options ?? [] as option, optionIndex}<div class="flex gap-2"><Input bind:value={option.label} aria-label={`Option ${optionIndex + 1} label`} oninput={notify} /><Input bind:value={option.value} aria-label={`Option ${optionIndex + 1} value`} oninput={notify} /><Button variant="ghost" size="icon-xs" title="Remove option" aria-label="Remove option" onclick={() => removeOption(optionIndex)}><Trash2Icon /></Button></div>{/each}<Button variant="outline" size="sm" onclick={addOption}><CirclePlusIcon data-icon="inline-start" />Add option</Button></div></Field.Field>
          {/if}
          {#if ['text', 'textarea'].includes(selectedField.type)}<Field.Field><Field.FieldLabel for="package-field-placeholder">Placeholder</Field.FieldLabel><Input id="package-field-placeholder" bind:value={selectedField.placeholder} oninput={notify} /></Field.Field>{/if}
        </Field.FieldGroup>
      {:else}
        <div class="flex min-h-56 items-center justify-center text-center text-sm text-muted-foreground">Select a field to configure it.</div>
      {/if}
    </aside>
  </div>
  {/if}
</section>

<Dialog.Root bind:open={previewOpen}>
  <Dialog.Content class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Form preview</Dialog.Title>
      <Dialog.Description>Review how this form will appear to someone completing it. Preview values are not saved.</Dialog.Description>
    </Dialog.Header>
    <div class="mt-5 flex flex-col gap-5">
      {#if localFields.length}
        {#each localFields as field (field.id)}
          {@render renderField(field)}
        {/each}
      {:else}
        <div class="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">Add fields to see the form preview.</div>
      {/if}
    </div>
    <Dialog.Footer><Button variant="outline" onclick={() => (previewOpen = false)}>Close preview</Button><Button onclick={() => { previewOpen = false; onPreviewDocument(); }}><EyeIcon data-icon="inline-start" />Preview document</Button></Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

{#snippet renderField(field)}
  {#if field.type === 'section'}
    <section class="rounded-xl border border-border bg-muted/20 p-4"><h3 class="font-semibold text-foreground">{field.label}</h3>{#if field.helpText}<p class="mt-1 text-sm text-muted-foreground">{field.helpText}</p>{/if}<div class="mt-4 flex flex-col gap-5">{#each field.fields ?? [] as child (child.id)}{@render renderField(child)}{/each}</div></section>
  {:else if field.type === 'divider'}
    <hr class="border-border" />
  {:else if isReadOnlyField(field)}
    <div class="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"><span class="font-medium text-foreground">{field.label}</span><span class="ml-2">{field.type === 'calculation' ? 'Calculated value' : 'Read-only field'}</span></div>
  {:else if isChoiceField(field)}
    <Field.Field><Field.FieldLabel>{previewLabel(field)}</Field.FieldLabel>{#if field.helpText}<Field.FieldDescription>{field.helpText}</Field.FieldDescription>{/if}{#if field.type === 'select'}<select class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" value={previewValues[field.fieldKey || field.id] || ''} onchange={(event) => updatePreviewValue(field, event.currentTarget.value)}><option value="">Select an option</option>{#each field.options ?? [] as option}<option value={option.value}>{option.label}</option>{/each}</select>{:else}<div class="flex flex-col gap-2">{#each field.options ?? [] as option}<label class="flex items-center gap-2 text-sm text-foreground"><input type={field.type === 'checkbox' || field.type === 'button-multi-select' ? 'checkbox' : 'radio'} name={field.id} value={option.value} checked={field.type === 'checkbox' || field.type === 'button-multi-select' ? (previewValues[field.fieldKey || field.id] ?? []).includes(option.value) : previewValues[field.fieldKey || field.id] === option.value} onchange={(event) => field.type === 'checkbox' || field.type === 'button-multi-select' ? togglePreviewOption(field, option.value, event.currentTarget.checked) : updatePreviewValue(field, option.value)} />{option.label}</label>{/each}</div>{/if}</Field.Field>
  {:else if field.type === 'textarea'}
    <Field.Field><Field.FieldLabel>{previewLabel(field)}</Field.FieldLabel><textarea class="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" placeholder={field.placeholder || ''} value={previewValues[field.fieldKey || field.id] || ''} oninput={(event) => updatePreviewValue(field, event.currentTarget.value)}></textarea>{#if field.helpText}<Field.FieldDescription>{field.helpText}</Field.FieldDescription>{/if}</Field.Field>
  {:else if field.type === 'file' || field.type === 'signature'}
    <Field.Field><Field.FieldLabel>{previewLabel(field)}</Field.FieldLabel><div class="rounded-lg border border-dashed border-border px-4 py-5 text-center text-sm text-muted-foreground">{field.type === 'file' ? 'File upload control' : 'Signature control'}</div>{#if field.helpText}<Field.FieldDescription>{field.helpText}</Field.FieldDescription>{/if}</Field.Field>
  {:else}
    <Field.Field><Field.FieldLabel>{previewLabel(field)}</Field.FieldLabel><input class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground" type={field.type === 'number' || field.type === 'money' || field.type === 'percent' ? 'number' : field.type === 'date' || field.type === 'datetime' ? 'date' : 'text'} placeholder={field.placeholder || ''} value={previewValues[field.fieldKey || field.id] || ''} oninput={(event) => updatePreviewValue(field, event.currentTarget.value)} />{#if field.helpText}<Field.FieldDescription>{field.helpText}</Field.FieldDescription>{/if}</Field.Field>
  {/if}
{/snippet}
