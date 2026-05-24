<script>
	let { form, client = null, mode = 'create' } = $props();

	const emptyContact = {
		name: '',
		email: '',
		phone: '',
		extension: '',
		title: ''
	};

	function getSourceValues() {
		return form?.values ?? client ?? {};
	}

	function normalizeContact(contact = {}) {
		return {
			...emptyContact,
			name: contact.name ?? '',
			email: contact.email ?? '',
			phone: contact.phone ?? '',
			extension: contact.extension ?? '',
			title: contact.title ?? '',
			isPrimary: Boolean(contact.isPrimary)
		};
	}

	function getInitialContacts() {
		const sourceContacts = getSourceValues().contacts ?? [];

		if (sourceContacts.length === 0) {
			return [{ ...emptyContact, isPrimary: true }];
		}

		return sourceContacts.map(normalizeContact);
	}

	function getInitialPrimaryContactIndex(items) {
		const selectedIndex = items.findIndex((contact) => contact.isPrimary);
		return selectedIndex >= 0 ? selectedIndex : 0;
	}

	function errors() {
		return form?.errors ?? {};
	}

	function addContact() {
		contacts = [...contacts, { ...emptyContact, isPrimary: false }];
	}

	function removeContact(index) {
		if (contacts.length === 1) {
			contacts = [{ ...emptyContact, isPrimary: true }];
			primaryContactIndex = 0;
			return;
		}

		contacts = contacts.filter((_, contactIndex) => contactIndex !== index);

		if (primaryContactIndex === index) {
			primaryContactIndex = 0;
		} else if (primaryContactIndex > index) {
			primaryContactIndex -= 1;
		}
	}

	const values = getSourceValues();
	const initialContacts = getInitialContacts();
	let contacts = $state(initialContacts);
	let primaryContactIndex = $state(getInitialPrimaryContactIndex(initialContacts));
</script>

<section class="rounded-[1.9rem] border border-slate-200 bg-slate-50/70 p-6 sm:p-8">
	<div class="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Clients</p>
			<h2 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{mode === 'edit' ? 'Edit client' : 'Create a client'}</h2>
			<p class="mt-2 text-sm leading-7 text-slate-600">
				{mode === 'edit'
					? 'Update company details and contacts, then return to the clients list with the latest values.'
					: 'Capture company details and one or more contacts so the team always has a primary point of contact.'}
			</p>
		</div>

		<a href="/clients" class="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
			Back to clients
		</a>
	</div>

	<form method="POST" class="mt-6 space-y-6 rounded-[1.7rem] border border-white bg-white/90 p-6">
		{#if form?.message}
			<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
				{form.message}
			</div>
		{/if}

		<div class="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
			<div>
				<label class="block text-sm font-medium text-slate-700" for="companyName">Company name</label>
				<input id="companyName" name="companyName" value={values.companyName ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="Northwind Systems" />
				{#if errors().companyName}
					<p class="mt-2 text-sm text-rose-600">{errors().companyName}</p>
				{/if}
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700" for="phone">Company phone</label>
				<input id="phone" name="phone" value={values.phone ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="+1 (555) 010-2000" />
			</div>

			<div>
				<label class="block text-sm font-medium text-slate-700" for="website">Website</label>
				<input id="website" name="website" value={values.website ?? ''} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="https://northwind.example" />
			</div>

			<div class="lg:row-span-2">
				<label class="block text-sm font-medium text-slate-700" for="address">Address</label>
				<textarea id="address" name="address" rows="5" class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="123 Main Street, Suite 400&#10;Austin, TX 78701">{values.address ?? ''}</textarea>
			</div>
		</div>

		<div class="space-y-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p class="text-sm font-semibold text-slate-950">Contacts</p>
					<p class="mt-1 text-sm text-slate-500">Add one or more contacts and choose a single primary contact.</p>
				</div>

				<button type="button" class="inline-flex h-10 items-center rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950" onclick={addContact}>
					Add contact
				</button>
			</div>

			{#if errors().contacts}
				<div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{errors().contacts}
				</div>
			{/if}

			<div class="space-y-4">
				{#each contacts as contact, index (index)}
					<div class="rounded-[1.4rem] border border-slate-200 bg-white p-4">
						<div class="flex flex-col gap-3 border-b border-slate-200/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
							<div class="flex items-center gap-3">
								<input
									id={`primary-contact-${index}`}
									type="radio"
									name="primaryContactIndex"
									value={index}
									checked={primaryContactIndex === index}
									onchange={() => (primaryContactIndex = index)}
									class="h-4 w-4 border-slate-300 text-slate-950 focus:ring-slate-300"
								/>
								<label for={`primary-contact-${index}`} class="text-sm font-semibold text-slate-950">
									{index === 0 ? 'Primary contact' : `Contact ${index + 1}`}
								</label>
							</div>

							<button type="button" class="inline-flex h-9 items-center rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950" onclick={() => removeContact(index)}>
								Remove
							</button>
						</div>

						<div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							<div>
								<label class="block text-sm font-medium text-slate-700" for={`contacts-${index}-name`}>Name</label>
								<input id={`contacts-${index}-name`} name={`contacts[${index}][name]`} bind:value={contact.name} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="Jordan Lee" />
							</div>

							<div>
								<label class="block text-sm font-medium text-slate-700" for={`contacts-${index}-email`}>Email</label>
								<input id={`contacts-${index}-email`} name={`contacts[${index}][email]`} type="email" bind:value={contact.email} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="jordan@northwind.example" />
							</div>

							<div>
								<label class="block text-sm font-medium text-slate-700" for={`contacts-${index}-phone`}>Phone</label>
								<input id={`contacts-${index}-phone`} name={`contacts[${index}][phone]`} bind:value={contact.phone} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="+1 (555) 010-2020" />
							</div>

							<div>
								<label class="block text-sm font-medium text-slate-700" for={`contacts-${index}-extension`}>Extension</label>
								<input id={`contacts-${index}-extension`} name={`contacts[${index}][extension]`} bind:value={contact.extension} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="204" />
							</div>

							<div class="xl:col-span-2">
								<label class="block text-sm font-medium text-slate-700" for={`contacts-${index}-title`}>Title</label>
								<input id={`contacts-${index}-title`} name={`contacts[${index}][title]`} bind:value={contact.title} class="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white" placeholder="Operations Director" />
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<div class="flex flex-wrap items-center justify-end gap-3 pt-2">
			<a href="/clients" class="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950">
				Cancel
			</a>
			<button class="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
				{mode === 'edit' ? 'Update client' : 'Save client'}
			</button>
		</div>
	</form>
</section>