<script>
	let { data, form } = $props();

	function values() {
		return form?.intent === 'updateProject' ? form.values ?? {} : data.project;
	}

	function bucketValues() {
		return form?.intent === 'createBucket' ? form.values ?? {} : {};
	}

	function statusLabel(status) {
		if (status === 'in_progress') return 'In progress';
		if (status === 'on_hold') return 'On hold';
		return String(status ?? 'open').replace('_', ' ');
	}
</script>

<section class="space-y-5">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Project Settings</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Project fields and lists</h1>
			<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600">Update project-level details and add custom lists used by task views and the Kanban board.</p>
		</div>
		<a href={`/projects/${data.project.id}/export`} class="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">Export project</a>
	</header>

	{#if data.notice}<div class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{data.notice}</div>{/if}
	{#if form?.message}<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{form.message}</div>{/if}

	<section class="rounded-[1.9rem] border border-slate-200 bg-white p-5">
		<h2 class="text-lg font-semibold text-slate-950">Project details</h2>
		<form method="POST" action="?/updateProject" class="mt-5 space-y-5">
			<div class="grid gap-5 lg:grid-cols-2">
				<div><label class="block text-sm font-medium text-slate-700" for="name">Name</label><input id="name" name="name" value={values().name ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400" /></div>
				<div><label class="block text-sm font-medium text-slate-700" for="status">Status</label><select id="status" name="status" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400"><option value="planning" selected={values().status === 'planning'}>Planning</option><option value="active" selected={values().status === 'active'}>Active</option><option value="on_hold" selected={values().status === 'on_hold'}>On hold</option><option value="completed" selected={values().status === 'completed'}>Completed</option><option value="canceled" selected={values().status === 'canceled'}>Canceled</option></select></div>
			</div>
			<div><label class="block text-sm font-medium text-slate-700" for="description">Description</label><textarea id="description" name="description" rows="4" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400">{values().description ?? ''}</textarea></div>
			<div class="grid gap-5 sm:grid-cols-2"><div><label class="block text-sm font-medium text-slate-700" for="startAt">Start</label><input id="startAt" name="startAt" type="date" value={values().startAt ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400" /></div><div><label class="block text-sm font-medium text-slate-700" for="dueAt">Due</label><input id="dueAt" name="dueAt" type="date" value={values().dueAt ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400" /></div></div>
			<div class="flex justify-end"><button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Update project</button></div>
		</form>
	</section>

	<section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.55fr)]">
		<div class="rounded-[1.9rem] border border-slate-200 bg-white">
			<div class="border-b border-slate-200 px-5 py-4"><h2 class="text-lg font-semibold text-slate-950">Lists</h2></div>
			<div class="divide-y divide-slate-100">
				{#each data.project.buckets as bucket}
					<div class="flex items-center justify-between gap-4 px-5 py-4"><div><p class="font-semibold text-slate-950">{bucket.name}</p><p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{bucket.key}</p></div><div class="text-right"><p class="text-sm text-slate-600">{statusLabel(bucket.status)}</p><p class="mt-1 text-xs text-slate-400">{bucket.isTerminal ? 'Terminal' : 'Active'}</p></div></div>
				{/each}
			</div>
		</div>

		<form method="POST" action="?/createBucket" class="rounded-[1.9rem] border border-slate-200 bg-white p-5">
			<h2 class="text-lg font-semibold text-slate-950">Add list</h2>
			<div class="mt-5 space-y-4">
				<div><label class="block text-sm font-medium text-slate-700" for="bucket-name">Name</label><input id="bucket-name" name="name" value={bucketValues().name ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400" placeholder="Review" /></div>
				<div><label class="block text-sm font-medium text-slate-700" for="bucket-key">Key</label><input id="bucket-key" name="key" value={bucketValues().key ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400" placeholder="review" /></div>
				<div><label class="block text-sm font-medium text-slate-700" for="bucket-status">Mapped status</label><select id="bucket-status" name="status" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-400"><option value="open">Open</option><option value="in_progress">In progress</option><option value="on_hold">On hold</option><option value="deferred">Deferred</option><option value="completed">Completed</option><option value="canceled">Canceled</option></select></div>
				<label class="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700"><input type="checkbox" name="isTerminal" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950" /><span><span class="block font-semibold text-slate-950">Terminal list</span><span class="mt-1 block text-slate-500">Tasks moved here are considered closed.</span></span></label>
				<button class="w-full rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Create list</button>
			</div>
		</form>
	</section>
</section>
