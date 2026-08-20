<script>
  let { form } = $props();
</script>

<div class="min-h-screen bg-slate-100 px-6 py-14 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
  <div class="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600 dark:text-sky-400">CRM setup</p>
    <h1 class="mt-3 text-3xl font-bold tracking-tight">Initialize PocketBase collections</h1>

    <p class="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
      This bootstrap creates the default CRM collections and seeds the first admin user from environment variables if they are configured.
    </p>

    <form method="POST" class="mt-8">
      <button
        type="submit"
        class="inline-flex items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
      >
        Run PocketBase setup
      </button>
    </form>

    {#if form?.message}
      <div class={`mt-6 rounded-2xl border px-4 py-3 text-sm ${form.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300' : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'}`}>
        {form.message}
      </div>
    {/if}
  </div>
</div>
