const CLASS_TOKEN_PATTERN = /^(?:!?[A-Za-z0-9_-]+)(?:[:/.[\]%-][A-Za-z0-9_./[\]%-]*)?$/;

export function normalizeDocumentClasses(value, label = 'Document classes') {
  const classes = String(value ?? '').trim().split(/\s+/).filter(Boolean);
  if (classes.length > 24) throw new Error(`${label} cannot contain more than 24 classes.`);
  for (const className of classes) {
    if (className.length > 96 || className.includes('..') || className.includes('content-') || className.includes('before:') || className.includes('after:') || className.includes('url(') || !CLASS_TOKEN_PATTERN.test(className)) {
      throw new Error(`Invalid ${label.toLowerCase()} token "${className}".`);
    }
  }
  return [...new Set(classes)].join(' ');
}

export function documentClassAttribute(value, baseClass = '') {
  const className = normalizeDocumentClasses(value);
  const merged = [baseClass, className].filter(Boolean).join(' ');
  return merged ? ` class="${merged.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"` : '';
}