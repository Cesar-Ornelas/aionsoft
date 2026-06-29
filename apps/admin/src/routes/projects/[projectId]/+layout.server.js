import { error } from '@sveltejs/kit';
import { listLocalUsers } from '$lib/server/admin-access-store';
import { getProjectById, getProjectsStoreErrorMessage } from '$lib/server/projects-store';

export async function load({ params }) {
	try {
		const [project, users] = await Promise.all([
			getProjectById(params.projectId),
			listLocalUsers()
		]);

		if (!project) {
			throw error(404, 'Project not found.');
		}

		return {
			project,
			users,
			workspaceShell: {
				kicker: 'Project Workspace',
				title: project.name,
				subtitle: `${project.summary.activeTasks} active tasks · ${project.summary.averageProgress}% complete`,
				actions: [
					{ href: `/projects/${project.id}/tasks?new=1`, label: 'Add task', symbol: '+', tone: 'primary' }
				],
				navItems: [
					{ href: `/projects/${project.id}/overview`, label: 'Overview', description: 'Progress, health, and activity' },
					{ href: `/projects/${project.id}/plan`, label: 'Plan', description: 'Phases, milestones, and task tree' },
					{ href: `/projects/${project.id}/tasks`, label: 'Tasks', description: 'Project task list' },
					{ href: `/projects/${project.id}/kanban`, label: 'Kanban', description: 'Project board and task movement' },
					{ href: `/projects/${project.id}/notes`, label: 'Notes', description: 'Markdown notes, tags, and favorites' },
					{ href: `/projects/${project.id}/settings`, label: 'Settings', description: 'Project fields and custom lists' }
				],
				exitHref: '/projects',
				exitLabel: 'Exit project'
			}
		};
	} catch (caughtError) {
		throw error(caughtError?.status ?? 500, getProjectsStoreErrorMessage(caughtError));
	}
}
