const MAX_SLUG_LENGTH = 30;

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'of',
  'for',
  'and',
  'to',
  'in',
  'on',
  'as',
  'with',
]);

function truncateToWordBoundary(slug: string): string {
  if (slug.length <= MAX_SLUG_LENGTH) {
    return slug;
  }

  const [first, ...rest] = slug.split('-');
  const firstWord = first ?? '';

  // Edge case: the first word alone exceeds the limit. Hard-truncate it.
  if (firstWord.length > MAX_SLUG_LENGTH) {
    return firstWord.slice(0, MAX_SLUG_LENGTH);
  }

  let result = firstWord;
  for (const word of rest) {
    const candidate = `${result}-${word}`;
    if (candidate.length > MAX_SLUG_LENGTH) {
      break;
    }
    result = candidate;
  }

  return result;
}

function stripTrailingStopWords(slug: string): string {
  const words = slug.split('-');
  while (words.length > 0 && STOP_WORDS.has(words[words.length - 1] ?? '')) {
    words.pop();
  }
  return words.join('-');
}

export function slugify(input: string): string {
  const normalized = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  if (slug.length === 0) {
    return 'untitled';
  }

  const truncated = truncateToWordBoundary(slug);
  const trimmed = stripTrailingStopWords(truncated);

  return trimmed || 'untitled';
}
