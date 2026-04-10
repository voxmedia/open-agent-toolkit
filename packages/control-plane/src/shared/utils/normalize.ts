const PLACEHOLDER_PATTERN = /^\{[^}]+\}$/;

export function normalizeNullableString(
  value: unknown,
  options: { treatPlaceholdersAsNull?: boolean } = {},
): string | null {
  if (typeof value !== 'string') {
    return value == null ? null : String(value);
  }

  const normalized = value.trim();
  if (
    !normalized ||
    normalized === 'null' ||
    (options.treatPlaceholdersAsNull === true &&
      PLACEHOLDER_PATTERN.test(normalized))
  ) {
    return null;
  }

  return normalized;
}

export function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }

    if (normalized === 'false') {
      return false;
    }
  }

  return false;
}
