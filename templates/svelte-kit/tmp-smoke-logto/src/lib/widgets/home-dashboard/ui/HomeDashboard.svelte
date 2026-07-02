<script lang="ts">
  import { SettingsHealthCard } from "$lib/features/settings-health";
  import type { SettingsHealth } from "$lib/features/settings-health";
  import { templateCapabilities } from "$lib/shared/model/template-capabilities";

  let { health }: { health: SettingsHealth } = $props();
</script>

<section class="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
  <div class="rounded-[28px] border border-slate-200/80 bg-white/85 p-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur sm:p-10">
    <p class="text-sm font-semibold uppercase tracking-[0.24em] text-brand-700">Aionsoft SvelteKit Template</p>
    <h1 class="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
      Build tmp-smoke-logto with Feature-Sliced Design from day one.
    </h1>
    <p class="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
      Pages orchestrate composition, features own user workflows, and entities own persistence contracts.
    </p>

    <div class="mt-7 flex flex-wrap gap-3">
      <a
        class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        href="https://feature-sliced.design/docs/get-started/overview"
      >
        FSD docs
      </a>
      <a
        class="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-950"
        href="https://kit.svelte.dev/docs"
      >
        SvelteKit docs
      </a>
    </div>

    <ul class="mt-7 space-y-2 text-sm text-slate-600">
      {#each templateCapabilities as capability}
        <li class="flex items-start gap-2">
          <span class="mt-1 h-2 w-2 rounded-full bg-brand-500"></span>
          <span>{capability}</span>
        </li>
      {/each}
    </ul>
  </div>

  <aside class="space-y-4">
    <SettingsHealthCard {health} />
    <section class="rounded-2xl border border-slate-200/85 bg-slate-950 p-5 text-slate-50 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">Layer Contract</p>
      <ul class="mt-3 space-y-2 text-sm text-slate-300">
        <li><span class="font-semibold text-white">pages</span> compose widgets and features</li>
        <li><span class="font-semibold text-white">features</span> depend on entities and shared</li>
        <li><span class="font-semibold text-white">entities</span> hold domain + persistence boundaries</li>
      </ul>
    </section>
  </aside>
</section>
