import { requireAdminAppReady } from '$lib/server/admin-guard';

export async function load(event) {
	return {
		...(await requireAdminAppReady(event)),
		workspaceShell: {
			kicker: 'Tasks Workspace',
			title: 'Tasks',
			subtitle: 'Delivery dashboard and operational queue',
			navItems: [
				{
					href: '/tasks',
					label: 'Dashboard',
					description: 'Signals, workload, due-date pressure'
				},
				{
					href: '/tasks/view',
					label: 'View',
					description: 'Current table, filters, and bulk actions'
				}
			],
			exitHref: '/tools',
			exitLabel: 'Exit tasks'
		}
	};
}