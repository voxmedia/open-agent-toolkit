import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  PROJECT_SCOPES,
  type ProjectScope,
} from '@commands/shared/project-scope';
import { CliError } from '@errors/cli-error';

/** The parent's record of its linked projects, in the parent's own folder. */
export const LINKED_PROJECTS_FILENAME = 'linked-projects.md';

export interface LinkedProjectRow {
  name: string;
  path: string;
  scope: ProjectScope;
  purpose: string;
  /** UTC date the row was opened (`YYYY-MM-DD`). */
  linked: string;
  /** UTC date `linked ack` closed it; absent while the row is open. */
  acknowledged?: string;
}

export interface LinkedProjectsLedger {
  title: string;
  open: LinkedProjectRow[];
  closed: LinkedProjectRow[];
}

const OPEN_HEADING = '## Open';
const CLOSED_HEADING = '## Closed';
const OPEN_COLUMNS = ['Project', 'Path', 'Scope', 'Purpose', 'Linked'];
const CLOSED_COLUMNS = [...OPEN_COLUMNS, 'Acknowledged'];

const PREAMBLE = [
  "Projects linked to this one. Written only by this project's orchestrator,",
  'through `oat project new <child> --mode freestyle --link-to <this project>`,',
  '`oat project linked add` and `oat project linked ack`; nothing here is',
  'committed or pushed by those commands. An open row is a linked project whose',
  'records this project has not yet read and acted on: `oat project status`',
  'lists it until `oat project linked ack <name>` closes it.',
];

export function linkedProjectsPath(projectDir: string): string {
  return join(projectDir, LINKED_PROJECTS_FILENAME);
}

/** A purpose is one table cell: one line, no pipe. */
export function validatePurpose(purpose: string | undefined): string {
  const value = purpose?.trim() ?? '';
  if (!value) {
    throw new CliError('--purpose needs a one-line purpose.', 1);
  }
  if (/[\r\n\u2028\u2029|]/.test(value)) {
    throw new CliError(
      '--purpose must be one line without a "|" character.',
      1,
    );
  }
  return value;
}

function sectionRows(content: string, heading: string): string[][] {
  const start = content.search(new RegExp(`^${heading}[ \\t]*$`, 'm'));
  if (start === -1) {
    throw new CliError(
      `${LINKED_PROJECTS_FILENAME} has no \`${heading}\` section; restore it before linking.`,
      1,
    );
  }
  const body = content.slice(start + heading.length);
  const next = body.search(/^## /m);
  const lines = (next === -1 ? body : body.slice(0, next)).split('\n');
  const rows = lines
    .filter((line) => line.trim().startsWith('|'))
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim()),
    );
  // Drop the header row and the separator row.
  return rows.filter(
    (cells, index) =>
      index > 0 && !cells.every((cell) => /^:?-+:?$/.test(cell)),
  );
}

function toRow(cells: string[], closed: boolean): LinkedProjectRow {
  const [name, path, scope, purpose, linked, acknowledged] = cells;
  if (
    !name ||
    !path ||
    !purpose ||
    !linked ||
    !PROJECT_SCOPES.includes(scope as ProjectScope) ||
    (closed && !acknowledged)
  ) {
    throw new CliError(
      `${LINKED_PROJECTS_FILENAME} has a malformed row: | ${cells.join(' | ')} |`,
      1,
    );
  }
  return {
    name,
    path,
    scope: scope as ProjectScope,
    purpose,
    linked,
    ...(closed ? { acknowledged } : {}),
  };
}

export function parseLinkedProjects(content: string): LinkedProjectsLedger {
  const normalized = content.replaceAll('\r\n', '\n');
  const title = /^# (.+)$/m.exec(normalized)?.[1]?.trim() ?? 'Linked projects';
  return {
    title,
    open: sectionRows(normalized, OPEN_HEADING).map((cells) =>
      toRow(cells, false),
    ),
    closed: sectionRows(normalized, CLOSED_HEADING).map((cells) =>
      toRow(cells, true),
    ),
  };
}

function renderTable(columns: string[], rows: string[][]): string[] {
  const widths = columns.map((column, index) =>
    Math.max(3, column.length, ...rows.map((row) => row[index]?.length ?? 0)),
  );
  const line = (cells: string[]): string =>
    `| ${cells.map((cell, index) => cell.padEnd(widths[index] ?? 0)).join(' | ')} |`;
  return [
    line(columns),
    line(widths.map((width) => '-'.repeat(width))),
    ...rows.map(line),
  ];
}

export function renderLinkedProjects(ledger: LinkedProjectsLedger): string {
  const openCells = ledger.open.map((row) => [
    row.name,
    row.path,
    row.scope,
    row.purpose,
    row.linked,
  ]);
  const closedCells = ledger.closed.map((row) => [
    row.name,
    row.path,
    row.scope,
    row.purpose,
    row.linked,
    row.acknowledged ?? '',
  ]);
  return [
    `# ${ledger.title}`,
    '',
    ...PREAMBLE,
    '',
    OPEN_HEADING,
    '',
    ...renderTable(OPEN_COLUMNS, openCells),
    '',
    CLOSED_HEADING,
    '',
    ...renderTable(CLOSED_COLUMNS, closedCells),
    '',
  ].join('\n');
}

/** The parent's ledger; an empty one when the file does not exist yet. */
export async function readLinkedProjects(
  projectDir: string,
  parentName: string,
): Promise<{ ledger: LinkedProjectsLedger; exists: boolean }> {
  let content: string;
  try {
    content = await readFile(linkedProjectsPath(projectDir), 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {
        ledger: {
          title: `Linked projects: ${parentName}`,
          open: [],
          closed: [],
        },
        exists: false,
      };
    }
    throw error;
  }
  return { ledger: parseLinkedProjects(content), exists: true };
}

export interface OpenLinkedProjects {
  open: LinkedProjectRow[];
  /** Why the file could not be read; `status` reports it instead of rows. */
  error?: string;
}

/**
 * Open rows for `status`: none when the file is absent, and the read error
 * when it cannot be parsed, so an unreadable ledger is never shown as empty.
 */
export async function readOpenLinkedProjects(
  projectDir: string,
): Promise<OpenLinkedProjects> {
  try {
    return { open: (await readLinkedProjects(projectDir, '')).ledger.open };
  } catch (error) {
    return {
      open: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function writeLinkedProjects(
  projectDir: string,
  ledger: LinkedProjectsLedger,
): Promise<void> {
  await writeFile(
    linkedProjectsPath(projectDir),
    renderLinkedProjects(ledger),
    'utf8',
  );
}
