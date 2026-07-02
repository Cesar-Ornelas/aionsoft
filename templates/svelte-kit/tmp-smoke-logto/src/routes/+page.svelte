<script lang="ts">
  import { HomeDashboard } from "$lib/widgets/home-dashboard";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<HomeDashboard health={data.health} />
