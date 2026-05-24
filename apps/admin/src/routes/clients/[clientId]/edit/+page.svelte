<script>
	import ClientEditorForm from '$lib/components/ClientEditorForm.svelte';

	let { data, form } = $props();
</script>

<ClientEditorForm {form} client={data.client} mode="edit" />