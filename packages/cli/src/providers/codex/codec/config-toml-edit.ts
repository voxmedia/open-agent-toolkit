import { CliError } from '@errors/index';

/*
 * Input must already parse as TOML: the lexer locates structure and does not
 * validate it. Callers re-parse every edited result.
 */

type KeyPath = readonly string[];

interface TomlHeader {
  path: KeyPath;
  isArray: boolean;
  lineStart: number;
  end: number;
}

interface TomlSection {
  header: TomlHeader | null;
  path: KeyPath;
  isArray: boolean;
  lastEnd: number;
}

interface TomlInlineTable {
  path: KeyPath;
  open: number;
  close: number;
  entries: TomlEntry[];
}

interface TomlEntry {
  path: KeyPath;
  keyPath: KeyPath;
  containerPath: KeyPath;
  section: TomlSection;
  inline: TomlInlineTable | null;
  start: number;
  lineStart: number;
  valueStart: number;
  valueEnd: number;
  end: number;
  table: TomlInlineTable | null;
}

interface TomlDocument {
  sections: TomlSection[];
  entries: TomlEntry[];
}

type TomlDefinition =
  | { kind: 'root' }
  | { kind: 'header'; section: TomlSection }
  | { kind: 'inline'; table: TomlInlineTable }
  | { kind: 'dotted'; anchor: TomlEntry }
  | { kind: 'implicit' };

const BARE_KEY_PATTERN = /^[A-Za-z0-9_-]+$/;
const BARE_VALUE_TERMINATORS = new Set([
  ' ',
  '\t',
  ',',
  ']',
  '}',
  '#',
  '\r',
  '\n',
]);
const SIMPLE_ESCAPES: Record<string, string> = {
  b: '\b',
  t: '\t',
  n: '\n',
  f: '\f',
  r: '\r',
  '"': '"',
  '\\': '\\',
};
const MAX_EDIT_PASSES = 10_000;

function unsupported(detail: string): CliError {
  return new CliError(
    `Cannot edit .codex/config.toml without rewriting user content: ${detail}. Edit the file by hand and rerun sync.`,
  );
}

function findLast<T>(
  items: readonly T[],
  predicate: (item: T) => boolean,
): T | undefined {
  for (let index = items.length - 1; index >= 0; index--) {
    if (predicate(items[index]!)) {
      return items[index];
    }
  }
  return undefined;
}

function pathsEqual(left: KeyPath, right: KeyPath): boolean {
  return (
    left.length === right.length &&
    left.every((segment, index) => segment === right[index])
  );
}

function startsWithPath(path: KeyPath, prefix: KeyPath): boolean {
  return (
    path.length >= prefix.length &&
    prefix.every((segment, index) => segment === path[index])
  );
}

function isStrictPrefix(prefix: KeyPath, path: KeyPath): boolean {
  return prefix.length < path.length && startsWithPath(path, prefix);
}

class TomlLexer {
  private pos = 0;
  private readonly sections: TomlSection[] = [];
  private readonly entries: TomlEntry[] = [];

  constructor(private readonly text: string) {}

  lex(): TomlDocument {
    let section: TomlSection = {
      header: null,
      path: [],
      isArray: false,
      lastEnd: 0,
    };
    this.sections.push(section);

    while (this.pos < this.text.length) {
      const lineStart = this.pos;
      this.skipInlineWhitespace();
      if (this.pos >= this.text.length) {
        break;
      }
      if (this.atNewline()) {
        this.skipNewline();
        continue;
      }
      if (this.peek() === '#') {
        this.skipComment();
        continue;
      }

      if (this.peek() === '[') {
        const isArray = this.text.startsWith('[[', this.pos);
        this.pos += isArray ? 2 : 1;
        const path = this.lexKey();
        this.expect(isArray ? ']]' : ']');
        const end = this.finishLine();
        section = {
          header: { path, isArray, lineStart, end },
          path,
          isArray,
          lastEnd: end,
        };
        this.sections.push(section);
        continue;
      }

      const entry = this.lexKeyValue(section, null, section.path, lineStart);
      entry.end = this.finishLine();
      section.lastEnd = entry.end;
    }

    return { sections: this.sections, entries: this.entries };
  }

  private peek(offset = 0): string | undefined {
    return this.text[this.pos + offset];
  }

  private fail(detail: string): never {
    throw unsupported(`${detail} at offset ${this.pos}`);
  }

  private atNewline(): boolean {
    return (
      this.peek() === '\n' || (this.peek() === '\r' && this.peek(1) === '\n')
    );
  }

  private skipNewline(): void {
    this.pos += this.peek() === '\r' ? 2 : 1;
  }

  private skipInlineWhitespace(): void {
    while (this.peek() === ' ' || this.peek() === '\t') {
      this.pos += 1;
    }
  }

  private skipComment(): void {
    while (this.pos < this.text.length && !this.atNewline()) {
      this.pos += 1;
    }
  }

  private skipArrayWhitespace(): void {
    for (;;) {
      this.skipInlineWhitespace();
      if (this.atNewline()) {
        this.skipNewline();
      } else if (this.peek() === '#') {
        this.skipComment();
      } else {
        return;
      }
    }
  }

  private expect(token: string): void {
    this.skipInlineWhitespace();
    if (!this.text.startsWith(token, this.pos)) {
      this.fail(`expected "${token}"`);
    }
    this.pos += token.length;
  }

  private finishLine(): number {
    this.skipInlineWhitespace();
    if (this.peek() === '#') {
      this.skipComment();
    }
    if (this.pos < this.text.length && !this.atNewline()) {
      this.fail('expected end of line');
    }
    return this.pos;
  }

  private lexKey(): string[] {
    const segments: string[] = [];
    for (;;) {
      this.skipInlineWhitespace();
      const char = this.peek();
      if (char === '"') {
        segments.push(this.lexBasicKey());
      } else if (char === "'") {
        const close = this.text.indexOf("'", this.pos + 1);
        if (close < 0) {
          this.fail('unterminated literal key');
        }
        segments.push(this.text.slice(this.pos + 1, close));
        this.pos = close + 1;
      } else {
        const start = this.pos;
        while (/[A-Za-z0-9_-]/.test(this.peek() ?? '')) {
          this.pos += 1;
        }
        if (start === this.pos) {
          this.fail('expected a key');
        }
        segments.push(this.text.slice(start, this.pos));
      }
      this.skipInlineWhitespace();
      if (this.peek() !== '.') {
        return segments;
      }
      this.pos += 1;
    }
  }

  private lexBasicKey(): string {
    let value = '';
    this.pos += 1;
    for (;;) {
      const char = this.peek();
      if (char === undefined || char === '\n' || char === '\r') {
        this.fail('unterminated quoted key');
      }
      this.pos += 1;
      if (char === '"') {
        return value;
      }
      if (char !== '\\') {
        value += char;
        continue;
      }
      const escape = this.peek() ?? '';
      this.pos += 1;
      if (escape in SIMPLE_ESCAPES) {
        value += SIMPLE_ESCAPES[escape];
        continue;
      }
      const width = escape === 'u' ? 4 : escape === 'U' ? 8 : 0;
      const hex = this.text.slice(this.pos, this.pos + width);
      if (width === 0 || !/^[0-9A-Fa-f]+$/.test(hex) || hex.length !== width) {
        this.fail('invalid escape in quoted key');
      }
      value += String.fromCodePoint(Number.parseInt(hex, 16));
      this.pos += width;
    }
  }

  private lexKeyValue(
    section: TomlSection,
    inline: TomlInlineTable | null,
    containerPath: KeyPath,
    lineStart: number,
  ): TomlEntry {
    this.skipInlineWhitespace();
    const start = this.pos;
    const keyPath = this.lexKey();
    this.expect('=');
    this.skipInlineWhitespace();
    const entry: TomlEntry = {
      path: [...containerPath, ...keyPath],
      keyPath,
      containerPath,
      section,
      inline,
      start,
      lineStart,
      valueStart: this.pos,
      valueEnd: this.pos,
      end: this.pos,
      table: null,
    };
    if (!section.isArray) {
      this.entries.push(entry);
    }
    entry.table = this.lexValue(entry.path, section);
    entry.valueEnd = this.pos;
    entry.end = this.pos;
    return entry;
  }

  private lexValue(
    path: KeyPath | null,
    section: TomlSection,
  ): TomlInlineTable | null {
    const char = this.peek();
    if (this.text.startsWith('"""', this.pos)) {
      this.lexMultilineString('"""', true);
    } else if (this.text.startsWith("'''", this.pos)) {
      this.lexMultilineString("'''", false);
    } else if (char === '"') {
      this.lexSingleLineString('"', true);
    } else if (char === "'") {
      this.lexSingleLineString("'", false);
    } else if (char === '[') {
      this.lexArray(section);
    } else if (char === '{') {
      return this.lexInlineTable(path, section);
    } else {
      this.lexBareValue();
    }
    return null;
  }

  private lexMultilineString(delimiter: string, escapes: boolean): void {
    this.pos += 3;
    for (;;) {
      if (this.pos >= this.text.length) {
        this.fail('unterminated multiline string');
      }
      if (escapes && this.peek() === '\\') {
        this.pos += 2;
        continue;
      }
      if (this.text.startsWith(delimiter, this.pos)) {
        this.pos += 3;
        for (
          let extra = 0;
          extra < 2 && this.peek() === delimiter[0];
          extra++
        ) {
          this.pos += 1;
        }
        return;
      }
      this.pos += 1;
    }
  }

  private lexSingleLineString(delimiter: string, escapes: boolean): void {
    this.pos += 1;
    for (;;) {
      const char = this.peek();
      if (char === undefined || char === '\n' || char === '\r') {
        this.fail('unterminated string');
      }
      if (escapes && char === '\\') {
        this.pos += 2;
        continue;
      }
      this.pos += 1;
      if (char === delimiter) {
        return;
      }
    }
  }

  private lexArray(section: TomlSection): void {
    this.pos += 1;
    for (;;) {
      this.skipArrayWhitespace();
      if (this.peek() === ']') {
        this.pos += 1;
        return;
      }
      if (this.pos >= this.text.length) {
        this.fail('unterminated array');
      }
      this.lexValue(null, section);
      this.skipArrayWhitespace();
      if (this.peek() === ',') {
        this.pos += 1;
      } else if (this.peek() !== ']') {
        this.fail('expected "," or "]" in array');
      }
    }
  }

  private lexInlineTable(
    path: KeyPath | null,
    section: TomlSection,
  ): TomlInlineTable | null {
    const table: TomlInlineTable = {
      path: path ?? [],
      open: this.pos,
      close: this.pos,
      entries: [],
    };
    this.pos += 1;
    this.skipInlineWhitespace();
    if (this.peek() !== '}') {
      for (;;) {
        if (path === null) {
          this.lexValueOnlyInlineEntry(section);
        } else {
          table.entries.push(
            this.lexKeyValue(section, table, path, table.open),
          );
        }
        this.skipInlineWhitespace();
        if (this.peek() === ',') {
          this.pos += 1;
          continue;
        }
        if (this.peek() !== '}') {
          this.fail('expected "," or "}" in inline table');
        }
        break;
      }
    }
    table.close = this.pos;
    this.pos += 1;
    return path === null ? null : table;
  }

  /** Inline tables inside arrays are array elements, never table definitions. */
  private lexValueOnlyInlineEntry(section: TomlSection): void {
    this.skipInlineWhitespace();
    this.lexKey();
    this.expect('=');
    this.skipInlineWhitespace();
    this.lexValue(null, section);
  }

  private lexBareValue(): void {
    const start = this.pos;
    while (
      this.pos < this.text.length &&
      !BARE_VALUE_TERMINATORS.has(this.peek()!)
    ) {
      this.pos += 1;
    }
    if (start === this.pos) {
      this.fail('expected a value');
    }
    if (
      /^\d{4}-\d{2}-\d{2}$/.test(this.text.slice(start, this.pos)) &&
      /^ \d{2}:/.test(this.text.slice(this.pos, this.pos + 4))
    ) {
      this.pos += 1;
      this.lexBareValue();
    }
  }
}

function lexToml(text: string): TomlDocument {
  return new TomlLexer(text).lex();
}

/** Renders a TOML basic string; JSON escaping is not TOML-safe for all input. */
export function renderTomlString(value: string): string {
  let rendered = '"';
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if (char === '"' || char === '\\') {
      rendered += `\\${char}`;
    } else if (char === '\b') {
      rendered += '\\b';
    } else if (char === '\t') {
      rendered += '\\t';
    } else if (char === '\n') {
      rendered += '\\n';
    } else if (char === '\f') {
      rendered += '\\f';
    } else if (char === '\r') {
      rendered += '\\r';
    } else if (code < 0x20 || code === 0x7f) {
      rendered += `\\u${code.toString(16).padStart(4, '0')}`;
    } else if (code >= 0xd800 && code <= 0xdfff) {
      throw unsupported('a value contains an unpaired surrogate');
    } else {
      rendered += char;
    }
  }
  return `${rendered}"`;
}

function renderKey(segment: string): string {
  return BARE_KEY_PATTERN.test(segment) ? segment : renderTomlString(segment);
}

function renderKeyPath(path: KeyPath): string {
  return path.map(renderKey).join('.');
}

function detectEol(text: string): string {
  const newline = text.indexOf('\n');
  return newline > 0 && text[newline - 1] === '\r' ? '\r\n' : '\n';
}

function splice(
  text: string,
  start: number,
  end: number,
  replacement: string,
): string {
  return `${text.slice(0, start)}${replacement}${text.slice(end)}`;
}

function lineIndentAt(text: string, lineStart: number): string {
  return /^[ \t]*/.exec(text.slice(lineStart))![0];
}

function previousLineStart(text: string, lineStart: number): number | null {
  if (lineStart === 0) {
    return null;
  }
  return text.lastIndexOf('\n', lineStart - 2) + 1;
}

function lineEndIncludingNewline(text: string, contentEnd: number): number {
  if (text.startsWith('\r\n', contentEnd)) {
    return contentEnd + 2;
  }
  return text[contentEnd] === '\n' ? contentEnd + 1 : contentEnd;
}

function findDefinition(
  document: TomlDocument,
  tablePath: KeyPath,
): TomlDefinition | null {
  if (tablePath.length === 0) {
    return { kind: 'root' };
  }

  const section = document.sections.find(
    (candidate) =>
      candidate.header !== null &&
      !candidate.isArray &&
      pathsEqual(candidate.path, tablePath),
  );
  if (section) {
    return { kind: 'header', section };
  }

  const inline = document.entries.find((entry) =>
    pathsEqual(entry.path, tablePath),
  );
  if (inline) {
    if (!inline.table) {
      throw unsupported(`${renderKeyPath(tablePath)} is not a table`);
    }
    return { kind: 'inline', table: inline.table };
  }

  const dotted = document.entries.filter(
    (entry) =>
      isStrictPrefix(tablePath, entry.path) &&
      isStrictPrefix(entry.containerPath, tablePath),
  );
  if (dotted.length > 0) {
    return { kind: 'dotted', anchor: dotted.at(-1)! };
  }

  return document.sections.some(
    (candidate) =>
      candidate.header !== null && isStrictPrefix(tablePath, candidate.path),
  )
    ? { kind: 'implicit' }
    : null;
}

function insertIntoInlineTable(
  text: string,
  table: TomlInlineTable,
  member: string,
): string {
  const last = table.entries.at(-1);
  if (!last) {
    return splice(text, table.open + 1, table.close, ` ${member} `);
  }
  return splice(text, last.valueEnd, last.valueEnd, `, ${member}`);
}

function insertAfterStatement(
  text: string,
  lineStart: number,
  contentEnd: number,
  line: string,
): string {
  return splice(
    text,
    contentEnd,
    contentEnd,
    `${detectEol(text)}${lineIndentAt(text, lineStart)}${line}`,
  );
}

function isCommentLine(line: string): boolean {
  return /^[ \t]*#/.test(line);
}

function isBlankLine(line: string): boolean {
  return /^[ \t]*(?:\r?\n)?$/.test(line);
}

/*
 * Other tools wrap tables in marker comments. A comment run with content
 * directly on both sides may be the `# END` of the block above or the
 * `# BEGIN` of the block below, so the two helpers below return null rather
 * than guess, and the caller appends at the end of the file instead.
 */
function leadingCommentStart(text: string, lineStart: number): number | null {
  let start = lineStart;
  for (;;) {
    const previous = previousLineStart(text, start);
    if (previous === null) {
      return start;
    }
    const line = text.slice(previous, start);
    if (!isCommentLine(line)) {
      return isBlankLine(line) || start === lineStart ? start : null;
    }
    start = previous;
  }
}

function trailingCommentEnd(text: string, contentEnd: number): number | null {
  let end = contentEnd;
  let cursor = lineEndIncludingNewline(text, contentEnd);
  while (cursor < text.length) {
    const newline = text.indexOf('\n', cursor);
    const next = newline < 0 ? text.length : newline + 1;
    const line = text.slice(cursor, next);
    if (!isCommentLine(line)) {
      return isBlankLine(line) || end === contentEnd ? end : null;
    }
    end = cursor + line.replace(/\r?\n$/, '').length;
    cursor = next;
  }
  return end;
}

function insertSection(
  text: string,
  document: TomlDocument,
  tablePath: KeyPath,
  lines: string[],
): string {
  const eol = detectEol(text);
  const block = [`[${renderKeyPath(tablePath)}]`, ...lines].join(eol);
  const headers = document.sections.filter(
    (section): section is TomlSection & { header: TomlHeader } =>
      section.header !== null,
  );

  const firstSubTable = headers.find((section) =>
    isStrictPrefix(tablePath, section.path),
  );
  const start = firstSubTable
    ? leadingCommentStart(text, firstSubTable.header.lineStart)
    : null;
  if (start !== null) {
    return splice(text, start, start, `${block}${eol}${eol}`);
  }

  for (
    let depth = tablePath.length - 1;
    !firstSubTable && depth >= 1;
    depth--
  ) {
    const family = tablePath.slice(0, depth);
    const lastInFamily = findLast(headers, (section) =>
      startsWithPath(section.path, family),
    );
    if (lastInFamily) {
      const end = trailingCommentEnd(text, lastInFamily.lastEnd);
      if (end !== null) {
        return splice(text, end, end, `${eol}${eol}${block}`);
      }
      break;
    }
  }

  const contentEnd = text.length - /(?:\r?\n[ \t]*)*$/.exec(text)![0].length;
  if (contentEnd === 0) {
    return splice(text, 0, 0, `${block}${eol}`);
  }
  return splice(text, contentEnd, contentEnd, `${eol}${eol}${block}`);
}

/** `renderedValue` must already be a valid TOML value literal. */
export function setTomlValue(
  text: string,
  path: KeyPath,
  renderedValue: string,
): string {
  const document = lexToml(text);
  const existing = document.entries.find((entry) =>
    pathsEqual(entry.path, path),
  );
  if (existing) {
    return splice(text, existing.valueStart, existing.valueEnd, renderedValue);
  }

  const tablePath = path.slice(0, -1);
  let depth = tablePath.length;
  let definition = findDefinition(document, tablePath);
  while (definition === null) {
    depth -= 1;
    definition = findDefinition(document, tablePath.slice(0, depth));
  }
  const rest = path.slice(depth);

  switch (definition.kind) {
    case 'header':
      if (rest.length === 1) {
        const anchor = definition.section;
        const lastEntry = findLast(
          document.entries,
          (entry) => entry.section === anchor && entry.inline === null,
        );
        return insertAfterStatement(
          text,
          lastEntry?.lineStart ?? anchor.header!.lineStart,
          anchor.lastEnd,
          `${renderKey(rest[0]!)} = ${renderedValue}`,
        );
      }
      break;
    case 'inline': {
      const member = rest
        .slice(0, -1)
        .reduceRight(
          (inner, segment) => `${renderKey(segment)} = { ${inner} }`,
          `${renderKey(rest.at(-1)!)} = ${renderedValue}`,
        );
      return insertIntoInlineTable(text, definition.table, member);
    }
    case 'dotted': {
      const { anchor } = definition;
      const member = `${renderKeyPath(path.slice(anchor.containerPath.length))} = ${renderedValue}`;
      if (anchor.inline) {
        return insertIntoInlineTable(text, anchor.inline, member);
      }
      return insertAfterStatement(text, anchor.lineStart, anchor.end, member);
    }
    case 'root':
    case 'implicit':
      break;
  }

  if (tablePath.length === 0) {
    throw unsupported(`top-level key ${renderKeyPath(path)} is not editable`);
  }
  return insertSection(text, document, tablePath, [
    `${renderKey(path.at(-1)!)} = ${renderedValue}`,
  ]);
}

function removeLines(text: string, start: number, contentEnd: number): string {
  let removeStart = start;
  const removeEnd = lineEndIncludingNewline(text, contentEnd);
  const previous = previousLineStart(text, start);
  const following = text.slice(removeEnd);
  if (
    previous !== null &&
    /^[ \t]*\r?\n$/.test(text.slice(previous, start)) &&
    /^[ \t]*(?:\r?\n|$)/.test(following)
  ) {
    removeStart = previous;
  }
  return splice(text, removeStart, removeEnd, '');
}

function removeInlineEntry(text: string, entry: TomlEntry): string {
  const table = entry.inline!;
  const index = table.entries.indexOf(entry);
  if (table.entries.length === 1) {
    return splice(text, table.open + 1, table.close, '');
  }
  const next = table.entries[index + 1];
  if (next) {
    return splice(text, entry.start, next.start, '');
  }
  return splice(text, table.entries[index - 1]!.valueEnd, entry.valueEnd, '');
}

export function removeTomlTable(text: string, path: KeyPath): string {
  let current = text;
  for (let pass = 0; pass < MAX_EDIT_PASSES; pass++) {
    const document = lexToml(current);
    const section = document.sections.find(
      (candidate) =>
        candidate.header !== null && startsWithPath(candidate.path, path),
    );
    if (section) {
      current = removeLines(
        current,
        section.header!.lineStart,
        section.lastEnd,
      );
      continue;
    }

    const entry = document.entries.find((candidate) =>
      startsWithPath(candidate.path, path),
    );
    if (!entry) {
      return current;
    }
    current = entry.inline
      ? removeInlineEntry(current, entry)
      : removeLines(current, entry.lineStart, entry.end);
  }
  throw unsupported(`${renderKeyPath(path)} could not be removed`);
}
