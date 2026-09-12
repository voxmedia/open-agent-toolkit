const FILE_URL_ABSOLUTE_PATH = /(^|[\s"'([{=])file:\/\/[^\s"'()[\]{}<>;,]*/gi;
const POSIX_ABSOLUTE_PATH = /(^|[\s"'([{=])\/[^\s"'()[\]{}<>;,:]*/g;
const WINDOWS_DRIVE_ABSOLUTE_PATH =
  /(^|[\s"'([{=])[A-Za-z]:[\\/][^\s"'()[\]{}<>;,:]*/g;
const WINDOWS_UNC_ABSOLUTE_PATH =
  /(^|[\s"'([{=])\\\\[^\\/\s"'()[\]{}<>;,:]+[\\/][^\s"'()[\]{}<>;,:]*/g;
const SENSITIVE_ENVIRONMENT_NAME =
  /(?:^|_)(?:ACCESS_?KEY|API_?KEY|AUTH|BEARER|CREDENTIALS?|PASSWORD|PASSWD|PAT|PRIVATE_?KEY|SECRET_?KEY|SECRET|SESSION|TOKEN)$/i;
const NON_SECRET_STRUCTURAL_ENVIRONMENT_NAMES = new Set(['npm_package_name']);
const DISTINCTIVE_ENVIRONMENT_VALUE_LENGTH = 12;
const SENSITIVE_ENVIRONMENT_VALUE_LENGTH = 4;

function environmentValuesForRedaction(env) {
  return [
    ...new Set(
      Object.entries(env)
        .filter(
          ([name, entry]) =>
            typeof entry === 'string' &&
            ((entry.length >= SENSITIVE_ENVIRONMENT_VALUE_LENGTH &&
              SENSITIVE_ENVIRONMENT_NAME.test(name)) ||
              (entry.length >= DISTINCTIVE_ENVIRONMENT_VALUE_LENGTH &&
                !NON_SECRET_STRUCTURAL_ENVIRONMENT_NAMES.has(name))),
        )
        .map(([_name, entry]) => entry),
    ),
  ].sort(
    (left, right) => right.length - left.length || left.localeCompare(right),
  );
}

export function sanitizeDiagnostic(value, { env = process.env } = {}) {
  let sanitized = value instanceof Error ? value.message : String(value);
  for (const environmentValue of environmentValuesForRedaction(env)) {
    sanitized = sanitized.replaceAll(environmentValue, '<env>');
  }
  return sanitized
    .replace(FILE_URL_ABSOLUTE_PATH, (_match, prefix) => `${prefix}<path>`)
    .replace(WINDOWS_UNC_ABSOLUTE_PATH, (_match, prefix) => `${prefix}<path>`)
    .replace(WINDOWS_DRIVE_ABSOLUTE_PATH, (_match, prefix) => `${prefix}<path>`)
    .replace(POSIX_ABSOLUTE_PATH, (_match, prefix) => `${prefix}<path>`);
}
