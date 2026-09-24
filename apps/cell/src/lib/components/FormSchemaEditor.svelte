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
  import { evaluateAggregate } from '$lib/management/model/form-calculations.js';

  let { fields = [], onChange = () => {}, onPreviewValuesChange = () => {}, onPreviewDocument = () => {}, sampleMode = false, sampleValues = {} } = $props();
  const cloneFields = (value) => JSON.parse(JSON.stringify(value));
  let localFields = $state(cloneFields(fields));
  let selectedIndex = $state(localFields.length ? 0 : -1);
  let selectedChildIndex = $state(-1);
  let draggedIndex = $state(-1);
  let draggedChildIndex = $state(-1);
  let draggedChildListIndex = $state(-1);
  let draggedPaletteType = $state('');
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
    { value: 'list', label: 'List' },
    { value: 'aggregate', label: 'Calculated list value' },
    { value: 'section', label: 'Section' }
  ];

  const listChildTypes = fieldTypes.filter((item) => ['text', 'textarea', 'number', 'money', 'percent', 'date', 'select', 'checkbox'].includes(item.value));

  let selectedTopLevelField = $derived(selectedIndex >= 0 ? localFields[selectedIndex] : null);
  let selectedField = $derived(selectedChildIndex >= 0 ? selectedTopLevelField?.fields?.[selectedChildIndex] ?? null : selectedTopLevelField);
  let selectedCollectionLength = $derived(selectedChildIndex >= 0 ? selectedTopLevelField?.fields?.length ?? 0 : localFields.length);
  const typeLabel = (type) => fieldTypes.find((item) => item.value === type)?.label || type;
  const notify = () => onChange(cloneFields(localFields));
  const previewLabel = (field) => `${field.label}${field.validation?.required ? ' *' : ''}`;
  const isChoiceField = (field) => ['radio', 'select', 'button-select', 'checkbox', 'button-multi-select'].includes(field.type);
  const isReadOnlyField = (field) => ['calculation', 'aggregate', 'derived-hidden', 'hidden', 'divider', 'template-section'].includes(field.type);
  const listFields = () => localFields.filter((field) => field.type === 'list');
  const numericListChildren = (listId) => localFields.find((field) => field.id === listId)?.fields?.filter((field) => ['number', 'money', 'percent'].includes(field.type)) ?? [];
  const aggregateValue = (field, values = previewValues) => evaluateAggregate(field, values, localFields.find((candidate) => candidate.id === field.sourceListFieldId));
  const formattedAggregateValue = (field) => field.calculationFormat === 'currency'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(aggregateValue(field))
    : field.calculationFormat === 'percent' ? `${aggregateValue(field).toLocaleString('en-US')}%` : aggregateValue(field).toLocaleString('en-US');

  $effect(() => {
    if (!sampleMode) return;
    const nextFields = JSON.stringify(fields);
    if (nextFields === syncedSampleFields) return;
    syncedSampleFields = nextFields;
    localFields = cloneFields(fields);
    selectedIndex = localFields.length ? 0 : -1;
    selectedChildIndex = -1;
  });

  function openPreview() {
    previewValues = {};
    onPreviewValuesChange({});
    previewOpen = true;
  }

  function updatePreviewValue(field, value) {
    const key = field.fieldKey || field.id;
    previewValues = withAggregateValues({ ...previewValues, [key]: value });
    onPreviewValuesChange(previewValues);
  }

  function withAggregateValues(values) {
    const next = { ...values };
    for (const field of localFields.filter((candidate) => candidate.type === 'aggregate')) {
      const value = aggregateValue(field, next);
      next[field.id] = value;
      if (field.fieldKey) next[field.fieldKey] = value;
    }
    return next;
  }

  function listRows(field) {
    return Array.isArray(previewValues[field.id]) ? previewValues[field.id] : [];
  }

  function updateListRows(field, rows) {
    previewValues = withAggregateValues({ ...previewValues, [field.id]: rows });
    onPreviewValuesChange(previewValues);
  }

  function addListRow(field) {
    updateListRows(field, [...listRows(field), Object.fromEntries((field.fields ?? []).map((child) => [child.id, child.defaultValue ?? '']))]);
  }

  function updateListCell(field, rowIndex, child, value) {
    const rows = listRows(field).map((row, index) => index === rowIndex ? { ...row, [child.id]: value } : row);
    updateListRows(field, rows);
  }

  function removeListRow(field, rowIndex) {
    updateListRows(field, listRows(field).filter((_, index) => index !== rowIndex));
  }

  function moveListRow(field, rowIndex, direction) {
    const targetIndex = rowIndex + direction;
    if (targetIndex < 0 || targetIndex >= listRows(field).length) return;
    const rows = [...listRows(field)];
    [rows[rowIndex], rows[targetIndex]] = [rows[targetIndex], rows[rowIndex]];
    updateListRows(field, rows);
  }

  function togglePreviewOption(field, optionValue, checked) {
    const key = field.fieldKey || field.id;
    const current = Array.isArray(previewValues[key]) ? previewValues[key] : [];
    const next = checked ? [...current, optionValue] : current.filter((value) => value !== optionValue);
    updatePreviewValue(field, next);
  }

  function createField(type) {
    const suffix = Date.now().toString(36);
    const firstList = listFields()[0];
    const firstNumericChild = firstList?.fields?.find((field) => ['number', 'money', 'percent'].includes(field.type));
    return {
      id: `field-${suffix}`,
      fieldKey: `field_${suffix}`,
      type,
      label: typeLabel(type),
      validation: {},
      ...(type === 'select' || type === 'checkbox' ? { options: [{ label: 'Option 1', value: 'option_1' }] } : {}),
      ...(type === 'list' ? { fields: [{ id: `field-${suffix}-column`, fieldKey: `field_${suffix}_name`, type: 'text', label: 'Name', validation: {} }] } : {}),
      ...(type === 'aggregate' ? { sourceListFieldId: firstList?.id ?? '', sourceChildFieldId: firstNumericChild?.id ?? '', operation: 'sum', calculationFormat: 'number' } : {}),
      ...(type === 'section' ? { fields: [] } : {})
    };
  }

  function createListChild(type) {
    const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    return {
      id: `field-${suffix}`,
      fieldKey: `field_${suffix}`,
      type,
      label: typeLabel(type),
      validation: {},
      ...(type === 'select' || type === 'checkbox' ? { options: [{ label: 'Option 1', value: 'option_1' }] } : {})
    };
  }

  function addField(type) {
    localFields = [...localFields, createField(type)];
    selectedIndex = localFields.length - 1;
    selectedChildIndex = -1;
    notify();
  }

  function selectField(index) {
    selectedIndex = index;
    selectedChildIndex = -1;
  }

  function selectListChild(listIndex, childIndex) {
    selectedIndex = listIndex;
    selectedChildIndex = childIndex;
  }

  function moveField(direction) {
    if (selectedChildIndex >= 0) {
      const nextIndex = selectedChildIndex + direction;
      if (!selectedTopLevelField || nextIndex < 0 || nextIndex >= (selectedTopLevelField.fields?.length ?? 0)) return;
      const nextChildren = [...selectedTopLevelField.fields];
      [nextChildren[selectedChildIndex], nextChildren[nextIndex]] = [nextChildren[nextIndex], nextChildren[selectedChildIndex]];
      selectedTopLevelField.fields = nextChildren;
      selectedChildIndex = nextIndex;
      notify();
      return;
    }
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
    if (selectedChildIndex >= 0 && selectedTopLevelField) {
      selectedTopLevelField.fields = selectedTopLevelField.fields.filter((_, index) => index !== selectedChildIndex);
      selectedChildIndex = -1;
      notify();
      return;
    }
    localFields = localFields.filter((_, index) => index !== selectedIndex);
    selectedIndex = Math.min(selectedIndex, localFields.length - 1);
    selectedChildIndex = -1;
    notify();
  }

  function startDragging(index) {
    draggedIndex = index;
    draggedPaletteType = '';
  }

  function startDraggingPalette(type) {
    draggedPaletteType = type;
    draggedIndex = -1;
  }

  function finishDragging() {
    draggedIndex = -1;
    draggedPaletteType = '';
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
    selectedChildIndex = -1;
    notify();
    finishDragging();
  }

  function dropFieldIntoList(listIndex) {
    if (draggedPaletteType) {
      if (!listChildTypes.some((item) => item.value === draggedPaletteType)) return finishDragging();
      const child = createListChild(draggedPaletteType);
      localFields[listIndex].fields = [...(localFields[listIndex].fields ?? []), child];
      selectListChild(listIndex, localFields[listIndex].fields.length - 1);
      notify();
      finishDragging();
      return;
    }
    if (draggedIndex < 0 || draggedIndex === listIndex) return finishDragging();
    const field = localFields[draggedIndex];
    if (!listChildTypes.some((item) => item.value === field.type)) return finishDragging();
    const { condition: _condition, colSpan: _colSpan, ...child } = field;
    const next = [...localFields];
    next.splice(draggedIndex, 1);
    const adjustedListIndex = draggedIndex < listIndex ? listIndex - 1 : listIndex;
    next[adjustedListIndex] = { ...next[adjustedListIndex], fields: [...(next[adjustedListIndex].fields ?? []), child] };
    localFields = next;
    selectedIndex = adjustedListIndex;
    selectedChildIndex = next[adjustedListIndex].fields.length - 1;
    notify();
    finishDragging();
  }

  function addListChild(type) {
    if (!selectedTopLevelField || selectedTopLevelField.type !== 'list') return;
    selectedTopLevelField.fields = [...(selectedTopLevelField.fields ?? []), createListChild(type)];
    selectedChildIndex = selectedTopLevelField.fields.length - 1;
    notify();
  }

  function moveListChildOut() {
    if (!selectedTopLevelField || selectedChildIndex < 0) return;
    const child = selectedTopLevelField.fields[selectedChildIndex];
    selectedTopLevelField.fields = selectedTopLevelField.fields.filter((_, childIndex) => childIndex !== selectedChildIndex);
    localFields = [...localFields, child];
    selectedIndex = localFields.length - 1;
    selectedChildIndex = -1;
    notify();
  }

  function addListChildOption(child) {
    child.options = [...(child.options ?? []), { label: `Option ${(child.options?.length ?? 0) + 1}`, value: `option_${(child.options?.length ?? 0) + 1}` }];
    notify();
  }

  function removeListChildOption(child, optionIndex) {
    child.options = child.options.filter((_, index) => index !== optionIndex);
    notify();
  }

  function startDraggingChild(listIndex, childIndex) {
    draggedChildListIndex = listIndex;
    draggedChildIndex = childIndex;
  }

  function finishDraggingChild() {
    draggedChildListIndex = -1;
    draggedChildIndex = -1;
  }

  function dropListChild(listIndex, targetIndex) {
    const list = localFields[listIndex];
    if (!list || draggedChildListIndex !== listIndex || draggedChildIndex < 0 || draggedChildIndex === targetIndex) return finishDraggingChild();
    const next = [...list.fields];
    const [child] = next.splice(draggedChildIndex, 1);
    next.splice(targetIndex, 0, child);
    list.fields = next;
    selectListChild(listIndex, targetIndex);
    finishDraggingChild();
    notify();
  }

  function updateAggregateSource() {
    if (!selectedField || selectedField.type !== 'aggregate') return;
    const list = localFields.find((field) => field.id === selectedField.sourceListFieldId);
    const numericChildren = list?.fields?.filter((field) => ['number', 'money', 'percent'].includes(field.type)) ?? [];
    if (!numericChildren.some((field) => field.id === selectedField.sourceChildFieldId)) selectedField.sourceChildFieldId = numericChildren[0]?.id ?? '';
    notify();
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
    <div class="border-b border-border p-4"><div class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="text-lg font-semibold text-foreground">Sample data</h2><p class="mt-1 text-sm text-muted-foreground">Enter test values for this schema. They are saved with the next draft revision.</p></div><Button variant="outline" size="sm" onclick={onPreviewDocument}><EyeIcon data-icon="inline-start" />Preview document</Button></div></div>
    <div class="p-4"><div class="flex flex-col gap-5">{#if localFields.length}{#each localFields as field (field.id)}{@render renderField(field)}{/each}{:else}<div class="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">Add form fields first to create sample data.</div>{/if}</div></div>
  {:else}
  <div class="border-b border-border p-4">
    <div class="flex flex-wrap items-start justify-between gap-3"><div><h2 class="text-lg font-semibold text-foreground">Form fields</h2><p class="mt-1 text-sm text-muted-foreground">These fields are saved with the next draft revision.</p></div><Button variant="outline" size="sm" onclick={openPreview}><EyeIcon data-icon="inline-start" />Preview form</Button></div>
  </div>
  <div class="grid gap-0 lg:grid-cols-[13rem_minmax(0,1fr)_20rem]">
    <aside class="border-b border-border p-4 lg:border-b-0 lg:border-r">
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Add field</p>
      <div class="mt-3 flex flex-col gap-1.5">
        {#each fieldTypes as item}
          <Button variant="ghost" size="sm" class="justify-start" draggable="true" title={listChildTypes.some((childType) => childType.value === item.value) ? 'Click to add, or drag into a List' : `Add ${item.label}`} onclick={() => addField(item.value)} ondragstart={() => startDraggingPalette(item.value)} ondragend={finishDragging}><CirclePlusIcon data-icon="inline-start" />{item.label}</Button>
        {/each}
      </div>
    </aside>

    <div class="min-h-72 border-b border-border p-4 lg:border-b-0 lg:border-r">
      <div class="flex items-center justify-between gap-3"><p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Schema fields</p><span class="text-xs text-muted-foreground">{localFields.length} fields</span></div>
      {#if localFields.length}
        <div class="mt-3 flex flex-col gap-2">
          {#each localFields as field, index (field.id)}
            <div class="rounded-xl {field.type === 'list' ? 'border border-border p-1.5' : ''}" ondragover={field.type === 'list' ? (event) => event.preventDefault() : undefined} ondrop={field.type === 'list' ? (event) => { event.preventDefault(); dropFieldIntoList(index); } : undefined}>
              <button type="button" draggable="true" class="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition-colors {selectedIndex === index && selectedChildIndex < 0 ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/60'} {draggedIndex === index ? 'opacity-50' : ''}" title={field.type === 'list' ? 'Select this List or drop a scalar field into it' : 'Drag to reorder field'} aria-label={`Drag to reorder ${field.label}`} onclick={() => selectField(index)} ondragstart={() => startDragging(index)} ondragover={(event) => event.preventDefault()} ondrop={(event) => { event.stopPropagation(); field.type === 'list' ? dropFieldIntoList(index) : dropField(index); }} ondragend={finishDragging}>
                <span class="min-w-0"><span class="block truncate font-medium text-foreground">{field.label}</span><span class="mt-0.5 block text-xs text-muted-foreground">{typeLabel(field.type)}{field.type === 'list' ? ` · ${field.fields?.length ?? 0} columns` : ''}</span></span>
                <span class="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><span>{index + 1}</span>{#if field.validation?.required}<span class="inline-flex items-center gap-1 font-medium text-emerald-600" title="Required field" aria-label="Required field"><CheckIcon class="size-3.5" /><span class="hidden sm:inline">Required</span></span>{/if}</span>
              </button>
              {#if field.type === 'list'}
                <div class="ml-4 mt-1.5 flex flex-col gap-1.5 border-l border-border pl-2">
                  {#each field.fields ?? [] as child, childIndex (child.id)}
                    <button type="button" draggable="true" class="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors {selectedIndex === index && selectedChildIndex === childIndex ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/60'} {draggedChildListIndex === index && draggedChildIndex === childIndex ? 'opacity-50' : ''}" title="Drag to reorder column" onclick={() => selectListChild(index, childIndex)} ondragstart={(event) => { event.stopPropagation(); startDraggingChild(index, childIndex); }} ondragover={(event) => { event.preventDefault(); event.stopPropagation(); }} ondrop={(event) => { event.preventDefault(); event.stopPropagation(); draggedPaletteType || draggedIndex >= 0 ? dropFieldIntoList(index) : dropListChild(index, childIndex); }} ondragend={finishDraggingChild}>
                      <span class="min-w-0"><span class="block truncate text-sm font-medium text-foreground">{child.label}</span><span class="block text-xs text-muted-foreground">{typeLabel(child.type)}</span></span>
                      <span class="text-xs text-muted-foreground">{index + 1}.{childIndex + 1}</span>
                    </button>
                  {:else}
                    <div class="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">Drop a scalar field here.</div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {:else}
        <div class="mt-3 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Choose a field type to begin.</div>
      {/if}
    </div>

    <aside class="p-4">
      {#if selectedField}
        <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{selectedChildIndex >= 0 ? 'Selected List column' : 'Selected field'}</p><h3 class="mt-1 font-semibold text-foreground">{typeLabel(selectedField.type)}</h3></div><div class="flex gap-1">{#if selectedChildIndex >= 0}<Button variant="ghost" size="xs" title="Move column out of List" onclick={moveListChildOut}>Move out</Button>{/if}<Button variant="ghost" size="icon-xs" title="Move field up" aria-label="Move field up" onclick={() => moveField(-1)} disabled={(selectedChildIndex >= 0 ? selectedChildIndex : selectedIndex) === 0}><ChevronUpIcon /></Button><Button variant="ghost" size="icon-xs" title="Move field down" aria-label="Move field down" onclick={() => moveField(1)} disabled={(selectedChildIndex >= 0 ? selectedChildIndex : selectedIndex) === selectedCollectionLength - 1}><ChevronDownIcon /></Button><Button variant="ghost" size="icon-xs" title="Remove field" aria-label="Remove field" onclick={removeField}><Trash2Icon /></Button></div></div>
        <Field.FieldGroup class="mt-4">
          <Field.Field><Field.FieldLabel for="package-field-label">Label</Field.FieldLabel><Input id="package-field-label" bind:value={selectedField.label} oninput={notify} /></Field.Field>
          <Field.Field><Field.FieldLabel for="package-field-key">Field key</Field.FieldLabel><Input id="package-field-key" bind:value={selectedField.fieldKey} oninput={notify} /><Field.FieldDescription>Use lowercase letters, numbers, and underscores.</Field.FieldDescription></Field.Field>
          {#if !['section', 'divider', 'calculation', 'aggregate'].includes(selectedField.type)}<label class="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" bind:checked={selectedField.validation.required} onchange={notify} /> Required field</label>{/if}
          {#if selectedField.type === 'select' || selectedField.type === 'checkbox'}
            <Field.Field><Field.FieldLabel>Options</Field.FieldLabel><div class="flex flex-col gap-2">{#each selectedField.options ?? [] as option, optionIndex}<div class="flex gap-2"><Input bind:value={option.label} aria-label={`Option ${optionIndex + 1} label`} oninput={notify} /><Input bind:value={option.value} aria-label={`Option ${optionIndex + 1} value`} oninput={notify} /><Button variant="ghost" size="icon-xs" title="Remove option" aria-label="Remove option" onclick={() => removeOption(optionIndex)}><Trash2Icon /></Button></div>{/each}<Button variant="outline" size="sm" onclick={addOption}><CirclePlusIcon data-icon="inline-start" />Add option</Button></div></Field.Field>
          {/if}
          {#if ['text', 'textarea'].includes(selectedField.type)}<Field.Field><Field.FieldLabel for="package-field-placeholder">Placeholder</Field.FieldLabel><Input id="package-field-placeholder" bind:value={selectedField.placeholder} oninput={notify} /></Field.Field>{/if}
          {#if selectedField.type === 'list'}
            <div class="flex flex-col gap-3 border-t border-border pt-4">
              <div><p class="text-sm font-medium text-foreground">List columns</p><p class="mt-1 text-xs text-muted-foreground">Drag a field from the palette or schema onto this List. Select a nested column to edit it here.</p></div>
              <div class="flex flex-wrap gap-1.5">{#each listChildTypes as item}<Button variant="outline" size="xs" onclick={() => addListChild(item.value)}><CirclePlusIcon data-icon="inline-start" />{item.label}</Button>{/each}</div>
              <div class="grid grid-cols-2 gap-2"><Field.Field><Field.FieldLabel for="list-min-rows">Minimum rows</Field.FieldLabel><Input id="list-min-rows" type="number" min="0" bind:value={selectedField.validation.minRows} oninput={notify} /></Field.Field><Field.Field><Field.FieldLabel for="list-max-rows">Maximum rows</Field.FieldLabel><Input id="list-max-rows" type="number" min="1" bind:value={selectedField.validation.maxRows} oninput={notify} /></Field.Field></div>
            </div>
          {/if}
          {#if selectedField.type === 'aggregate'}
            <Field.Field><Field.FieldLabel for="aggregate-list">List</Field.FieldLabel><select id="aggregate-list" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" bind:value={selectedField.sourceListFieldId} onchange={updateAggregateSource}><option value="">Select a List</option>{#each listFields() as list}<option value={list.id}>{list.label}</option>{/each}</select></Field.Field>
            <Field.Field><Field.FieldLabel for="aggregate-column">Numeric column</Field.FieldLabel><select id="aggregate-column" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" bind:value={selectedField.sourceChildFieldId} onchange={notify}><option value="">Select a column</option>{#each numericListChildren(selectedField.sourceListFieldId) as child}<option value={child.id}>{child.label}</option>{/each}</select></Field.Field>
            <Field.Field><Field.FieldLabel for="aggregate-operation">Operation</Field.FieldLabel><select id="aggregate-operation" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" bind:value={selectedField.operation} onchange={notify}><option value="sum">Sum</option><option value="avg">Average</option></select></Field.Field>
            <Field.Field><Field.FieldLabel for="aggregate-format">Format</Field.FieldLabel><select id="aggregate-format" class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" bind:value={selectedField.calculationFormat} onchange={notify}><option value="number">Number</option><option value="currency">Currency</option><option value="percent">Percent</option></select></Field.Field>
          {/if}
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
  {#if field.type === 'list'}
    <Field.Field><Field.FieldLabel>{previewLabel(field)}</Field.FieldLabel>{#if field.helpText}<Field.FieldDescription>{field.helpText}</Field.FieldDescription>{/if}<div class="overflow-x-auto rounded-lg border border-border"><table class="w-full min-w-[36rem] text-sm"><thead class="bg-muted/50"><tr>{#each field.fields ?? [] as child}<th class="px-3 py-2 text-left font-medium text-foreground">{child.label}{child.validation?.required ? ' *' : ''}</th>{/each}<th class="w-24 px-3 py-2"><span class="sr-only">Row actions</span></th></tr></thead><tbody>{#each listRows(field) as row, rowIndex}<tr class="border-t border-border">{#each field.fields ?? [] as child}<td class="p-2">{#if child.type === 'select'}<select class="h-9 w-full rounded-md border border-input bg-background px-2" value={row[child.id] ?? ''} onchange={(event) => updateListCell(field, rowIndex, child, event.currentTarget.value)}><option value="">Select</option>{#each child.options ?? [] as option}<option value={option.value}>{option.label}</option>{/each}</select>{:else if child.type === 'checkbox'}<select multiple class="min-h-16 w-full rounded-md border border-input bg-background px-2 py-1" value={row[child.id] ?? []} onchange={(event) => updateListCell(field, rowIndex, child, Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>{#each child.options ?? [] as option}<option value={option.value}>{option.label}</option>{/each}</select>{:else}<input class="h-9 w-full rounded-md border border-input bg-background px-2" type={['number', 'money', 'percent'].includes(child.type) ? 'number' : child.type === 'date' || child.type === 'datetime' ? 'date' : 'text'} value={row[child.id] ?? ''} placeholder={child.placeholder || ''} oninput={(event) => updateListCell(field, rowIndex, child, event.currentTarget.value)} />{/if}</td>{/each}<td class="p-2"><div class="flex justify-end gap-1"><Button variant="ghost" size="icon-xs" title="Move row up" aria-label="Move row up" disabled={rowIndex === 0} onclick={() => moveListRow(field, rowIndex, -1)}><ChevronUpIcon /></Button><Button variant="ghost" size="icon-xs" title="Move row down" aria-label="Move row down" disabled={rowIndex === listRows(field).length - 1} onclick={() => moveListRow(field, rowIndex, 1)}><ChevronDownIcon /></Button><Button variant="ghost" size="icon-xs" title="Remove row" aria-label="Remove row" onclick={() => removeListRow(field, rowIndex)}><Trash2Icon /></Button></div></td></tr>{:else}<tr><td colspan={(field.fields?.length ?? 0) + 1} class="px-3 py-6 text-center text-muted-foreground">No rows yet.</td></tr>{/each}</tbody></table></div><Button variant="outline" size="sm" onclick={() => addListRow(field)} disabled={field.validation?.maxRows !== undefined && listRows(field).length >= field.validation.maxRows}><CirclePlusIcon data-icon="inline-start" />Add row</Button></Field.Field>
  {:else if field.type === 'aggregate'}
    <Field.Field><Field.FieldLabel>{field.label}</Field.FieldLabel><div class="rounded-md border border-border bg-muted/30 px-3 py-2 font-medium text-foreground">{formattedAggregateValue(field)}</div><Field.FieldDescription>{field.operation === 'avg' ? 'Average' : 'Sum'} of the selected List column.</Field.FieldDescription></Field.Field>
  {:else if field.type === 'section'}
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
