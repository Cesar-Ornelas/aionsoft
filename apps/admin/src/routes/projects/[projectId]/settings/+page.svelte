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

	function hexToRgb(color) {
		const value = String(color ?? '').replace('#', '');

		if (value.length !== 6) {
			return { red: 100, green: 116, blue: 139 };
		}

		return {
			red: Number.parseInt(value.slice(0, 2), 16),
			green: Number.parseInt(value.slice(2, 4), 16),
			blue: Number.parseInt(value.slice(4, 6), 16)
		};
	}

	function bucketPreviewStyle(color) {
		const { red, green, blue } = hexToRgb(color);
		return `border-color: rgba(${red}, ${green}, ${blue}, 0.52); box-shadow: inset 0 0 0 1px rgba(${red}, ${green}, ${blue}, 0.12), 0 24px 64px -34px rgba(${red}, ${green}, ${blue}, 0.34);`;
	}

	function countBadgeStyle(color) {
		const { red, green, blue } = hexToRgb(color);
		return `background-color: rgba(${red}, ${green}, ${blue}, 0.12); color: rgb(${red}, ${green}, ${blue});`;
	}
</script>

<section class="space-y-5">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Project Settings</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Project fields and lists</h1>
			<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">Update project-level details and add custom lists used by task views and the Kanban board.</p>
		</div>
		<a href={`/projects/${data.project.id}/export`} class="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">Export project</a>
	</header>

	{#if data.notice}
		<div class="rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">{data.notice}</div>
	{/if}

	<section class="rounded-[1.9rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
		<h2 class="text-lg font-semibold text-slate-950 dark:text-white">Project details</h2>
		<form method="POST" action="?/updateProject" class="mt-5 space-y-5">
			<div class="grid gap-5 lg:grid-cols-2">
				<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="name">Name</label><input id="name" name="name" value={values().name ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/40" /></div>
				<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="status">Status</label><select id="status" name="status" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/40"><option value="planning" selected={values().status === 'planning'}>Planning</option><option value="active" selected={values().status === 'active'}>Active</option><option value="on_hold" selected={values().status === 'on_hold'}>On hold</option><option value="completed" selected={values().status === 'completed'}>Completed</option><option value="canceled" selected={values().status === 'canceled'}>Canceled</option></select></div>
			</div>
			<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="description">Description</label><textarea id="description" name="description" rows="4" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/40">{values().description ?? ''}</textarea></div>
			<div class="grid gap-5 sm:grid-cols-2"><div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="startAt">Start</label><input id="startAt" name="startAt" type="date" value={values().startAt ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/40" /></div><div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="dueAt">Due</label><input id="dueAt" name="dueAt" type="date" value={values().dueAt ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/40" /></div></div>
			<div class="flex justify-end"><button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Update project</button></div>
		</form>
	</section>

	<section class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.55fr)]">
		<div class="rounded-[1.9rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/92">
			<div class="border-b border-slate-200 px-5 py-4 dark:border-white/10"><h2 class="text-lg font-semibold text-slate-950 dark:text-white">Lists</h2></div>
			<div class="divide-y divide-slate-100 dark:divide-white/5">
				{#each data.project.buckets as bucket}
					<div class="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)] lg:items-center">
						<div>
							<div class="flex items-start justify-between gap-4">
								<div>
									<p class="font-semibold text-slate-950 dark:text-white">{bucket.name}</p>
									<p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{bucket.key}</p>
								</div>
								<div class="text-right">
									<p class="text-sm text-slate-600 dark:text-slate-400">{statusLabel(bucket.status)}</p>
									<p class="mt-1 text-xs text-slate-400">{bucket.isTerminal ? 'Terminal' : 'Active'}</p>
								</div>
							</div>
							<div class="mt-4 rounded-[1.3rem] border bg-white/90 p-4 transition dark:bg-slate-950/65" style={bucketPreviewStyle(bucket.color)}>
								<div class="flex items-center justify-between gap-3">
									<div>
										<p class="font-semibold text-slate-950 dark:text-white">{bucket.name}</p>
										<p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">Glow preview</p>
									</div>
									<span class="rounded-full px-2.5 py-1 text-xs font-semibold" style={countBadgeStyle(bucket.color)}>4</span>
								</div>
							</div>
						</div>
						<form method="POST" action="?/updateBucketColor" class="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
							<input type="hidden" name="bucketId" value={bucket.id} />
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for={`bucket-color-${bucket.id}`}>Kanban glow color</label>
							<div class="mt-3 flex items-center gap-3">
								<input id={`bucket-color-${bucket.id}`} type="color" name="color" value={bucket.color} class="h-11 w-11 cursor-pointer rounded-full border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5" />
								<div class="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium uppercase tracking-[0.12em] text-slate-700 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200">{bucket.color}</div>
							</div>
							<p class="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">This color is used only for the kanban lane border and glow, not the full card or background.</p>
							<div class="mt-4 flex justify-end">
								<button class="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Save color</button>
							</div>
						</form>
					</div>
				{/each}
			</div>
		</div>

		<form method="POST" action="?/createBucket" class="rounded-[1.9rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
			<h2 class="text-lg font-semibold text-slate-950 dark:text-white">Add list</h2>
			<div class="mt-5 space-y-4">
				<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="bucket-name">Name</label><input id="bucket-name" name="name" value={bucketValues().name ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/40" placeholder="Review" /></div>
				<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="bucket-key">Key</label><input id="bucket-key" name="key" value={bucketValues().key ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/40" placeholder="review" /></div>
				<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="bucket-status">Mapped status</label><select id="bucket-status" name="status" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none focus:border-teal-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/40"><option value="open">Open</option><option value="in_progress">In progress</option><option value="on_hold">On hold</option><option value="deferred">Deferred</option><option value="completed">Completed</option><option value="canceled">Canceled</option></select></div>
				<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="bucket-create-color">Kanban glow color</label><input id="bucket-create-color" name="color" type="color" value={bucketValues().color ?? '#64748b'} class="mt-2 h-11 w-11 cursor-pointer rounded-full border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/5" /></div>
				<label class="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"><input type="checkbox" name="isTerminal" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950" /><span><span class="block font-semibold text-slate-950 dark:text-white">Terminal list</span><span class="mt-1 block text-slate-500 dark:text-slate-400">Tasks moved here are considered closed.</span></span></label>
				<button class="w-full rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Create list</button>
			</div>
		</form>
	</section>
</section>
