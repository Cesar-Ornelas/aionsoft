<svelte:head><title>Pipeline Dashboard | Aionsoft Cell</title></svelte:head>

<div class="flex flex-col gap-8">
  <header class="border-b border-border pb-6">
    <p class="text-sm font-medium text-muted-foreground">Pipeline</p>
    <h1 class="mt-1 text-3xl font-semibold text-foreground">Dashboard</h1>
  </header>

  <section class="grid gap-6 border-b border-border pb-8 sm:grid-cols-3">
    <div>
      <p class="text-sm text-muted-foreground">Open deals</p>
      <p class="mt-2 text-4xl font-semibold text-foreground">0</p>
    </div>
    <div>
      <p class="text-sm text-muted-foreground">Forecast</p>
      <p class="mt-2 text-4xl font-semibold text-foreground">$0</p>
    </div>
    <div>
      <p class="text-sm text-muted-foreground">Active stages</p>
      <p class="mt-2 text-4xl font-semibold text-foreground">0</p>
    </div>
  </section>

  <p class="text-sm text-muted-foreground">No pipeline activity yet.</p>
</div>
