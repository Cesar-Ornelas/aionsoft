<script>
  import { tick } from "svelte";
  import { goto } from "$app/navigation";
  import ArrowLeftIcon from "@lucide/svelte/icons/arrow-left";
  import CopyIcon from "@lucide/svelte/icons/copy";
  import DownloadIcon from "@lucide/svelte/icons/download";
  import EyeIcon from "@lucide/svelte/icons/eye";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import FileTextIcon from "@lucide/svelte/icons/file-text";
  import MessageCircleIcon from "@lucide/svelte/icons/message-circle";
  import PencilIcon from "@lucide/svelte/icons/pencil";
  import PrinterIcon from "@lucide/svelte/icons/printer";
  import SaveIcon from "@lucide/svelte/icons/save";
  import ThumbsUpIcon from "@lucide/svelte/icons/thumbs-up";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import Undo2Icon from "@lucide/svelte/icons/undo-2";
  import UploadCloudIcon from "@lucide/svelte/icons/upload-cloud";
  import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
  import ZoomInIcon from "@lucide/svelte/icons/zoom-in";
  import ZoomOutIcon from "@lucide/svelte/icons/zoom-out";
  import * as AlertDialog from "$lib/components/ui/alert-dialog";
  import * as Field from "$lib/components/ui/field";
  import * as Sheet from "$lib/components/ui/sheet";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import DocumentPageConfigDialog from "$lib/components/DocumentPageConfigDialog.svelte";
  import DocumentTokenInspector from "$lib/components/DocumentTokenInspector.svelte";
  import FormSchemaEditor from "$lib/components/FormSchemaEditor.svelte";
  import IssueDescriptionEditor from "$lib/components/IssueDescriptionEditor.svelte";
  import {
    renderAuthoredDocumentHtml,
    renderDocumentHtml,
  } from "$lib/documents/model/content.js";
  import { toast } from "$lib/stores/toast.js";
  import { DEFAULT_PAGE_CONFIG, normalizePageConfig } from "$lib/documents/model/page-config.js";

  let { data } = $props();
  let selectedFormVersionId = $state(
    data.versions?.[0]?.formVersionId ?? data.ownedFormVersions?.[0]?.id ?? "",
  );
  let content = $state(
    data.versions?.[0]?.content ?? {
      type: "doc",
      content: [{ type: "paragraph" }],
    },
  );
  let sampleData = $state(
    structuredClone(data.versions?.[0]?.sampleData ?? {}),
  );
  let pageConfig = $state(
    normalizePageConfig(data.versions?.[0]?.pageConfig ?? DEFAULT_PAGE_CONFIG),
  );
  let pageConfigDialogOpen = $state(false);
  let resources = $state(structuredClone(data.resources ?? []));
  let variables = $state(structuredClone(data.variables ?? []));
  let formFields = $state(
    structuredClone(data.ownedFormVersions?.[0]?.schema?.fields ?? []),
  );
  let isSaving = $state(false);
  let errorMessage = $state("");
  let previewValues = $state({});
  let previewZoom = $state(100);
  let workspaceTab = $state(
    data.reviewTabRequested || data.reviewCommentId ? "review" : "form",
  );
  let dateFormat = $state("long");
  let editorApi = $state();
  let selectedToken = $state(null);
  let selectedFormVersion = $derived(
    data.ownedFormVersions?.find(
      (version) => version.id === selectedFormVersionId,
    ),
  );
  let availableFields = $derived(flattenFields(formFields));
  let availableVariables = $derived(variables.filter((variable) => variable.status !== 'archived'));
  let latestVersion = $derived(data.versions?.[0] ?? null);
  let reviewContentContainer = $state();
  let reviewBody = $state("");
  let reviewSelection = $state(null);
  let reviewError = $state("");
  let reviewAnchorStatus = $state("");
  let activeReviewComment = $state(data.reviewCommentId || "");
  let reviewComments = $state(structuredClone(data.reviewComments ?? []));
  let reviewIssues = $state(structuredClone(data.reviewIssues ?? {}));
  let deletingReviewCommentId = $state("");
  let pendingDeleteComment = $state(null);
  let issueSheetOpen = $state(false);
  let issueSheetLoading = $state(false);
  let issueSheetError = $state("");
  let linkedIssue = $state(null);
  let linkedReviewComment = $state(null);
  let linkedIssueComments = $state([]);
  let issueCommentBody = $state("");
  let issueEditingCommentId = $state("");
  let issueEditingBody = $state("");
  let issueCommentError = $state("");
  let issueCommentSubmitting = $state(false);
  let issueDeletingCommentId = $state("");
  let votingCommentId = $state("");
  let votingReviewCommentId = $state("");
  let deleteTemplateOpen = $state(false);
  let templateNameCopied = $state(false);
  let pendingRollback = $state(null);
  let isRollingBack = $state(false);
  let deleteTemplateConfirmation = $state("");
  let canDeleteTemplate = $derived(
    deleteTemplateConfirmation === data.template.name,
  );

  const previewZoomMin = 50;
  const previewZoomMax = 150;
  const previewZoomStep = 10;
  const previewPageWidth = 816;
  const previewPageHeight = 1056;

  function adjustPreviewZoom(amount) {
    previewZoom = Math.min(previewZoomMax, Math.max(previewZoomMin, previewZoom + amount));
  }

  function previewPaperStyle() {
    const scale = previewZoom / 100;
    return `width:${previewPageWidth * scale}px;min-height:${previewPageHeight * scale}px;`;
  }

  function flattenFields(fields, result = []) {
    for (const field of fields) {
      result.push(field);
      if (field.fields) flattenFields(field.fields, result);
    }
    return result;
  }
  function handleEditorReady(api) {
    editorApi = api;
  }

  function handleTokenSelection(token) {
    selectedToken = token;
  }

  async function uploadResource(file) {
    const form = new FormData();
    form.set("file", file);
    const response = await fetch(`/management/documents/${data.template.id}/resources`, { method: "POST", body: form });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to upload image.");
    resources = [result.resource, ...resources];
    toast.success("Image uploaded.");
    return result.resource;
  }
  function renderPreviewHtml() {
    try {
      return renderDocumentHtml(
        content,
        { ...sampleData, ...previewValues },
        { fields: formFields },
        pageConfig,
        resources,
        availableVariables,
      );
    } catch (error) {
      return '<p class="document-preview-error">Document preview is unavailable until its field references are resolved.</p>';
    }
  }

  function renderAuthoredHtml() {
    try {
      return renderAuthoredDocumentHtml(latestVersion?.content ?? content, latestVersion?.pageConfig ?? pageConfig);
    } catch {
      return '<p class="document-preview-error">Document review is unavailable until the authored content is valid.</p>';
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function renderCommentMarkdown(value) {
    let html = escapeHtml(value)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    );
    return html.replace(/\n/g, "<br>");
  }

  function voteTooltip(votes) {
    return votes?.voterNames?.length
      ? votes.voterNames.join(", ")
      : "No votes yet";
  }

  async function toggleReviewCommentVote(comment) {
    if (!data.user?.id || data.user.id === comment.authorId) return;
    votingReviewCommentId = comment.id;
    reviewError = "";
    try {
      const response = await fetch(
        `/management/documents/${data.template.id}/reviews/${comment.id}/vote`,
        { method: "POST" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to update the vote.");
      const updated = { ...comment, votes: result };
      reviewComments = reviewComments.map((entry) =>
        entry.id === comment.id ? updated : entry,
      );
      if (linkedReviewComment?.id === comment.id) linkedReviewComment = updated;
    } catch (error) {
      reviewError = error.message;
    } finally {
      votingReviewCommentId = "";
    }
  }

  async function toggleIssueCommentVote(comment) {
    if (!data.user?.id || data.user.id === comment.authorId || !linkedIssue)
      return;
    votingCommentId = comment.id;
    issueCommentError = "";
    try {
      const response = await fetch(
        `/operations/issues/${linkedIssue.id}/comments/${comment.id}/vote`,
        { method: "POST" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to update the vote.");
      linkedIssueComments = linkedIssueComments.map((entry) =>
        entry.id === comment.id ? { ...entry, votes: result } : entry,
      );
      syncLinkedIssueComments(linkedIssueComments);
    } catch (error) {
      issueCommentError = error.message;
    } finally {
      votingCommentId = "";
    }
  }

  function textOffset(container, target, offset) {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let total = 0;
    let current;
    while ((current = walker.nextNode())) {
      if (current === target) return total + offset;
      total += current.textContent.length;
    }
    return total;
  }

  function clearReviewHighlight() {
    if (!reviewContentContainer) return;
    reviewContentContainer
      .querySelectorAll("[data-review-highlight]")
      .forEach((highlight) => {
        highlight.replaceWith(
          document.createTextNode(highlight.textContent || ""),
        );
      });
    reviewContentContainer.normalize();
  }

  function normalizedReviewText(value) {
    return value.replace(/\s+/g, "");
  }

  function findReviewAnchorOffsets(target, anchor) {
    const normalizedTarget = normalizedReviewText(target);
    const normalizedAnchor = normalizedReviewText(anchor.text || "");
    if (!normalizedAnchor) return null;
    const matches = [];
    let index = normalizedTarget.indexOf(normalizedAnchor);
    while (index !== -1) {
      matches.push(index);
      index = normalizedTarget.indexOf(normalizedAnchor, index + 1);
    }
    if (!matches.length) return null;
    const normalizedStart = normalizedReviewText(
      target.slice(0, anchor.start),
    ).length;
    const match = matches.sort(
      (left, right) =>
        Math.abs(left - normalizedStart) - Math.abs(right - normalizedStart),
    )[0];
    const offsets = [];
    let normalizedIndex = 0;
    for (let rawIndex = 0; rawIndex < target.length; rawIndex += 1) {
      const whitespace = /\s/.test(target[rawIndex]);
      if (whitespace) continue;
      offsets[normalizedIndex] = rawIndex;
      normalizedIndex += 1;
    }
    return {
      start: offsets[match],
      end: offsets[match + normalizedAnchor.length - 1] + 1,
    };
  }

  function captureReviewSelection() {
    if (!reviewContentContainer) return;
    const selection = window.getSelection();
    if (
      !selection ||
      selection.rangeCount === 0 ||
      selection.isCollapsed ||
      !reviewContentContainer.contains(selection.anchorNode) ||
      !reviewContentContainer.contains(selection.focusNode)
    )
      return;
    const range = selection.getRangeAt(0);
    const rawText = selection.toString();
    const leadingWhitespace = rawText.length - rawText.trimStart().length;
    const trailingWhitespace = rawText.length - rawText.trimEnd().length;
    const start =
      textOffset(
        reviewContentContainer,
        range.startContainer,
        range.startOffset,
      ) + leadingWhitespace;
    const end =
      textOffset(reviewContentContainer, range.endContainer, range.endOffset) -
      trailingWhitespace;
    const text = rawText.trim();
    if (!text || end <= start) return;
    reviewSelection = { start, end, text };
    reviewError = "";
  }

  function resolveReviewAnchor(anchor) {
    if (!reviewContentContainer || !anchor) return null;
    const target = reviewContentContainer.textContent || "";
    const offsets = findReviewAnchorOffsets(target, anchor);
    if (!offsets) return false;
    const walker = document.createTreeWalker(
      reviewContentContainer,
      NodeFilter.SHOW_TEXT,
    );
    let current;
    let total = 0;
    let startNode;
    let endNode;
    let startOffset = 0;
    let endOffset = 0;
    while ((current = walker.nextNode())) {
      const next = total + current.textContent.length;
      if (!startNode && offsets.start >= total && offsets.start <= next) {
        startNode = current;
        startOffset = offsets.start - total;
      }
      if (offsets.end >= total && offsets.end <= next) {
        endNode = current;
        endOffset = offsets.end - total;
        break;
      }
      total = next;
    }
    if (!startNode || !endNode) return null;
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return { range, startNode, endNode, startOffset, endOffset };
  }

  function highlightReviewAnchor(anchorRange) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      reviewContentContainer,
      NodeFilter.SHOW_TEXT,
    );
    let current;
    while ((current = walker.nextNode())) textNodes.push(current);
    let started = false;
    const highlights = [];
    for (const node of textNodes) {
      if (node === anchorRange.startNode) started = true;
      if (!started) continue;
      const from = node === anchorRange.startNode ? anchorRange.startOffset : 0;
      const to =
        node === anchorRange.endNode
          ? anchorRange.endOffset
          : node.textContent.length;
      if (to > from) {
        if (to < node.textContent.length) node.splitText(to);
        const segment = from > 0 ? node.splitText(from) : node;
        const highlight = document.createElement("mark");
        highlight.dataset.reviewHighlight = "true";
        segment.parentNode.insertBefore(highlight, segment);
        highlight.appendChild(segment);
        highlights.push(highlight);
      }
      if (node === anchorRange.endNode) break;
    }
    highlights[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
    return highlights.length > 0;
  }

  function selectBrowserReviewAnchor(anchor) {
    const resolved = resolveReviewAnchor(anchor);
    if (!resolved) return false;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(resolved.range);
    return true;
  }

  function selectReviewAnchor(anchor) {
    if (!reviewContentContainer || !anchor) return false;
    clearReviewHighlight();
    const resolved = resolveReviewAnchor(anchor);
    if (!resolved) {
      reviewAnchorStatus = "stale";
      return false;
    }
    reviewAnchorStatus = "";
    if (!highlightReviewAnchor(resolved)) return false;
    return selectBrowserReviewAnchor(anchor);
  }

  $effect(() => {
    if (
      workspaceTab !== "review" ||
      !reviewContentContainer ||
      !activeReviewComment
    )
      return;
    const comment = reviewComments.find(
      (entry) => entry.id === activeReviewComment,
    );
    if (comment)
      requestAnimationFrame(() => selectReviewAnchor(comment.anchor));
  });

  async function openReviewComment(comment) {
    workspaceTab = "review";
    activeReviewComment = comment.id;
    await goto(
      `/management/documents/${data.template.id}?tab=review&comment=${encodeURIComponent(comment.id)}`,
      { replaceState: true, noScroll: true },
    );
    await tick();
    requestAnimationFrame(() => selectReviewAnchor(comment.anchor));
  }

  async function openIssueEditor(comment) {
    issueSheetOpen = true;
    issueSheetLoading = false;
    issueSheetError = "";
    const preloaded = reviewIssues[comment.id];
    linkedReviewComment = comment;
    linkedIssue = preloaded?.issue ?? null;
    linkedIssueComments = preloaded?.comments ?? [];
    issueCommentBody = "";
    if (preloaded?.issue) return;
    issueSheetLoading = true;
    try {
      let linkedComment = comment;
      if (!linkedComment.issueId) {
        const createController = new AbortController();
        const createTimeout = setTimeout(() => createController.abort(), 10000);
        let createResponse;
        try {
          createResponse = await fetch(
            `/management/documents/${data.template.id}/reviews/${comment.id}/issue`,
            { method: "POST", signal: createController.signal },
          );
        } finally {
          clearTimeout(createTimeout);
        }
        const created = JSON.parse(await createResponse.text());
        if (!createResponse.ok)
          throw new Error(
            created.error || "Unable to create the linked issue.",
          );
        linkedComment = { ...comment, issueId: created.issueId };
        reviewComments = reviewComments.map((entry) =>
          entry.id === comment.id ? linkedComment : entry,
        );
      }
      const loadController = new AbortController();
      const loadTimeout = setTimeout(() => loadController.abort(), 10000);
      let response;
      try {
        response = await fetch(
          `/management/documents/${data.template.id}/reviews/${comment.id}/issue`,
          { signal: loadController.signal },
        );
      } finally {
        clearTimeout(loadTimeout);
      }
      const result = JSON.parse(await response.text());
      if (!response.ok)
        throw new Error(result.error || "Unable to load the linked issue.");
      if (!result.issue)
        throw new Error("The linked issue response was incomplete.");
      linkedIssue = result.issue;
      linkedIssueComments = result.comments ?? [];
      reviewIssues = {
        ...reviewIssues,
        [comment.id]: { issue: result.issue, comments: result.comments ?? [] },
      };
    } catch (error) {
      issueSheetError =
        error.name === "AbortError"
          ? "The linked issue took too long to load. Open the full issue page and try again."
          : error.message;
    } finally {
      issueSheetLoading = false;
    }
  }

  function syncLinkedIssueComments(comments) {
    if (!linkedReviewComment?.id || !linkedIssue) return;
    reviewIssues = {
      ...reviewIssues,
      [linkedReviewComment.id]: { issue: linkedIssue, comments },
    };
  }

  async function saveIssueComment() {
    if (!linkedIssue || !issueCommentBody.trim()) return;
    issueCommentSubmitting = true;
    issueCommentError = "";
    try {
      const response = await fetch(
        `/operations/issues/${linkedIssue.id}/comments`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ bodyMarkdown: issueCommentBody }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to add the issue comment.");
      linkedIssueComments = [...linkedIssueComments, result];
      syncLinkedIssueComments(linkedIssueComments);
      issueCommentBody = "";
    } catch (error) {
      issueCommentError = error.message;
    } finally {
      issueCommentSubmitting = false;
    }
  }

  async function saveEditedIssueComment(comment) {
    if (!linkedIssue || !issueEditingBody.trim()) return;
    issueCommentSubmitting = true;
    issueCommentError = "";
    try {
      const response = await fetch(
        `/operations/issues/${linkedIssue.id}/comments/${comment.id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ bodyMarkdown: issueEditingBody }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to update the issue comment.");
      linkedIssueComments = linkedIssueComments.map((entry) =>
        entry.id === comment.id ? result : entry,
      );
      syncLinkedIssueComments(linkedIssueComments);
      issueEditingCommentId = "";
      issueEditingBody = "";
    } catch (error) {
      issueCommentError = error.message;
    } finally {
      issueCommentSubmitting = false;
    }
  }

  async function deleteIssueComment(comment) {
    if (!linkedIssue) return;
    issueDeletingCommentId = comment.id;
    issueCommentError = "";
    try {
      const response = await fetch(
        `/operations/issues/${linkedIssue.id}/comments/${comment.id}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to delete the issue comment.");
      linkedIssueComments = linkedIssueComments.filter(
        (entry) => entry.id !== comment.id && entry.parentId !== comment.id,
      );
      syncLinkedIssueComments(linkedIssueComments);
    } catch (error) {
      issueCommentError = error.message;
    } finally {
      issueDeletingCommentId = "";
    }
  }

  async function saveReviewComment() {
    if (!latestVersion?.id || !reviewSelection || !reviewBody.trim()) {
      reviewError = "Select text and add a comment before saving.";
      return;
    }
    reviewError = "";
    const response = await fetch(
      `/management/documents/${data.template.id}/reviews`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          versionId: latestVersion.id,
          body: reviewBody,
          anchor: reviewSelection,
        }),
      },
    );
    const result = await response.json();
    if (!response.ok) {
      reviewError = result?.error || "Unable to save review comment.";
      return;
    }
    reviewComments = [...reviewComments, result];
    reviewBody = "";
    reviewSelection = null;
    openReviewComment(result);
  }

  async function deleteReviewComment(comment) {
    deletingReviewCommentId = comment.id;
    reviewError = "";
    try {
      const response = await fetch(
        `/management/documents/${data.template.id}/reviews/${comment.id}`,
        { method: "DELETE" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result?.error || "Unable to delete the review comment.",
        );
      reviewComments = reviewComments.filter(
        (entry) => entry.id !== comment.id,
      );
      pendingDeleteComment = null;
      if (activeReviewComment === comment.id) {
        activeReviewComment = "";
        await goto(`/management/documents/${data.template.id}?tab=review`, {
          replaceState: true,
          noScroll: true,
        });
      }
    } catch (error) {
      reviewError = error.message;
    } finally {
      deletingReviewCommentId = "";
    }
  }

  function openDocumentPreview() {
    workspaceTab = "preview";
  }

  async function saveDraft() {
    isSaving = true;
    errorMessage = "";
    try {
      const response = await fetch(
        `/management/documents/${data.template.id}/versions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            content,
            sampleData,
            pageConfig,
            formSchema: { fields: formFields },
            formVersionId: data.template.formId
              ? null
              : selectedFormVersionId || null,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result?.error || "Unable to save document template.");
      toast.success(`Draft version ${result.versionNumber} saved.`);
      await goto(`/management/documents/${data.template.id}`, {
        invalidateAll: true,
        replaceState: true,
      });
    } catch (error) {
      errorMessage = error.message;
      toast.error(errorMessage);
    } finally {
      isSaving = false;
    }
  }

  async function publish() {
    isSaving = true;
    errorMessage = "";
    try {
      const response = await fetch(
        `/management/documents/${data.template.id}/versions`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "publish" }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result?.error || "Unable to publish document template.",
        );
      toast.success("Template published.");
      await goto(`/management/documents/${data.template.id}`, {
        invalidateAll: true,
        replaceState: true,
      });
    } catch (error) {
      errorMessage = error.message;
      toast.error(errorMessage);
    } finally {
      isSaving = false;
    }
  }

  async function copyTemplateName() {
    await navigator.clipboard.writeText(data.template.name);
    templateNameCopied = true;
    toast.success("Document name copied.");
    setTimeout(() => (templateNameCopied = false), 1500);
  }

  function setDeleteTemplateOpen(open) {
    deleteTemplateOpen = open;
    if (!open) {
      deleteTemplateConfirmation = "";
      templateNameCopied = false;
    }
  }

  async function deleteTemplate() {
    try {
      const response = await fetch(`/management/documents/${data.template.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Unable to delete document template.");
      toast.success("Document template deleted.");
      await goto("/management/documents");
    } catch (error) {
      errorMessage = error.message;
      toast.error(errorMessage);
    }
  }

  async function exportTemplate(includeCollaboration = false) {
    try {
      const query = includeCollaboration ? "?includeIssues=true&includeVotes=true" : "";
      const response = await fetch(`/management/documents/${data.template.id}/export${query}`);
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Unable to export document package.");
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${data.template.name.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() || "document"}.aionsoft-document.json`;
      anchor.click();
      URL.revokeObjectURL(downloadUrl);
      toast.success(includeCollaboration ? "Document package with collaboration exported." : "Document package exported.");
    } catch (error) {
      toast.error(error.message || "Unable to export document package.");
    }
  }

  function savePreviewAsPdf() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Unable to open the PDF print window. Allow pop-ups and try again.");
      return;
    }
    const title = `${data.template.name} preview`;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
      @page { size: Letter; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; color: #1f2937; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      .document-page { box-sizing: border-box; width: 8.5in; min-height: 11in; background: #fff; color: #1f2937; }
      .document-page + .document-page { break-before: page; page-break-before: always; }
      h1, h2, h3 { margin: 1.25rem 0 0.75rem; line-height: 1.25; }
      p { margin: 0.75rem 0; }
      ul, ol { margin: 0.75rem 0; padding-left: 1.75rem; }
      blockquote { border-left: 3px solid #d1d5db; padding-left: 1rem; color: #4b5563; }
      hr { margin: 1.5rem 0; border: 0; border-top: 1px solid #d1d5db; }
      table { max-width: 100%; }
      img { max-width: 100%; height: auto; }
      .document-page-break { break-before: page; page-break-before: always; }
    </style></head><body>${renderPreviewHtml()}<style>
      @page { margin: 0 !important; }
    </style></body></html>`);
    printWindow.document.close();
    printWindow.addEventListener("load", () => {
      printWindow.focus();
      printWindow.print();
    }, { once: true });
    toast.success("PDF print dialog opened. Choose Save as PDF to download it.");
  }

  async function rollbackTemplate(version) {
    isRollingBack = true;
    try {
      const response = await fetch(`/management/documents/${data.template.id}/versions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "rollback", versionId: version.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to roll back document.");
      pendingRollback = null;
      toast.success(`Document restored to version ${version.versionNumber}.`);
      await goto(`/management/documents/${data.template.id}?tab=history`, {
        invalidateAll: true,
        replaceState: true,
      });
    } catch (error) {
      errorMessage = error.message;
      toast.error(errorMessage);
    } finally {
      isRollingBack = false;
    }
  }
</script>

<div class="flex flex-col gap-6">
  <div class="flex flex-wrap items-center justify-between gap-4">
    <div class="flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        href="/management/documents"
        title="Back to templates"
        aria-label="Back to templates"><ArrowLeftIcon /></Button
      >
      <div
        class="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground"
      >
        <FileTextIcon />
      </div>
      <div>
        <div
          class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-500"
        >
          Document template <Badge
            variant={data.template.status === "published"
              ? "default"
              : "secondary"}>{data.template.status}</Badge
          >
        </div>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-foreground">
          {data.template.name}
        </h1>
      </div>
    </div>
    <div class="flex gap-2">
      <Button
        variant="outline"
        onclick={() =>
          (workspaceTab = workspaceTab === "preview" ? "document" : "preview")}
        ><EyeIcon data-icon="inline-start" />{workspaceTab === "preview"
          ? "Edit"
          : "Preview"}</Button
      >{#if latestVersion && !latestVersion.isPublished}<Button
          variant="outline"
          onclick={publish}
          disabled={isSaving}
          ><UploadCloudIcon data-icon="inline-start" />Publish</Button
        >{/if}<Button onclick={saveDraft} disabled={isSaving}
        ><SaveIcon data-icon="inline-start" />{isSaving
          ? "Saving..."
          : "Save draft"}</Button
      >
        <Button variant="outline" onclick={() => exportTemplate()}><DownloadIcon data-icon="inline-start" />Export</Button>
        <Button variant="outline" onclick={() => exportTemplate(true)}><DownloadIcon data-icon="inline-start" />Export with collaboration</Button>
        <AlertDialog.Root
          open={deleteTemplateOpen}
          onOpenChange={setDeleteTemplateOpen}
        >
          <AlertDialog.Trigger>
            {#snippet child({ props })}
              <Button
                {...props}
                variant="destructive"
                size="icon"
                title="Delete document template"
                aria-label="Delete document template"
                ><Trash2Icon /></Button
              >
            {/snippet}
          </AlertDialog.Trigger>
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>Delete this document template?</AlertDialog.Title>
              <AlertDialog.Description>
                This permanently removes the document, generated records, saved
                versions, Review comments, linked Issues, and Issue replies.
              </AlertDialog.Description>
            </AlertDialog.Header>
            <div class="rounded-md border border-border bg-muted/30 p-3">
              <label
                for="delete-template-name"
                class="text-xs font-medium text-muted-foreground"
                >Type the document name to confirm</label
              >
              <div class="relative mt-2">
                <Input
                  id="delete-template-name"
                  bind:value={deleteTemplateConfirmation}
                  placeholder={data.template.name}
                  autocomplete="off"
                  class="pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  class="absolute right-1 top-1/2 -translate-y-1/2"
                  onclick={copyTemplateName}
                  title="Copy document name"
                  aria-label="Copy document name"
                  ><CopyIcon /></Button
                >
              </div>
            </div>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
              <AlertDialog.Action onclick={deleteTemplate} disabled={!canDeleteTemplate}
                >Delete document</AlertDialog.Action
              >
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Root>
    </div>
  </div>

  <section
    class="rounded-2xl border border-border bg-card p-4 shadow-sm lg:p-6"
  >
    <div class="flex flex-col gap-2">
      <div class="flex w-full flex-wrap items-center gap-1 rounded-full bg-muted p-1 sm:w-fit" role="tablist" aria-label="Document workspace">
        {#each [{ value: "form", label: "Form" }, { value: "sample", label: "Sample data" }, { value: "document", label: "Document" }, { value: "preview", label: "Preview" }, { value: "review", label: "Review" }, { value: "history", label: "History" }] as tab}
          <button
            type="button"
            role="tab"
            aria-selected={workspaceTab === tab.value}
            class="flex-1 rounded-full px-3 py-1 text-sm font-medium transition-colors hover:bg-background/70 sm:flex-none"
            class:bg-background={workspaceTab === tab.value}
            class:text-foreground={workspaceTab === tab.value}
            class:text-muted-foreground={workspaceTab !== tab.value}
            onclick={() => (workspaceTab = tab.value)}
          >{tab.label}</button>
        {/each}
      </div>

      {#if workspaceTab === "form"}<div role="tabpanel" class="pt-6">
        {#if data.ownedForm}
          <FormSchemaEditor
            fields={formFields}
            onChange={(nextFields) => (formFields = nextFields)}
            onPreviewValuesChange={(nextValues) => (previewValues = nextValues)}
            onPreviewDocument={openDocumentPreview}
          />
        {:else}
          <div
            class="rounded-xl border border-dashed border-border px-6 py-12 text-center"
          >
            <p class="font-medium text-foreground">This is a legacy template</p>
            <p class="mt-2 text-sm text-muted-foreground">
              Its form remains managed through the standalone Form Builder.
            </p>
          </div>
        {/if}
      </div>{/if}

      {#if workspaceTab === "sample"}<div role="tabpanel" class="pt-6">
        {#if data.ownedForm}
          <FormSchemaEditor
            fields={formFields}
            sampleMode
            sampleValues={sampleData}
            onPreviewValuesChange={(nextValues) => (sampleData = nextValues)}
            onPreviewDocument={openDocumentPreview}
          />
          <details class="mt-4 rounded-xl border border-border bg-muted/20 p-4">
            <summary class="cursor-pointer text-sm font-medium text-foreground"
              >View sample data JSON</summary
            >
            <pre
              class="mt-3 overflow-x-auto text-xs text-muted-foreground">{JSON.stringify(
                sampleData,
                null,
                2,
              )}</pre>
          </details>
        {:else}
          <div
            class="rounded-xl border border-dashed border-border px-6 py-12 text-center"
          >
            <p class="font-medium text-foreground">
              Sample data is unavailable for legacy templates
            </p>
            <p class="mt-2 text-sm text-muted-foreground">
              Select or migrate the form package before creating a saved
              fixture.
            </p>
          </div>
        {/if}
      </div>{/if}

      {#if workspaceTab === "document"}<div role="tabpanel" class="pt-6">
        <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section class="min-w-0">
            <DocumentPageConfigDialog
              inline
              value={pageConfig}
              {content}
              {availableFields}
              {dateFormat}
              onContentChange={(nextContent) => (content = nextContent)}
              onEditorReady={handleEditorReady}
              onOpenConfiguration={() => (pageConfigDialogOpen = true)}
              onPageConfigChange={(nextConfig) => (pageConfig = nextConfig)}
              onTokenSelection={handleTokenSelection}
              {resources}
              onUploadResource={uploadResource}
              {availableVariables}
            />
          </section>

          <aside
            class="rounded-xl border border-border bg-muted/20 p-5 xl:sticky xl:top-6"
          >
            <DocumentTokenInspector
              token={selectedToken}
              onChange={(attrs) => selectedToken?.update(attrs)}
              onAlign={(alignment) => selectedToken?.align(alignment)}
              onLineHeight={(lineHeight) => selectedToken?.lineHeight(lineHeight)}
              onReset={() => { selectedToken?.update(selectedToken?.type === 'image' ? { width: null, widthPx: null, heightPx: null } : { fontSize: null, textColor: null, backgroundColor: null, bold: false, italic: false, underline: false, strike: false }); if (selectedToken?.type !== 'image') selectedToken?.lineHeight(null); }}
            />
            {#if data.ownedForm}<div>
                <p
                  class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                >
                  Owned form
                </p>
                <p class="mt-2 font-medium text-foreground">
                  {data.ownedForm.name}
                </p>
                <p class="mt-1 text-sm text-muted-foreground">
                  Edit fields from the Form tab.
                </p>
              </div>{:else}<Field.Field
                ><Field.FieldLabel for="form-version"
                  >Source form version</Field.FieldLabel
                ><select
                  id="form-version"
                  class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                  bind:value={selectedFormVersionId}
                  ><option value="">Static template without a form</option
                  >{#each data.publishedFormVersions as version}<option
                      value={version.id}
                      >{version.formName} · Version {version.versionNumber}</option
                    >{/each}</select
                ><Field.FieldDescription
                  >Legacy templates can continue using published form versions.</Field.FieldDescription
                ></Field.Field
              >{/if}
            <div class="mt-6 border-t border-border pt-5">
              <p
                class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              >
                Insert field
              </p>
              {#if selectedFormVersion}<p
                  class="mt-2 text-sm text-muted-foreground"
                >
                  Click a field or type @ in the canvas.
                </p>
                {#if availableFields.some((field) => field.type === "date")}<Field.Field
                    class="mt-4"
                    ><Field.FieldLabel for="date-format"
                      >Date format</Field.FieldLabel
                    ><select
                      id="date-format"
                      class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
                      bind:value={dateFormat}
                      ><option value="long">September 7, 2026</option><option
                        value="medium">Sep 7, 2026</option
                      ><option value="short">09/07/2026</option><option
                        value="numeric">9/7/2026</option
                      ><option value="iso">2026-09-07</option></select
                    ><Field.FieldDescription
                      >Applies when you insert a date field.</Field.FieldDescription
                    ></Field.Field
                  >{/if}
                <div
                  class="mt-4 flex max-h-[32rem] flex-col gap-2 overflow-y-auto"
                >
                  {#each availableFields as field}<Button
                      variant="outline"
                      size="sm"
                      class="h-auto min-h-10 justify-start py-2 text-left"
                      onclick={() => editorApi?.insertField(field)}
                      ><span class="truncate">@{field.label}</span><span
                        class="ml-auto shrink-0 text-xs text-muted-foreground"
                        >{field.fieldKey || field.id}</span
                      ></Button
                    >{/each}
                </div>{:else}<p class="mt-3 text-sm text-muted-foreground">
                  Add fields from the Form tab before inserting them.
                </p>{/if}
            </div>
            <div class="mt-6 border-t border-border pt-5">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Insert global variable</p>
              {#if availableVariables.length}<p class="mt-2 text-sm text-muted-foreground">Click a variable or type # in the canvas.</p><div class="mt-4 flex max-h-[20rem] flex-col gap-2 overflow-y-auto">{#each availableVariables as variable}<Button variant="outline" size="sm" class="h-auto min-h-10 justify-start py-2 text-left" onclick={() => editorApi?.insertVariable(variable)}><span class="truncate">#{variable.label}</span><span class="ml-auto shrink-0 text-xs text-muted-foreground">{variable.key}</span></Button>{/each}</div>{:else}<p class="mt-3 text-sm text-muted-foreground">Add global variables from Management Configuration before inserting them.</p>{/if}
            </div>
          </aside>
        </div>
      </div>{/if}

      {#if workspaceTab === "preview"}<div role="tabpanel" class="pt-6">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
          <div class="flex items-center gap-2"><EyeIcon class="size-4" /><span>Document preview uses values from Sample data when available.</span></div>
          <div class="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" onclick={savePreviewAsPdf}><PrinterIcon data-icon="inline-start" />Save as PDF</Button>
            <div class="flex items-center gap-1 rounded-md border border-sky-200/80 bg-background/70 p-1 text-foreground dark:border-sky-800" aria-label="Preview zoom controls">
              <Button variant="ghost" size="icon-xs" title="Zoom out" aria-label="Zoom out" disabled={previewZoom <= previewZoomMin} onclick={() => adjustPreviewZoom(-previewZoomStep)}><ZoomOutIcon /></Button>
              <span class="min-w-12 text-center text-xs font-semibold tabular-nums">{previewZoom}%</span>
              <Button variant="ghost" size="icon-xs" title="Zoom in" aria-label="Zoom in" disabled={previewZoom >= previewZoomMax} onclick={() => adjustPreviewZoom(previewZoomStep)}><ZoomInIcon /></Button>
              <Button variant="ghost" size="icon-xs" title="Reset zoom" aria-label="Reset zoom" disabled={previewZoom === 100} onclick={() => (previewZoom = 100)}><RotateCcwIcon /></Button>
            </div>
          </div>
        </div>
        <div class="document-preview-stage">
          <div class="document-preview-paper" style={previewPaperStyle()}>
            <div class="document-preview document-preview-content" style={`transform:scale(${previewZoom / 100})`}>
              {@html renderPreviewHtml()}
            </div>
          </div>
        </div>
      </div>{/if}

      {#if workspaceTab === "review"}<div role="tabpanel" class="pt-6">
        <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <section
            class="document-review min-h-[42rem] min-w-0 rounded-xl border border-border bg-background px-4 py-5 text-base leading-8 text-foreground lg:px-8 lg:py-7"
          >
            <div
              class="mb-5 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground"
            >
              <EyeIcon class="size-4" /><span
                >Review shows the authored template. Form values are
                intentionally not substituted.</span
              >
            </div>
            <div
              bind:this={reviewContentContainer}
              onmouseup={captureReviewSelection}
            >
              {@html renderAuthoredHtml()}
            </div>
          </section>
          <aside
            class="rounded-xl border border-border bg-muted/20 p-5 xl:sticky xl:top-6"
          >
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground"
              >
                Comments
              </p>
              <p class="mt-2 text-sm text-muted-foreground">
                Select text in the document to start a comment.
              </p>
            </div>
            {#if reviewSelection}<div
                class="mt-5 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100"
              >
                <p class="font-medium">Selected text</p>
                <p class="mt-1 line-clamp-4">{reviewSelection.text}</p>
                <textarea
                  class="mt-3 min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  bind:value={reviewBody}
                  placeholder="Add a comment..."
                ></textarea><Button
                  class="mt-2 w-full"
                  onclick={saveReviewComment}>Comment</Button
                >
              </div>{/if}
            {#if reviewAnchorStatus === "stale"}<p
                class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
                role="status"
              >
                This comment's selected text is no longer available in the saved
                document version.
              </p>{/if}
            <div class="mt-5 flex flex-col gap-3">
              {#each reviewComments as comment}<div
                  class="review-comment"
                  class:active={activeReviewComment === comment.id}
                >
                  <div>
                    <button
                      type="button"
                      class="w-full text-left"
                      onclick={() => openReviewComment(comment)}
                      ><p
                        class="line-clamp-3 text-sm font-medium text-foreground"
                      >
                        {comment.body}
                      </p></button
                    >
                    <div
                      class="mt-3 flex items-center justify-end gap-1 border-t border-border pt-2"
                      aria-label="Comment actions"
                    >
                      {#if data.user?.id && data.user.id !== comment.authorId}<Button
                          variant="ghost"
                          size="icon-xs"
                          class={comment.votes?.votedByMe
                            ? "bg-primary/10 text-primary"
                            : ""}
                          title={comment.votes?.votedByMe
                            ? "Remove thumbs up"
                            : "Thumbs up"}
                          aria-label={comment.votes?.votedByMe
                            ? "Remove thumbs up"
                            : "Thumbs up"}
                          onclick={() => toggleReviewCommentVote(comment)}
                          disabled={votingReviewCommentId === comment.id}
                          ><ThumbsUpIcon /></Button
                        >{/if}
                      {#if comment.issueId}<Button
                          variant="ghost"
                          size="icon-xs"
                          title="Open in Issues"
                          aria-label="Open in Issues"
                          href={`/operations/issues/${comment.issueId}`}
                          ><ExternalLinkIcon /></Button
                        >{/if}<Button
                        variant="ghost"
                        size="icon-xs"
                        title="Edit issue"
                        aria-label="Open conversation"
                        onclick={() => openIssueEditor(comment)}
                        ><MessageCircleIcon /></Button
                      ><AlertDialog.Root
                        open={pendingDeleteComment?.id === comment.id}
                        onOpenChange={(open) =>
                          !open && (pendingDeleteComment = null)}
                        ><AlertDialog.Trigger
                          >{#snippet child({ props })}<Button
                              {...props}
                              variant="ghost"
                              size="icon-xs"
                              class="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              title={comment.issueId
                                ? "Delete comment and linked Issue"
                                : "Delete comment"}
                              aria-label={comment.issueId
                                ? "Delete comment and linked Issue"
                                : "Delete comment"}
                              onclick={() => (pendingDeleteComment = comment)}
                              ><Trash2Icon /></Button
                            >{/snippet}</AlertDialog.Trigger
                        ><AlertDialog.Content
                          ><AlertDialog.Header
                            ><AlertDialog.Title
                              >{comment.issueId
                                ? "Delete comment and linked Issue?"
                                : "Delete this comment?"}</AlertDialog.Title
                            ><AlertDialog.Description
                              >{comment.issueId
                                ? "This permanently removes the review comment and the Operations Issue created from it."
                                : "This permanently removes the review comment from this document version."}</AlertDialog.Description
                            ></AlertDialog.Header
                          ><AlertDialog.Footer
                            ><AlertDialog.Cancel>Cancel</AlertDialog.Cancel
                            ><AlertDialog.Action
                              onclick={() => deleteReviewComment(comment)}
                              disabled={deletingReviewCommentId === comment.id}
                              >{deletingReviewCommentId === comment.id
                                ? "Deleting..."
                                : comment.issueId
                                  ? "Delete comment and Issue"
                                  : "Delete comment"}</AlertDialog.Action
                            ></AlertDialog.Footer
                          ></AlertDialog.Content
                        ></AlertDialog.Root
                      >
                    </div>
                  </div>
                </div>{/each}{#if !reviewComments.length}<p
                  class="text-sm text-muted-foreground"
                >
                  No comments on this saved version yet.
                </p>{/if}
            </div>
            {#if reviewError}<p
                class="mt-4 text-sm text-destructive"
                role="alert"
              >
                {reviewError}
              </p>{/if}
          </aside>
        </div>
      </div>{/if}

      {#if workspaceTab === "history"}<div role="tabpanel" class="pt-6">
        <div>
          <h2 class="text-lg font-semibold text-foreground">Version history</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Published revisions stay immutable while draft package changes
            remain editable.
          </p>
        </div>
        <div class="mt-4 flex flex-col divide-y divide-border">
          {#each data.versions as version}<div
              class="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
              ><span class="font-medium text-foreground"
                >Version {version.versionNumber}</span
              ><Badge variant={version.isPublished ? "default" : "secondary"}
                >{version.status}</Badge
              ><span class="text-muted-foreground"
                >{version.createdAt
                  ? new Date(version.createdAt).toLocaleString()
                  : "Not available"}</span
              >{#if version.isPublished && version.id !== data.versions[0]?.id}<AlertDialog.Root
                  open={pendingRollback?.id === version.id}
                  onOpenChange={(open) => !open && (pendingRollback = null)}
                ><AlertDialog.Trigger
                    >{#snippet child({ props })}<Button
                        {...props}
                        variant="outline"
                        size="sm"
                        onclick={() => (pendingRollback = version)}
                        ><Undo2Icon data-icon="inline-start" />Restore</Button
                      >{/snippet}</AlertDialog.Trigger
                  ><AlertDialog.Content
                    ><AlertDialog.Header
                      ><AlertDialog.Title
                        >Restore version {version.versionNumber}?</AlertDialog.Title
                      ><AlertDialog.Description
                        >This creates a new published revision using the content and form from version {version.versionNumber}. Existing history remains unchanged.</AlertDialog.Description
                      ></AlertDialog.Header
                    ><AlertDialog.Footer
                      ><AlertDialog.Cancel>Cancel</AlertDialog.Cancel
                      ><AlertDialog.Action
                        onclick={() => rollbackTemplate(version)}
                        disabled={isRollingBack}
                        >{isRollingBack ? "Restoring..." : "Restore version"}</AlertDialog.Action
                      ></AlertDialog.Footer
                    ></AlertDialog.Content
                  ></AlertDialog.Root
                >{/if}
            </div>{/each}{#if !data.versions.length}<p
              class="py-3 text-sm text-muted-foreground"
            >
              No saved versions yet.
            </p>{/if}
        </div>
      </div>{/if}
    </div>
    <Sheet.Root bind:open={issueSheetOpen}>
      <Sheet.Content side="right" class="w-full overflow-hidden sm:max-w-xl">
        <Sheet.Header
          ><Sheet.Title class="sr-only"
            >{linkedIssue?.title || "Review linked issue"}</Sheet.Title
          ><Sheet.Description class="sr-only"
            >Review the linked Issue.</Sheet.Description
          >{#if linkedIssue}<Button
              variant="outline"
              size="sm"
              href={`/operations/issues/${linkedIssue.id}`}
              ><ExternalLinkIcon data-icon="inline-start" />Open full issue</Button
            >{/if}</Sheet.Header
        >
        {#if issueSheetLoading && !linkedIssue}<div
            class="px-4 py-8 text-sm text-muted-foreground"
          >
            Loading issue...
          </div>
        {:else if issueSheetError && !linkedIssue}<p
            class="px-4 py-6 text-sm text-destructive"
            role="alert"
          >
            {issueSheetError}
          </p>
        {:else if linkedIssue}<div class="flex min-h-0 flex-1 flex-col">
            <div class="min-h-0 flex-1 overflow-y-auto px-4 py-6">
              <article
                class="rounded-lg border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-900 dark:bg-sky-950/30"
              >
                <header>
                  <p class="text-sm font-medium text-foreground">
                    {linkedReviewComment?.authorName || "Document reviewer"}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {linkedReviewComment?.createdAt
                      ? new Date(linkedReviewComment.createdAt).toLocaleString()
                      : "Date unavailable"}
                  </p>
                </header>
                <p class="mt-3 font-semibold leading-6 text-foreground">
                  {linkedReviewComment?.body}
                </p>
              </article>
              <div class="mt-4">
                {#if linkedIssueComments.length}<div
                    class="flex flex-col gap-4"
                  >
                    {#each linkedIssueComments as comment (comment.id)}<article
                        class="rounded-lg border border-border bg-card p-3"
                      >
                        <header class="flex items-start justify-between gap-3">
                          <div>
                            <p class="text-sm font-medium text-foreground">
                              {comment.authorName}
                            </p>
                            <p class="text-xs text-muted-foreground">
                              {new Date(
                                comment.createdAt,
                              ).toLocaleString()}{#if comment.edited}
                                · edited{/if}
                            </p>
                          </div>
                          {#if data.user?.id}<div class="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                class={`h-7 gap-1 px-2 text-xs ${
                                  comment.votes?.votedByMe
                                    ? "bg-primary/10 text-primary"
                                    : ""
                                }`}
                                title={data.user.id === comment.authorId
                                  ? "You cannot vote on your own comment"
                                  : voteTooltip(comment.votes)}
                                aria-label={data.user.id === comment.authorId
                                  ? "Your comment vote count"
                                  : comment.votes?.votedByMe
                                    ? "Remove thumbs up"
                                    : "Thumbs up"}
                                onclick={() => toggleIssueCommentVote(comment)}
                                disabled={
                                  data.user.id === comment.authorId ||
                                  votingCommentId === comment.id
                                }
                                ><ThumbsUpIcon />{comment.votes?.count ?? 0}</Button
                              >
                              {#if data.user.id === comment.authorId}
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                title="Edit comment"
                                aria-label="Edit comment"
                                onclick={() => {
                                  issueEditingCommentId = comment.id;
                                  issueEditingBody = comment.bodyMarkdown;
                                }}><PencilIcon /></Button
                              ><Button
                                variant="ghost"
                                size="icon-xs"
                                title="Delete comment"
                                aria-label="Delete comment"
                                onclick={() => deleteIssueComment(comment)}
                                disabled={issueDeletingCommentId === comment.id}
                                ><Trash2Icon /></Button
                              >
                              {/if}
                            </div>{/if}
                        </header>
                        {#if issueEditingCommentId === comment.id}<IssueDescriptionEditor
                            value={issueEditingBody}
                            onChange={(value) => (issueEditingBody = value)}
                            minHeight="min-h-28"
                          />
                          <div class="mt-2 flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onclick={() => (issueEditingCommentId = "")}
                              >Cancel</Button
                            ><Button
                              size="sm"
                              onclick={() => saveEditedIssueComment(comment)}
                              disabled={issueCommentSubmitting}
                              >Save edit</Button
                            >
                          </div>{:else}<div
                            class="comment-body mt-3 text-sm leading-6 text-foreground"
                          >
                            {@html renderCommentMarkdown(comment.bodyMarkdown)}
                          </div>{/if}
                      </article>{/each}
                  </div>{:else}<p
                    class="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground"
                  >
                    No comments yet.
                  </p>{/if}
              </div>
            </div>
            <div class="shrink-0 border-t border-border bg-popover px-4 py-4">
              <IssueDescriptionEditor
                value={issueCommentBody}
                onChange={(value) => (issueCommentBody = value)}
                placeholder="Write a quick comment..."
                minHeight="min-h-28"
              />
              <div class="mt-3 flex justify-end">
                <Button
                  onclick={saveIssueComment}
                  disabled={issueCommentSubmitting || !issueCommentBody.trim()}
                  >{issueCommentSubmitting ? "Posting..." : "Comment"}</Button
                >
              </div>
              {#if issueCommentError}<p
                  class="mt-3 text-sm text-destructive"
                  role="alert"
                >
                  {issueCommentError}
                </p>{/if}
            </div>
          </div>{/if}
      </Sheet.Content>
    </Sheet.Root>
    <DocumentPageConfigDialog
      bind:open={pageConfigDialogOpen}
      value={pageConfig}
      {resources}
      {availableVariables}
      onUploadResource={uploadResource}
      onApply={(nextConfig) => (pageConfig = nextConfig)}
    />
    {#if errorMessage}<p class="mt-4 text-sm text-destructive" role="alert">
        {errorMessage}
      </p>{/if}
  </section>
</div>

<style>
  .document-preview-stage {
    min-height: 42rem;
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    background: color-mix(in oklch, var(--muted) 58%, var(--background));
    padding: 2rem;
  }
  .document-preview-paper {
    position: relative;
    margin: 0 auto;
  }
  .document-preview-content {
    transform-origin: top left;
    width: 816px;
    min-height: 1056px;
    color: #1f2937;
    color-scheme: light;
  }
  .document-preview-content :global(.document-page) {
    box-sizing: border-box;
    width: 816px;
    min-height: 1056px;
    margin: 0;
    overflow: hidden;
    background: #ffffff;
    color: #1f2937;
    box-shadow: 0 12px 30px color-mix(in oklch, var(--foreground) 16%, transparent);
  }
  .document-preview :global(h1),
  .document-preview :global(h2),
  .document-preview :global(h3) {
    margin: 1.25rem 0 0.75rem;
    font-weight: 650;
    line-height: 1.25;
  }
  .document-preview :global(h1) {
    font-size: 2rem;
  }
  .document-preview :global(h2) {
    font-size: 1.5rem;
  }
  .document-preview :global(h3) {
    font-size: 1.25rem;
  }
  .document-preview :global(p) {
    margin: 0.75rem 0;
  }
  .document-preview :global(ul),
  .document-preview :global(ol) {
    margin: 0.75rem 0;
    padding-left: 1.75rem;
  }
  .document-preview :global(ul) {
    list-style: disc;
  }
  .document-preview :global(ol) {
    list-style: decimal;
  }
  .document-preview :global(blockquote) {
    border-left: 3px solid hsl(var(--border));
    padding-left: 1rem;
    color: #4b5563;
  }
  .document-preview :global(hr) {
    margin: 1.5rem 0;
    border-color: #d1d5db;
  }
  .document-preview :global(.document-table) {
    margin: 1rem 0;
    color: #1f2937;
  }
  .document-preview :global(.document-preview-error) {
    color: hsl(var(--destructive));
  }
  .document-review :global(h1),
  .document-review :global(h2),
  .document-review :global(h3) {
    margin: 1.25rem 0 0.75rem;
    font-weight: 650;
    line-height: 1.25;
  }
  .document-review :global(h1) {
    font-size: 2rem;
  }
  .document-review :global(h2) {
    font-size: 1.5rem;
  }
  .document-review :global(h3) {
    font-size: 1.25rem;
  }
  .document-review :global(p) {
    margin: 0.75rem 0;
  }
  .document-review :global(ul),
  .document-review :global(ol) {
    margin: 0.75rem 0;
    padding-left: 1.75rem;
  }
  .document-review :global(ul) {
    list-style: disc;
  }
  .document-review :global(ol) {
    list-style: decimal;
  }
  .document-review :global(.document-authored-field) {
    display: inline-block;
    border-radius: 0.375rem;
    background: hsl(var(--primary) / 0.12);
    padding: 0.05rem 0.4rem;
    color: hsl(var(--primary));
    font-weight: 600;
    line-height: 1.5;
  }
  .document-review :global(.document-authored-variable) {
    display: inline-block;
    border: 1px solid hsl(var(--primary) / 0.28);
    border-radius: 0.375rem;
    background: hsl(var(--primary) / 0.1);
    padding: 0.05rem 0.4rem;
    color: hsl(var(--primary));
    font-weight: 600;
    line-height: 1.5;
  }
  .document-review :global(.document-page-break) {
    min-height: 2rem;
    margin: 1.5rem 0;
    border-top: 1px dashed hsl(var(--primary) / 0.55);
  }
  .document-review :global([data-review-highlight]) {
    border-radius: 0.2rem;
    background: hsl(var(--primary) / 0.18);
    color: inherit;
    outline: 2px solid hsl(var(--primary) / 0.25);
    outline-offset: 1px;
  }
  .review-comment {
    display: block;
    border: 1px solid hsl(var(--border));
    border-radius: 0.5rem;
    padding: 0.75rem;
  }
  .review-comment > button:first-child {
    cursor: pointer;
    border-radius: 0.375rem;
    padding: 0.5rem;
    margin: -0.5rem;
    transition:
      background-color 150ms ease,
      box-shadow 150ms ease;
  }
  .review-comment > button:first-child:hover {
    background: var(--accent);
  }
  .review-comment.active > button:first-child {
    border-left: 4px solid var(--primary);
    background: color-mix(in srgb, var(--primary) 14%, var(--card));
    box-shadow: 0 0 0 2px var(--primary);
    font-weight: 600;
  }
</style>
