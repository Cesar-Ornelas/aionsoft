<script>
	import { tick } from 'svelte';

	let { data } = $props();
	let draggedTaskId = $state(null);
	let activeDropTarget = $state(null);
	let moveTaskId = $state('');
	let moveBucketId = $state('');
	let moveProgressPercentage = $state('0');
	let moveTargetIndex = $state('0');
	let moveForm;

	function bucketTasks(bucketId) {
		return data.project.tasks.filter((task) => task.bucketId === bucketId);
	}

	function taskById(taskId) {
		return data.project.tasks.find((task) => task.id === taskId) ?? null;
	}

	function formatDate(value) {
		if (!value) return 'No due date';
		const date = value instanceof Date ? value : new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
		return Number.isNaN(date.getTime()) ? 'No due date' : new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
	}

	function priorityClass(priority) {
		if (priority === 'critical') return 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200';
		if (priority === 'high') return 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200';
		if (priority === 'low') return 'bg-slate-100 text-slate-600 dark:bg-white/8 dark:text-slate-300';
		return 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-200';
	}

	function statusLabel(status) {
		if (status === 'in_progress') return 'In progress';
		if (status === 'on_hold') return 'On hold';
		if (status === 'deferred') return 'Deferred';
		if (status === 'completed') return 'Completed';
		if (status === 'canceled') return 'Canceled';
		return 'Open';
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

	function bucketSurfaceStyle(bucket, emphasized = false) {
		const { red, green, blue } = hexToRgb(bucket.color);
		const glowStrength = emphasized ? 0.34 : 0.18;
		const borderStrength = emphasized ? 0.42 : 0.24;
		const backgroundStrength = emphasized ? 0.09 : 0.055;
		return `border-color: rgba(${red}, ${green}, ${blue}, ${borderStrength}); background-color: rgba(${red}, ${green}, ${blue}, ${backgroundStrength}); box-shadow: inset 0 0 0 1px rgba(${red}, ${green}, ${blue}, 0.08), 0 22px 56px -38px rgba(${red}, ${green}, ${blue}, ${glowStrength});`;
	}

	function bucketCountStyle(bucket) {
		const { red, green, blue } = hexToRgb(bucket.color);
		return `background-color: rgba(${red}, ${green}, ${blue}, 0.14); color: rgb(${red}, ${green}, ${blue});`;
	}

	function bucketDividerStyle(bucket) {
		const { red, green, blue } = hexToRgb(bucket.color);
		return `border-color: rgba(${red}, ${green}, ${blue}, 0.22);`;
	}

	function dropIndicatorStyle(bucket) {
		const { red, green, blue } = hexToRgb(bucket.color);
		return `background: linear-gradient(90deg, rgba(${red}, ${green}, ${blue}, 0.30), rgba(${red}, ${green}, ${blue}, 0.10));`;
	}

	function emptyStateStyle(bucket) {
		const { red, green, blue } = hexToRgb(bucket.color);
		return `border-color: rgba(${red}, ${green}, ${blue}, 0.28); box-shadow: inset 0 0 0 1px rgba(${red}, ${green}, ${blue}, 0.04);`;
	}

	function emptyStateCopy(bucket) {
		if (bucket.status === 'in_progress') {
			return {
				title: 'Nothing in progress',
				description: 'Move tasks here when active work starts.'
			};
		}

		if (bucket.status === 'completed') {
			return {
				title: 'No completed tasks',
				description: 'Finished work will appear here.'
			};
		}

		if (bucket.status === 'canceled') {
			return {
				title: 'No canceled tasks',
				description: 'Canceled items stay visible here.'
			};
		}

		return {
			title: `No ${bucket.name.toLowerCase()} tasks`,
			description: 'Drop a task here or create a new one.'
		};
	}

	function handleDragStart(event, task, bucketId) {
		draggedTaskId = task.id;
		activeDropTarget = { bucketId, targetIndex: bucketTasks(bucketId).findIndex((entry) => entry.id === task.id) };
		event.dataTransfer?.setData('text/plain', task.id);
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
		}
	}

	function resetDragState() {
		draggedTaskId = null;
		activeDropTarget = null;
	}

	function updateDropTarget(event, bucketId, targetIndex) {
		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
		activeDropTarget = { bucketId, targetIndex };
	}

	function cardDropIndex(event, index) {
		const rect = event.currentTarget.getBoundingClientRect();
		return event.clientY > rect.top + rect.height / 2 ? index + 1 : index;
	}

	async function submitMove(task, bucketId, targetIndex) {
		moveTaskId = task.id;
		moveBucketId = bucketId;
		moveProgressPercentage = String(task.progressPercentage ?? 0);
		moveTargetIndex = String(targetIndex);
		await tick();
		moveForm?.requestSubmit();
	}

	async function handleDrop(event, bucketId, targetIndex) {
		event.preventDefault();
		const taskId = draggedTaskId ?? event.dataTransfer?.getData('text/plain') ?? '';
		const task = taskById(taskId);

		if (!task) {
			resetDragState();
			return;
		}

		await submitMove(task, bucketId, targetIndex);
		resetDragState();
	}

	function showDropIndicator(bucketId, targetIndex) {
		return activeDropTarget?.bucketId === bucketId && activeDropTarget?.targetIndex === targetIndex;
	}

	function isDraggedTask(taskId) {
		return draggedTaskId === taskId;
	}
</script>

<section class="space-y-4">

	{#if data.notice}
		<div class="rounded-[1.2rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/12 dark:text-emerald-200">{data.notice}</div>
	{/if}

	<form bind:this={moveForm} method="POST" action="?/moveTask" class="hidden">
		<input type="hidden" name="taskId" bind:value={moveTaskId} />
		<input type="hidden" name="bucketId" bind:value={moveBucketId} />
		<input type="hidden" name="progressPercentage" bind:value={moveProgressPercentage} />
		<input type="hidden" name="targetIndex" bind:value={moveTargetIndex} />
	</form>

	<div class="overflow-x-auto pb-2">
		<div class="grid min-w-[72rem] gap-4" style={`grid-template-columns: repeat(${Math.max(1, data.project.buckets.length)}, minmax(17rem, 1fr));`}>
			{#each data.project.buckets as bucket}
				{@const tasks = bucketTasks(bucket.id)}
				{@const emptyState = emptyStateCopy(bucket)}
				<section
					class="flex max-h-[calc(100dvh-13rem)] min-h-[28rem] flex-col rounded-[1.7rem] border backdrop-blur-sm transition"
					role="group"
					aria-label={`${bucket.name} task lane`}
					style={bucketSurfaceStyle(bucket, activeDropTarget?.bucketId === bucket.id)}
					ondragover={(event) => updateDropTarget(event, bucket.id, tasks.length)}
					ondrop={(event) => handleDrop(event, bucket.id, tasks.length)}
				>
					<div class="flex items-start justify-between gap-3 border-b px-4 py-3" style={bucketDividerStyle(bucket)}>
						<div>
							<h2 class="font-semibold text-slate-950 dark:text-white">{bucket.name}</h2>
							<p class="mt-1 text-xs uppercase tracking-[0.24em] text-slate-400">{statusLabel(bucket.status)}</p>
						</div>
						<span class="rounded-full px-2.5 py-1 text-xs font-bold" style={bucketCountStyle(bucket)}>{tasks.length}</span>
					</div>

					<div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
						{#if showDropIndicator(bucket.id, 0)}
							<div class="h-3 rounded-full" style={dropIndicatorStyle(bucket)}></div>
						{/if}

						{#if tasks.length === 0}
							<div class="rounded-[1.3rem] border border-dashed bg-white/55 px-5 py-8 text-center dark:bg-slate-950/55" style={emptyStateStyle(bucket)}>
								<p class="text-sm font-medium text-slate-600 dark:text-slate-300">{emptyState.title}</p>
								<p class="mt-1 text-xs text-slate-400">{emptyState.description}</p>
							</div>
						{/if}

						{#each tasks as task, index}
							<article
								class={`rounded-[1.4rem] border border-slate-200 bg-white/92 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.45)] transition dark:border-white/10 dark:bg-slate-950/88 dark:shadow-[0_20px_40px_-30px_rgba(2,6,23,0.75)] ${isDraggedTask(task.id) ? 'scale-[0.99] opacity-60' : 'opacity-100'}`}
								draggable="true"
								ondragstart={(event) => handleDragStart(event, task, bucket.id)}
								ondragend={resetDragState}
								ondragover={(event) => updateDropTarget(event, bucket.id, cardDropIndex(event, index))}
								ondrop={(event) => handleDrop(event, bucket.id, cardDropIndex(event, index))}
							>
								<div class="flex items-start justify-between gap-3">
									<div>
										<p class="font-semibold text-slate-950 dark:text-white">{task.title}</p>
										<p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{task.description || 'No description'}</p>
									</div>
									<span class={`rounded-full px-2.5 py-1 text-xs font-semibold ${priorityClass(task.priority)}`}>{task.priority}</span>
								</div>
								<div class="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
									<span>{formatDate(task.dueAt)}</span>
									<span>{task.progressPercentage}%</span>
								</div>
								<div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/90 dark:bg-white/10">
									<div class="h-full rounded-full bg-slate-900/70 dark:bg-white/70" style={`width: ${task.progressPercentage}%`}></div>
								</div>
								<div class="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
									<span>{task.assignedUsers?.length ?? 0} assigned</span>
									<a href={`/projects/${data.project.id}/tasks?edit=${task.id}`} class="rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-white/20 dark:hover:text-white">Open</a>
								</div>
							</article>

							{#if showDropIndicator(bucket.id, index + 1)}
								<div class="h-3 rounded-full" style={dropIndicatorStyle(bucket)}></div>
							{/if}
						{/each}
					</div>
				</section>
			{/each}
		</div>
	</div>
</section>
