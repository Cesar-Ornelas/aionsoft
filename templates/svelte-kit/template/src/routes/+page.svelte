<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { HomeDashboard } from "$lib/widgets/home-dashboard";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<HomeDashboard health={data.health} />

<section class="mt-6 rounded-xl border border-border bg-card p-5">
  <header>
    <h2 class="text-base font-semibold">Notification Tester</h2>
    <p class="mt-1 text-sm text-muted-foreground">
      Trigger sample notifications for your current user to test the sidebar notifications panel.
    </p>
  </header>

  <div class="mt-4 flex flex-wrap gap-2">
    <form method="POST" action="?/triggerNotification">
      <input type="hidden" name="type" value="info" />
      <Button type="submit" variant="outline">Send info</Button>
    </form>

    <form method="POST" action="?/triggerNotification">
      <input type="hidden" name="type" value="success" />
      <Button type="submit" variant="outline">Send success</Button>
    </form>

    <form method="POST" action="?/triggerNotification">
      <input type="hidden" name="type" value="warning" />
      <Button type="submit" variant="outline">Send warning</Button>
    </form>

    <form method="POST" action="?/triggerNotification">
      <input type="hidden" name="type" value="error" />
      <Button type="submit" variant="outline">Send error</Button>
    </form>
  </div>
</section>
