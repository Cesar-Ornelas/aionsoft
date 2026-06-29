<script>
	import { page } from '$app/state';
	import { fade, fly } from 'svelte/transition';
	import ProjectNoteEditor from '$lib/components/ProjectNoteEditor.svelte';

	let { data, form } = $props();

	function currentEditNoteId() {
		return String(form?.noteId ?? page.url.searchParams.get('note') ?? '').trim();
	}

	function drawerMode() {
		return currentEditNoteId() ? 'edit' : 'create';
	}

	function isDrawerOpen() {
		return page.url.searchParams.get('new') === '1' || Boolean(currentEditNoteId()) || form?.intent === 'create' || form?.intent === 'update';
	}

	function createHref() {
		const searchParams = new URLSearchParams();

		searchParams.set('new', '1');

		if (data.filters.q) {
			searchParams.set('q', data.filters.q);
		}

		if (data.filters.tag) {
			searchParams.set('tag', data.filters.tag);
		}

		return `?${searchParams.toString()}`;
	}

	function editHref(noteId) {
		const searchParams = new URLSearchParams();

		searchParams.set('note', noteId);

		if (data.filters.q) {
			searchParams.set('q', data.filters.q);
		}

		if (data.filters.tag) {
			searchParams.set('tag', data.filters.tag);
		}

		return `?${searchParams.toString()}`;
	}

	function closeHref() {
		const searchParams = new URLSearchParams();

		if (data.filters.q) {
			searchParams.set('q', data.filters.q);
		}

		if (data.filters.tag) {
			searchParams.set('tag', data.filters.tag);
		}

		const search = searchParams.toString();
		return `/projects/${data.project.id}/notes${search ? `?${search}` : ''}`;
	}

	function currentValues() {
		if (form?.intent === 'create' || form?.intent === 'update') {
			return {
				title: form.values?.title ?? '',
				bodyMarkdown: form.values?.bodyMarkdown ?? '',
				tagsInput: form.values?.tagsInput ?? '',
				isFavorite: Boolean(form.values?.isFavorite)
			};
		}

		if (data.editNote) {
			return {
				title: data.editNote.title,
				bodyMarkdown: data.editNote.bodyMarkdown,
				tagsInput: data.editNote.tags.map((tag) => tag.name).join(', '),
				isFavorite: data.editNote.isFavorite
			};
		}

		return {
			title: '',
			bodyMarkdown: '',
			tagsInput: '',
			isFavorite: false
		};
	}

	function fieldErrors() {
		if (form?.intent === 'create' || form?.intent === 'update') {
			return form.errors ?? {};
		}

		return {};
	}

	function editorKey() {
		return `${drawerMode()}-${currentEditNoteId() || 'new'}-${form?.intent ?? 'idle'}`;
	}

	function formatDate(value) {
		if (!value) {
			return 'Unknown';
		}

		const date = new Date(value);

		if (Number.isNaN(date.getTime())) {
			return 'Unknown';
		}

		return new Intl.DateTimeFormat('en', {
			dateStyle: 'medium',
			timeStyle: 'short'
		}).format(date);
	}

	const values = $derived(currentValues());
	const errors = $derived(fieldErrors());
</script>

<svelte:head>
	<title>{data.project.name} Notes</title>
</svelte:head>

<section class="space-y-8">
	<div class="flex flex-col gap-5 rounded-[2rem] border border-slate-200 bg-white px-6 py-6 shadow-sm shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900/92 dark:shadow-[0_20px_50px_-32px_rgba(2,6,23,0.75)] lg:flex-row lg:items-end lg:justify-between">
		<div class="space-y-3">
			<p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Project Notes</p>
		</div>

		<a href={createHref()} class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">New note</a>
	</div>

	<form method="GET" class="grid gap-4 rounded-[2rem] border border-slate-200 bg-white px-6 py-5 shadow-sm shadow-slate-200/40 dark:border-white/10 dark:bg-slate-900/92 dark:shadow-[0_20px_50px_-32px_rgba(2,6,23,0.75)] md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end">
		<label class="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
			<span>Search</span>
			<input name="q" value={data.filters.q} placeholder="Search note titles, content, or tags" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-white/20 dark:focus:bg-white/10 dark:focus:ring-white/10" />
		</label>

		<label class="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
			<span>Tag</span>
			<select name="tag" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-white/20 dark:focus:bg-white/10 dark:focus:ring-white/10">
				<option value="">All tags</option>
				{#each data.availableTags as tag}
					<option value={tag.key} selected={tag.key === data.filters.tag}>{tag.name}</option>
				{/each}
			</select>
		</label>

		<div class="flex gap-3">
			<button type="submit" class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Apply</button>
			<a href="." class="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/5">Reset</a>
		</div>
	</form>

	{#if data.notes.length > 0}
		<div class="grid gap-5 xl:grid-cols-2">
			{#each data.notes as note}
				<article class="flex h-full flex-col gap-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/40 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200/50 dark:border-white/10 dark:bg-slate-900/92 dark:shadow-[0_20px_50px_-32px_rgba(2,6,23,0.75)] dark:hover:shadow-[0_24px_56px_-32px_rgba(2,6,23,0.82)]">
					<div class="flex items-start justify-between gap-4">
						<div class="space-y-2">
							<div class="flex flex-wrap items-center gap-2">
								<h2 class="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">{note.title}</h2>
								{#if note.isFavorite}
									<span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:bg-amber-500/12 dark:text-amber-200">Pinned</span>
								{/if}
							</div>
							<p class="text-xs uppercase tracking-[0.2em] text-slate-500">Updated {formatDate(note.updatedAt)}</p>
						</div>

						<form method="POST" action="?/toggleFavorite">
							<input type="hidden" name="noteId" value={note.id} />
							<input type="hidden" name="isFavorite" value={note.isFavorite ? 'false' : 'true'} />
							<input type="hidden" name="returnQ" value={data.filters.q} />
							<input type="hidden" name="returnTag" value={data.filters.tag} />
							<button type="submit" class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-lg text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20 dark:hover:bg-white/5 dark:hover:text-white" aria-label={note.isFavorite ? 'Unpin note' : 'Pin note'}>{note.isFavorite ? '★' : '☆'}</button>
						</form>
					</div>

					{#if note.tags.length > 0}
						<div class="flex flex-wrap gap-2">
							{#each note.tags as tag}
								<span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-white/8 dark:text-slate-300">{tag.name}</span>
							{/each}
						</div>
					{/if}

					<p class="flex-1 text-sm leading-7 text-slate-600 dark:text-slate-400">{note.excerpt || 'This note is still empty.'}</p>

					<div class="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-white/5">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-500">Created {formatDate(note.createdAt)}</p>
						<a href={editHref(note.id)} class="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/5">Edit</a>
					</div>
				</article>
			{/each}
		</div>
	{:else}
		<div class="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center shadow-inner shadow-white dark:border-white/10 dark:bg-white/5 dark:shadow-none">
			<div class="mx-auto max-w-2xl space-y-3">
				<p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">No notes yet</p>
				<h2 class="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Start the project knowledge base.</h2>
				<p class="text-sm leading-7 text-slate-600 dark:text-slate-400">Capture kickoff notes, meeting outcomes, deployment checklists, or internal runbooks so the team can find them alongside the project plan.</p>
				<div class="pt-2">
					<a href={createHref()} class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">Create the first note</a>
				</div>
			</div>
		</div>
	{/if}
</section>

{#if isDrawerOpen()}
	<div class="fixed inset-0 z-40 bg-slate-950/45" transition:fade></div>
	<aside class="fixed inset-y-0 right-0 z-50 w-full max-w-3xl overflow-y-auto border-l border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-2xl shadow-slate-950/20 dark:border-white/10 dark:bg-[linear-gradient(180deg,#020617_0%,#0f172a_100%)] dark:shadow-[0_24px_80px_-24px_rgba(2,6,23,0.85)]" transition:fly={{ x: 32, duration: 180 }}>
		<div class="flex min-h-full flex-col">
			<div class="flex items-start justify-between gap-6 border-b border-slate-200 px-6 py-5 dark:border-white/10">
				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{drawerMode() === 'edit' ? 'Edit Note' : 'New Note'}</p>
					<h2 class="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">{drawerMode() === 'edit' ? 'Update the project note.' : 'Create a new project note.'}</h2>
					<p class="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-400">Use markdown formatting for meeting notes, decisions, checklists, or implementation context. Pinned notes stay at the top of the list.</p>
				</div>

				<a href={closeHref()} class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20 dark:hover:bg-white/5 dark:hover:text-white" aria-label="Close notes drawer">×</a>
			</div>

			<form method="POST" action={drawerMode() === 'edit' ? '?/update' : '?/create'} class="flex flex-1 flex-col gap-6 px-6 py-6">
				{#if drawerMode() === 'edit'}
					<input type="hidden" name="noteId" value={currentEditNoteId()} />
				{/if}

				<input type="hidden" name="returnQ" value={data.filters.q} />
				<input type="hidden" name="returnTag" value={data.filters.tag} />

				<label class="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
					<span>Title</span>
					<input name="title" value={values.title} placeholder="Sprint review notes" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-white/20 dark:focus:ring-white/10" />
					{#if errors.title}
						<p class="text-sm text-rose-600">{errors.title}</p>
					{/if}
				</label>

				<div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
					<label class="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-300">
						<span>Tags</span>
						<input name="tagsInput" value={values.tagsInput} placeholder="handoff, deployment, meeting" class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:focus:border-white/20 dark:focus:ring-white/10" />
					</label>

					<label class="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
						<input type="checkbox" name="isFavorite" checked={values.isFavorite} class="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300" />
						<span>Pin note</span>
					</label>
				</div>

				<div class="space-y-2">
					<div class="flex items-center justify-between gap-4">
						<p id="project-note-body-label" class="text-sm font-medium text-slate-700 dark:text-slate-300">Body</p>
						<p class="text-xs uppercase tracking-[0.18em] text-slate-500">Markdown editor</p>
					</div>

					{#key editorKey()}
						<ProjectNoteEditor value={values.bodyMarkdown} labelledBy="project-note-body-label" placeholder="Write the project note in markdown. Use headings, lists, quotes, or code blocks as needed." />
					{/key}

					{#if errors.bodyMarkdown}
						<p class="text-sm text-rose-600">{errors.bodyMarkdown}</p>
					{/if}
				</div>

				<div class="mt-auto flex items-center justify-between gap-4 border-t border-slate-200 pt-6 dark:border-white/10">
					<p class="max-w-xl text-sm leading-7 text-slate-500 dark:text-slate-400">Notes are stored per project, searchable by title and content, and can be filtered by tag.</p>

					<div class="flex gap-3">
						<a href={closeHref()} class="inline-flex items-center justify-center rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20 dark:hover:bg-white/5">Cancel</a>
						<button type="submit" class="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">{drawerMode() === 'edit' ? 'Save changes' : 'Create note'}</button>
					</div>
				</div>
			</form>
		</div>
	</aside>
{/if}