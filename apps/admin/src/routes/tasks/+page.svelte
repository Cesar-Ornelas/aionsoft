<script>
	let { data, form } = $props();

	function formatDate(value) {
		if (!value) {
			return 'Not available';
		}

		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}
</script>

<section class="space-y-5">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Tasks</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Assigned work and due dates</h1>
			<p class="mt-2 text-sm leading-7 text-slate-600">
				Track due dates, reminders, recurrence, assignees, and tags from one operational list.
			</p>
		</div>

		<a href="/tasks/new" class="inline-flex h-10 items-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800">
			Add task
		</a>
	</header>

	<form method="GET" class="grid gap-4 rounded-[1.7rem] border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.7fr))_auto] sm:p-5">
		<div>
			<label class="block text-sm font-medium text-slate-700" for="q">Search</label>
			<input id="q" name="q" value={data.filters.q ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400" placeholder="Search titles, assignees, tags" />
		</div>

		<div>
			<label class="block text-sm font-medium text-slate-700" for="status">Status</label>
			<select id="status" name="status" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400">
				<option value="">All statuses</option>
				<option value="open" selected={data.filters.status === 'open'}>Open</option>
				<option value="completed" selected={data.filters.status === 'completed'}>Completed</option>
			</select>
		</div>

		<div>
			<label class="block text-sm font-medium text-slate-700" for="tag">Tag</label>
			<select id="tag" name="tag" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400">
				<option value="">All tags</option>
				{#each data.availableTags as tag}
					<option value={tag.key} selected={data.filters.tag === tag.key}>{tag.name}</option>
				{/each}
			</select>
		</div>

		<div>
			<label class="block text-sm font-medium text-slate-700" for="assignee">Assignee</label>
			<select id="assignee" name="assignee" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-teal-400">
				<option value="">All assignees</option>
				{#each data.availableAssignees as assignee}
					<option value={assignee.id} selected={data.filters.assignee === assignee.id}>{assignee.name}</option>
				{/each}
			</select>
		</div>

		<div class="flex items-end gap-3">
			<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Filter</button>
			<a href="/tasks" class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">Reset</a>
		</div>
	</form>

	{#if data.notice}
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
			{data.notice}
		</div>
	{/if}

	{#if data.errorMessage || form?.message}
		<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
			{data.errorMessage || form?.message}
		</div>
	{/if}

	<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm">
				<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
					<tr>
						<th class="px-5 py-4">Task</th>
						<th class="px-5 py-4">Due</th>
						<th class="px-5 py-4">Repeat</th>
						<th class="px-5 py-4">Assignees</th>
						<th class="px-5 py-4">Tags</th>
						<th class="px-5 py-4">Status</th>
						<th class="px-5 py-4 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-100">
					{#if data.tasks.length === 0}
						<tr>
							<td colspan="7" class="px-5 py-10 text-center text-sm text-slate-500">
								No tasks match the current filters.
							</td>
						</tr>
					{:else}
						{#each data.tasks as task}
							<tr class="bg-white">
								<td class="px-5 py-4 align-top">
									<p class="font-semibold text-slate-950">{task.title}</p>
									<p class="mt-1 max-w-md text-sm text-slate-500">{task.description || 'No description'}</p>
								</td>
								<td class="px-5 py-4 align-top text-slate-600">{formatDate(task.dueAt)}</td>
								<td class="px-5 py-4 align-top text-slate-600">{task.recurrenceRule}</td>
								<td class="px-5 py-4 align-top text-slate-600">
									{#if task.assignedUsers.length === 0}
										No assignees
									{:else}
										{task.assignedUsers.map((user) => user.name).join(', ')}
									{/if}
								</td>
								<td class="px-5 py-4 align-top text-slate-600">
									{#if task.tags.length === 0}
										No tags
									{:else}
										<div class="flex flex-wrap gap-2">
											{#each task.tags as tag}
												<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{tag.name}</span>
											{/each}
										</div>
									{/if}
								</td>
								<td class="px-5 py-4 align-top">
									<span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${task.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
										{task.status}
									</span>
								</td>
								<td class="px-5 py-4 text-right align-top">
									<div class="flex justify-end gap-2">
										<a href={`/tasks/${task.id}/edit`} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
											Edit
										</a>

										{#if task.status !== 'completed'}
											<form method="POST" action="?/complete">
												<input type="hidden" name="taskId" value={task.id} />
												<button class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
													Complete
												</button>
											</form>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</section>