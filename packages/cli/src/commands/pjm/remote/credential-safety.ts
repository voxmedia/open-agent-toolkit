const CREDENTIAL_ASSIGNMENT_PREFIX =
  /(["']?)(password|passwd|api[_-]?key|access[_-]?token|secret|token|authorization)\1\s*[:=]\s*/gim;
const IDENTIFIER_CHARACTER = /[A-Za-z0-9_-]/;
const UNQUOTED_VALUE_TERMINATOR = /[\s,;}]/;

export function containsCredentialAssignment(value: string): boolean {
  for (const match of value.matchAll(CREDENTIAL_ASSIGNMENT_PREFIX)) {
    if (isStandaloneCredentialKey(value, match)) return true;
  }
  return false;
}

export function redactCredentialAssignments(
  value: string,
  marker: string,
): string {
  let result = '';
  let cursor = 0;

  for (const match of value.matchAll(CREDENTIAL_ASSIGNMENT_PREFIX)) {
    const matchIndex = match.index;
    if (
      matchIndex === undefined ||
      matchIndex < cursor ||
      !isStandaloneCredentialKey(value, match)
    ) {
      continue;
    }

    const valueStart = matchIndex + match[0].length;
    result += value.slice(cursor, valueStart);
    const quote = value[valueStart];
    if (quote === '"' || quote === "'") {
      const closingQuote = findClosingQuote(value, valueStart, quote);
      result += `${quote}${marker}`;
      if (closingQuote === null) {
        cursor = value.length;
        break;
      }
      result += quote;
      cursor = closingQuote + 1;
      continue;
    }

    let valueEnd = valueStart;
    while (
      valueEnd < value.length &&
      !UNQUOTED_VALUE_TERMINATOR.test(value[valueEnd]!)
    ) {
      valueEnd += 1;
    }
    result += marker;
    cursor = valueEnd;
  }

  return result + value.slice(cursor);
}

function isStandaloneCredentialKey(
  value: string,
  match: RegExpMatchArray,
): boolean {
  if (match.index === undefined) return false;
  const keyStart = match.index + (match[1]?.length ?? 0);
  const preceding = value[keyStart - 1];
  return preceding === undefined || !IDENTIFIER_CHARACTER.test(preceding);
}

function findClosingQuote(
  value: string,
  valueStart: number,
  quote: '"' | "'",
): number | null {
  let index = valueStart + 1;
  while (index < value.length) {
    if (value[index] === '\\') {
      index += 2;
      continue;
    }
    if (value[index] !== quote) {
      index += 1;
      continue;
    }
    if (value[index + 1] === quote) {
      index += 2;
      continue;
    }
    return index;
  }
  return null;
}
