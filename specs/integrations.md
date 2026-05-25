# Integrations

## Overview

The admin app now has a first-pass integrations model for server-to-server task creation.

This is intended for:
- other Aionsoft-owned apps
- customer-operated sites or backend systems

Human admins still authenticate through Logto and the UI. External systems authenticate through per-integration API tokens issued inside the Admin app.

## Current Model

Each integration has:
- its own token
- its own permission list
- an internal local user used as the task owner/actor for created tasks
- usage metadata such as `lastUsedAt`

The token is shown once when created and only its hash plus a visible hint are stored.

## Current Permissions

First-pass supported permissions:
- `tasks:create`
- `tasks:update`
- `tasks:read`

The first implemented endpoint only requires `tasks:create`.

## Current Endpoints

Implemented:
- `POST /api/v1/tasks`

Planned next:
- `PATCH /api/v1/tasks/[taskId]`
- `GET /api/v1/tasks/[taskId]`
- outbound task webhooks

## How To Use The Current API

### 1. Create an integration in Admin

Go to:
- `/integrations`

Create a new integration and:
- give it a recognizable name
- choose the internal local admin user that should own created tasks
- grant `tasks:create`
- copy the token shown after creation

Important:
- the raw token is shown only once
- after that, only the token hint is kept in the UI

### 2. Send requests with a bearer token

All current API requests must include:

```http
Authorization: Bearer <your-integration-token>
Content-Type: application/json
```

### 3. Call the task-create endpoint

Current endpoint:

```text
POST /api/v1/tasks
```

Local example:

```text
http://localhost:3003/api/v1/tasks
```

### 4. Required request fields

Required:
- `title`
- `dueAt`
- `sourceExternalId`

Optional:
- `description`
- `status`
- `notificationOffsetMinutes`
- `recurrenceRule`
- `assignedUserIds`
- `tags`
- `sourceType`
- `sourceLabel`

### 5. Example request

```json
{
	"title": "Follow up with customer about new lead",
	"description": "Created automatically from customer website contact form.",
	"dueAt": "2026-05-26T16:00:00.000Z",
	"notificationOffsetMinutes": 60,
	"recurrenceRule": "none",
	"assignedUserIds": ["local-admin-user-id"],
	"tags": ["customer", "lead", "website"],
	"sourceExternalId": "contact-form-000123",
	"sourceType": "customer-site",
	"sourceLabel": "Main Marketing Site"
}
```

### 6. Example curl command

```bash
curl -X POST http://localhost:3003/api/v1/tasks \
	-H "Authorization: Bearer YOUR_INTEGRATION_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{
		"title": "Follow up with customer about new lead",
		"description": "Created automatically from customer website contact form.",
		"dueAt": "2026-05-26T16:00:00.000Z",
		"notificationOffsetMinutes": 60,
		"recurrenceRule": "none",
		"assignedUserIds": ["local-admin-user-id"],
		"tags": ["customer", "lead", "website"],
		"sourceExternalId": "contact-form-000123",
		"sourceType": "customer-site",
		"sourceLabel": "Main Marketing Site"
	}'
```

### 7. Example fetch call

```js
await fetch('http://localhost:3003/api/v1/tasks', {
	method: 'POST',
	headers: {
		Authorization: `Bearer ${process.env.AIONSOFT_TASKS_TOKEN}`,
		'Content-Type': 'application/json'
	},
	body: JSON.stringify({
		title: 'Follow up with customer about new lead',
		description: 'Created automatically from customer website contact form.',
		dueAt: '2026-05-26T16:00:00.000Z',
		notificationOffsetMinutes: 60,
		recurrenceRule: 'none',
		assignedUserIds: ['local-admin-user-id'],
		tags: ['customer', 'lead', 'website'],
		sourceExternalId: 'contact-form-000123',
		sourceType: 'customer-site',
		sourceLabel: 'Main Marketing Site'
	})
});
```

## Current Response Behavior

### Successful new task

Status:
- `201 Created`

Shape:

```json
{
	"task": {
		"id": "task-id",
		"title": "Follow up with customer about new lead",
		"description": "Created automatically from customer website contact form.",
		"status": "open",
		"dueAt": "2026-05-26T16:00:00.000Z",
		"notificationOffsetMinutes": 60,
		"recurrenceRule": "none",
		"createdByUserId": "local-admin-user-id",
		"sourceIntegrationId": "integration-id",
		"sourceType": "customer-site",
		"sourceLabel": "Main Marketing Site",
		"sourceExternalId": "contact-form-000123",
		"createdVia": "api",
		"assignedUsers": [],
		"tags": [],
		"createdAt": "2026-05-25T18:00:00.000Z",
		"updatedAt": "2026-05-25T18:00:00.000Z"
	},
	"created": true
}
```

### Idempotent retry

If the same integration sends the same `sourceExternalId` again:

Status:
- `200 OK`

Shape:

```json
{
	"task": { "...": "existing task" },
	"created": false
}
```

This is intentional so external callers can safely retry without creating duplicates.

## Common Error Responses

### Missing or invalid token

Status:
- `401 Unauthorized`

Example:

```json
{
	"message": "The provided API token is invalid."
}
```

### Revoked token or insufficient permission

Status:
- `403 Forbidden`

Example:

```json
{
	"message": "This integration does not have permission for the requested task operation."
}
```

### Invalid JSON body

Status:
- `400 Bad Request`

Example:

```json
{
	"message": "The request body must be valid JSON."
}
```

### Missing required fields

Status:
- `400 Bad Request`

Example:

```json
{
	"message": "The task request is invalid.",
	"errors": {
		"title": "Task title is required.",
		"dueAt": "Task due date is required.",
		"sourceExternalId": "An external source reference is required."
	}
}
```

## Current Usage Notes

1. `assignedUserIds` must reference existing local admin users in the admin app.
2. `dueAt` should be sent as an ISO timestamp.
3. `notificationOffsetMinutes` should be an integer number of minutes.
4. `recurrenceRule` currently supports only `none`, `daily`, `weekly`, `monthly`, or `yearly`.
5. `tags` may be sent as an array of strings.
6. Tasks created through the API still register internal alerts using the same task-alert logic as UI-created tasks.
7. The integration's selected internal owner becomes `createdByUserId` on created tasks.

## Recommended Caller Pattern

For external systems, the safest pattern is:

1. create one integration per external app or environment
2. store the token in that system's secret manager or environment variables
3. generate a stable `sourceExternalId` from the source record
4. retry failed requests with the same `sourceExternalId`
5. do not embed tokens in client-side browser code

## Token Rules

1. Tokens are bearer tokens sent in the `Authorization` header.
2. Tokens are issued per integration, not shared globally.
3. Raw tokens are never stored after creation.
4. Revoked integrations must no longer be able to call the API.
5. API-token auth is separate from webhook signing secrets.

## External Task Rules

1. External create requests must include `sourceExternalId`.
2. `sourceExternalId` is unique within a single integration.
3. Repeating the same `sourceExternalId` for the same integration should return the existing task instead of creating a duplicate.
4. External task writes should reuse the same internal task and alert logic as UI-created tasks.

## Current Admin Surface

Admin operators can currently manage integrations at:
- `/integrations`

The page currently supports:
- creating an integration
- choosing the internal owner user
- assigning permissions
- viewing token hints and last-used timestamps

Future work should add:
- token rotation
- token revocation
- webhook endpoint management
- delivery history and failure inspection


ait_WeQfVVPH1NRHsXwgRBiyDau6bMkD1kJm