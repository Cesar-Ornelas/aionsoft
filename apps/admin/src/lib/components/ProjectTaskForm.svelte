<script>
	import ProjectNoteEditor from '$lib/components/ProjectNoteEditor.svelte';

	let {
		form,
		project,
		task = null,
		users = [],
		mode = 'create',
		formAction = null,
		commentAction = null,
		initialSection = 'general',
		backHref = '',
		backLabel = 'Close'
	} = $props();

	let activeSection = $state('general');
	let selectedStatus = $state('open');
	let progressPercentage = $state('0');
	let taskDescription = $state('');
	let appliedSectionSeed = 'general';

	const statusOptions = [
		{ value: 'open', label: 'Open' },
		{ value: 'in_progress', label: 'In progress' },
		{ value: 'on_hold', label: 'On hold' },
		{ value: 'deferred', label: 'Deferred' },
		{ value: 'completed', label: 'Completed' },
		{ value: 'canceled', label: 'Canceled' }
	];
	const priorityOptions = [
		{ value: 'low', label: 'Low' },
		{ value: 'normal', label: 'Normal' },
		{ value: 'high', label: 'High' },
		{ value: 'critical', label: 'Critical' }
	];

	function values() {
		return form?.values ?? task ?? {};
	}

	function errors() {
		return form?.errors ?? {};
	}

	function taskComments() {
		return task?.comments ?? [];
	}

	function assignedUserIds() {
		return values().assignedUserIds ?? values().assignedUsers?.map((user) => user.id) ?? [];
	}

	function tagsInput() {
		if (values().tagsInput != null) return values().tagsInput;
		if (Array.isArray(values().tags)) return values().tags.map((tag) => typeof tag === 'string' ? tag : tag.name).filter(Boolean).join(', ');
		return values().tags ?? '';
	}

	function commentValue() {
		return form?.intent === 'addComment' ? form.commentBody ?? '' : '';
	}

	function commentErrors() {
		return form?.intent === 'addComment' ? form.commentErrors ?? {} : {};
	}

	function commentMessage() {
		return form?.intent === 'addComment' ? form.commentMessage ?? '' : '';
	}

	function formatCommentDate(value) {
		if (!value) return 'Just now';
		return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
	}

	const statusSeed = $derived(String(values().status ?? 'open'));
	const progressSeed = $derived(String(values().progressPercentage ?? '0'));
	const sectionSeed = $derived(mode === 'edit' && initialSection === 'comments' ? 'comments' : 'general');
	const descriptionSeed = $derived(String(values().description ?? ''));

	$effect(() => {
		if (sectionSeed !== appliedSectionSeed) {
			appliedSectionSeed = sectionSeed;
			activeSection = sectionSeed;
		}
	});

	$effect(() => {
		if (selectedStatus !== statusSeed) {
			selectedStatus = statusSeed;
		}

		const nextProgress = statusSeed === 'completed' ? '100' : progressSeed;
		if (progressPercentage !== nextProgress) {
			progressPercentage = nextProgress;
		}
	});

	$effect(() => {
		if (selectedStatus === 'completed' && progressPercentage !== '100') {
			progressPercentage = '100';
		}
	});

	$effect(() => {
		if (taskDescription !== descriptionSeed) {
			taskDescription = descriptionSeed;
		}
	});

	function drawerSections() {
		const sections = [
			{ key: 'general', label: 'General' },
			{ key: 'content', label: 'Content' }
		];

		if (mode === 'edit') {
			sections.push({ key: 'comments', label: `Comments${taskComments().length ? ` (${taskComments().length})` : ''}` });
		}

		return sections;
	}

	function handleProgressInput(event) {
		progressPercentage = event.currentTarget.value;
		if (Number.parseInt(progressPercentage, 10) > 0 && selectedStatus === 'open') {
			selectedStatus = 'in_progress';
		}
	}
</script>

<section class="flex h-full flex-col bg-white dark:bg-slate-950">
	<div class="border-b border-slate-200 px-5 py-5 dark:border-white/10 sm:px-6">
		<div class="flex items-start justify-between gap-4">
			<div>
				<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Project Tasks</p>
				<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{mode === 'edit' ? 'Edit project task' : 'Create project task'}</h2>
				<p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">Connect work to phases, milestones, lists, assignees, progress, and comments.</p>
			</div>
			<a href={backHref} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">{backLabel}</a>
		</div>
	</div>

	<div class="border-b border-slate-200 px-5 py-3 dark:border-white/10 sm:px-6">
		<div class="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
			{#each drawerSections() as section}
				<button type="button" class={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeSection === section.key ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'}`} onclick={() => (activeSection = section.key)}>{section.label}</button>
			{/each}
		</div>
	</div>

	{#if mode !== 'edit' || activeSection !== 'comments'}
		<form method="POST" action={formAction} class="flex min-h-0 flex-1 flex-col">
			{#if mode === 'edit'}<input type="hidden" name="taskId" value={values().id ?? task?.id ?? ''} />{/if}
			<input type="hidden" name="description" value={taskDescription} />
			<div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
				{#if form?.message}<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/12 dark:text-rose-200">{form.message}</div>{/if}

				{#if activeSection === 'general'}
					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="title">Title</label>
						<input id="title" name="title" value={values().title ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/50 dark:focus:bg-white/10" placeholder="Finalize launch checklist" />
						{#if errors().title}<p class="mt-2 text-sm text-rose-600">{errors().title}</p>{/if}
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="phaseId">Phase</label>
							<select id="phaseId" name="phaseId" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/50 dark:focus:bg-white/10">
								<option value="">No phase</option>
								{#each project.phases as phase}<option value={phase.id} selected={values().phaseId === phase.id}>{phase.name}</option>{/each}
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="milestoneId">Milestone</label>
							<select id="milestoneId" name="milestoneId" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/50 dark:focus:bg-white/10">
								<option value="">No milestone</option>
								{#each project.milestones as milestone}<option value={milestone.id} selected={values().milestoneId === milestone.id}>{milestone.name}</option>{/each}
							</select>
						</div>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="bucketId">List</label>
							<select id="bucketId" name="bucketId" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/50 dark:focus:bg-white/10">
								<option value="">No list</option>
								{#each project.buckets as bucket}<option value={bucket.id} selected={values().bucketId === bucket.id}>{bucket.name}</option>{/each}
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="status">Status</label>
							<select id="status" name="status" bind:value={selectedStatus} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/50 dark:focus:bg-white/10">
								{#each statusOptions as option}<option value={option.value}>{option.label}</option>{/each}
							</select>
						</div>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="startAt">Start</label><input id="startAt" name="startAt" type="date" value={values().startAt ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/50 dark:focus:bg-white/10" /></div>
						<div><label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="dueAt">Due</label><input id="dueAt" name="dueAt" type="date" value={values().dueAt ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/50 dark:focus:bg-white/10" /></div>
					</div>

					<div class="grid gap-5 sm:grid-cols-2">
						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="priority">Priority</label>
							<select id="priority" name="priority" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/50 dark:focus:bg-white/10">
								{#each priorityOptions as option}<option value={option.value} selected={(values().priority ?? 'normal') === option.value}>{option.label}</option>{/each}
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="progressPercentage">Progress</label>
							<input type="hidden" name="progressPercentage" value={progressPercentage} />
							<div class="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
								<input id="progressPercentage" bind:value={progressPercentage} oninput={handleProgressInput} type="range" min="0" max="100" step="1" disabled={selectedStatus === 'completed'} class="w-full accent-slate-950 disabled:cursor-not-allowed disabled:opacity-60" />
								<span class="min-w-12 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">{progressPercentage}%</span>
							</div>
						</div>
					</div>

					<div>
						<label class="block text-sm font-medium text-slate-700 dark:text-slate-300" for="tags">Tags</label>
						<input id="tags" name="tags" value={tagsInput()} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/50 dark:focus:bg-white/10" placeholder="launch, design, client" />
					</div>

					<div class="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
						<p class="text-sm font-semibold text-slate-950 dark:text-white">Assign users</p>
						<div class="mt-4 grid gap-3">
							{#if users.length === 0}<p class="text-sm text-slate-500">No local users are available.</p>{/if}
							{#each users as user}
								<label class="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-300">
									<input type="checkbox" name="assignedUserIds" value={user.id} checked={assignedUserIds().includes(user.id)} class="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300" />
									<span><span class="block font-semibold text-slate-950 dark:text-white">{user.name}</span><span class="mt-1 block text-slate-500 dark:text-slate-400">{user.email}</span></span>
								</label>
							{/each}
						</div>
					</div>
				{:else}
					<div class="flex min-h-0 flex-1 flex-col gap-4">
						<ProjectNoteEditor
							name="description"
							includeHiddenInput={false}
							value={taskDescription}
							onChange={(nextValue) => (taskDescription = nextValue)}
							placeholder="Describe the project task, context, blockers, or expected outcome. Use headings, lists, quotes, or code blocks as needed."
							editorClass="min-h-[26rem]"
						/>
					</div>
				{/if}
			</div>
			<div class="flex justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10 sm:px-6">
				<a href={backHref} class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">Cancel</a>
				<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">{mode === 'edit' ? 'Update task' : 'Save task'}</button>
			</div>
		</form>
	{:else}
		<div class="flex min-h-0 flex-1 flex-col">
			<div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
				{#if commentMessage()}<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{commentMessage()}</div>{/if}
				{#if taskComments().length === 0}<div class="rounded-[1.5rem] border border-dashed border-slate-200 px-5 py-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">No comments yet.</div>{/if}
				{#each taskComments() as comment}
					<article class="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 dark:border-white/10 dark:bg-slate-950/70">
						<div class="flex justify-between gap-3"><div><p class="text-sm font-semibold text-slate-950 dark:text-white">{comment.author.name}</p><p class="mt-1 text-xs text-slate-500 dark:text-slate-400">{comment.author.email}</p></div><p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{formatCommentDate(comment.createdAt)}</p></div>
						<p class="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{comment.body}</p>
					</article>
				{/each}

				<form method="POST" action={commentAction} class="rounded-[1.5rem] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950/70">
					<input type="hidden" name="taskId" value={task?.id ?? ''} />
					<textarea name="commentBody" rows="4" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-teal-400 focus:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-teal-500/50 dark:focus:bg-white/10" placeholder="Add a project update">{commentValue()}</textarea>
					{#if commentErrors().body}<p class="mt-2 text-sm text-rose-600">{commentErrors().body}</p>{/if}
					<div class="mt-3 flex justify-end"><button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Add comment</button></div>
				</form>
			</div>
		</div>
	{/if}
</section>
