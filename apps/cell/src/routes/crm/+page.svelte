<script>
  import ArrowRightIcon from '@lucide/svelte/icons/arrow-right';
  import ContactRoundIcon from '@lucide/svelte/icons/contact-round';
  import { Badge } from '$lib/components/ui/badge';
  import { buttonVariants } from '$lib/components/ui/button';

  let { data } = $props();

  function companyName(company) {
    return company.displayName || company.legalName;
  }
</script>

<svelte:head><title>CRM Dashboard | Aionsoft Cell</title></svelte:head>

<div class="flex flex-col gap-8">
  <header class="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p class="text-sm font-medium text-muted-foreground">CRM</p>
      <h1 class="mt-1 text-3xl font-semibold text-foreground">Dashboard</h1>
    </div>
    <a href="/crm/companies" class={buttonVariants()}><ContactRoundIcon data-icon="inline-start" />Companies</a>
  </header>

  <section class="grid gap-6 border-b border-border pb-8 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,0.45fr)]">
    <div>
      <p class="text-sm text-muted-foreground">Active companies</p>
      <p class="mt-2 text-5xl font-semibold text-foreground">{data.companies.totalItems}</p>
    </div>
    <div class="border-l-0 border-border sm:border-l sm:pl-6">
      <p class="text-sm font-medium text-foreground">Company records</p>
      <p class="mt-2 text-sm leading-6 text-muted-foreground">Legal entities, operating names, contacts, addresses, and account relationships.</p>
    </div>
  </section>

  <section>
    <div class="mb-4 flex items-center justify-between gap-4">
      <h2 class="text-lg font-semibold text-foreground">Recently updated</h2>
      <a href="/crm/companies" class={buttonVariants({ variant: 'ghost', size: 'sm' })}>View all<ArrowRightIcon data-icon="inline-end" /></a>
    </div>

    <div class="divide-y divide-border border-y border-border">
      {#each data.companies.items as company (company.id)}
        <a href={`/crm/companies/${company.id}`} class="flex items-center justify-between gap-4 py-4 text-sm hover:text-primary">
          <span class="min-w-0">
            <span class="block truncate font-medium">{companyName(company)}</span>
            <span class="mt-1 block truncate text-muted-foreground">{company.legalName}</span>
          </span>
          <Badge variant="outline">{company.lifecycle}</Badge>
        </a>
      {:else}
        <p class="py-8 text-sm text-muted-foreground">No companies yet.</p>
      {/each}
    </div>
  </section>
</div>
