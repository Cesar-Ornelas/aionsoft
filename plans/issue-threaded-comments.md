# Issue Threaded Comments

## Goal

Add GitHub-like conversations to the Operations Issue detail page. Authenticated users can write Markdown comments, edit/delete their own comments, and view chronological conversation history. Threaded replies remain deferred while the flat conversation model is evaluated.

## Decisions

- The initial UI is flat-only; the existing threaded persistence model is retained temporarily.
- Comments use the existing Markdown/Tiptap editing pattern.
- PocketBase users provide authorship; anonymous edit/delete is not supported.
- Use the existing `operations_issue_comments` collection rather than creating a second persistence model.
- Authenticated users can read/create comments; authors can edit/delete their own comments.
- Comments remain writable on closed/cancelled Issues to preserve conversation history.
- Realtime updates, notifications, attachments, mentions, reactions, customer portal visibility, and advanced moderation are deferred.

## Implementation phases

1. Add a server-only PocketBase session resolver and request identity boundary.
2. Add provider-neutral `IssueComment` models, repository operations, validation, thread rules, and author authorization.
3. Complete the existing PocketBase comment schema and adapter mapping, including parent and author relations, ordering indexes, and cascade behavior.
4. Add nested comment GET/POST/PATCH/DELETE routes with session-aware authorization.
5. Replace the Issue detail Conversation placeholder with root/reply Markdown composers, threaded rendering, edit/delete controls, metadata, loading/error/empty states, and shared AlertDialog confirmation.
6. Update Issues feature/spec documentation and add service, adapter, route, and browser coverage.

## Relevant files

- `apps/cell/src/routes/operations/issues/[issueId]/+page.svelte`
- `apps/cell/src/routes/operations/issues/[issueId]/+page.server.js`
- `apps/cell/src/routes/operations/issues/[issueId]/comments/+server.js`
- `apps/cell/src/routes/operations/issues/[issueId]/comments/[commentId]/+server.js`
- `apps/cell/src/lib/issues/model/entities.js`
- `apps/cell/src/lib/issues/server/ports/issues-repository.js`
- `apps/cell/src/lib/issues/server/services/issues-service.js`
- `apps/cell/src/lib/issues/server/adapters/pocketbase/repositories.js`
- `apps/cell/src/lib/crm/server/adapters/pocketbase/schema.js`
- `apps/cell/src/lib/crm/server/composition.js`
- `apps/cell/src/lib/components/IssueDescriptionEditor.svelte`
- `apps/cell/ai/features/issues.md`
- `apps/cell/ai/todos/issues.md`
- `specs/cell-operations-issues.md`

## Validation

Run `bun run cell:test:issues`, then `bun run cell:build`, diagnostics for touched files, and `git diff --check`. Browser-test creating a root comment, replying, Markdown rendering, editing, deleting, reload persistence, and rejected unauthorized mutations.

## Current status

Plan saved. The provider-neutral comment model, repository contract, service validation/authorization rules, Issues adapter mapping, additive schema relations/indexes, request session resolution, login surface with safe redirects and protocol-aware cookies, comment HTTP routes, Issue detail UI, and focused service tests are implemented. Runtime checks confirmed the login error state, Issue conversation rendering, and unauthenticated mutation rejection. Remaining work is authenticated PocketBase/browser coverage, adapter and route integration tests, and deeper identity/collection-rule hardening. Realtime updates, notifications, attachments, mentions, reactions, portal visibility, moderation, and comment permalinks remain deferred.
