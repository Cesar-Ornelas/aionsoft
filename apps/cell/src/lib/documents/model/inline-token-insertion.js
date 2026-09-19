import { Selection } from '@tiptap/pm/state';
import { Fragment } from '@tiptap/pm/model';

function validRange(doc, range) {
  if (!range || !Number.isInteger(range.from) || !Number.isInteger(range.to)) return null;
  if (range.from < 0 || range.to < range.from || range.to > doc.content.size) return null;
  return range;
}

export function insertInlineToken(editor, range, content) {
  const { state } = editor;
  const target = validRange(state.doc, range) || {
    from: state.selection.from,
    to: state.selection.to
  };
  const token = state.schema.nodeFromJSON(content);
  const resolvedTarget = state.doc.resolve(target.from);
  const paragraph = resolvedTarget.depth === 1 ? resolvedTarget.node(1) : null;
  const paragraphIsOnlyTrigger = paragraph?.type.name === 'paragraph' && paragraph.content.size === target.to - target.from;
  const previousParagraph = paragraphIsOnlyTrigger && resolvedTarget.index(0) > 0 ? state.doc.child(resolvedTarget.index(0) - 1) : null;
  if (paragraphIsOnlyTrigger && previousParagraph?.type.name === 'paragraph') {
    const paragraphStart = resolvedTarget.before(1);
    const previousParagraphStart = paragraphStart - previousParagraph.nodeSize;
    const hardBreak = state.schema.nodes.hardBreak.create();
    const merged = previousParagraph.copy(Fragment.from([...previousParagraph.content.content, hardBreak, token]));
    const transaction = state.tr.replaceWith(previousParagraphStart, paragraphStart + paragraph.nodeSize, merged);
    transaction.setStoredMarks([]);
    transaction.setSelection(Selection.near(transaction.doc.resolve(previousParagraphStart + merged.nodeSize - 1), -1));
    editor.view.dispatch(transaction);
    editor.view.focus();
    return;
  }
  const transaction = state.tr.replaceWith(target.from, target.to, token);
  transaction.setStoredMarks([]);
  transaction.setSelection(Selection.near(transaction.doc.resolve(target.from + token.nodeSize), 1));
  editor.view.dispatch(transaction);
  editor.view.focus();
}
