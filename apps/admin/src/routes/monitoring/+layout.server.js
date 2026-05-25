import { requireAdminAppReady } from '$lib/server/admin-guard';

export async function load(event) {
	const guardData = await requireAdminAppReady(event);

	return {
		...guardData,
		workspaceShell: {
			kicker: 'Tool Workspace',
			title: 'Monitoring',
			subtitle: 'Dashboard and saved infrastructure links',
			navItems: [
				{
					href: '/monitoring/dashboard',
					label: 'Dashboard',
					description: 'Summary and quick access'
				},
				{
					href: '/monitoring/sites',
					label: 'Sites',
					description: 'Saved monitoring URLs'
				}
			],
			exitHref: '/tools',
			exitLabel: 'Back to tools'
		}
	};
}