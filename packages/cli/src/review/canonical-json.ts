import { createHash } from 'node:crypto';

import {
  type Node as JsonNode,
  type ParseError,
  parseTree,
} from 'jsonc-parser';

export interface CanonicalJsonOptions {
  jsonText?: boolean;
  excludeTopLevelKeys?: readonly string[];
}

function assertNoDuplicateKeys(node: JsonNode): void {
  if (node.type === 'object') {
    const seen = new Set<string>();
    for (const property of node.children ?? []) {
      const keyNode = property.children?.[0];
      const valueNode = property.children?.[1];
      const key = keyNode?.value as string | undefined;
      if (key === undefined || valueNode === undefined) {
        throw new Error('invalid JSON object property');
      }
      if (seen.has(key)) throw new Error(`duplicate JSON object key: ${key}`);
      seen.add(key);
      assertNoDuplicateKeys(valueNode);
    }
  } else if (node.type === 'array') {
    for (const child of node.children ?? []) assertNoDuplicateKeys(child);
  }
}

function parseStrictJson(source: string): unknown {
  const errors: ParseError[] = [];
  const tree = parseTree(source, errors, {
    allowTrailingComma: false,
    disallowComments: true,
  });
  if (!tree || errors.length > 0) throw new Error('invalid strict JSON');
  assertNoDuplicateKeys(tree);
  return JSON.parse(source) as unknown;
}

function serialize(value: unknown): string {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'string'
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('JSON numbers must be finite');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(serialize).join(',')}]`;
  }
  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${serialize(object[key])}`)
      .join(',')}}`;
  }
  throw new Error('value is not representable as JSON');
}

export function canonicalizeJson(
  input: unknown,
  options: CanonicalJsonOptions = {},
): string {
  const parsed =
    options.jsonText === true
      ? parseStrictJson(String(input))
      : structuredClone(input);
  if (
    options.excludeTopLevelKeys &&
    parsed !== null &&
    typeof parsed === 'object' &&
    !Array.isArray(parsed)
  ) {
    for (const key of options.excludeTopLevelKeys) {
      delete (parsed as Record<string, unknown>)[key];
    }
  }
  return serialize(parsed);
}

export function hashCanonicalJson(
  input: unknown,
  options: CanonicalJsonOptions = {},
): string {
  return createHash('sha256')
    .update(canonicalizeJson(input, options))
    .digest('hex');
}
