const CLOSED_IDENTIFIER =
  /\b(?:p\d{2}(?:-t\d{2})?|w\d+|wave-\d+|BL-\d{6}-[a-z0-9-]+)\b/i;
const GROUPED_NUMBER = /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?%?\b/g;
const PLAIN_NUMBER = /\b\d+(?:\.\d+)?%?\b/g;

export function harvestNumericTokens(text) {
  const grouped = text.match(GROUPED_NUMBER) ?? [];
  const remainder = text.replace(GROUPED_NUMBER, ' ');
  return [...grouped, ...(remainder.match(PLAIN_NUMBER) ?? [])].map(
    normalizeNumericToken,
  );
}

export function normalizeNumericToken(value) {
  const percent = value.endsWith('%');
  const body = (percent ? value.slice(0, -1) : value).replaceAll(',', '');
  return percent ? `${body}%` : body;
}

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
