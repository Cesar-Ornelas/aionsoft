<script>
  import ImagePlusIcon from '@lucide/svelte/icons/image-plus';
  import UploadIcon from '@lucide/svelte/icons/upload';
  import { Button } from '$lib/components/ui/button/index.js';

  let { resources = [], onUpload = null, onSelect = null } = $props();
  let input = $state();
  let busy = $state(false);
  let errorMessage = $state('');

  async function upload(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || !onUpload) return;
    busy = true;
    errorMessage = '';
    try { await onUpload(file); } catch (error) { errorMessage = error.message || 'Unable to upload image.'; } finally { busy = false; }
  }
</script>

<div class="resource-picker">
  <Button type="button" variant="outline" size="sm" onclick={() => input?.click()} disabled={busy} title="Upload PNG or JPEG image">
    <UploadIcon data-icon="inline-start" />{busy ? 'Uploading...' : 'Upload image'}
  </Button>
  <input bind:this={input} class="sr-only" type="file" accept="image/png,image/jpeg" onchange={upload} />
  {#if resources.length}
    <div class="resource-list" role="listbox" aria-label="Uploaded images">
      {#each resources as resource}
        <button type="button" class="resource-item" role="option" onclick={() => onSelect?.(resource)} title={`Insert ${resource.name}`}>
          <img src={resource.url} alt="" loading="lazy" />
          <span>{resource.name}</span>
        </button>
      {/each}
    </div>
  {:else}
    <div class="resource-empty"><ImagePlusIcon size={16} />Upload an image to insert it.</div>
  {/if}
  {#if errorMessage}<p class="text-xs text-destructive" role="alert">{errorMessage}</p>{/if}
</div>

<style>
  .resource-picker { display: flex; flex-direction: column; gap: 0.5rem; min-width: 15rem; }
  .resource-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.35rem; max-height: 12rem; overflow: auto; }
  .resource-item { display: flex; min-width: 0; flex-direction: column; gap: 0.2rem; border: 1px solid var(--border); border-radius: 0.375rem; padding: 0.25rem; text-align: left; }
  .resource-item:hover { border-color: var(--primary); background: var(--accent); }
  .resource-item img { aspect-ratio: 1; width: 100%; object-fit: contain; background: var(--muted); }
  .resource-item span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.65rem; }
  .resource-empty { display: flex; align-items: center; gap: 0.35rem; color: var(--muted-foreground); font-size: 0.75rem; }
</style>