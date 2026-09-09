# Document Review And Comments

## Goal

Add a Review workspace to the Document Builder that shows authored template content without data substitution, supports flat comments anchored to selected text, deep-links back to selections, and optionally hands a comment off to the existing Operations Issues workflow.

## Decisions

- Comments belong to a saved document template version.
- Comments are flat in the first slice; threaded replies are deferred.
- Flagging an issue is explicit and optional; ordinary comments remain internal.
- Issue descriptions include the selected excerpt, original comment, document/version/comment identifiers, and a Review backlink.
- Review shows authored field tokens; Preview remains the sample-data-substituted HTML view.
- Deep links use `tab=review&comment=<id>`.
- Cell has no request-level authenticated identity in these routes, so first-slice comments are anonymous. Stable author ownership and authorization will be added with identity/session wiring.
- PDF generation, approval gates, realtime comments, and signature capture are separate future work.

## Implementation

Status: first slice implemented. Review rendering, anonymous version-scoped comments, text-range deep links, and optional Issue handoff are in place. Remaining work includes stronger identity/authorization, stale-anchor UI polish, adapter integration tests, and richer browser coverage.

1. Add authored-content rendering that preserves field tokens and page-break markers.
2. Add selection anchor creation/reselection APIs to the document editor.
3. Add provider-neutral review-comment models, port, service, and PocketBase adapter/collection.
4. Add server composition and route loading/actions for comments.
5. Add the Review tab, comments panel, selection composer, click-to-reselect, stale-anchor fallback, and URL deep links.
6. Add explicit Issue creation and backlink persistence.
7. Update feature context/specs and add focused tests.

## Validation

- `bun run cell:test:documents`
- `bun run cell:build`
- `get_errors` on touched files
- `git diff --check`
- Browser validation for Review, selection comments, reload deep links, Issue creation, and backlinks.
