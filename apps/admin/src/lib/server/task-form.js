function readTrimmedString(formData, name) {
	return String(formData.get(name) ?? '').trim();
}

function padNumber(value) {
	return String(value).padStart(2, '0');
}

function parseLocalDateParts(value) {
	const normalizedValue = String(value ?? '').trim();
	const match = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

	if (!match) {
		return null;
	}

	const [, year, month, day] = match;
	return {
		year: Number.parseInt(year, 10),
		month: Number.parseInt(month, 10),
		day: Number.parseInt(day, 10)
	};
}

function parseLocalTimeParts(value) {
	const normalizedValue = String(value ?? '').trim();

	if (!normalizedValue) {
		return null;
	}

	const match = normalizedValue.match(/^(\d{2}):(\d{2})$/);

	if (!match) {
		return null;
	}

	const [, hours, minutes] = match;
	return {
		hours: Number.parseInt(hours, 10),
		minutes: Number.parseInt(minutes, 10)
	};
}

function combineDueAt(dueDate, dueTime) {
	const dateParts = parseLocalDateParts(dueDate);

	if (!dateParts) {
		return '';
	}

	const timeParts = parseLocalTimeParts(dueTime) ?? { hours: 0, minutes: 0 };
	const date = new Date(
		dateParts.year,
		dateParts.month - 1,
		dateParts.day,
		timeParts.hours,
		timeParts.minutes,
		0,
		0
	);

	if (Number.isNaN(date.getTime())) {
		return '';
	}

	return date.toISOString();
}

function formatDueDateValue(value) {
	if (!value) {
		return '';
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return '';
	}

	const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return localDate.toISOString().slice(0, 10);
}

function formatDueTimeValue(value) {
	if (!value) {
		return '';
	}

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) {
		return '';
	}

	return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function resolveStoredDueTime(input) {
	if (input.hasDueTime === false || input.hasDueTime === 'false') {
		return '';
	}

	if (String(input.dueTime ?? '').trim()) {
		return String(input.dueTime).trim();
	}

	return formatDueTimeValue(input.dueAt);
}

export function readTaskInput(formData) {
	const dueDate = readTrimmedString(formData, 'dueDate');
	const dueTime = readTrimmedString(formData, 'dueTime');

	return {
		title: readTrimmedString(formData, 'title'),
		description: readTrimmedString(formData, 'description'),
		status: readTrimmedString(formData, 'status') || 'open',
		progressPercentage: readTrimmedString(formData, 'progressPercentage'),
		dueDate,
		dueTime,
		hasDueTime: Boolean(dueTime),
		dueAt: combineDueAt(dueDate, dueTime),
		notificationOffsetMinutes: readTrimmedString(formData, 'notificationOffsetMinutes'),
		recurrenceRule: readTrimmedString(formData, 'recurrenceRule') || 'none',
		assignedUserIds: formData.getAll('assignedUserIds').map((value) => String(value).trim()).filter(Boolean),
		tags: readTrimmedString(formData, 'tags')
	};
}

export function buildTaskFormValues(input) {
	return {
		...input,
		dueDate: input.dueDate ?? formatDueDateValue(input.dueAt),
		dueTime: input.dueTime ?? resolveStoredDueTime(input),
		progressPercentage: String(input.progressPercentage ?? input.progress ?? '0'),
		tagsInput: input.tags
	};
}