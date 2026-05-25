<script>
	import TaskForm from '$lib/components/TaskForm.svelte';

	let { data, form } = $props();
</script>

<TaskForm {form} users={data.users} mode="create" />