# Tasks

## Overview

The admin app needs a top-level `Tasks` area for tracking operational work with due dates, optional reminders, recurrence, assignments, and tags.

This first pass covers:
- task creation and editing
- due dates
- optional in-app reminders
- basic recurrence: none, daily, weekly, monthly, yearly
- assignment to local admin users
- tags for grouping and searching
- in-app alert registration linked back to the task

It does not yet cover:
- email notifications
- subtasks or dependencies
- comments or attachments
- kanban boards or calendar views
- custom recurrence rules

## External API

Tasks now have a first-pass external integration surface for server-to-server creation.

Current implementation:
- `POST /api/v1/tasks`
- bearer-token authentication through an Admin-managed integration token
- idempotent create behavior using `sourceExternalId` scoped to the calling integration
- external tasks still flow through the same internal task store and alert sync path

Current request requirements:
- `title`
- `dueAt`
- `sourceExternalId`

Optional request fields:
- `description`
- `notificationOffsetMinutes`
- `recurrenceRule`
- `assignedUserIds`
- `tags`
- `sourceType`
- `sourceLabel`

Current response behavior:
- returns `201` with `{ task, created: true }` for a new task
- returns `200` with `{ task, created: false }` when the same integration sends an existing `sourceExternalId`

## Provenance

Tasks can now carry external-source metadata:
- `sourceIntegrationId`
- `sourceType`
- `sourceLabel`
- `sourceExternalId`
- `createdVia`

This allows the app to track which external system created a task while still assigning the task to a real local admin user for internal follow-up.

## Route Shape

Routes:
- `/tasks`
- `/tasks/new`
- `/tasks/[taskId]/edit`

Tasks is a top-level operational domain, not a Tool card.

## Rules

1. A task must have a title.
2. A task must have a due date.
3. A task may have zero or more assignees.
4. A task may have zero or more tags.
5. Recurrence is limited to `none`, `daily`, `weekly`, `monthly`, or `yearly`.
6. Notifications are in-app only in the first pass.

## Alerts

Tasks register alerts that link back to the task edit route.

First pass alert behavior:
- a due-date alert is registered for active tasks
- an optional reminder alert is registered when a reminder offset is configured
- completing a task resolves its active alerts