import { fail, redirect } from '@sveltejs/kit';
import { getLocalUserByLogtoUserId } from '$lib/server/admin-access-store';
import { executeAdminJob, getAdminJob, listAdminJobs } from '$lib/server/admin-jobs';
import {
	buildOfeliaLabelsSnippet,
	deleteJobDefinition,
	getJobDefinitionsStoreErrorMessage,
	listJobDefinitions,
	saveJobDefinition
} from '$lib/server/job-definitions-store';
import { getJobRunsStoreErrorMessage, listJobRunGroups, listJobRuns, listJobRunStatuses } from '$lib/server/job-runs-store';

function normalizeString(value) {
	return String(value ?? '').trim();
}

function readFilters(searchParams) {
	return {
		view: normalizeString(searchParams.get('view')) === 'definitions' ? 'definitions' : 'events',
		job: normalizeString(searchParams.get('job')).toLowerCase(),
		definition: normalizeString(searchParams.get('definition')).toLowerCase(),
		status: normalizeString(searchParams.get('status')).toLowerCase(),
		dateFrom: normalizeString(searchParams.get('dateFrom')),
		dateTo: normalizeString(searchParams.get('dateTo'))
	};
}

function getNotice(searchParams) {
	if (searchParams.get('reran') === '1') {
		return 'The job was rerun successfully.';
	}

	if (searchParams.get('updated') === '1') {
		return 'The job definition was updated successfully.';
	}

	if (searchParams.get('defined') === '1') {
		return 'The job definition was saved successfully.';
	}

	if (searchParams.get('deleted') === '1') {
		return 'The job definition was deleted successfully.';
	}

	return null;
}

function buildJobsHref(filters, extraParams = {}) {
	const searchParams = new URLSearchParams();

	for (const [key, value] of Object.entries({ ...filters, ...extraParams })) {
		const normalizedValue = normalizeString(value);

		if (normalizedValue) {
			searchParams.set(key, normalizedValue);
		}
	}

	const search = searchParams.toString();
	return `/tools/jobs${search ? `?${search}` : ''}`;
}

function mergeAvailableJobs(registeredJobs, jobDefinitions, groups) {
	const items = new Map();

	for (const job of registeredJobs) {
		items.set(job.jobKey, {
			jobKey: job.jobKey,
			jobName: job.jobName,
			description: job.description,
			sources: [...job.sources],
			scheduler: job.scheduler ? { ...job.scheduler } : null,
			isRegistered: true,
			isDefined: false
		});
	}

	for (const definition of jobDefinitions) {
		const existing = items.get(definition.jobKey);
		items.set(definition.jobKey, {
			jobKey: definition.jobKey,
			jobName: definition.jobName,
			description: definition.description,
			sources: existing?.sources ?? [],
			scheduler: existing?.scheduler ?? null,
			isRegistered: existing?.isRegistered ?? false,
			isDefined: true
		});
	}

	for (const group of groups) {
		if (!items.has(group.jobKey)) {
			items.set(group.jobKey, {
				jobKey: group.jobKey,
				jobName: group.jobName,
				description: '',
				sources: [],
				scheduler: null,
				isRegistered: false,
				isDefined: false
			});
		}
	}

	return [...items.values()].sort((left, right) => left.jobName.localeCompare(right.jobName));
}

function buildDefinitionFormValues(selectedJobKey, registeredJobs, jobDefinitions) {
	const registeredJob = registeredJobs.find((job) => job.jobKey === selectedJobKey) ?? null;
	const definition = jobDefinitions.find((job) => job.jobKey === selectedJobKey) ?? null;

	return {
		jobKey: definition?.jobKey ?? registeredJob?.jobKey ?? '',
		jobName: definition?.jobName ?? registeredJob?.jobName ?? '',
		description: definition?.description ?? registeredJob?.description ?? '',
		labelName: definition?.labelName ?? registeredJob?.scheduler?.labelName ?? '',
		schedule: definition?.schedule ?? registeredJob?.scheduler?.defaultSchedule ?? '',
		containerName: definition?.containerName ?? registeredJob?.scheduler?.containerName ?? '',
		command: definition?.command ?? registeredJob?.scheduler?.command ?? '',
		noOverlap: definition?.noOverlap ?? registeredJob?.scheduler?.noOverlap ?? true
	};
}

export async function load({ url }) {
	const filters = readFilters(url.searchParams);
	const registeredJobs = listAdminJobs();
	const requestedEventJobKey = getAdminJob(filters.job)?.jobKey ?? filters.job;
	const requestedDefinitionKey = getAdminJob(filters.definition)?.jobKey ?? filters.definition;
	const editingDefinitionKey = getAdminJob(normalizeString(url.searchParams.get('edit')).toLowerCase())?.jobKey
		?? normalizeString(url.searchParams.get('edit')).toLowerCase();
	const definitionFormKey = url.searchParams.get('new') === '1' ? null : editingDefinitionKey || null;

	try {
		const [jobDefinitions, groups] = await Promise.all([listJobDefinitions(), listJobRunGroups(filters)]);
		const availableJobs = mergeAvailableJobs(registeredJobs, jobDefinitions, groups);
		const selectedEventJobKey = requestedEventJobKey || groups[0]?.jobKey || availableJobs[0]?.jobKey || null;
		const selectedDefinitionKey = requestedDefinitionKey || jobDefinitions[0]?.jobKey || null;
		const runs = selectedEventJobKey ? await listJobRuns(selectedEventJobKey, { ...filters, limit: 100 }) : [];
		const selectedJobDefinition = jobDefinitions.find((job) => job.jobKey === selectedDefinitionKey) ?? null;
		const editingJobDefinition = jobDefinitions.find((job) => job.jobKey === editingDefinitionKey) ?? null;

		return {
			groups,
			selectedEventJobKey,
			selectedDefinitionKey,
			editingDefinitionKey: editingJobDefinition?.jobKey ?? null,
			runs,
			filters,
			availableJobs,
			jobDefinitions: jobDefinitions.map((definition) => ({
				...definition,
				ofeliaLabelsSnippet: buildOfeliaLabelsSnippet(definition),
				isRegistered: Boolean(getAdminJob(definition.jobKey))
			})),
			selectedJobDefinition: selectedJobDefinition
				? {
					...selectedJobDefinition,
					ofeliaLabelsSnippet: buildOfeliaLabelsSnippet(selectedJobDefinition),
					isRegistered: Boolean(getAdminJob(selectedJobDefinition.jobKey))
				}
				: null,
			jobDefinitionFormValues: buildDefinitionFormValues(definitionFormKey, registeredJobs, jobDefinitions),
			statusOptions: listJobRunStatuses(),
			notice: getNotice(url.searchParams)
		};
	} catch (error) {
		const availableJobs = mergeAvailableJobs(registeredJobs, [], []);

		return {
			groups: [],
			selectedEventJobKey: null,
			selectedDefinitionKey: null,
			editingDefinitionKey: editingDefinitionKey || null,
			runs: [],
			filters,
			availableJobs,
			jobDefinitions: [],
			selectedJobDefinition: null,
			jobDefinitionFormValues: buildDefinitionFormValues(definitionFormKey, registeredJobs, []),
			statusOptions: listJobRunStatuses(),
			notice: getNotice(url.searchParams),
			errorMessage: getJobRunsStoreErrorMessage(error, 'The jobs view could not be loaded.')
		};
	}
}

export const actions = {
	saveDefinition: async ({ request }) => {
		const formData = await request.formData();
		const values = {
			currentJobKey: normalizeString(formData.get('currentJobKey')).toLowerCase(),
			jobKey: normalizeString(formData.get('jobKey')).toLowerCase(),
			jobName: normalizeString(formData.get('jobName')),
			description: normalizeString(formData.get('description')),
			labelName: normalizeString(formData.get('labelName')),
			schedule: normalizeString(formData.get('schedule')),
			containerName: normalizeString(formData.get('containerName')),
			command: normalizeString(formData.get('command')),
			noOverlap: formData.get('noOverlap') ? 'true' : 'false'
		};
		const errors = {};

		if (!values.jobKey) {
			errors.jobKey = 'Job key is required.';
		}

		if (!values.jobName) {
			errors.jobName = 'Job name is required.';
		}

		if (!values.schedule) {
			errors.schedule = 'Schedule is required.';
		}

		if (!values.containerName) {
			errors.containerName = 'Container name is required.';
		}

		if (!values.command) {
			errors.command = 'Command is required.';
		}

		if (Object.keys(errors).length > 0) {
			return fail(400, {
				intent: 'saveDefinition',
				errors,
				values,
				message: 'Complete the required job definition fields.'
			});
		}

		try {
			await saveJobDefinition(values, { currentJobKey: values.currentJobKey });
		} catch (error) {
			return fail(500, {
				intent: 'saveDefinition',
				values,
				message: getJobDefinitionsStoreErrorMessage(error, 'The job definition could not be saved.')
			});
		}

		throw redirect(
			303,
			buildJobsHref(
				{ view: 'definitions', definition: values.jobKey },
				{ [values.currentJobKey ? 'updated' : 'defined']: '1' }
			)
		);
	},
	deleteDefinition: async ({ request }) => {
		const formData = await request.formData();
		const jobKey = normalizeString(formData.get('jobKey')).toLowerCase();

		if (!jobKey) {
			return fail(400, {
				message: 'Job key is required to delete a definition.'
			});
		}

		try {
			await deleteJobDefinition(jobKey);
		} catch (error) {
			return fail(500, {
				message: getJobDefinitionsStoreErrorMessage(error, 'The job definition could not be deleted.')
			});
		}

		throw redirect(303, buildJobsHref({ view: 'definitions' }, { deleted: '1' }));
	},
	rerun: async ({ locals, request }) => {
		const formData = await request.formData();
		const jobKey = normalizeString(formData.get('jobKey')).toLowerCase();
		const filters = {
			view: 'events',
			job: normalizeString(formData.get('returnJob')).toLowerCase() || jobKey,
			definition: normalizeString(formData.get('returnDefinition')).toLowerCase(),
			status: normalizeString(formData.get('returnStatus')).toLowerCase(),
			dateFrom: normalizeString(formData.get('returnDateFrom')),
			dateTo: normalizeString(formData.get('returnDateTo'))
		};
		const job = getAdminJob(jobKey);

		if (!job) {
			return fail(400, {
				message: 'Job is not available for manual rerun.'
			});
		}

		let actor = null;

		try {
			actor = await getLocalUserByLogtoUserId(locals.user?.sub);

			if (!actor) {
				return fail(403, {
					message: 'No local admin user mapping was found for the current account.'
				});
			}

			await executeAdminJob(jobKey, {
				source: 'manual',
				metadata: {
					triggeredByUserId: actor.id,
					triggeredByUserName: actor.name,
					triggeredByUserEmail: actor.email
				}
			});
		} catch (error) {
			return fail(500, {
				message: getJobRunsStoreErrorMessage(error, 'The job could not be rerun.')
			});
		}

		throw redirect(303, buildJobsHref(filters, { reran: '1' }));
	}
};