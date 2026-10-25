import type { PeleError } from 'pele';

type Pele = typeof import('pele');

let runtime: Promise<Pele> | undefined;

/**
 * Pele reports syntax errors in Mermaid's multi-line form: a "Parse error on
 * line N:" header, the offending source line, a caret line and the expected
 * tokens. Keep only the explanation and append the diagram-relative position.
 */
function conciseMessage(error: PeleError): string {
  const message = error.snippet
    ? error.message.replace(error.snippet, '')
    : error.message;
  const detail = message
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^Parse error on line \d+:?$/.test(line))
    .join(' ');
  return error.line > 0
    ? `${detail} (diagram line ${error.line}, column ${error.column})`
    : detail;
}

/** Mermaid syntax check with the pinned, DOM-free Pele parser. Never renders. */
export async function parseMermaid(source: string): Promise<void> {
  runtime ??= import('pele');
  const pele = await runtime;
  try {
    pele.parse(source);
  } catch (error) {
    if (error instanceof pele.PeleError)
      throw new Error(conciseMessage(error), { cause: error });
    throw error;
  }
}
