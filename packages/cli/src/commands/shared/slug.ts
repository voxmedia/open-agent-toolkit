const MAX_SLUG_LENGTH = 48;

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

  return slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '') || 'untitled';
}
