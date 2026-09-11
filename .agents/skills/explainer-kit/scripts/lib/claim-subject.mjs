const CLOSED_IDENTIFIER =
  /\b(?:p\d{2}(?:-t\d{2})?|w\d+|wave-\d+|BL-\d{6}-[a-z0-9-]+)\b/i;

export function normalizeClaimSubject({ text, rowSubject, sectionId }) {
  const normalizedRow =
    typeof rowSubject === 'string' && rowSubject.trim()
      ? rowSubject.trim()
      : markdownRowSubject(text);
  if (normalizedRow) return normalizedRow;

  const identifier = String(text).match(CLOSED_IDENTIFIER)?.[0];
  if (identifier) return identifier;
  return sectionId;
}

function markdownRowSubject(text) {
  if (!String(text).startsWith('|')) return null;
  return (
    String(text)
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean)[0] ?? null
  );
}
