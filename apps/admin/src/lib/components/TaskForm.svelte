<script>
	let {
		form,
		task = null,
		users = [],
		mode = 'create',
		surface = 'page',
		formAction = null,
		backHref = '/tasks',
		backLabel = 'Back to tasks'
	} = $props();

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
		{ value: 'completed', label: 'Completed' }
	];

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

	function assignedUserIds() {
		return values().assignedUserIds ?? values().assignedUsers?.map((user) => user.id) ?? [];
	}

	function tagsInput() {
		if (values().tagsInput != null) {
			return values().tagsInput;
		}

		return values().tags?.map((tag) => tag.name).join(', ') ?? '';
	}

	function isDrawer() {
		return surface === 'drawer';
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

	<form method="POST" action={formAction} class={isDrawer() ? 'flex min-h-0 flex-1 flex-col' : 'mt-6 space-y-6 rounded-[1.7rem] border border-white bg-white/90 p-6'}>
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

			<div>
				<label class="block text-sm font-medium text-slate-700" for="dueAt">Due date</label>
				<input id="dueAt" name="dueAt" type="datetime-local" value={formatDateTimeInput(values().dueAt)} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" />
				{#if errors().dueAt}
					<p class="mt-2 text-sm text-rose-600">{errors().dueAt}</p>
				{/if}
			</div>

			<div class={isDrawer() ? '' : 'lg:col-span-2'}>
				<label class="block text-sm font-medium text-slate-700" for="description">Description</label>
				<textarea id="description" name="description" rows={isDrawer() ? '4' : '5'} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="Describe the work, context, or expected outcome.">{values().description ?? ''}</textarea>
			</div>
		</div>

		<div class={isDrawer() ? 'grid gap-5 sm:grid-cols-2' : 'grid gap-5 lg:grid-cols-3'}>
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
				<select id="status" name="status" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white">
					{#each statusOptions as option}
						<option value={option.value} selected={(values().status ?? 'open') === option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		</div>

		<div>
			<label class="block text-sm font-medium text-slate-700" for="tags">Tags</label>
			<input id="tags" name="tags" value={tagsInput()} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="infra, certificates, production" />
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
</section>