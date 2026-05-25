<script>
	import { TagsInput } from '$lib/components/ui/tags-input';

	let {
		form,
		task = null,
		users = [],
		mode = 'create',
		surface = 'page',
		formAction = null,
		commentAction = null,
		initialSection = 'general',
		hiddenFields = [],
		backHref = '/tasks',
		backLabel = 'Back to tasks'
	} = $props();

	let drawerTags = $state([]);
	let activeSection = $state('general');

	const reminderOptions = [
		{ value: '', label: 'No reminder' },
		{ value: '0', label: 'At due time' },
		{ value: '15', label: '15 minutes before' },
		{ value: '60', label: '1 hour before' },
		{ value: '1440', label: '1 day before' }
	];

	const recurrenceOptions = [
		{ value: 'none', label: 'Does not repeat' },
		{ value: 'daily', label: 'Daily' },
		{ value: 'weekly', label: 'Weekly' },
		{ value: 'monthly', label: 'Monthly' },
		{ value: 'yearly', label: 'Yearly' }
	];

	const statusOptions = [
		{ value: 'open', label: 'Open' },
		{ value: 'in_progress', label: 'In progress' },
		{ value: 'on_hold', label: 'On hold' },
		{ value: 'deferred', label: 'Deferred' },
		{ value: 'canceled', label: 'Canceled' },
		{ value: 'completed', label: 'Completed' }
	];

	const progressActivatedStatuses = new Set(['open', 'on_hold', 'deferred']);

	function values() {
		return form?.values ?? task ?? {};
	}

	function errors() {
		return form?.errors ?? {};
	}

	function formatDateTimeInput(value) {
		if (!value) {
			return '';
		}

		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return '';
		}

		const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
		return localDate.toISOString().slice(0, 16);
	}

	function formatDateInput(value) {
		return formatDateTimeInput(value).slice(0, 10);
	}

	function formatTimeInput(value) {
		return formatDateTimeInput(value).slice(11, 16);
	}

	function dueDateValue() {
		if (values().dueDate != null) {
			return values().dueDate;
		}

		return formatDateInput(values().dueAt);
	}

	function dueTimeValue() {
		if (values().dueTime != null) {
			return values().dueTime;
		}

		if (values().hasDueTime === false) {
			return '';
		}

		return formatTimeInput(values().dueAt);
	}

	function progressPercentageValue() {
		return String(values().progressPercentage ?? '0');
	}

	function assignedUserIds() {
		return values().assignedUserIds ?? values().assignedUsers?.map((user) => user.id) ?? [];
	}

	function taskComments() {
		return task?.comments ?? [];
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

	function tagsInput() {
		if (values().tagsInput != null) {
			return values().tagsInput;
		}

		return values().tags?.map((tag) => tag.name).join(', ') ?? '';
	}

	function parseTagValues(value) {
		return String(value ?? '')
			.split(',')
			.map((tag) => tag.trim())
			.filter(Boolean)
			.filter((tag, index, allTags) => allTags.indexOf(tag) === index);
	}

	const drawerTagSeed = $derived.by(() => {
		if (Array.isArray(values().tags) && values().tags.length > 0) {
			return values().tags.map((tag) => typeof tag === 'string' ? tag : tag.name).filter(Boolean);
		}

		if (values().tagsInput != null) {
			return parseTagValues(values().tagsInput);
		}

		if (typeof values().tags === 'string') {
			return parseTagValues(values().tags);
		}

		return [];
	});

	let selectedStatus = $state('open');
	let progressPercentage = $state('0');

	const statusSeed = $derived(String(values().status ?? 'open'));
	const progressSeed = $derived(String(values().progressPercentage ?? '0'));

	$effect(() => {
		drawerTags = [...drawerTagSeed];
	});

	$effect(() => {
		selectedStatus = statusSeed;
		progressPercentage = selectedStatus === 'completed' ? '100' : progressSeed;
	});

	$effect(() => {
		if (selectedStatus === 'completed') {
			progressPercentage = '100';
		}
	});

	$effect(() => {
		activeSection = mode === 'edit' && initialSection === 'comments' ? 'comments' : 'general';
	});

	function handleProgressInput(event) {
		progressPercentage = event.currentTarget.value;

		if (Number.parseInt(progressPercentage, 10) > 0 && progressActivatedStatuses.has(selectedStatus)) {
			selectedStatus = 'in_progress';
		}
	}

	function isDrawer() {
		return surface === 'drawer';
	}

	function formatCommentDate(value) {
		if (!value) {
			return 'Just now';
		}

		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}
</script>

<section class={isDrawer() ? 'flex h-full flex-col bg-white' : 'rounded-[1.9rem] border border-slate-200 bg-slate-50/70 p-6 sm:p-8'}>
	<div class={isDrawer() ? 'border-b border-slate-200 px-5 py-5 sm:px-6' : 'flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between'}>
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Tasks</p>
			<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{mode === 'edit' ? 'Edit task' : 'Create a task'}</h2>
			<p class={`mt-2 text-sm text-slate-600 ${isDrawer() ? 'leading-6' : 'leading-7'}`}>
				{mode === 'edit'
					? 'Update scheduling, assignees, and tags while keeping task alerts aligned with the latest due date.'
					: isDrawer()
						? 'Add a due date, optional reminder, assignees, and tags without leaving the task list flow.'
						: 'Create a task with a due date, optional reminder, recurrence, assignees, and tags for grouping.'}
			</p>
		</div>

		{#if !isDrawer()}
			<a href={backHref} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
				{backLabel}
			</a>
		{/if}
	</div>

	{#if mode === 'edit'}
		<div class={isDrawer() ? 'border-b border-slate-200 px-5 py-3 sm:px-6' : 'mt-4 border-b border-slate-200/80 pb-4'}>
			<div class="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
				<button
					type="button"
					class={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeSection === 'general' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'}`}
					onclick={() => (activeSection = 'general')}
				>
					General
				</button>
				<button
					type="button"
					class={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeSection === 'comments' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'}`}
					onclick={() => (activeSection = 'comments')}
				>
					Comments {taskComments().length ? `(${taskComments().length})` : ''}
				</button>
			</div>
		</div>
	{/if}

	{#if mode !== 'edit' || activeSection === 'general'}
	<form method="POST" action={formAction} class={isDrawer() ? 'flex min-h-0 flex-1 flex-col' : 'mt-6 space-y-6 rounded-[1.7rem] border border-white bg-white/90 p-6'}>
		{#if mode === 'edit'}
			<input type="hidden" name="taskId" value={values().id ?? task?.id ?? ''} />
		{/if}

		{#each hiddenFields as field}
			<input type="hidden" name={field.name} value={field.value} />
		{/each}

		<div class={isDrawer() ? 'min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6' : 'space-y-6'}>
			{#if form?.message}
				<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{form.message}
				</div>
			{/if}

			<div class={isDrawer() ? 'grid gap-5' : 'grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]'}>
			<div>
				<label class="block text-sm font-medium text-slate-700" for="title">Title</label>
				<input id="title" name="title" value={values().title ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="Renew SSL certificates" />
				{#if errors().title}
					<p class="mt-2 text-sm text-rose-600">{errors().title}</p>
				{/if}
			</div>

			<div class="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
				<div>
					<label class="block text-sm font-medium text-slate-700" for="dueDate">Due date</label>
					<input id="dueDate" name="dueDate" type="date" value={dueDateValue()} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" />
					{#if errors().dueDate || errors().dueAt}
						<p class="mt-2 text-sm text-rose-600">{errors().dueDate ?? errors().dueAt}</p>
					{/if}
				</div>

				<div>
					<label class="block text-sm font-medium text-slate-700" for="dueTime">Time</label>
					<input id="dueTime" name="dueTime" type="time" value={dueTimeValue()} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" />
					<p class="mt-2 text-xs text-slate-500">Optional. Leave blank when the task only needs a due date.</p>
				</div>
			</div>

			<div class={isDrawer() ? '' : 'lg:col-span-2'}>
				<label class="block text-sm font-medium text-slate-700" for="description">Description</label>
				<textarea id="description" name="description" rows={isDrawer() ? '4' : '5'} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="Describe the work, context, or expected outcome.">{values().description ?? ''}</textarea>
			</div>
		</div>

		<div class={isDrawer() ? 'grid gap-5 sm:grid-cols-2' : 'grid gap-5 lg:grid-cols-4'}>
			<div>
				<label class="block text-sm font-medium text-slate-700" for="notificationOffsetMinutes">Reminder</label>
				<select id="notificationOffsetMinutes" name="notificationOffsetMinutes" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white">
					{#each reminderOptions as option}
						<option value={option.value} selected={String(values().notificationOffsetMinutes ?? '') === option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700" for="recurrenceRule">Repeat</label>
				<select id="recurrenceRule" name="recurrenceRule" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white">
					{#each recurrenceOptions as option}
						<option value={option.value} selected={(values().recurrenceRule ?? 'none') === option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700" for="status">Status</label>
				<select id="status" name="status" bind:value={selectedStatus} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white">
					{#each statusOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700" for="progressPercentage">Progress</label>
				<input type="hidden" name="progressPercentage" value={progressPercentage} />
				<div class="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
					<input id="progressPercentage" bind:value={progressPercentage} oninput={handleProgressInput} type="range" min="0" max="100" step="1" disabled={selectedStatus === 'completed'} class="w-full accent-slate-950 disabled:cursor-not-allowed disabled:opacity-60" />
					<span class="min-w-12 text-right text-sm font-semibold text-slate-700">{progressPercentage}%</span>
				</div>
				{#if selectedStatus === 'completed'}
					<p class="mt-2 text-xs text-slate-500">Completed tasks are locked to 100% progress.</p>
				{/if}
			</div>
		</div>

		<div>
			<label class="block text-sm font-medium text-slate-700" for="tags">Tags</label>
			{#if isDrawer()}
				<input type="hidden" name="tags" value={drawerTags.join(', ')} />
				<div class="mt-2">
					<TagsInput bind:value={drawerTags} placeholder="Add a tag and press Enter" class="min-h-[50px] rounded-2xl border-slate-200 bg-slate-50 px-2 py-2 transition focus-within:border-teal-400 focus-within:bg-white" />
				</div>
			{:else}
				<input id="tags" name="tags" value={tagsInput()} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="infra, certificates, production" />
			{/if}
			<p class="mt-2 text-xs text-slate-500">Separate tags with commas to group or search tasks later.</p>
		</div>

		<div class="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
			<div>
				<p class="text-sm font-semibold text-slate-950">Assign users</p>
				<p class="mt-1 text-sm text-slate-500">Choose zero or more users responsible for this task.</p>
			</div>

			<div class={`mt-4 grid gap-3 ${isDrawer() ? 'sm:grid-cols-1' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
				{#if users.length === 0}
					<p class="text-sm text-slate-500">No local users are available for assignment.</p>
				{:else}
					{#each users as user}
						<label class="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
							<input type="checkbox" name="assignedUserIds" value={user.id} checked={assignedUserIds().includes(user.id)} class="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300" />
							<span>
								<span class="block font-semibold text-slate-950">{user.name}</span>
								<span class="mt-1 block text-slate-500">{user.email}</span>
							</span>
						</label>
					{/each}
				{/if}
			</div>
		</div>
		</div>

		<div class={isDrawer() ? 'flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 sm:px-6' : 'flex flex-wrap items-center justify-end gap-3 pt-2'}>
			<a href={backHref} class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
				Cancel
			</a>
			<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
				{mode === 'edit' ? 'Update task' : 'Save task'}
			</button>
		</div>
	</form>
	{:else}
		<div class={isDrawer() ? 'flex min-h-0 flex-1 flex-col' : 'mt-6 rounded-[1.7rem] border border-white bg-white/90'}>
			<div class={isDrawer() ? 'min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6' : 'space-y-6 p-6'}>
				{#if commentMessage()}
					<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
						{commentMessage()}
					</div>
				{/if}

				<div class="space-y-4">
					{#if taskComments().length === 0}
						<div class="rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
							No comments yet. Add the first update so assignees can see status changes, questions, or next steps.
						</div>
					{:else}
						{#each taskComments() as comment}
							<article class="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4">
								<div class="flex flex-wrap items-center justify-between gap-3">
									<div>
										<p class="text-sm font-semibold text-slate-950">{comment.author.name}</p>
										<p class="mt-1 text-xs text-slate-500">{comment.author.email}</p>
									</div>
									<p class="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{formatCommentDate(comment.createdAt)}</p>
								</div>
								<p class="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{comment.body}</p>
							</article>
						{/each}
					{/if}
				</div>

				<form method="POST" action={commentAction} class="rounded-[1.5rem] border border-slate-200 bg-white p-4 sm:p-5">
					<input type="hidden" name="taskId" value={task?.id ?? ''} />
					{#each hiddenFields as field}
						<input type="hidden" name={field.name} value={field.name === 'returnSection' ? 'comments' : field.value} />
					{/each}

					<label class="block text-sm font-medium text-slate-700" for="commentBody">Add comment</label>
					<textarea id="commentBody" name="commentBody" rows="4" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="Share an update, a question, or a follow-up for this task.">{commentValue()}</textarea>
					{#if commentErrors().body}
						<p class="mt-2 text-sm text-rose-600">{commentErrors().body}</p>
					{/if}

					<div class="mt-4 flex justify-end">
						<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">Add comment</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</section>