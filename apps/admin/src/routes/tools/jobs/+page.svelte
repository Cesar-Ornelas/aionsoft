<script>
	import { page } from '$app/state';
	import { fade, fly } from 'svelte/transition';

	let { data, form } = $props();

	const manualSourceLabel = 'manual';
	const cronPresetOptions = [
		{ value: '*/5 * * * *', label: 'Every 5 minutes', description: 'Runs every 5 minutes.' },
		{ value: '*/15 * * * *', label: 'Every 15 minutes', description: 'Runs every 15 minutes.' },
		{ value: '*/30 * * * *', label: 'Every 30 minutes', description: 'Runs twice per hour.' },
		{ value: '0 * * * *', label: 'Hourly', description: 'Runs at minute 0 of every hour.' },
		{ value: '0 */6 * * *', label: 'Every 6 hours', description: 'Runs at midnight, 6 AM, noon, and 6 PM.' },
		{ value: '0 0 * * *', label: 'Daily at midnight', description: 'Runs once per day at 12:00 AM.' },
		{ value: '0 9 * * 1-5', label: 'Weekdays at 9 AM', description: 'Runs Monday through Friday at 9:00 AM.' },
		{ value: '0 9 * * 1', label: 'Weekly on Monday', description: 'Runs every Monday at 9:00 AM.' },
		{ value: '0 9 1 * *', label: 'Monthly on day 1', description: 'Runs on the first day of every month at 9:00 AM.' }
	];

	const blankDefinitionValues = {
		jobKey: '',
		jobName: '',
		description: '',
		labelName: '',
		schedule: '',
		containerName: '',
		command: '',
		noOverlap: true
	};

	let copiedDefinitionKey = $state('');
	let copyErrorMessage = $state('');
	let openDefinitionActionsKey = $state('');
	let openDefinitionActionsTop = $state(0);
	let openDefinitionActionsLeft = $state(0);
	let definitionDialogKey = $state('');
	let deleteDefinitionKey = $state('');
	let scheduleValue = $state('');

	function formatDate(value) {
		if (!value) {
			return 'Never';
		}

		return new Intl.DateTimeFormat('en-US', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(new Date(value));
	}

	function formatDuration(durationMs) {
		if (durationMs == null) {
			return 'Pending';
		}

		if (durationMs < 1000) {
			return `${durationMs} ms`;
		}

		const seconds = durationMs / 1000;

		if (seconds < 60) {
			return `${seconds.toFixed(seconds < 10 ? 1 : 0)} s`;
		}

		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.round(seconds % 60);
		return `${minutes}m ${remainingSeconds}s`;
	}

	function statusClass(status) {
		if (status === 'failed') {
			return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200';
		}

		if (status === 'running') {
			return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200';
		}

		return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200';
	}

	function currentView() {
		if (form?.intent === 'saveDefinition') {
			return 'definitions';
		}

		return data.filters.view === 'definitions' ? 'definitions' : 'events';
	}

	function buildJobsHref(mutateSearchParams) {
		const url = new URL(page.url);
		mutateSearchParams(url.searchParams);
		const search = url.searchParams.toString();
		return `${url.pathname}${search ? `?${search}` : ''}`;
	}

	function viewHref(view) {
		return buildJobsHref((searchParams) => {
			searchParams.set('view', view);
			searchParams.delete('new');
		});
	}

	function eventHref(jobKey) {
		return buildJobsHref((searchParams) => {
			searchParams.set('view', 'events');
			searchParams.set('job', jobKey);
			searchParams.delete('new');
		});
	}

	function definitionHref(jobKey) {
		return buildJobsHref((searchParams) => {
			searchParams.set('view', 'definitions');
			searchParams.set('definition', jobKey);
			searchParams.delete('edit');
			searchParams.delete('new');
		});
	}

	function editDefinitionDrawerOpen() {
		return currentView() === 'definitions' && Boolean(data.editingDefinitionKey) && page.url.searchParams.get('new') !== '1';
	}

	function definitionDrawerOpen() {
		return currentView() === 'definitions' && (page.url.searchParams.get('new') === '1' || editDefinitionDrawerOpen() || form?.intent === 'saveDefinition');
	}

	function openDefinitionDrawerHref() {
		return buildJobsHref((searchParams) => {
			searchParams.set('view', 'definitions');
			searchParams.set('new', '1');
			searchParams.delete('edit');
			searchParams.delete('definition');
		});
	}

	function editDefinitionDrawerHref(jobKey) {
		return buildJobsHref((searchParams) => {
			searchParams.set('view', 'definitions');
			searchParams.set('definition', jobKey);
			searchParams.set('edit', jobKey);
			searchParams.delete('new');
		});
	}

	function closeDefinitionDrawerHref() {
		return buildJobsHref((searchParams) => {
			searchParams.delete('new');
			searchParams.delete('edit');
		});
	}

	function normalizeNoOverlap(value) {
		return value === false || value === 'false' ? false : Boolean(value ?? true);
	}

	function selectedGroup() {
		return data.groups.find((group) => group.jobKey === data.selectedEventJobKey) ?? null;
	}

	function selectedDefinition() {
		return data.jobDefinitions.find((definition) => definition.jobKey === data.selectedDefinitionKey) ?? null;
	}

	function dialogDefinition() {
		return data.jobDefinitions.find((definition) => definition.jobKey === definitionDialogKey) ?? null;
	}

	function definitionValues() {
		if (form?.intent === 'saveDefinition' && form?.values) {
			return {
				...blankDefinitionValues,
				...form.values,
				noOverlap: normalizeNoOverlap(form.values.noOverlap)
			};
		}

		if (!editDefinitionDrawerOpen() && page.url.searchParams.get('new') === '1') {
			return blankDefinitionValues;
		}

		return {
			...blankDefinitionValues,
			...data.jobDefinitionFormValues,
			noOverlap: normalizeNoOverlap(data.jobDefinitionFormValues.noOverlap)
		};
	}

	$effect(() => {
		scheduleValue = String(definitionValues().schedule ?? '');
	});

	function canRerunSelectedGroup() {
		const group = selectedGroup();

		if (!group) {
			return false;
		}

		return data.availableJobs.some((job) => job.jobKey === group.jobKey && job.sources.includes(manualSourceLabel));
	}

	function closeDefinitionActions() {
		openDefinitionActionsKey = '';
	}

	function toggleDefinitionActions(event, jobKey) {
		if (openDefinitionActionsKey === jobKey) {
			closeDefinitionActions();
			return;
		}

		const bounds = event.currentTarget.getBoundingClientRect();
		openDefinitionActionsKey = jobKey;
		openDefinitionActionsTop = bounds.bottom + 8;
		openDefinitionActionsLeft = Math.max(16, bounds.right - 176);
	}

	function openDefinitionDialog(jobKey) {
		definitionDialogKey = jobKey;
		closeDefinitionActions();
	}

	function closeDefinitionDialog() {
		definitionDialogKey = '';
	}

	function deleteDefinition() {
		return data.jobDefinitions.find((definition) => definition.jobKey === deleteDefinitionKey) ?? null;
	}

	function openDeleteDefinitionDialog(jobKey) {
		deleteDefinitionKey = jobKey;
		closeDefinitionActions();
	}

	function closeDeleteDefinitionDialog() {
		deleteDefinitionKey = '';
	}

	function selectedCronPreset() {
		return cronPresetOptions.find((option) => option.value === scheduleValue) ?? null;
	}

	function handleSchedulePresetChange(event) {
		const value = event.currentTarget.value;

		if (!value) {
			return;
		}

		scheduleValue = value;
	}

	async function copyDefinitionSnippet(definition) {
		copyErrorMessage = '';

		try {
			await navigator.clipboard.writeText(definition.ofeliaLabelsSnippet);
			copiedDefinitionKey = definition.jobKey;
		} catch {
			copyErrorMessage = 'The label snippet could not be copied.';
		}
	}

	function deleteDefinitionMessage() {
		const definition = deleteDefinition();

		if (!definition) {
			return 'Delete this job definition?';
		}

		return `Delete the definition for ${definition.jobName}?`;
	}
</script>

<section class="space-y-6">
	<header class="flex flex-col gap-4 border-b border-slate-200/80 pb-5 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Tools</p>
			<h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">Jobs</h1>
			<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">
				Manage runtime job events separately from job definitions stored in the admin database.
			</p>
		</div>
		{#if currentView() === 'definitions'}
			<a href={openDefinitionDrawerHref()} class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
				New definition
			</a>
		{/if}
	</header>

	<div class="rounded-[1.9rem] border border-slate-200 bg-white p-2 dark:border-white/10 dark:bg-slate-900/92">
		<div class="grid gap-2 sm:grid-cols-2">
			<a href={viewHref('events')} class={`rounded-[1.4rem] px-4 py-3 text-sm font-semibold transition ${currentView() === 'events' ? 'bg-slate-950 text-white shadow-[0_20px_50px_-32px_rgba(15,23,42,0.8)] dark:bg-white dark:text-slate-950' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'}`}>
				Events
				<p class={`mt-1 text-xs font-medium ${currentView() === 'events' ? 'text-slate-300' : 'text-slate-400'}`}>
					Review executed jobs, statuses, and reruns.
				</p>
			</a>
			<a href={viewHref('definitions')} class={`rounded-[1.4rem] px-4 py-3 text-sm font-semibold transition ${currentView() === 'definitions' ? 'bg-slate-950 text-white shadow-[0_20px_50px_-32px_rgba(15,23,42,0.8)] dark:bg-white dark:text-slate-950' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'}`}>
				Definitions
				<p class={`mt-1 text-xs font-medium ${currentView() === 'definitions' ? 'text-slate-300' : 'text-slate-400'}`}>
					Manage saved scheduler definitions and generate Ofelia tags.
				</p>
			</a>
		</div>
	</div>

	{#if copyErrorMessage}
		<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
			{copyErrorMessage}
		</div>
	{/if}

	{#if currentView() === 'events'}
		<form method="GET" class="rounded-[1.9rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
			<input type="hidden" name="view" value="events" />
			<input type="hidden" name="definition" value={data.filters.definition} />
			<div class="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_12rem_11rem_11rem_auto] lg:items-end">
				<div>
					<label for="job-filter" class="block text-sm font-semibold text-slate-800">Job</label>
					<select id="job-filter" name="job" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50">
						<option value="">All jobs</option>
						{#each data.availableJobs as job}
							<option value={job.jobKey} selected={job.jobKey === data.filters.job}>{job.jobName}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="status-filter" class="block text-sm font-semibold text-slate-800">Status</label>
					<select id="status-filter" name="status" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50">
						<option value="">All statuses</option>
						{#each data.statusOptions as status}
							<option value={status} selected={status === data.filters.status}>{status.replace('_', ' ')}</option>
						{/each}
					</select>
				</div>

				<div>
					<label for="date-from-filter" class="block text-sm font-semibold text-slate-800">From</label>
					<input id="date-from-filter" name="dateFrom" type="date" value={data.filters.dateFrom} class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50" />
				</div>

				<div>
					<label for="date-to-filter" class="block text-sm font-semibold text-slate-800">To</label>
					<input id="date-to-filter" name="dateTo" type="date" value={data.filters.dateTo} class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50" />
				</div>

				<div class="flex gap-3 lg:justify-end">
					<button type="submit" class="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
						Apply filters
					</button>
					<a href={viewHref('events')} class="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">
						Reset
					</a>
				</div>
			</div>
		</form>

		<div class="space-y-5">
			{#if selectedGroup()}
				<div class="rounded-[1.9rem] border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-slate-900/92">
					<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
						<div>
							<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Selected job history</p>
							<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{selectedGroup().jobName}</h2>
							<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{selectedGroup().jobKey}</p>
						</div>
						<div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
							<div class="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-white/5">
								<p class="text-xs uppercase tracking-[0.2em] text-slate-400">Total</p>
								<p class="mt-2 text-lg font-semibold text-slate-950 dark:text-white">{selectedGroup().totalRuns}</p>
							</div>
							<div class="rounded-2xl bg-emerald-50 px-4 py-3">
								<p class="text-xs uppercase tracking-[0.2em] text-emerald-600">Succeeded</p>
								<p class="mt-2 text-lg font-semibold text-emerald-700">{selectedGroup().succeededRuns}</p>
							</div>
							<div class="rounded-2xl bg-rose-50 px-4 py-3">
								<p class="text-xs uppercase tracking-[0.2em] text-rose-600">Failed</p>
								<p class="mt-2 text-lg font-semibold text-rose-700">{selectedGroup().failedRuns}</p>
							</div>
							<div class="rounded-2xl bg-amber-50 px-4 py-3">
								<p class="text-xs uppercase tracking-[0.2em] text-amber-600">Running</p>
								<p class="mt-2 text-lg font-semibold text-amber-700">{selectedGroup().runningRuns}</p>
							</div>
						</div>
					</div>

					{#if canRerunSelectedGroup()}
						<form method="POST" action="?/rerun" class="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
							<div>
								<p class="text-sm font-semibold text-slate-900 dark:text-white">Manual rerun</p>
								<p class="mt-1 text-sm text-slate-600 dark:text-slate-400">Run this registered job now and store the result under the same job history.</p>
							</div>
							<input type="hidden" name="jobKey" value={selectedGroup().jobKey} />
							<input type="hidden" name="returnJob" value={data.filters.job || selectedGroup().jobKey} />
							<input type="hidden" name="returnDefinition" value={data.filters.definition} />
							<input type="hidden" name="returnStatus" value={data.filters.status} />
							<input type="hidden" name="returnDateFrom" value={data.filters.dateFrom} />
							<input type="hidden" name="returnDateTo" value={data.filters.dateTo} />
							<button type="submit" class="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
								Run now
							</button>
						</form>
					{/if}
				</div>
			{/if}

			{#if data.groups.length === 0}
				<div class="rounded-[1.9rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-white/10 dark:bg-white/5">
					<p class="text-lg font-semibold text-slate-950 dark:text-white">No job executions yet</p>
					<p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">
						No executions matched the current filters. Adjust the filters or run an instrumented job to populate this view.
					</p>
				</div>
			{:else}
				<div class="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
					<div class="rounded-[1.9rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Job events</p>
								<p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">
									Browse instrumented jobs and inspect the run stream for each one.
								</p>
							</div>
							<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/8 dark:text-slate-300">{data.groups.length} jobs</span>
						</div>

						<div class="mt-5 space-y-3">
							{#each data.groups as group}
								<a href={eventHref(group.jobKey)} class={`block rounded-2xl border px-4 py-4 transition ${group.jobKey === data.selectedEventJobKey ? 'border-sky-300 bg-sky-50 dark:border-sky-400/40 dark:bg-sky-500/10' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:hover:border-white/20 dark:hover:bg-white/5'}`}>
									<div class="flex items-start justify-between gap-3">
										<div>
											<p class="font-semibold text-slate-950 dark:text-white">{group.jobName}</p>
											<p class="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{group.jobKey}</p>
										</div>
										<span class={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(group.lastStatus ?? 'succeeded')}`}>
											{(group.lastStatus ?? 'succeeded').replace('_', ' ')}
										</span>
									</div>
									<p class="mt-3 text-sm text-slate-600 dark:text-slate-400">{group.totalRuns} runs · last started {formatDate(group.lastStartedAt)}</p>
								</a>
							{/each}
						</div>
					</div>

					<div class="overflow-hidden rounded-[1.9rem] border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/92">
						<div class="overflow-x-auto">
							<table class="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
								<thead class="bg-slate-50/90 text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:bg-white/5 dark:text-slate-500">
									<tr>
										<th class="px-5 py-4">Status</th>
										<th class="px-5 py-4">Started</th>
										<th class="px-5 py-4">Finished</th>
										<th class="px-5 py-4">Duration</th>
										<th class="px-5 py-4">Details</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-slate-100 dark:divide-white/5">
									{#each data.runs as run}
										<tr class="align-top">
											<td class="px-5 py-4">
												<span class={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(run.status)}`}>
													{run.status.replace('_', ' ')}
												</span>
											</td>
											<td class="px-5 py-4 text-slate-600 dark:text-slate-400">{formatDate(run.startedAt)}</td>
											<td class="px-5 py-4 text-slate-600 dark:text-slate-400">{formatDate(run.finishedAt)}</td>
											<td class="px-5 py-4 text-slate-600 dark:text-slate-400">{formatDuration(run.durationMs)}</td>
											<td class="px-5 py-4">
												{#if run.errorMessage}
													<p class="max-w-xl text-sm text-rose-600">{run.errorMessage}</p>
												{:else if run.result}
													<pre class="max-w-xl overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs text-slate-100">{JSON.stringify(run.result, null, 2)}</pre>
												{:else}
													<p class="text-sm text-slate-500 dark:text-slate-400">No details recorded.</p>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{/if}
		</div>
	{:else}
				<div class="rounded-[1.9rem] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/92">
					<div class="flex flex-col gap-3 border-b border-slate-200 pb-5 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
				<div>
							<p class="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">Saved job definitions</p>
							<p class="mt-2 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-400">
						Definitions live in the admin database. Use the actions menu on a definition to generate the Ofelia labels you will paste into compose.
					</p>
				</div>
						<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/8 dark:text-slate-300">{data.jobDefinitions.length} definitions</span>
			</div>

			<div class="mt-5 space-y-3">
				{#if data.jobDefinitions.length === 0}
					<div class="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
						No job definitions have been saved yet.
					</div>
				{:else}
					{#each data.jobDefinitions as definition}
						<div class={`rounded-2xl border px-4 py-4 transition ${definition.jobKey === data.selectedDefinitionKey ? 'border-sky-300 bg-sky-50 dark:border-sky-400/40 dark:bg-sky-500/10' : 'border-slate-200 bg-white dark:border-white/10 dark:bg-white/5'}`}>
							<div class="flex items-start justify-between gap-3">
								<a href={definitionHref(definition.jobKey)} class="min-w-0 flex-1">
									<div class="flex flex-wrap items-start gap-3">
										<div class="min-w-0 flex-1">
											<p class="font-semibold text-slate-950 dark:text-white">{definition.jobName}</p>
											<p class="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{definition.jobKey}</p>
										</div>
										<span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${definition.isRegistered ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
											{definition.isRegistered ? 'Registered' : 'DB only'}
										</span>
									</div>
									<p class="mt-3 text-sm text-slate-600 dark:text-slate-400">{definition.schedule} · {definition.command}</p>
									{#if definition.description}
										<p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{definition.description}</p>
									{/if}
								</a>

								<div class="relative flex justify-end">
									<button
										type="button"
										class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
										onclick={(event) => toggleDefinitionActions(event, definition.jobKey)}
										aria-haspopup="menu"
										aria-expanded={openDefinitionActionsKey === definition.jobKey}
										aria-label="Definition actions"
										title="Definition actions"
									>
										<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
											<path d="M10 4.25a1.25 1.25 0 1 0 0 .001V4.25Zm0 4.5a1.25 1.25 0 1 0 0 .001V8.75Zm0 4.5a1.25 1.25 0 1 0 0 .001v-.001Z" fill="currentColor" />
										</svg>
									</button>
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}

	{#if dialogDefinition()}
		<div class="fixed inset-0 z-40">
			<button type="button" class="absolute inset-0 bg-slate-950/40 backdrop-blur-[3px]" onclick={closeDefinitionDialog} aria-label="Close Ofelia tags dialog"></button>

			<div class="absolute inset-x-4 top-1/2 mx-auto w-auto max-w-4xl -translate-y-1/2 rounded-[2rem] border border-slate-200 bg-white shadow-[0_40px_120px_-40px_rgba(15,23,42,0.6)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_40px_120px_-40px_rgba(2,6,23,0.85)] sm:inset-x-8 lg:inset-x-16" in:fade={{ duration: 180 }} out:fade={{ duration: 140 }}>
				<div class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-white/10 sm:px-8">
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Generated Ofelia tags</p>
						<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{dialogDefinition().jobName}</h2>
						<p class="mt-2 text-sm text-slate-500 dark:text-slate-400">{dialogDefinition().jobKey}</p>
					</div>
					<button type="button" class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white" onclick={closeDefinitionDialog}>
						Close
					</button>
				</div>

				<div class="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
					<p class="text-sm leading-7 text-slate-600 dark:text-slate-400">
						Copy this block into the target service labels in your compose deployment.
					</p>

					<pre class="max-h-[50vh] overflow-auto rounded-[1.5rem] bg-slate-950 px-4 py-4 text-xs text-slate-100">{dialogDefinition().ofeliaLabelsSnippet}</pre>

					<div class="flex flex-wrap items-center justify-end gap-3">
						<button type="button" class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white" onclick={closeDefinitionDialog}>
							Cancel
						</button>
						<button type="button" class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800" onclick={() => copyDefinitionSnippet(dialogDefinition())}>
							{copiedDefinitionKey === dialogDefinition().jobKey ? 'Copied' : 'Copy tags'}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	{#if openDefinitionActionsKey}
		<button type="button" class="fixed inset-0 z-10" onclick={closeDefinitionActions} aria-label="Close definition actions menu"></button>

		<div class="fixed z-20 w-48 rounded-[1.3rem] border border-slate-200 bg-white p-2 text-left shadow-[0_32px_80px_-32px_rgba(15,23,42,0.55)] ring-1 ring-slate-950/5 dark:border-white/10 dark:bg-slate-900 dark:ring-white/10 dark:shadow-[0_32px_80px_-32px_rgba(2,6,23,0.85)]" style={`top: ${openDefinitionActionsTop}px; left: ${openDefinitionActionsLeft}px;`}>
			<a href={editDefinitionDrawerHref(openDefinitionActionsKey)} class="flex items-center gap-3 rounded-[1rem] px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white" onclick={closeDefinitionActions}>
				<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
					<path d="M4.75 13.5V15.25H6.5l7.22-7.22-1.75-1.75L4.75 13.5Zm10.44-6.28a1.24 1.24 0 0 0 0-1.75l-.66-.66a1.24 1.24 0 0 0-1.75 0l-.74.74 1.75 1.75.74-.08Z" fill="currentColor" />
				</svg>
				<span>Edit definition</span>
			</a>

			<button type="button" class="flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white" onclick={() => openDefinitionDialog(openDefinitionActionsKey)}>
				<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
					<path d="M4.75 5.75A1.75 1.75 0 0 1 6.5 4h7A1.75 1.75 0 0 1 15.25 5.75v8.5A1.75 1.75 0 0 1 13.5 16h-7a1.75 1.75 0 0 1-1.75-1.75v-8.5Zm2 1.25a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-4.5Z" fill="currentColor" />
				</svg>
				<span>Generate Ofelia tags</span>
			</button>

			<button type="button" class="flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10" onclick={() => openDeleteDefinitionDialog(openDefinitionActionsKey)}>
					<svg viewBox="0 0 20 20" fill="none" class="h-4 w-4" aria-hidden="true">
						<path d="M6.75 5.5h6.5m-5.75 2.5v4.75m5-4.75v4.75M8 3.75h4l.5 1.25h2.25v1.5h-10V5h2.25L8 3.75Zm-1 3.75h6v6.25A1.25 1.25 0 0 1 11.75 15h-3.5A1.25 1.25 0 0 1 7 13.75V7.5Z" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					<span>Delete definition</span>
				</button>
		</div>
	{/if}

	{#if deleteDefinition()}
		<div class="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6">
			<button
				type="button"
				class="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
				onclick={closeDeleteDefinitionDialog}
				aria-label="Close delete definition dialog"
			></button>

			<div class="relative z-10 w-full max-w-xl rounded-[1.8rem] border border-white/80 bg-white p-6 shadow-[0_32px_80px_-42px_rgba(15,23,42,0.45)] dark:border-white/10 dark:bg-slate-900 dark:shadow-[0_32px_80px_-42px_rgba(2,6,23,0.85)] sm:p-7">
				<div class="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4 dark:border-white/10">
					<div>
						<p class="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Delete</p>
						<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Delete job definition</h2>
						<p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">
							{deleteDefinitionMessage()}
						</p>
					</div>

					<button
						type="button"
						class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20 dark:hover:text-white"
						onclick={closeDeleteDefinitionDialog}
						aria-label="Close delete definition dialog"
					>
						<span aria-hidden="true">×</span>
					</button>
				</div>

				<form method="POST" action="?/deleteDefinition" class="mt-5 space-y-5">
					<input type="hidden" name="jobKey" value={deleteDefinition().jobKey} />

					<div class="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
						This removes the saved database definition and its generated Ofelia tag source from the Definitions view. It does not modify deployed compose labels automatically.
					</div>

					<div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
						<p class="font-semibold text-slate-950 dark:text-white">{deleteDefinition().jobName}</p>
						<p class="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">{deleteDefinition().jobKey}</p>
					</div>

					<div class="flex flex-wrap items-center justify-end gap-3">
						<button
							type="button"
							class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white"
							onclick={closeDeleteDefinitionDialog}
						>
							Cancel
						</button>
						<button class="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700">
							Delete definition
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	{#if definitionDrawerOpen()}
		<div class="fixed inset-0 z-50">
			<a href={closeDefinitionDrawerHref()} class="absolute inset-0 bg-slate-950/35 backdrop-blur-[3px]" aria-label={editDefinitionDrawerOpen() ? 'Close edit job definition drawer' : 'Close new job definition drawer'} in:fade={{ duration: 180 }} out:fade={{ duration: 140 }}></a>

			<div class="absolute inset-y-0 right-0 w-full bg-white shadow-[-24px_0_80px_-48px_rgba(15,23,42,0.55)] dark:bg-slate-950 dark:shadow-[-24px_0_80px_-48px_rgba(2,6,23,0.85)] sm:max-w-2xl lg:w-[40vw] lg:max-w-none lg:min-w-[32rem]" in:fly={{ x: 96, duration: 220, opacity: 1 }} out:fly={{ x: 96, duration: 180, opacity: 1 }}>
				<div class="flex h-full flex-col bg-white dark:bg-slate-950">
					<div class="border-b border-slate-200 px-5 py-5 dark:border-white/10 sm:px-6">
						<div class="flex items-start justify-between gap-4">
							<div>
								<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Definitions</p>
								<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{editDefinitionDrawerOpen() ? 'Edit job definition' : 'New job definition'}</h2>
								<p class="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-400">
									{editDefinitionDrawerOpen() ? 'Update the scheduler metadata here and keep using the actions menu for generated tags.' : 'Save the scheduler metadata here, then generate the Ofelia tags from the definition list.'}
								</p>
							</div>
							<a href={closeDefinitionDrawerHref()} class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">
								Close
							</a>
						</div>
					</div>

					<form method="POST" action="?/saveDefinition" class="flex min-h-0 flex-1 flex-col">
						<input type="hidden" name="currentJobKey" value={data.editingDefinitionKey ?? ''} />
						<div class="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
							<div class="grid gap-5 md:grid-cols-2">
								<div>
									<label for="jobKey" class="block text-sm font-semibold text-slate-800 dark:text-slate-200">Job key</label>
									<input id="jobKey" name="jobKey" type="text" value={definitionValues().jobKey} class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50" placeholder="task-maintenance.reconcile-tags" />
									{#if form?.intent === 'saveDefinition' && form?.errors?.jobKey}
										<p class="mt-2 text-sm text-rose-600">{form.errors.jobKey}</p>
									{/if}
								</div>

								<div>
									<label for="jobName" class="block text-sm font-semibold text-slate-800 dark:text-slate-200">Job name</label>
									<input id="jobName" name="jobName" type="text" value={definitionValues().jobName} class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50" placeholder="Task maintenance reconciliation" />
									{#if form?.intent === 'saveDefinition' && form?.errors?.jobName}
										<p class="mt-2 text-sm text-rose-600">{form.errors.jobName}</p>
									{/if}
								</div>

								<div class="md:col-span-2">
									<label for="description" class="block text-sm font-semibold text-slate-800 dark:text-slate-200">Description</label>
									<textarea id="description" name="description" rows="4" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50" placeholder="Describe what this job does.">{definitionValues().description}</textarea>
								</div>

								<div>
									<label for="labelName" class="block text-sm font-semibold text-slate-800 dark:text-slate-200">Ofelia label name</label>
									<input id="labelName" name="labelName" type="text" value={definitionValues().labelName} class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50" placeholder="task-maintenance" />
								</div>

								<div>
									<label for="schedule" class="block text-sm font-semibold text-slate-800 dark:text-slate-200">Schedule</label>
									<select id="schedulePreset" class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50" value={selectedCronPreset()?.value ?? ''} onchange={handleSchedulePresetChange}>
										<option value="">Custom cron rule</option>
										{#each cronPresetOptions as option}
											<option value={option.value}>{option.label}</option>
										{/each}
									</select>
									{#if selectedCronPreset()}
										<p class="mt-2 text-xs text-slate-500 dark:text-slate-400">{selectedCronPreset().description}</p>
									{:else}
										<p class="mt-2 text-xs text-slate-500 dark:text-slate-400">Choose a standard schedule or type a custom cron rule below.</p>
									{/if}
									<input id="schedule" name="schedule" type="text" bind:value={scheduleValue} class="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50" placeholder="0 * * * *" />
									{#if form?.intent === 'saveDefinition' && form?.errors?.schedule}
										<p class="mt-2 text-sm text-rose-600">{form.errors.schedule}</p>
									{/if}
								</div>

								<div>
									<label for="containerName" class="block text-sm font-semibold text-slate-800 dark:text-slate-200">Container name</label>
									<input id="containerName" name="containerName" type="text" value={definitionValues().containerName} class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50" placeholder="aionsoft-admin" />
									{#if form?.intent === 'saveDefinition' && form?.errors?.containerName}
										<p class="mt-2 text-sm text-rose-600">{form.errors.containerName}</p>
									{/if}
								</div>

								<div class="md:col-span-2">
									<label for="command" class="block text-sm font-semibold text-slate-800 dark:text-slate-200">Command</label>
									<input id="command" name="command" type="text" value={definitionValues().command} class="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-sky-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-sky-500/50" placeholder="bun run task:maintenance" />
									{#if form?.intent === 'saveDefinition' && form?.errors?.command}
										<p class="mt-2 text-sm text-rose-600">{form.errors.command}</p>
									{/if}
								</div>

								<div class="md:col-span-2">
									<label class="inline-flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:text-slate-300">
										<input type="checkbox" name="noOverlap" checked={definitionValues().noOverlap} class="h-4 w-4 rounded border-slate-300 text-slate-950 dark:border-white/15 dark:bg-slate-900" />
										<span>Prevent overlapping executions</span>
									</label>
								</div>
							</div>
						</div>

						<div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-white/10 sm:px-6">
							<a href={closeDefinitionDrawerHref()} class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">
								Cancel
							</a>
							<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
								{editDefinitionDrawerOpen() ? 'Update definition' : 'Save definition'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}
</section>