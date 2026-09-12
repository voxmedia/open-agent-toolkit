const POSIX_ABSOLUTE_PATH = /(^|[\s"'(=])\/[^\s"'()<>;,:]*/g;
const WINDOWS_DRIVE_ABSOLUTE_PATH =
  /(^|[\s"'(=])[A-Za-z]:[\\/][^\s"'()<>;,:]*/g;
const WINDOWS_UNC_ABSOLUTE_PATH =
  /(^|[\s"'(=])\\\\[^\\/\s"'()<>;,:]+[\\/][^\s"'()<>;,:]*/g;

export function sanitizeDiagnostic(value, { env = process.env } = {}) {
  let sanitized = value instanceof Error ? value.message : String(value);
  const environmentValues = [...new Set(Object.values(env))]
    .filter((entry) => typeof entry === 'string' && entry.length >= 12)
    .sort(
      (left, right) => right.length - left.length || left.localeCompare(right),
    );
  for (const environmentValue of environmentValues) {
    sanitized = sanitized.replaceAll(environmentValue, '<env>');
  }
  return sanitized
    .replace(WINDOWS_UNC_ABSOLUTE_PATH, (_match, prefix) => `${prefix}<path>`)
    .replace(WINDOWS_DRIVE_ABSOLUTE_PATH, (_match, prefix) => `${prefix}<path>`)
    .replace(POSIX_ABSOLUTE_PATH, (_match, prefix) => `${prefix}<path>`);
}
