<script>
	import ClientContactForm from '$lib/components/ClientContactForm.svelte';

	let { data, form } = $props();
</script>

<ClientContactForm
	{form}
	clientId={data.client.id}
	mode="create"
	backHref={`/clients/${data.client.id}/overview`}
	backLabel="Back to profile"
/>