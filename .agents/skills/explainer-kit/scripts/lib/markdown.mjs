const CALLOUT_TYPES = new Set([
  'NOTE',
  'TIP',
  'IMPORTANT',
  'WARNING',
  'CAUTION',
]);
const SAFE_NODE_TYPES = new Set([
  'blockquote',
  'callout',
  'code',
  'delete',
  'diagram',
  'document',
  'emphasis',
  'figure',
  'heading',
  'inlineCode',
  'link',
  'list',
  'listItem',
  'paragraph',
  'strong',
  'table',
  'text',
  'timeline',
]);
const RAW_HTML_PATTERN =
  /<\/?[a-z][^>]*>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![A-Z][^>]*>/i;

export class MarkdownSafetyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MarkdownSafetyError';
  }
}

export function parseMarkdown(markdown) {
  if (typeof markdown !== 'string') {
    throw new TypeError('Markdown source must be a string.');
  }
  return {
    type: 'document',
    children: parseBlocks(markdown.replaceAll('\r\n', '\n').split('\n')),
  };
}

export function parseMarkdownDocument(markdown) {
  const ast = parseMarkdown(markdown);
  return { ast, warnings: validateMarkdownAst(ast) };
}

export function validateMarkdownAst(ast) {
  const warnings = [];
  let previousHeadingDepth = 0;

  visit(ast, (node) => {
    if (!SAFE_NODE_TYPES.has(node.type)) {
      throw new MarkdownSafetyError(
        `Unsafe markdown node type: ${String(node.type)}.`,
      );
    }
    if (node.type === 'html') {
      throw new MarkdownSafetyError('Raw HTML is not allowed in markdown.');
    }
    if (node.type === 'link' || node.type === 'figure') {
      assertSafeDestination(node.url);
    }
    if (node.type === 'heading') {
      if (previousHeadingDepth > 0 && node.depth > previousHeadingDepth + 1) {
        warnings.push({
          code: 'heading-depth-jump',
          message: `Heading depth jumps from ${previousHeadingDepth} to ${node.depth}.`,
        });
      }
      previousHeadingDepth = node.depth;
    }
    if (node.type === 'timeline') {
      for (const entry of node.entries) {
        if (!entry.date || !entry.label) {
          warnings.push({
            code: 'timeline-entry-shape',
            message: 'Timeline entries should use “date — label”.',
          });
        }
      }
    }
  });

  return warnings;
}

function parseBlocks(lines) {
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }

    const fence = lines[index].match(/^ {0,3}```\s*([^\s`]*)\s*$/);
    if (fence) {
      const language = fence[1].toLowerCase();
      const source = [];
      index += 1;
      while (index < lines.length && !/^ {0,3}```\s*$/.test(lines[index])) {
        source.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(fencedNode(language, source.join('\n')));
      continue;
    }

    const heading = lines[index].match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      blocks.push({
        type: 'heading',
        depth: heading[1].length,
        children: parseInline(heading[2]),
      });
      index += 1;
      continue;
    }

    const callout = lines[index].match(
      /^ {0,3}>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i,
    );
    if (callout) {
      const content = [callout[2]];
      index += 1;
      while (index < lines.length) {
        const continuation = lines[index].match(/^ {0,3}>\s?(.*)$/);
        if (!continuation) break;
        content.push(continuation[1]);
        index += 1;
      }
      const kind = callout[1].toUpperCase();
      blocks.push({
        type: 'callout',
        kind: CALLOUT_TYPES.has(kind) ? kind.toLowerCase() : 'note',
        children: parseBlocks(content),
      });
      continue;
    }

    if (/^ {0,3}>/.test(lines[index])) {
      const content = [];
      while (index < lines.length) {
        const quote = lines[index].match(/^ {0,3}>\s?(.*)$/);
        if (!quote) break;
        content.push(quote[1]);
        index += 1;
      }
      blocks.push({ type: 'blockquote', children: parseBlocks(content) });
      continue;
    }

    if (isTableStart(lines, index)) {
      const header = splitTableRow(lines[index]).map(parseInline);
      index += 2;
      const rows = [];
      while (index < lines.length && isTableRow(lines[index])) {
        rows.push(splitTableRow(lines[index]).map(parseInline));
        index += 1;
      }
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    const listMarker = matchListItem(lines[index]);
    if (listMarker) {
      const ordered = listMarker.ordered;
      const items = [];
      while (index < lines.length) {
        const item = matchListItem(lines[index]);
        if (!item || item.ordered !== ordered) break;
        const task = item.content.match(/^\[([ xX])\]\s+(.*)$/);
        items.push({
          type: 'listItem',
          checked: task ? task[1].toLowerCase() === 'x' : null,
          children: [
            {
              type: 'paragraph',
              children: parseInline(task?.[2] ?? item.content),
            },
          ],
        });
        index += 1;
      }
      blocks.push({
        type: 'list',
        ordered,
        start: ordered ? listMarker.start : null,
        task: items.some((item) => item.checked !== null),
        children: items,
      });
      continue;
    }

    if (RAW_HTML_PATTERN.test(lines[index].trim())) {
      blocks.push({ type: 'html', value: lines[index] });
      index += 1;
      continue;
    }

    const paragraph = [lines[index].trim()];
    index += 1;
    while (index < lines.length && !startsBlock(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({
      type: 'paragraph',
      children: parseInline(paragraph.join(' ')),
    });
  }

  return blocks;
}

function fencedNode(language, value) {
  if (language === 'diagram') return { type: 'diagram', source: value };
  if (language === 'timeline') {
    return {
      type: 'timeline',
      entries: value.split('\n').map((line) => {
        const separator = line.indexOf(' — ');
        return separator < 0
          ? { date: '', label: line.trim() }
          : {
              date: line.slice(0, separator).trim(),
              label: line.slice(separator + 3).trim(),
            };
      }),
    };
  }
  return { type: 'code', language: language || null, value };
}

function parseInline(value) {
  const nodes = [];
  let remaining = value;

  while (remaining) {
    const token = nextInlineToken(remaining);
    if (!token) {
      nodes.push({ type: 'text', value: remaining });
      break;
    }
    if (token.index > 0) {
      nodes.push({ type: 'text', value: remaining.slice(0, token.index) });
    }
    nodes.push(token.node);
    remaining = remaining.slice(token.index + token.length);
  }

  return nodes;
}

function nextInlineToken(value) {
  const candidates = [
    matchDelimited(value, /`([^`\n]+)`/, (match) => ({
      type: 'inlineCode',
      value: match[1],
    })),
    matchDelimited(value, /~~(.+?)~~/, (match) => ({
      type: 'delete',
      children: parseInline(match[1]),
    })),
    matchDelimited(value, /\*\*(.+?)\*\*/, (match) => ({
      type: 'strong',
      children: parseInline(match[1]),
    })),
    matchDelimited(value, /(?<!\*)\*([^*\n]+)\*/, (match) => ({
      type: 'emphasis',
      children: parseInline(match[1]),
    })),
    matchDelimited(
      value,
      /!\[([^\]]*)\]\((\S+?)(?:\s+["']([^"']*)["'])?\)/,
      (match) => ({
        type: 'figure',
        alt: match[1],
        url: match[2],
        title: match[3] ?? null,
      }),
    ),
    matchDelimited(
      value,
      /\[([^\]]+)\]\((\S+?)(?:\s+["']([^"']*)["'])?\)/,
      (match) => ({
        type: 'link',
        url: match[2],
        title: match[3] ?? null,
        children: parseInline(match[1]),
      }),
    ),
  ].filter(Boolean);

  if (RAW_HTML_PATTERN.test(value)) {
    const match = value.match(RAW_HTML_PATTERN);
    candidates.push({
      index: match.index,
      length: match[0].length,
      node: { type: 'html', value: match[0] },
    });
  }

  return candidates.sort((left, right) => left.index - right.index)[0];
}

function matchDelimited(value, pattern, createNode) {
  const match = value.match(pattern);
  return match
    ? {
        index: match.index,
        length: match[0].length,
        node: createNode(match),
      }
    : null;
}

function visit(node, callback) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    throw new MarkdownSafetyError('Markdown AST contains an invalid node.');
  }
  callback(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) visit(child, callback);
  }
  if (node.type === 'table') {
    for (const cell of [...node.header, ...node.rows.flat()]) {
      for (const child of cell) visit(child, callback);
    }
  }
}

function assertSafeDestination(value) {
  if (typeof value !== 'string' || !value) {
    throw new MarkdownSafetyError('Markdown links require a destination.');
  }
  if (
    value.startsWith('/') ||
    value.startsWith('//') ||
    /^(?:javascript|data|file):/i.test(value)
  ) {
    throw new MarkdownSafetyError(
      `Unsafe markdown link destination: ${value}.`,
    );
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^https:/i.test(value)) {
    throw new MarkdownSafetyError(
      `Absolute markdown links must use HTTPS: ${value}.`,
    );
  }
}

function isTableStart(lines, index) {
  return (
    index + 1 < lines.length &&
    isTableRow(lines[index]) &&
    /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])
  );
}

function isTableRow(line) {
  return line.includes('|') && line.trim() !== '';
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function matchListItem(line) {
  const unordered = line.match(/^ {0,3}[-+*]\s+(.+)$/);
  if (unordered) {
    return { ordered: false, start: null, content: unordered[1] };
  }
  const ordered = line.match(/^ {0,3}(\d+)[.)]\s+(.+)$/);
  return ordered
    ? {
        ordered: true,
        start: Number.parseInt(ordered[1], 10),
        content: ordered[2],
      }
    : null;
}

function startsBlock(lines, index) {
  const line = lines[index];
  return (
    !line.trim() ||
    /^ {0,3}```/.test(line) ||
    /^ {0,3}#{1,6}\s/.test(line) ||
    /^ {0,3}>/.test(line) ||
    Boolean(matchListItem(line)) ||
    isTableStart(lines, index) ||
    RAW_HTML_PATTERN.test(line.trim())
  );
}
