<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import type { Snippet } from "svelte";
  import { env } from "$env/dynamic/public";
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import ToastHost from "$lib/components/toast-host.svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";

  const swetrixProjectId = env.PUBLIC_SWETRIX_PROJECT_ID || "";
  const swetrixScriptUrl = env.PUBLIC_SWETRIX_SCRIPT_URL || "https://swetrix.org/swetrix.js";
  const swetrixApiUrl = env.PUBLIC_SWETRIX_API_URL || "https://analytics.aionsoft.io/backend/v1/log";
  const swetrixNoscriptBase = env.PUBLIC_SWETRIX_NOSCRIPT_URL || "https://analytics.aionsoft.io/backend/log/noscript";

  let {
    children,
    data
  }: {
    children?: Snippet;
    data: { user: { name: string; email: string; avatar: string }; hasLogtoManagement: boolean };
  } = $props();

  onMount(() => {
    if (!swetrixProjectId) return;

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

  function isSetupRoute() {
    return page.url.pathname.startsWith("/setup");
  }

  function formatBreadcrumbSegment(segment: string) {
    return decodeURIComponent(segment)
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function getBreadcrumbItems(pathname: string) {
    if (pathname === "/security" || pathname.startsWith("/security/")) {
      return [{ label: "Security", href: "/security" }];
    }

    const segments = pathname.split("/").filter(Boolean);

    if (segments.length === 0) {
      return [{ label: "Home", href: "/" }];
    }

    return segments.map((segment, index) => ({
      label: formatBreadcrumbSegment(segment),
      href: `/${segments.slice(0, index + 1).join("/")}`
    }));
  }

  const breadcrumbItems = $derived(getBreadcrumbItems(page.url.pathname));
</script>

<svelte:head>
  <title>__PROJECT_NAME__</title>
  <meta name="description" content="Aionsoft SvelteKit template" />
</svelte:head>

{#if isSetupRoute()}
  <main class="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
    <div class="mx-auto flex min-h-[calc(100vh-5rem)] max-w-7xl items-center justify-center">
      {@render children?.()}
    </div>
  </main>
{:else}
  <Sidebar.Provider>
    <AppSidebar user={data.user} hasLogtoManagement={data.hasLogtoManagement} />
    <ToastHost />

    <Sidebar.Inset>
      <header class="bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-3 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <Sidebar.Trigger class="-ms-1" />
          <Separator orientation="vertical" class="me-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb.Root>
            <Breadcrumb.List>
              {#each breadcrumbItems as item, index}
                <Breadcrumb.Item>
                  {#if index === breadcrumbItems.length - 1}
                    <Breadcrumb.Page class="line-clamp-1">{item.label}</Breadcrumb.Page>
                  {:else}
                    <Breadcrumb.Link href={item.href} class="line-clamp-1">{item.label}</Breadcrumb.Link>
                  {/if}
                </Breadcrumb.Item>

                {#if index < breadcrumbItems.length - 1}
                  <Breadcrumb.Separator />
                {/if}
              {/each}
            </Breadcrumb.List>
          </Breadcrumb.Root>
        </div>
      </header>

      <div class="flex flex-1 flex-col gap-4 p-4 sm:p-6">
        {@render children?.()}
      </div>

      <footer class="border-t border-border px-4 py-3 text-xs text-muted-foreground">© 2026 __PROJECT_NAME__. App default shell.</footer>
    </Sidebar.Inset>
  </Sidebar.Provider>
{/if}

{#if swetrixProjectId}
  <noscript>
    <img
      src={`${swetrixNoscriptBase}?pid=${encodeURIComponent(swetrixProjectId)}`}
      alt=""
      referrerpolicy="no-referrer-when-downgrade"
    />
  </noscript>
{/if}
