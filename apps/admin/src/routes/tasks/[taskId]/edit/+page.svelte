<script>
	import TaskForm from '$lib/components/TaskForm.svelte';

	let { data, form } = $props();
</script>

<TaskForm {form} task={data.task} users={data.users} mode="edit" />