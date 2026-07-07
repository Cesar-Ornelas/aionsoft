<script lang="ts">
  import { toastStore, dismiss } from "$lib/stores/toast";
</script>

<div class="fixed right-4 top-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:w-full">
  {#each $toastStore as item (item.id)}
    <div
      class={`rounded-xl border px-4 py-3 shadow-lg backdrop-blur ${item.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : item.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-border bg-background text-foreground"}`}
      role="status"
      aria-live="polite"
    >
      <div class="flex items-start gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold">{item.title}</p>
          {#if item.description}
            <p class="mt-1 text-sm opacity-80">{item.description}</p>
          {/if}
        </div>
        <button class="text-xs font-semibold uppercase tracking-[0.14em] opacity-70 transition hover:opacity-100" type="button" on:click={() => dismiss(item.id)}>
          Close
        </button>
      </div>
    </div>
  {/each}
</div>
