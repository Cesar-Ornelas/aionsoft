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

Status: first slice implemented. Review rendering, anonymous version-scoped comments, text-range deep links, and optional Issue handoff are in place. The click-to-location slice now renders saved-version content, applies temporary highlights, scrolls to comment anchors, and reports stale anchors. Remaining work includes browser coverage, adapter integration tests, and stronger identity/authorization.

1. Add authored-content rendering that preserves field tokens and page-break markers.
2. Add selection anchor creation/reselection APIs to the document editor.
3. Add provider-neutral review-comment models, port, service, and PocketBase adapter/collection.
4. Add server composition and route loading/actions for comments.
5. Add the Review tab, comments panel, selection composer, click-to-reselect, stale-anchor fallback, and URL deep links.
6. Add explicit Issue creation and backlink persistence.
7. Update feature context/specs and add focused tests.

### Comment Navigation Follow-up

1. Render review anchors against the same saved template version that owns the comments; do not silently anchor comments against unsaved editor content.
2. Isolate the authored document body from the Review notice so character offsets cover only document content.
3. Normalize selection offsets to match trimmed selected text.
4. Reconstruct selected ranges across paragraphs and table cells, wrap the range in a temporary marked highlight, and clear the previous highlight when another comment is opened.
5. Scroll the first highlighted fragment into the left review pane and preserve `tab=review&comment=<id>` deep links after reload.
6. Show a visible stale-anchor state when the saved text no longer matches instead of silently failing.
7. Add focused anchor tests, browser coverage, and update the Documents feature context after implementation.

### Navigation Decisions

- Preserve the existing `{ start, end, text }` anchor contract.
- Use temporary DOM highlighting; never persist highlight markup in document content.
- Keep review comments flat. PDF annotations, realtime collaboration, threaded comments, and rich annotation ranges remain out of scope.

## Validation

- `bun run cell:test:documents`
- `bun run cell:build`
- `get_errors` on touched files
- `git diff --check`
- Browser validation for Review, selection comments, reload deep links, Issue creation, and backlinks.
- Browser validation for click-to-scroll, persistent highlighting, multi-paragraph/table selections, stale anchors, and saved-versus-unsaved content.
