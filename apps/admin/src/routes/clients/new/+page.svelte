<script>
	import ClientEditorForm from '$lib/components/ClientEditorForm.svelte';

	let { form } = $props();
</script>

<ClientEditorForm {form} mode="create" />