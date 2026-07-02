<script lang="ts">
  import type { SettingsHealth } from "$lib/features/settings-health/model/types";

  let { health }: { health: SettingsHealth } = $props();
</script>

<section class="rounded-2xl border border-slate-200/85 bg-white/90 p-5 shadow-sm">
  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Reference Feature Slice</p>
  <h2 class="mt-2 text-xl font-semibold text-slate-900">Settings Health</h2>

  <p class="mt-3 text-sm leading-6 text-slate-600">{health.reason}</p>

  <div class="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold {health.status === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
    <span class="h-2 w-2 rounded-full {health.status === 'connected' ? 'bg-emerald-600' : 'bg-amber-600'}"></span>
    {health.status === "connected" ? "Connected" : "Unavailable"}
  </div>
</section>
