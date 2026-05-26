function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

export function readProjectTaskInput(formData) {
	return {
		phaseId: readTrimmedString(formData, 'phaseId'),
		milestoneId: readTrimmedString(formData, 'milestoneId'),
		bucketId: readTrimmedString(formData, 'bucketId'),
		title: readTrimmedString(formData, 'title'),
		description: readTrimmedString(formData, 'description'),
		status: readTrimmedString(formData, 'status') || 'open',
		priority: readTrimmedString(formData, 'priority') || 'normal',
		progressPercentage: readTrimmedString(formData, 'progressPercentage') || '0',
		startAt: readTrimmedString(formData, 'startAt'),
		dueAt: readTrimmedString(formData, 'dueAt'),
		assignedUserIds: formData.getAll('assignedUserIds').map((value) => String(value).trim()).filter(Boolean),
		tags: readTrimmedString(formData, 'tags')
	};
}

export function buildProjectTaskFormValues(input) {
	return {
		...input,
		tagsInput: Array.isArray(input.tags)
			? input.tags.map((tag) => typeof tag === 'string' ? tag : tag.name).filter(Boolean).join(', ')
			: input.tags ?? ''
	};
}

export function readProjectInput(formData) {
	return {
		name: readTrimmedString(formData, 'name'),
		description: readTrimmedString(formData, 'description'),
		status: readTrimmedString(formData, 'status') || 'active',
		startAt: readTrimmedString(formData, 'startAt'),
		dueAt: readTrimmedString(formData, 'dueAt')
	};
}

export function readProjectPhaseInput(formData) {
	return {
		name: readTrimmedString(formData, 'name'),
		description: readTrimmedString(formData, 'description'),
		startAt: readTrimmedString(formData, 'startAt'),
		dueAt: readTrimmedString(formData, 'dueAt'),
		sortOrder: readTrimmedString(formData, 'sortOrder')
	};
}

export function readProjectMilestoneInput(formData) {
	return {
		phaseId: readTrimmedString(formData, 'phaseId'),
		name: readTrimmedString(formData, 'name'),
		description: readTrimmedString(formData, 'description'),
		startAt: readTrimmedString(formData, 'startAt'),
		dueAt: readTrimmedString(formData, 'dueAt'),
		sortOrder: readTrimmedString(formData, 'sortOrder')
	};
}

export function readProjectBucketInput(formData) {
	return {
		name: readTrimmedString(formData, 'name'),
		key: readTrimmedString(formData, 'key'),
		status: readTrimmedString(formData, 'status') || 'open',
		isTerminal: Boolean(formData.get('isTerminal')),
		sortOrder: readTrimmedString(formData, 'sortOrder')
	};
}
