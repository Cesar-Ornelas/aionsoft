<script>
	import MonitoringSiteForm from '$lib/components/MonitoringSiteForm.svelte';

	let { form } = $props();
</script>

<MonitoringSiteForm {form} mode="create" />