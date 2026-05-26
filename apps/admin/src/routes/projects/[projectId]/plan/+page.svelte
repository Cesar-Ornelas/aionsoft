<script>
	let { data, form } = $props();

	let createPhaseOpen = $state(false);
	let createMilestoneOpen = $state(false);
	let createTaskOpen = $state(false);
	let expandedPhaseIds = $state([]);
	let expandedMilestoneIds = $state([]);

	$effect(() => {
		if (form?.intent === 'createTask') createTaskOpen = true;
		if (form?.intent === 'createPhase') createPhaseOpen = true;
		if (form?.intent === 'createMilestone') createMilestoneOpen = true;
		if (expandedPhaseIds.length === 0 && data.project.phases.length > 0) {
			expandedPhaseIds = data.project.phases.map((phase) => phase.id);
		}
		if (expandedMilestoneIds.length === 0 && data.project.milestones.length > 0) {
			expandedMilestoneIds = data.project.milestones.map((milestone) => milestone.id);
		}
	});

	function formatDate(value) {
		if (!value) return 'Not set';
		const date = value instanceof Date ? value : new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
		return Number.isNaN(date.getTime()) ? 'Not set' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
	}

	function statusLabel(status) {
		if (status === 'in_progress') return 'In progress';
		if (status === 'on_hold') return 'On hold';
		return String(status ?? 'open').replace('_', ' ');
	}

	function statusClass(status) {
		if (status === 'completed') return 'bg-emerald-50 text-emerald-700';
		if (status === 'canceled') return 'bg-rose-50 text-rose-700';
		if (status === 'in_progress') return 'bg-sky-50 text-sky-700';
		if (status === 'on_hold' || status === 'deferred') return 'bg-amber-50 text-amber-700';
		return 'bg-slate-100 text-slate-700';
	}

	function phaseMilestones(phaseId) {
		return data.project.milestones.filter((milestone) => milestone.phaseId === phaseId);
	}

	function phaseTasks(phaseId) {
		return data.project.tasks.filter((task) => task.phaseId === phaseId && !task.milestoneId);
	}

	function milestoneTasks(milestoneId) {
		return data.project.tasks.filter((task) => task.milestoneId === milestoneId);
	}

	function bucketName(bucketId) {
		return data.project.buckets.find((bucket) => bucket.id === bucketId)?.name ?? 'No list';
	}

	function togglePhase(phaseId) {
		expandedPhaseIds = expandedPhaseIds.includes(phaseId)
			? expandedPhaseIds.filter((id) => id !== phaseId)
			: [...expandedPhaseIds, phaseId];
	}

	function toggleMilestone(milestoneId) {
		expandedMilestoneIds = expandedMilestoneIds.includes(milestoneId)
			? expandedMilestoneIds.filter((id) => id !== milestoneId)
			: [...expandedMilestoneIds, milestoneId];
	}

	function taskValues() {
		return form?.intent === 'createTask' ? form.values ?? {} : {};
	}

	function taskErrors() {
		return form?.intent === 'createTask' ? form.errors ?? {} : {};
	}
</script>

<section class="space-y-5">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Project Plan</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Tree table</h1>
			<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600">Group the project by phase, milestone, and task while keeping delivery dates and progress visible.</p>
		</div>
		<div class="flex flex-wrap gap-3">
			<button class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700" type="button" onclick={() => (createPhaseOpen = !createPhaseOpen)}>Add phase</button>
			<button class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700" type="button" onclick={() => (createMilestoneOpen = !createMilestoneOpen)}>Add milestone</button>
			<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white" type="button" onclick={() => (createTaskOpen = !createTaskOpen)}>Add task</button>
		</div>
	</header>

	{#if data.notice}<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{data.notice}</div>{/if}
	{#if form?.message}<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{form.message}</div>{/if}

	{#if createPhaseOpen}
		<form method="POST" action="?/createPhase" class="grid gap-4 rounded-[1.7rem] border border-slate-200 bg-white p-5 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_10rem_10rem_auto] xl:items-end">
			<div><label class="block text-sm font-medium text-slate-700" for="phase-name">Phase name</label><input id="phase-name" name="name" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400" /></div>
			<div><label class="block text-sm font-medium text-slate-700" for="phase-description">Description</label><input id="phase-description" name="description" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400" /></div>
			<div><label class="block text-sm font-medium text-slate-700" for="phase-start">Start</label><input id="phase-start" name="startAt" type="date" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400" /></div>
			<div><label class="block text-sm font-medium text-slate-700" for="phase-due">Due</label><input id="phase-due" name="dueAt" type="date" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400" /></div>
			<button class="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Save phase</button>
		</form>
	{/if}

	{#if createMilestoneOpen}
		<form method="POST" action="?/createMilestone" class="grid gap-4 rounded-[1.7rem] border border-slate-200 bg-white p-5 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_10rem_10rem_auto] xl:items-end">
			<div><label class="block text-sm font-medium text-slate-700" for="milestone-name">Milestone name</label><input id="milestone-name" name="name" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400" /></div>
			<div><label class="block text-sm font-medium text-slate-700" for="milestone-phase">Phase</label><select id="milestone-phase" name="phaseId" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400">{#each data.project.phases as phase}<option value={phase.id}>{phase.name}</option>{/each}</select></div>
			<div><label class="block text-sm font-medium text-slate-700" for="milestone-start">Start</label><input id="milestone-start" name="startAt" type="date" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400" /></div>
			<div><label class="block text-sm font-medium text-slate-700" for="milestone-due">Due</label><input id="milestone-due" name="dueAt" type="date" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400" /></div>
			<button class="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Save milestone</button>
		</form>
	{/if}

	{#if createTaskOpen}
		<form method="POST" action="?/createTask" class="grid gap-4 rounded-[1.7rem] border border-slate-200 bg-white p-5 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_10rem_auto] xl:items-end">
			<div><label class="block text-sm font-medium text-slate-700" for="task-title">Task title</label><input id="task-title" name="title" value={taskValues().title ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400" />{#if taskErrors().title}<p class="mt-2 text-sm text-rose-600">{taskErrors().title}</p>{/if}</div>
			<div><label class="block text-sm font-medium text-slate-700" for="task-phase">Phase</label><select id="task-phase" name="phaseId" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400"><option value="">No phase</option>{#each data.project.phases as phase}<option value={phase.id} selected={taskValues().phaseId === phase.id}>{phase.name}</option>{/each}</select></div>
			<div><label class="block text-sm font-medium text-slate-700" for="task-milestone">Milestone</label><select id="task-milestone" name="milestoneId" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400"><option value="">No milestone</option>{#each data.project.milestones as milestone}<option value={milestone.id} selected={taskValues().milestoneId === milestone.id}>{milestone.name}</option>{/each}</select></div>
			<div><label class="block text-sm font-medium text-slate-700" for="task-due">Due</label><input id="task-due" name="dueAt" type="date" value={taskValues().dueAt ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400" /></div>
			<button class="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">Save task</button>
		</form>
	{/if}

	<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white">
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-slate-200 text-sm">
				<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400"><tr><th class="px-5 py-4">Item</th><th class="px-5 py-4">Dates</th><th class="px-5 py-4">Progress</th><th class="px-5 py-4">List</th><th class="px-5 py-4">Status</th></tr></thead>
				<tbody class="divide-y divide-slate-100">
					{#each data.project.phases as phase}
						<tr class="bg-slate-50/80">
							<td class="px-5 py-4"><button type="button" class="mr-3 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold" onclick={() => togglePhase(phase.id)}>{expandedPhaseIds.includes(phase.id) ? '-' : '+'}</button><span class="font-semibold text-slate-950">{phase.name}</span></td>
							<td class="px-5 py-4 text-slate-600">{formatDate(phase.startAt)} - {formatDate(phase.dueAt)}</td><td class="px-5 py-4 text-slate-500">Phase</td><td class="px-5 py-4 text-slate-500">-</td><td class="px-5 py-4 text-slate-500">-</td>
						</tr>
						{#if expandedPhaseIds.includes(phase.id)}
							{#each phaseMilestones(phase.id) as milestone}
								<tr class="bg-white">
									<td class="px-5 py-4 pl-12"><button type="button" class="mr-3 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-semibold" onclick={() => toggleMilestone(milestone.id)}>{expandedMilestoneIds.includes(milestone.id) ? '-' : '+'}</button><span class="font-semibold text-slate-800">{milestone.name}</span></td>
									<td class="px-5 py-4 text-slate-600">{formatDate(milestone.startAt)} - {formatDate(milestone.dueAt)}</td><td class="px-5 py-4 text-slate-500">Milestone</td><td class="px-5 py-4 text-slate-500">-</td><td class="px-5 py-4 text-slate-500">-</td>
								</tr>
								{#if expandedMilestoneIds.includes(milestone.id)}
									{#each milestoneTasks(milestone.id) as task}
										<tr><td class="px-5 py-4 pl-24"><span class="font-medium text-slate-800">{task.title}</span><p class="mt-1 text-xs text-slate-500">{task.description}</p></td><td class="px-5 py-4 text-slate-600">{formatDate(task.startAt)} - {formatDate(task.dueAt)}</td><td class="px-5 py-4 text-slate-600">{task.progressPercentage}%</td><td class="px-5 py-4 text-slate-600">{bucketName(task.bucketId)}</td><td class="px-5 py-4"><span class={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(task.status)}`}>{statusLabel(task.status)}</span></td></tr>
									{/each}
								{/if}
							{/each}
							{#each phaseTasks(phase.id) as task}
								<tr><td class="px-5 py-4 pl-12"><span class="font-medium text-slate-800">{task.title}</span><p class="mt-1 text-xs text-slate-500">{task.description}</p></td><td class="px-5 py-4 text-slate-600">{formatDate(task.startAt)} - {formatDate(task.dueAt)}</td><td class="px-5 py-4 text-slate-600">{task.progressPercentage}%</td><td class="px-5 py-4 text-slate-600">{bucketName(task.bucketId)}</td><td class="px-5 py-4"><span class={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(task.status)}`}>{statusLabel(task.status)}</span></td></tr>
							{/each}
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>
