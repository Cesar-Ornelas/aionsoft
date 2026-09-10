# Comment Thumbs-Up Voting

## Goal

Add persisted thumbs-up feedback to Operations Issue comments and Document Review comments. Each authenticated user can vote once, click again to remove the vote, see the selected state and count, and hover the count to see voter names. Users cannot vote on their own comments.

## Decisions

- Voting applies to all Issue conversation comments, not only `document-review` Issues.
- The original Document Review comment is votable in the Review Sheet.
- Issue comments and Review comments use separate vote collections because they are separate domain records.
- Vote ownership uses the authenticated stable user ID; the display name is snapshotted at vote time.
- The server enforces authentication, self-vote prevention, duplicate protection, and toggle state.
- Existing author-only edit/delete behavior remains unchanged.
- Anonymous voting, other reactions, notifications, and realtime updates are out of scope.

## Implementation

1. Update Issue and Document Review feature contracts and specifications.
2. Add provider-neutral vote models and repository ports.
3. Add additive PocketBase collections with unique `(comment, voter)` indexes.
4. Implement service-level vote toggles and enriched vote summaries.
5. Add Issue and Document Review vote endpoints with ownership validation.
6. Render thumbs-up controls, selected state, counts, and voter-name tooltips in both UIs.
7. Add service/adapter tests for first vote, toggle-off, duplicate protection, self-vote rejection, authentication, and voter names.
8. Run focused tests, Cell build, diagnostics, diff checks, and browser verification.

## Validation

- `bun run cell:test:issues`
- `bun run cell:test:documents`
- `bun run cell:build`
- Diagnostics for all touched files
- `git diff --check`
- Browser verification of voting, toggle-off, voter tooltip, self-vote blocking, Sheet behavior, and reload persistence
