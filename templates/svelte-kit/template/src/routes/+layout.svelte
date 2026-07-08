<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { goto } from "$app/navigation";
  import type { Snippet } from "svelte";
  import { env } from "$env/dynamic/public";
  import AppSidebar from "$lib/components/app-sidebar.svelte";
  import { Button } from "$lib/components/ui/button";
  import PinIcon from "@lucide/svelte/icons/pin";
  import { toastError, toastSuccess } from "$lib/stores/toast";
  import ToastHost from "$lib/components/toast-host.svelte";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Sheet from "$lib/components/ui/sheet";
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
    data: {
      user: { name: string; email: string; avatar: string };
      hasLogtoManagement: boolean;
      unreadNotificationsCount: number;
      notificationsFilter: "all";
      activeSystemAlert: {
        id: string;
        title: string;
        message: string;
        type: "info" | "success" | "warning" | "error";
        startsAt: Date | string;
        endsAt: Date | string;
      } | null;
      notifications: Array<{
        id: string;
        type: "info" | "success" | "warning" | "error";
        title: string;
        message: string;
        actionHref: string | null;
        readAt: Date | null | string;
        createdAt: Date | string;
      }>;
    };
  } = $props();

  let notificationsOpen = $state(false);
  let notifications = $state<typeof data.notifications>([]);
  let activeSystemAlert = $state<typeof data.activeSystemAlert>(null);
  let unreadNotificationsCount = $state(0);
  let pendingNotificationActions = $state<string[]>([]);
  let notificationsRefreshPending = $state(false);
  let latestSystemAlertId = $state<string | null>(null);

  type NotificationActionIntent = "markRead" | "markAllRead" | "delete";

  function getNotificationActionKey(intent: NotificationActionIntent, notificationId?: string) {
    return `${intent}:${notificationId ?? "all"}`;
  }

  function isNotificationActionPending(intent: NotificationActionIntent, notificationId?: string) {
    return pendingNotificationActions.includes(getNotificationActionKey(intent, notificationId));
  }

  $effect(() => {
    notifications = data.notifications;
    activeSystemAlert = data.activeSystemAlert;
    unreadNotificationsCount = data.unreadNotificationsCount;
    latestSystemAlertId = data.activeSystemAlert?.id ?? null;
  });

  function applyNotificationsPayload(
    payload: {
      notifications: typeof notifications;
      activeSystemAlert: typeof activeSystemAlert;
      unreadNotificationsCount: number;
    },
    options?: { toastOnNewSystemAlert?: boolean }
  ) {
    const nextSystemAlertId = payload.activeSystemAlert?.id ?? null;

    if (options?.toastOnNewSystemAlert && payload.activeSystemAlert && nextSystemAlertId !== latestSystemAlertId) {
      toastSuccess("System alert", payload.activeSystemAlert.title);
    }

    notifications = payload.notifications;
    activeSystemAlert = payload.activeSystemAlert;
    unreadNotificationsCount = payload.unreadNotificationsCount;
    latestSystemAlertId = nextSystemAlertId;
  }

  async function runNotificationAction(intent: NotificationActionIntent, notificationId?: string) {
    const actionKey = getNotificationActionKey(intent, notificationId);
    pendingNotificationActions = [...pendingNotificationActions, actionKey];

    try {
      const body = new URLSearchParams({
        intent,
        redirectTo: notificationsHref(activeNotificationsFilter())
      });

      if (notificationId) {
        body.set("notificationId", notificationId);
      }

      const response = await fetch("/notifications", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });

      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        toastError("Notifications action failed", payload.message || "Unable to update notifications.");
        return;
      }

      applyNotificationsPayload(payload);
    } catch {
      toastError("Notifications action failed", "Unable to update notifications.");
    } finally {
      pendingNotificationActions = pendingNotificationActions.filter((item) => item !== actionKey);
    }
  }

  async function refreshNotificationsFromServer() {
    if (notificationsRefreshPending) {
      return;
    }

    notificationsRefreshPending = true;

    try {
      const response = await fetch("/notifications", {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        return;
      }

      applyNotificationsPayload(payload, { toastOnNewSystemAlert: true });
    } finally {
      notificationsRefreshPending = false;
    }
  }

  function notificationsHref(filter?: "all" | "unread" | "read") {
    const url = new URL(page.url);
    url.searchParams.set("notifications", "1");

    if (filter && filter !== "all") {
      url.searchParams.set("notificationsFilter", filter);
    } else {
      url.searchParams.delete("notificationsFilter");
    }

    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ""}`;
  }

  function closeNotificationsHref() {
    const url = new URL(page.url);
    url.searchParams.delete("notifications");
    url.searchParams.delete("notificationsFilter");
    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ""}`;
  }

  function activeNotificationsFilter() {
    const filter = page.url.searchParams.get("notificationsFilter");
    return filter === "read" || filter === "unread" ? filter : "all";
  }

  function isUnread(readAt: Date | string | null) {
    return !readAt;
  }

  function formatNotificationDate(value: Date | string) {
    const date = typeof value === "string" ? new Date(value) : value;
    return Number.isNaN(date.getTime()) ? "Now" : date.toLocaleString();
  }

  function systemAlertToneClass(type: "info" | "success" | "warning" | "error") {
    if (type === "success") {
      return "border-emerald-300/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    }

    if (type === "error") {
      return "border-rose-300/50 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    }

    if (type === "info") {
      return "border-sky-300/50 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    }

    return "border-amber-300/50 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  const visibleNotifications = $derived.by(() => {
    const filter = activeNotificationsFilter();

    if (filter === "unread") {
      return notifications.filter((notification) => isUnread(notification.readAt));
    }

    if (filter === "read") {
      return notifications.filter((notification) => !isUnread(notification.readAt));
    }

    return notifications;
  });

  onMount(() => {
    if (swetrixProjectId) {
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
    }

    const notificationsError = page.url.searchParams.get("notificationsError");

    if (notificationsError) {
      toastError("Notifications action failed", decodeURIComponent(notificationsError));
    }

    if (isSetupRoute() || typeof EventSource === "undefined") {
      return;
    }

    const stream = new EventSource("/notifications/stream");
    const onNotification = () => {
      void refreshNotificationsFromServer();
    };

    stream.addEventListener("notification", onNotification);

    return () => {
      stream.removeEventListener("notification", onNotification);
      stream.close();
    };
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

  $effect(() => {
    if (page.url.searchParams.get("notifications") === "1") {
      notificationsOpen = true;
    }
  });

  $effect(() => {
    if (!notificationsOpen && page.url.searchParams.get("notifications") === "1") {
      void goto(closeNotificationsHref(), { keepFocus: true, noScroll: true, replaceState: true });
    }
  });
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
    <AppSidebar
      user={data.user}
      hasLogtoManagement={data.hasLogtoManagement}
      notificationsHref={notificationsHref()}
      unreadNotificationsCount={unreadNotificationsCount}
    />
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

    <Sheet.Root bind:open={notificationsOpen}>
      <Sheet.Content side="right" class="w-full max-w-xl overflow-y-auto p-0 [&>button]:hidden">
        <Sheet.Header class="p-6 pb-3">
          <Sheet.Title>Notifications</Sheet.Title>
        </Sheet.Header>

        <div class="px-6 pb-6">
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <a href={notificationsHref("all")}>
              <Button variant={activeNotificationsFilter() === "all" ? "default" : "outline"} size="sm">All</Button>
            </a>
            <a href={notificationsHref("unread")}>
              <Button variant={activeNotificationsFilter() === "unread" ? "default" : "outline"} size="sm">Unread</Button>
            </a>
            <a href={notificationsHref("read")}>
              <Button variant={activeNotificationsFilter() === "read" ? "default" : "outline"} size="sm">Read</Button>
            </a>

            <Button
              type="button"
              variant="outline"
              size="sm"
              class="ms-auto"
              disabled={isNotificationActionPending("markAllRead")}
              onclick={() => runNotificationAction("markAllRead")}
            >
              {isNotificationActionPending("markAllRead") ? "Marking..." : "Mark all read"}
            </Button>
          </div>

          {#if visibleNotifications.length === 0 && !activeSystemAlert}
            <p class="rounded-lg border border-border bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
              No notifications yet.
            </p>
          {:else}
            <div class="space-y-3">
              {#if activeSystemAlert}
                <article class="rounded-lg border border-border bg-card p-3">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <p class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        <PinIcon class="size-3.5" />
                        System Alert
                      </p>
                      <p class="mt-1 text-sm font-semibold">{activeSystemAlert.title}</p>
                      <p class="mt-1 text-sm text-muted-foreground">{activeSystemAlert.message}</p>
                      <p class="mt-2 text-xs text-muted-foreground">
                        Active until {formatNotificationDate(activeSystemAlert.endsAt)}
                      </p>
                    </div>
                    <span class={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${systemAlertToneClass(activeSystemAlert.type)}`}>
                      {activeSystemAlert.type}
                    </span>
                  </div>
                </article>
              {/if}

              {#each visibleNotifications as notification}
                <article class="rounded-lg border border-border bg-card p-3">
                  <div class="flex items-start justify-between gap-2">
                    <div>
                      <p class="text-sm font-semibold">{notification.title}</p>
                      <p class="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                      <p class="mt-2 text-xs text-muted-foreground">{formatNotificationDate(notification.createdAt)}</p>
                    </div>
                    {#if isUnread(notification.readAt)}
                      <span class="rounded-full bg-cyan-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                        New
                      </span>
                    {/if}
                  </div>

                  <div class="mt-3 flex flex-wrap items-center gap-2">
                    {#if notification.actionHref}
                      <a href={notification.actionHref}>
                        <Button variant="outline" size="sm">Open</Button>
                      </a>
                    {/if}

                    {#if isUnread(notification.readAt)}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isNotificationActionPending("markRead", notification.id)}
                        onclick={() => runNotificationAction("markRead", notification.id)}
                      >
                        {isNotificationActionPending("markRead", notification.id) ? "Marking..." : "Mark read"}
                      </Button>
                    {/if}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      class="ms-auto"
                      disabled={isNotificationActionPending("delete", notification.id)}
                      onclick={() => runNotificationAction("delete", notification.id)}
                    >
                      {isNotificationActionPending("delete", notification.id) ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        </div>
      </Sheet.Content>
    </Sheet.Root>
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
