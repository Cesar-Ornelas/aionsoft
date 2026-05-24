<script>
	import ClientContactForm from '$lib/components/ClientContactForm.svelte';

	let { data, form } = $props();
</script>

<ClientContactForm
	{form}
	contact={data.contact}
	clientId={data.client.id}
	mode="edit"
	backHref={`/clients/${data.client.id}/overview`}
	backLabel="Back to profile"
/>