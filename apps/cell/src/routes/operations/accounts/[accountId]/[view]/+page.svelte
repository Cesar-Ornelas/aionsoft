<script>
  import { goto } from '$app/navigation';
  import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
  import MessageSquareIcon from '@lucide/svelte/icons/message-square';
  import NotebookPenIcon from '@lucide/svelte/icons/notebook-pen';
  import { Button } from '$lib/components/ui/button';

  let { data } = $props();
  let communications = data.view === 'communications';
</script>

<svelte:head><title>{communications ? 'Communications' : 'Customer notes'} | {data.account.name}</title></svelte:head>

<div class="flex flex-col gap-6">
  <header class="flex flex-col gap-4 border-b border-border pb-5">
    <Button variant="ghost" size="sm" class="w-fit" onclick={() => goto(`/operations/accounts/${data.account.id}`)}>
      <ArrowLeftIcon data-icon="inline-start" />{data.account.name}
    </Button>
    <div class="flex items-center gap-3">
      {#if communications}<MessageSquareIcon class="text-muted-foreground" />{:else}<NotebookPenIcon class="text-muted-foreground" />{/if}
      <div>
        <h1 class="text-2xl font-semibold">{communications ? 'Communications' : 'Customer notes'}</h1>
        <p class="text-sm text-muted-foreground">{data.account.name}</p>
      </div>
    </div>
  </header>

  <section class="rounded-lg border border-border p-6">
    <h2 class="font-semibold">Coming soon</h2>
    <p class="mt-2 text-sm text-muted-foreground">
      {communications ? 'Messages, emails, and customer communication history will appear here.' : 'Notes and account context for the customer team will appear here.'}
    </p>
  </section>
</div>
