<script>
	import MonitoringSiteForm from '$lib/components/MonitoringSiteForm.svelte';

	let { data, form } = $props();
</script>

<MonitoringSiteForm {form} site={data.site} mode="edit" />