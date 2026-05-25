import { getRunningJobRun, finishJobRun, startJobRun } from '$lib/server/job-runs-store';
import { reconcileTaskSystemTags } from '$lib/server/tasks-store';

const ADMIN_JOBS = {
	'task-maintenance.reconcile-tags': {
		jobKey: 'task-maintenance.reconcile-tags',
		jobName: 'Task maintenance reconciliation',
		description: 'Reconciles system-managed due and stale task tags.',
		sources: ['ofelia', 'manual'],
		scheduler: {
			labelName: 'task-maintenance',
			defaultSchedule: '0 * * * *',
			containerName: 'aionsoft-admin',
			command: 'bun run task:maintenance',
			noOverlap: true
		},
		execute: async () => reconcileTaskSystemTags()
	}
};

function normalizeString(value) {
	return String(value ?? '').trim();
}

export function listAdminJobs() {
	return Object.values(ADMIN_JOBS).map((job) => ({
		jobKey: job.jobKey,
		jobName: job.jobName,
		description: job.description,
		sources: [...job.sources],
		scheduler: job.scheduler ? { ...job.scheduler } : null
	}));
}

export function getAdminJob(jobKey) {
	const normalizedJobKey = normalizeString(jobKey).toLowerCase();
	return ADMIN_JOBS[normalizedJobKey] ?? null;
}

export async function executeAdminJob(jobKey, options = {}) {
	const job = getAdminJob(jobKey);

	if (!job) {
		throw new Error('Job is not registered.');
	}

	const source = normalizeString(options.source) || 'system';
	const runningRun = await getRunningJobRun(job.jobKey);

	if (runningRun) {
		throw new Error('This job is already running.');
	}

	const run = await startJobRun({
		jobKey: job.jobKey,
		jobName: job.jobName,
		source,
		metadata: options.metadata ?? null
	});

	try {
		const result = await job.execute(options);
		const finishedRun = await finishJobRun(run.id, {
			status: 'succeeded',
			result
		});

		return {
			job,
			run: finishedRun,
			result
		};
	} catch (error) {
		const message = error instanceof Error && error.message ? error.message : 'The job could not be completed.';
		await finishJobRun(run.id, {
			status: 'failed',
			errorMessage: message
		});
		throw error;
	}
}