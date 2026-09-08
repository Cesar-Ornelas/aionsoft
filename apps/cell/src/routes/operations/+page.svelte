<svelte:head><title>Operations Dashboard | Aionsoft Cell</title></svelte:head>

<div class="flex flex-col gap-8">
  <header>
    <p class="text-sm font-medium text-muted-foreground">Operations</p>
    <h1 class="mt-1 text-3xl font-semibold text-foreground">Dashboard</h1>
  </header>

  <section class="grid gap-6 border-b border-border pb-8 sm:grid-cols-3">
    <div>
      <p class="text-sm text-muted-foreground">Open tasks</p>
      <p class="mt-2 text-4xl font-semibold text-foreground">0</p>
    </div>
    <div>
      <p class="text-sm text-muted-foreground">Active incidents</p>
      <p class="mt-2 text-4xl font-semibold text-foreground">0</p>
    </div>
    <div>
      <p class="text-sm text-muted-foreground">Clients</p>
      <p class="mt-2 text-4xl font-semibold text-foreground">0</p>
    </div>
  </section>

  <p class="text-sm text-muted-foreground">No operational activity yet.</p>
</div>
