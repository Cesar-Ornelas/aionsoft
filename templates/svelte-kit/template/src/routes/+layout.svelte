<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { env } from "$env/dynamic/public";

  const swetrixProjectId = env.PUBLIC_SWETRIX_PROJECT_ID || "";
  const swetrixScriptUrl = env.PUBLIC_SWETRIX_SCRIPT_URL || "https://swetrix.org/swetrix.js";
  const swetrixApiUrl = env.PUBLIC_SWETRIX_API_URL || "https://analytics.aionsoft.io/backend/v1/log";
  const swetrixNoscriptBase = env.PUBLIC_SWETRIX_NOSCRIPT_URL || "https://analytics.aionsoft.io/backend/log/noscript";

  onMount(() => {
    if (!swetrixProjectId) return;

    const existing = document.querySelector('script[data-analytics="swetrix"]');
    if (existing) return;

    const script = document.createElement("script");
    script.src = swetrixScriptUrl;
    script.defer = true;
    script.dataset.analytics = "swetrix";

    script.addEventListener("load", () => {
      if (!("swetrix" in globalThis)) return;

      // @ts-expect-error swetrix is injected globally by the analytics script.
      globalThis.swetrix.init(swetrixProjectId, { apiURL: swetrixApiUrl });
      // @ts-expect-error swetrix is injected globally by the analytics script.
      globalThis.swetrix.trackViews();
    });

    document.head.appendChild(script);
  });
</script>

<svelte:head>
  <title>__PROJECT_NAME__</title>
  <meta name="description" content="Aionsoft SvelteKit template" />
</svelte:head>

<main class="mx-auto min-h-screen w-full max-w-6xl px-5 py-12 sm:px-8 lg:px-10">
  <slot />
</main>

{#if swetrixProjectId}
  <noscript>
    <img
      src={`${swetrixNoscriptBase}?pid=${encodeURIComponent(swetrixProjectId)}`}
      alt=""
      referrerpolicy="no-referrer-when-downgrade"
    />
  </noscript>
{/if}
