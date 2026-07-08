<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Sheet from "$lib/components/ui/sheet";
  import { toastError, toastSuccess } from "$lib/stores/toast";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData | null | undefined } = $props();

  function createDrawerOpen() {
    return page.url.searchParams.get("new") === "1" || form?.intent === "create";
  }

  let createOpen = $state(false);

  function createDrawerHref(open: boolean) {
    const url = new URL(page.url);

    if (open) {
      url.searchParams.set("new", "1");
    } else {
      url.searchParams.delete("new");
    }

    const search = url.searchParams.toString();
    return `${url.pathname}${search ? `?${search}` : ""}`;
  }

  function createValues() {
    if (form?.intent !== "create") {
      return undefined;
    }

    return form.values as
      | {
          title?: string;
          message?: string;
          type?: string;
          startDate?: string;
          startTime?: string;
          endDate?: string;
          endTime?: string;
          startsAt?: string;
          endsAt?: string;
        }
      | undefined;
  }

  function formatDateValue(value: Date | string) {
    const date = typeof value === "string" ? new Date(value) : value;

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    const hours = `${date.getHours()}`.padStart(2, "0");
    const minutes = `${date.getMinutes()}`.padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function formatDisplayDate(value: Date | string) {
    const date = typeof value === "string" ? new Date(value) : value;
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
  }

  function nowDateValue() {
    const date = new Date();
    return formatDateValue(date);
  }

  function nowPlusHourDateValue() {
    const date = new Date();
    date.setHours(date.getHours() + 1);
    return formatDateValue(date);
  }

  function datePart(value: string) {
    return value.slice(0, 10);
  }

  function timePart(value: string) {
    return value.slice(11, 16);
  }

  function statusLabel(alert: PageData["alerts"][number]) {
    const now = Date.now();
    const startsAt = new Date(alert.startsAt).getTime();
    const endsAt = new Date(alert.endsAt).getTime();

    if (!alert.isActive) {
      return "Inactive";
    }

    if (now < startsAt) {
      return "Scheduled";
    }

    if (now > endsAt) {
      return "Expired";
    }

    return "Active";
  }

  $effect(() => {
    if (createDrawerOpen()) {
      createOpen = true;
    }
  });

  $effect(() => {
    if (!createOpen && page.url.searchParams.has("new")) {
      void goto(createDrawerHref(false), { keepFocus: true, noScroll: true, replaceState: true });
    }
  });

  onMount(() => {
    if (data.notice) {
      toastSuccess("System alerts", data.notice);
    }

    if (data.errorMessage) {
      toastError("System alerts unavailable", data.errorMessage);
    }

    if (form?.intent === "create" && form?.message) {
      toastError("Unable to create system alert", form.message);
    }

    if (form?.intent === "delete" && form?.message) {
      toastError("Unable to delete system alert", form.message);
    }
  });
</script>

<section class="space-y-6">
  <div class="flex items-center justify-between rounded-xl border border-border bg-card p-5">
    <div>
      <h2 class="text-base font-semibold">System Alerts</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Alerts are global and non-removable by end users. Only one alert can be active at a time.
      </p>
    </div>
    <a href={createDrawerHref(true)}>
      <Button type="button">New system alert</Button>
    </a>
  </div>

  <div class="overflow-hidden rounded-xl border border-border bg-card">
    <table class="min-w-full divide-y divide-border text-sm">
      <thead class="bg-muted/40 text-left text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <tr>
          <th class="px-4 py-3">Title</th>
          <th class="px-4 py-3">Type</th>
          <th class="px-4 py-3">Start</th>
          <th class="px-4 py-3">End</th>
          <th class="px-4 py-3">Status</th>
          <th class="px-4 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        {#if data.alerts.length === 0}
          <tr>
            <td colspan="6" class="px-4 py-6 text-center text-muted-foreground">No system alerts created yet.</td>
          </tr>
        {:else}
          {#each data.alerts as alert}
            <tr>
              <td class="px-4 py-3">
                <p class="font-medium">{alert.title}</p>
                <p class="mt-1 text-xs text-muted-foreground">{alert.message}</p>
              </td>
              <td class="px-4 py-3 uppercase text-muted-foreground">{alert.type}</td>
              <td class="px-4 py-3 text-muted-foreground">{formatDisplayDate(alert.startsAt)}</td>
              <td class="px-4 py-3 text-muted-foreground">{formatDisplayDate(alert.endsAt)}</td>
              <td class="px-4 py-3 text-muted-foreground">{statusLabel(alert)}</td>
              <td class="px-4 py-3 text-right">
                <form method="POST" action="?/delete" class="inline-block">
                  <input type="hidden" name="alertId" value={alert.id} />
                  <Button type="submit" variant="outline" size="sm">Delete</Button>
                </form>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <Sheet.Root bind:open={createOpen}>
    <Sheet.Content side="right" class="w-full max-w-xl overflow-y-auto p-0 [&>button]:hidden">
      <Sheet.Header class="p-6 pb-2">
        <Sheet.Title>Create System Alert</Sheet.Title>
      </Sheet.Header>

      <div class="px-6 pb-6">
        <form method="POST" action="?/create" class="mt-4 space-y-4">
          <div>
            <label class="text-sm font-medium" for="title">Title</label>
            <input
              id="title"
              name="title"
              value={createValues()?.title ?? ""}
              class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Scheduled maintenance"
            />
            {#if form?.errors?.title}
              <p class="mt-1 text-sm text-rose-600">{form.errors.title}</p>
            {/if}
          </div>

          <div>
            <label class="text-sm font-medium" for="message">Message</label>
            <textarea
              id="message"
              name="message"
              rows="4"
              class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Platform access will be limited while maintenance is in progress."
            >{createValues()?.message ?? ""}</textarea>
            {#if form?.errors?.message}
              <p class="mt-1 text-sm text-rose-600">{form.errors.message}</p>
            {/if}
          </div>

          <div class="space-y-4">
            <div>
              <label class="text-sm font-medium" for="type">Type</label>
              <select
                id="type"
                name="type"
                class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={createValues()?.type ?? "warning"}
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div>
              <label class="text-sm font-medium" for="start-date">Start date</label>
              <input
                id="start-date"
                type="date"
                name="startDate"
                value={createValues()?.startDate ?? datePart(createValues()?.startsAt ?? nowDateValue())}
                class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              {#if form?.errors?.startDate}
                <p class="mt-1 text-sm text-rose-600">{form.errors.startDate}</p>
              {/if}
            </div>

            <div>
              <label class="text-sm font-medium" for="start-time">Start time</label>
              <input
                id="start-time"
                type="time"
                name="startTime"
                value={createValues()?.startTime ?? timePart(createValues()?.startsAt ?? nowDateValue())}
                class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              {#if form?.errors?.startTime}
                <p class="mt-1 text-sm text-rose-600">{form.errors.startTime}</p>
              {/if}
            </div>

            <div>
              <label class="text-sm font-medium" for="end-date">End date</label>
              <input
                id="end-date"
                type="date"
                name="endDate"
                value={createValues()?.endDate ?? datePart(createValues()?.endsAt ?? nowPlusHourDateValue())}
                class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              {#if form?.errors?.endDate}
                <p class="mt-1 text-sm text-rose-600">{form.errors.endDate}</p>
              {/if}
            </div>

            <div>
              <label class="text-sm font-medium" for="end-time">End time</label>
              <input
                id="end-time"
                type="time"
                name="endTime"
                value={createValues()?.endTime ?? timePart(createValues()?.endsAt ?? nowPlusHourDateValue())}
                class="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              {#if form?.errors?.endTime}
                <p class="mt-1 text-sm text-rose-600">{form.errors.endTime}</p>
              {/if}
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Sheet.Close>
              {#snippet child({ props })}
                <a href={createDrawerHref(false)} class="rounded-md border border-border px-4 py-2 text-sm font-medium" {...props}>Cancel</a>
              {/snippet}
            </Sheet.Close>
            <Button type="submit">Create alert</Button>
          </div>
        </form>
      </div>
    </Sheet.Content>
  </Sheet.Root>
</section>
