<script>
	import TaskForm from '$lib/components/TaskForm.svelte';

	let { data, form } = $props();
</script>

<section class="min-h-[calc(100vh-7rem)] overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc,#eef2ff_58%,#e0f2fe)]">
	<div class="flex min-h-[calc(100vh-7rem)] justify-end">
		<div class="hidden min-w-0 flex-1 px-8 py-8 lg:flex lg:items-end xl:px-12">
			<div class="max-w-xl rounded-[2rem] border border-white/80 bg-white/65 p-8 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.45)] backdrop-blur-xl">
				<p class="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">Quick Create</p>
				<h1 class="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Add work without switching into a full form page.</h1>
				<p class="mt-4 text-sm leading-7 text-slate-600">
					This panel keeps task creation focused and compact. Save the task and return directly to the list with reminders, assignees, and tags already configured.
				</p>
			</div>
		</div>

		<div class="w-full bg-white shadow-[-24px_0_80px_-48px_rgba(15,23,42,0.45)] lg:w-[40%] lg:min-w-[30rem] xl:min-w-[34rem]">
			<TaskForm {form} users={data.users} mode="create" surface="drawer" />
		</div>
	</div>
</section>