<script>
  import XIcon from '@lucide/svelte/icons/x';
  import { Badge } from '$lib/components/ui/badge';
  import { Input } from '$lib/components/ui/input';

  let { value = $bindable([]), id, placeholder = 'Add a tag...', maxTags = 12 } = $props();
  let draft = $state('');

  function addTag(rawValue) {
    const name = String(rawValue ?? '').trim().toLowerCase();
    if (!name || value.includes(name) || value.length >= maxTags) return;
    value = [...value, name];
    draft = '';
  }

  function handleKeydown(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addTag(draft);
  }

  function removeTag(tag) {
    value = value.filter((entry) => entry !== tag);
  }
</script>

<div class="flex min-h-9 flex-wrap items-center gap-2 rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-3 focus-within:ring-ring/30">
  {#each value as tag (tag)}
    <Badge variant="secondary" class="pr-1">
      <span>{tag}</span>
      <button type="button" class="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Remove ${tag} tag`} title={`Remove ${tag} tag`} onclick={() => removeTag(tag)}>
        <XIcon />
      </button>
    </Badge>
  {/each}
  <Input id={id} class="h-6 min-w-24 flex-1 border-0 px-1 shadow-none focus-visible:ring-0" bind:value={draft} {placeholder} onkeydown={handleKeydown} />
</div>
