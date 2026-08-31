export type ManagedMarkdownChoiceReason =
  | 'missing-boundary'
  | 'duplicate-boundary'
  | 'nested-boundary'
  | 'malformed-boundary'
  | 'heading-mismatch';

export type ManagedMarkdownInspection =
  | { status: 'absent'; content: null }
  | {
      status: 'managed';
      content: string;
      range: { start: number; end: number };
    }
  | {
      status: 'choice-required';
      reason: Exclude<ManagedMarkdownChoiceReason, 'missing-boundary'>;
      body: string;
    };

export type ManagedMarkdownUpdate =
  | {
      status: 'updated';
      operation: 'insert' | 'replace';
      body: string;
    }
  | {
      status: 'choice-required';
      reason: ManagedMarkdownChoiceReason;
      body: string;
    };

const ANY_BOUNDARY = /<!-- OAT-MANAGED:[^>\r\n]+:(?:START|END) -->/g;

export function buildManagedMarkdownBlock(
  bindingId: string,
  content: string,
): string {
  assertBindingId(bindingId);
  return `${startBoundary(bindingId)}\n## OAT-managed\n\n${content}\n${endBoundary(bindingId)}`;
}

export function inspectManagedMarkdown(
  body: string,
  bindingId: string,
): ManagedMarkdownInspection {
  assertBindingId(bindingId);
  const start = startBoundary(bindingId);
  const end = endBoundary(bindingId);
  const starts = findAll(body, start);
  const ends = findAll(body, end);

  if (starts.length === 0 && ends.length === 0) {
    return { status: 'absent', content: null };
  }
  if (starts.length !== 1 || ends.length !== 1) {
    return {
      status: 'choice-required',
      reason:
        starts.length > 1 || ends.length > 1
          ? 'duplicate-boundary'
          : 'malformed-boundary',
      body,
    };
  }

  const startIndex = starts[0]!;
  const endIndex = ends[0]!;
  if (endIndex <= startIndex) {
    return {
      status: 'choice-required',
      reason: 'malformed-boundary',
      body,
    };
  }

  const innerStart = startIndex + start.length;
  const inner = body.slice(innerStart, endIndex);
  if (ANY_BOUNDARY.test(inner)) {
    ANY_BOUNDARY.lastIndex = 0;
    return {
      status: 'choice-required',
      reason: 'nested-boundary',
      body,
    };
  }
  ANY_BOUNDARY.lastIndex = 0;

  const managed = /^\r?\n## OAT-managed[ \t]*\r?\n\r?\n([\s\S]*?)\r?\n$/.exec(
    inner,
  );
  if (!managed) {
    return {
      status: 'choice-required',
      reason: 'heading-mismatch',
      body,
    };
  }

  return {
    status: 'managed',
    content: managed[1]!,
    range: { start: startIndex, end: endIndex + end.length },
  };
}

export function insertManagedMarkdown(
  body: string,
  bindingId: string,
  content: string,
): ManagedMarkdownUpdate {
  const inspection = inspectManagedMarkdown(body, bindingId);
  if (inspection.status !== 'absent') {
    return {
      status: 'choice-required',
      reason:
        inspection.status === 'managed'
          ? 'duplicate-boundary'
          : inspection.reason,
      body,
    };
  }
  if (containsBoundary(content)) {
    return { status: 'choice-required', reason: 'nested-boundary', body };
  }

  return {
    status: 'updated',
    operation: 'insert',
    body: `${body}${insertionSeparator(body)}${buildManagedMarkdownBlock(
      bindingId,
      content,
    )}`,
  };
}

export function replaceManagedMarkdown(
  body: string,
  bindingId: string,
  content: string,
): ManagedMarkdownUpdate {
  const inspection = inspectManagedMarkdown(body, bindingId);
  if (inspection.status === 'absent') {
    return { status: 'choice-required', reason: 'missing-boundary', body };
  }
  if (inspection.status === 'choice-required') return inspection;
  if (containsBoundary(content)) {
    return { status: 'choice-required', reason: 'nested-boundary', body };
  }

  return {
    status: 'updated',
    operation: 'replace',
    body: `${body.slice(0, inspection.range.start)}${buildManagedMarkdownBlock(
      bindingId,
      content,
    )}${body.slice(inspection.range.end)}`,
  };
}

function startBoundary(bindingId: string): string {
  return `<!-- OAT-MANAGED:${bindingId}:START -->`;
}

function endBoundary(bindingId: string): string {
  return `<!-- OAT-MANAGED:${bindingId}:END -->`;
}

function findAll(body: string, value: string): number[] {
  const indices: number[] = [];
  let from = 0;
  while (from <= body.length) {
    const index = body.indexOf(value, from);
    if (index === -1) break;
    indices.push(index);
    from = index + value.length;
  }
  return indices;
}

function insertionSeparator(body: string): string {
  if (body.length === 0 || body.endsWith('\n\n')) return '';
  if (body.endsWith('\n')) return '\n';
  return '\n\n';
}

function containsBoundary(value: string): boolean {
  const found = ANY_BOUNDARY.test(value);
  ANY_BOUNDARY.lastIndex = 0;
  return found;
}

function assertBindingId(bindingId: string): void {
  if (!bindingId || /[\r\n:<>]/.test(bindingId)) {
    throw new Error('Managed Markdown requires a safe binding ID.');
  }
}
