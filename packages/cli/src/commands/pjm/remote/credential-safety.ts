const SENSITIVE_CONTENT_SIGNAL =
  /(?<![A-Za-z0-9_-])(?:password|passwd|api(?:[ _-]+)key|access(?:[ _-]+)token|authorization|secret|token)(?![A-Za-z0-9_-])/i;

/**
 * Detects a deliberately small, conservative signal in one caller-approved
 * text field. This is not credential-value parsing or a general DLP check.
 */
export function containsSensitiveContentSignal(value: string): boolean {
  return SENSITIVE_CONTENT_SIGNAL.test(value);
}

export function containsSensitiveContentSignalInValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return containsSensitiveContentSignal(value);
  }
  if (Array.isArray(value)) {
    return value.some((entry) => containsSensitiveContentSignalInValue(entry));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).some(
      ([key, entry]) =>
        containsSensitiveContentSignal(key) ||
        containsSensitiveContentSignalInValue(entry),
    );
  }
  return false;
}
