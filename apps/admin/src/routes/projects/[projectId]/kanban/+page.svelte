<script>
	let { data, form } = $props();

	function bucketTasks(bucketId) {
		return data.project.tasks.filter((task) => task.bucketId === bucketId);
	}

	function otherBuckets(bucketId) {
		return data.project.buckets.filter((bucket) => bucket.id !== bucketId);
	}

	function formatDate(value) {
		if (!value) return 'No due date';
		const date = value instanceof Date ? value : new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
		return Number.isNaN(date.getTime()) ? 'No due date' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
	}

	function priorityClass(priority) {
		if (priority === 'critical') return 'bg-rose-50 text-rose-700';
		if (priority === 'high') return 'bg-amber-50 text-amber-700';
		if (priority === 'low') return 'bg-slate-100 text-slate-600';
		return 'bg-sky-50 text-sky-700';
	}
</script>

<section class="space-y-5">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Project Kanban</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Task board</h1>
			<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600">Move project-local tasks through default or custom lists. Drag/drop can be layered on after the server-backed board is stable.</p>
		</div>
		<a href={`/projects/${data.project.id}/tasks?new=1`} class="inline-flex h-10 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">Add task</a>
	</header>

	{#if data.notice}<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{data.notice}</div>{/if}
	{#if form?.message}<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{form.message}</div>{/if}

	<div class="overflow-x-auto pb-2">
		<div class="grid min-w-[72rem] gap-4" style={`grid-template-columns: repeat(${Math.max(1, data.project.buckets.length)}, minmax(17rem, 1fr));`}>
			{#each data.project.buckets as bucket}
				<section class="flex max-h-[calc(100dvh-12rem)] min-h-[28rem] flex-col rounded-[1.7rem] border border-slate-200 bg-slate-50/80">
					<div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
						<div><h2 class="font-semibold text-slate-950">{bucket.name}</h2><p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{bucket.status.replace('_', ' ')}</p></div>
						<span class="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">{bucketTasks(bucket.id).length}</span>
					</div>

					<div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
						{#if bucketTasks(bucket.id).length === 0}
							<div class="rounded-[1.3rem] border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">No tasks in this list.</div>
						{/if}
						{#each bucketTasks(bucket.id) as task}
							<article class="rounded-[1.3rem] border border-slate-200 bg-white p-4 shadow-sm">
								<div class="flex items-start justify-between gap-3">
									<div><p class="font-semibold text-slate-950">{task.title}</p><p class="mt-2 text-sm leading-6 text-slate-500">{task.description || 'No description'}</p></div>
									<span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClass(task.priority)}`}>{task.priority}</span>
								</div>
								<div class="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{formatDate(task.dueAt)}</span><span>{task.progressPercentage}%</span></div>
								<div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div class="h-full rounded-full bg-sky-400" style={`width: ${task.progressPercentage}%`}></div></div>
								<form method="POST" action="?/moveTask" class="mt-4 flex gap-2">
									<input type="hidden" name="taskId" value={task.id} />
									<input type="hidden" name="progressPercentage" value={task.progressPercentage} />
									<select name="bucketId" class="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none">
										{#each otherBuckets(bucket.id) as targetBucket}<option value={targetBucket.id}>{targetBucket.name}</option>{/each}
									</select>
									<button class="rounded-full bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Move</button>
								</form>
							</article>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	</div>
</section>
