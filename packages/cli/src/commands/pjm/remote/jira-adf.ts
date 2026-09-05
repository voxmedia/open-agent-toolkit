import { semanticDigest } from '@commands/pjm/remote/provider';

export type JiraAdfValue =
  | null
  | boolean
  | number
  | string
  | JiraAdfValue[]
  | { [key: string]: JiraAdfValue };

export interface JiraAdfDocument {
  type: 'doc';
  version: 1;
  content: JiraAdfNode[];
}

export interface JiraAdfNode {
  type: string;
  attrs?: Record<string, JiraAdfValue>;
  content?: JiraAdfNode[];
  text?: string;
  marks?: Array<Record<string, JiraAdfValue>>;
}

export interface JiraAdfInspection {
  state: 'absent' | 'managed';
  bindingId: string;
  managedText: string | null;
  documentDigest: string;
  surroundingDigest: string;
}

export const JIRA_ADF_LIMITS = {
  maxDocumentBytes: 1_048_576,
  maxManagedTextBytes: 65_536,
  maxBindingIdBytes: 128,
  maxDepth: 64,
  maxNodes: 10_000,
} as const;

const MARKER_PREFIX = 'oat-managed:';

export function inspectJiraAdf(
  document: JiraAdfDocument,
  bindingId: string,
): JiraAdfInspection {
  assertDocument(document);
  assertBindingId(bindingId);
  const matches = managedIndexes(document, bindingId);
  if (matches.malformed)
    throw new Error('Jira ADF managed anchor is malformed.');
  if (matches.indexes.length > 1)
    throw new Error('Jira ADF managed anchor is duplicated.');
  const index = matches.indexes[0];
  return {
    state: index === undefined ? 'absent' : 'managed',
    bindingId,
    managedText:
      index === undefined ? null : extractManagedText(document.content[index]!),
    documentDigest: semanticDigest(document),
    surroundingDigest: semanticDigest(
      document.content.filter((_, candidate) => candidate !== index),
    ),
  };
}

export function validateJiraAdfDocument(
  document: unknown,
): asserts document is JiraAdfDocument {
  assertDocument(document);
}

export function insertJiraAdfManagedContent(
  document: JiraAdfDocument,
  bindingId: string,
  content: string,
): JiraAdfDocument {
  const inspection = inspectJiraAdf(document, bindingId);
  if (inspection.state !== 'absent')
    throw new Error('Jira ADF managed anchor already exists.');
  const next = cloneDocument(document);
  next.content.push(managedNode(bindingId, content));
  assertDocument(next);
  assertSurroundingPreserved(document, next, bindingId);
  return next;
}

export function replaceJiraAdfManagedContent(
  document: JiraAdfDocument,
  bindingId: string,
  content: string,
): JiraAdfDocument {
  const inspection = inspectJiraAdf(document, bindingId);
  if (inspection.state !== 'managed')
    throw new Error('Jira ADF managed anchor is absent.');
  const next = cloneDocument(document);
  const index = managedIndexes(next, bindingId).indexes[0]!;
  next.content[index] = managedNode(bindingId, content);
  assertDocument(next);
  assertSurroundingPreserved(document, next, bindingId);
  return next;
}

export function verifyJiraAdfReplacement(
  before: JiraAdfDocument,
  after: JiraAdfDocument,
  bindingId: string,
  expectedContent: string,
): boolean {
  try {
    assertSurroundingPreserved(before, after, bindingId);
    const inspection = inspectJiraAdf(after, bindingId);
    return (
      inspection.state === 'managed' &&
      inspection.managedText === expectedContent
    );
  } catch {
    return false;
  }
}

function managedNode(bindingId: string, content: string): JiraAdfNode {
  assertManagedText(content);
  return {
    type: 'panel',
    attrs: { panelType: 'info', localId: `${MARKER_PREFIX}${bindingId}` },
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: content }] },
    ],
  };
}

function managedIndexes(
  document: JiraAdfDocument,
  bindingId: string,
): { indexes: number[]; malformed: boolean } {
  const marker = `${MARKER_PREFIX}${bindingId}`;
  const indexes: number[] = [];
  let malformed = false;
  const visit = (node: JiraAdfNode, topLevelIndex: number, depth: number) => {
    const localId = node.attrs?.localId;
    if (typeof localId === 'string' && localId.startsWith(MARKER_PREFIX)) {
      if (
        depth !== 0 ||
        localId !== marker ||
        node.type !== 'panel' ||
        !Array.isArray(node.content)
      ) {
        malformed = true;
      } else {
        indexes.push(topLevelIndex);
      }
    }
    for (const child of node.content ?? [])
      visit(child, topLevelIndex, depth + 1);
  };
  document.content.forEach((node, index) => visit(node, index, 0));
  return { indexes, malformed };
}

function extractManagedText(node: JiraAdfNode): string {
  const paragraph = node.content;
  if (
    paragraph?.length !== 1 ||
    paragraph[0]?.type !== 'paragraph' ||
    paragraph[0].content?.length !== 1 ||
    paragraph[0].content[0]?.type !== 'text' ||
    typeof paragraph[0].content[0].text !== 'string'
  ) {
    throw new Error('Jira ADF managed content is malformed.');
  }
  return paragraph[0].content[0].text;
}

function assertSurroundingPreserved(
  before: JiraAdfDocument,
  after: JiraAdfDocument,
  bindingId: string,
): void {
  const beforeInspection = inspectJiraAdf(before, bindingId);
  const afterInspection = inspectJiraAdf(after, bindingId);
  if (
    beforeInspection.surroundingDigest !== afterInspection.surroundingDigest
  ) {
    throw new Error(
      'Jira ADF surrounding content was not structurally preserved.',
    );
  }
}

function assertDocument(
  document: unknown,
): asserts document is JiraAdfDocument {
  if (
    !isRecord(document) ||
    document.type !== 'doc' ||
    document.version !== 1 ||
    !Array.isArray(document.content)
  ) {
    throw new Error('Jira ADF document is invalid or exceeds its byte limit.');
  }
  let encoded: string;
  try {
    encoded = JSON.stringify(document);
  } catch {
    throw new Error('Jira ADF document is invalid or exceeds its byte limit.');
  }
  if (Buffer.byteLength(encoded, 'utf8') > JIRA_ADF_LIMITS.maxDocumentBytes) {
    throw new Error('Jira ADF document is invalid or exceeds its byte limit.');
  }
  const counter = { nodes: 0 };
  for (const node of document.content) validateNode(node, 0, counter);
}

function validateNode(
  value: unknown,
  depth: number,
  counter: { nodes: number },
): void {
  counter.nodes += 1;
  if (
    !isRecord(value) ||
    typeof value.type !== 'string' ||
    value.type.length === 0 ||
    depth > JIRA_ADF_LIMITS.maxDepth ||
    counter.nodes > JIRA_ADF_LIMITS.maxNodes ||
    (value.attrs !== undefined && !isRecord(value.attrs)) ||
    (value.text !== undefined && typeof value.text !== 'string') ||
    (value.marks !== undefined &&
      (!Array.isArray(value.marks) ||
        value.marks.some((mark) => !isRecord(mark)))) ||
    (value.content !== undefined && !Array.isArray(value.content))
  ) {
    throw new Error(
      'Jira ADF document is invalid or exceeds its structural limits.',
    );
  }
  for (const child of (value.content as unknown[] | undefined) ?? []) {
    validateNode(child, depth + 1, counter);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertBindingId(bindingId: string): void {
  if (
    !bindingId ||
    Buffer.byteLength(bindingId, 'utf8') > JIRA_ADF_LIMITS.maxBindingIdBytes
  ) {
    throw new Error('Jira ADF binding identity is invalid.');
  }
}

function assertManagedText(content: string): void {
  if (
    Buffer.byteLength(content, 'utf8') > JIRA_ADF_LIMITS.maxManagedTextBytes
  ) {
    throw new Error('Jira ADF managed content exceeds its byte limit.');
  }
}

function cloneDocument(document: JiraAdfDocument): JiraAdfDocument {
  return structuredClone(document);
}
