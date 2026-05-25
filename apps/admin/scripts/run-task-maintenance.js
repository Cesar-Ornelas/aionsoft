const maintenanceSecret = String(process.env.TASK_MAINTENANCE_SECRET ?? '').trim();

if (!maintenanceSecret) {
	console.error('TASK_MAINTENANCE_SECRET is required to run task maintenance.');
	process.exit(1);
}

const response = await fetch('http://127.0.0.1:3000/api/internal/task-maintenance/reconcile-tags', {
	method: 'POST',
	headers: {
		Authorization: `Bearer ${maintenanceSecret}`
	}
});

const responseBody = await response.text();

if (!response.ok) {
	console.error(responseBody);
	process.exit(1);
}

console.log(responseBody);