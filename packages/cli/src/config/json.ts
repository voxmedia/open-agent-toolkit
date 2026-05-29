import {
  parse as parseJsonc,
  printParseErrorCode,
  type ParseError,
  type ParseOptions,
} from 'jsonc-parser';

const JSON_CONFIG_PARSE_OPTIONS: ParseOptions = {
  allowTrailingComma: true,
  disallowComments: true,
};

export function parseJsonConfig(raw: string, configPath: string): unknown {
  const errors: ParseError[] = [];
  const parsed = parseJsonc(raw, errors, JSON_CONFIG_PARSE_OPTIONS) as unknown;

  if (errors.length > 0) {
    const details = errors
      .map((error) => formatParseError(raw, error))
      .join('; ');
    throw new SyntaxError(
      `Config at ${configPath} is not valid JSON: ${details}`,
    );
  }

  return parsed;
}

function formatParseError(raw: string, error: ParseError): string {
  const location = offsetToLineColumn(raw, error.offset);
  return `${printParseErrorCode(error.error)} at ${location.line}:${location.column}`;
}

function offsetToLineColumn(
  raw: string,
  offset: number,
): { line: number; column: number } {
  const prefix = raw.slice(0, offset);
  const lines = prefix.split('\n');
  const lastLine = lines[lines.length - 1] ?? '';

  return {
    line: lines.length,
    column: lastLine.length + 1,
  };
}
