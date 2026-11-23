import { randomUUID } from 'node:crypto';
import {
  readFile,
  rename as renameFile,
  unlink as unlinkFile,
  writeFile as writeFileContent,
} from 'node:fs/promises';
import { join } from 'node:path';

import { CliError } from '@errors/cli-error';

/** The lane ledger, in the project folder. */
export const LANES_FILENAME = 'lanes.md';

/** Where filed lane reports live, beside the ledger. */
export const LANE_REPORTS_DIRNAME = 'lane-reports';

export const LANE_STATES = [
  'dispatched',
  'running',
  'turn-finished',
  'work-settled',
  'review-accepted',
  'merged',
  'blocked',
  'superseded',
] as const;
export type LaneState = (typeof LANE_STATES)[number];

/** States that move a lane from `## Active` to `## Closed`. */
export const CLOSED_LANE_STATES: readonly LaneState[] = [
  'merged',
  'superseded',
];

/** What a blocked lane waits on. */
export const WAITING_ON_KINDS = [
  'owner',
  'lane',
  'linked-project',
  'external',
] as const;

export const DISPATCH_STATUSES = ['open', 'reported', 'no-report'] as const;
export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

/** Where a lane works: its own worktree, or the orchestrator's checkout. */
export const LANE_PLACEMENTS = ['own-worktree', 'shared-worktree'] as const;

/**
 * The fields of an active lane block, in the order they are written. Each is
 * one `- <field>: <value>` line; an unset field is not written.
 */
export const LANE_FIELDS = [
  'state',
  'dispatch',
  'next',
  'owner',
  'waiting_on',
  'blocker',
  'replaced_by',
  'task',
  'thread',
  'worktree',
  'placement',
  'branch',
  'base',
  'head',
  'review_round',
  'report',
  'wake',
  'provider',
  'model',
  'effort',
  'observed_model',
  'paths',
  'last_observed',
] as const;
export type LaneField = (typeof LANE_FIELDS)[number];

export interface LaneBlock {
  /** Lane ID: `l01`, `l02`, ... */
  id: string;
  fields: Partial<Record<LaneField, string>>;
}

/** One `- <id> · <text>` line of `## Closed` or `## History`. */
export interface LedgerLine {
  id: string;
  text: string;
}

export interface LaneLedger {
  title: string;
  active: LaneBlock[];
  closed: LedgerLine[];
  history: LedgerLine[];
}

export const LANE_ID_PATTERN = /^l\d{2,}$/;
const DISPATCH_VALUE_PATTERN = /^(d\d{2,}) (open|reported|no-report)$/;
const UPDATE_ID_PATTERN = /^u\d{3,}$/;
const ACTIVE_HEADING = '## Active';
const CLOSED_HEADING = '## Closed';
const HISTORY_HEADING = '## History';
const EMPTY_SECTION = '_None._';
const SEPARATOR = ' · ';

const PREAMBLE = [
  "The lane ledger. Written only by `oat project lane set` in the orchestrator's",
  'checkout; never edit it by hand, and lanes never write it. Active holds one',
  'block per open lane, rewritten in place; Closed one line per merged or',
  'superseded lane; History one line per update, append-only, each with its',
  'update ID. Filed lane reports are in `lane-reports/`.',
];

export function lanesPath(projectDir: string): string {
  return join(projectDir, LANES_FILENAME);
}

export function formatDispatchId(number: number): string {
  return `d${String(number).padStart(2, '0')}`;
}

export function formatUpdateId(number: number): string {
  return `u${String(number).padStart(3, '0')}`;
}

export interface LaneDispatch {
  id: string;
  number: number;
  status: DispatchStatus;
}

/** A block's current dispatch, from its `dispatch: dNN <status>` field. */
export function laneDispatch(block: LaneBlock): LaneDispatch {
  const match = DISPATCH_VALUE_PATTERN.exec(block.fields.dispatch ?? '');
  if (!match) {
    throw new CliError(
      `${LANES_FILENAME}: lane ${block.id} has no valid dispatch line (expected \`- dispatch: dNN open|reported|no-report\`).`,
      1,
    );
  }
  const id = match[1] as string;
  return {
    id,
    number: Number(id.slice(1)),
    status: match[2] as DispatchStatus,
  };
}

function malformed(line: string, where: string): CliError {
  return new CliError(
    `${LANES_FILENAME} has a malformed line in ${where}: ${line.trim()}`,
    1,
  );
}

function sectionBody(content: string, heading: string): string[] {
  const start = content.search(new RegExp(`^${heading}[ \\t]*$`, 'm'));
  if (start === -1) {
    throw new CliError(
      `${LANES_FILENAME} has no \`${heading}\` section; restore it before updating lanes.`,
      1,
    );
  }
  const body = content.slice(start + heading.length);
  const next = body.search(/^## /m);
  return (next === -1 ? body : body.slice(0, next)).split('\n');
}

/**
 * Undo Markdown backslash escapes. A Markdown formatter (such as a pre-commit
 * oxfmt) rewrites a committed ledger's `*` as `\*`; reading the escape back
 * keeps a value such as `paths: src/*.ts` what `lane set` wrote.
 */
function unescapeMarkdown(value: string): string {
  return value.replace(/\\([!-/:-@[-`{-~])/g, '$1');
}

/**
 * Escape a value's backslashes as it is written, so `unescapeMarkdown` reads
 * back a literal `\` (as in `rg 'api\.v1'`) instead of dropping it.
 */
function escapeBackslashes(value: string): string {
  return value.replaceAll('\\', '\\\\');
}

function isBlankOrPlaceholder(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === '' || trimmed === EMPTY_SECTION;
}

function parseActive(lines: string[]): LaneBlock[] {
  const blocks: LaneBlock[] = [];
  let current: LaneBlock | null = null;
  for (const line of lines) {
    if (isBlankOrPlaceholder(line)) {
      continue;
    }
    const heading = /^### (\S+)\s*$/.exec(line);
    if (heading) {
      const id = heading[1] as string;
      if (!LANE_ID_PATTERN.test(id)) {
        throw malformed(line, ACTIVE_HEADING);
      }
      current = { id, fields: {} };
      blocks.push(current);
      continue;
    }
    const field = /^- ([a-z_]+): (.*)$/.exec(line);
    const key = field?.[1] as LaneField | undefined;
    if (!current || !field || !key || !LANE_FIELDS.includes(key)) {
      throw malformed(line, ACTIVE_HEADING);
    }
    if (current.fields[key] !== undefined) {
      throw malformed(
        line,
        `${ACTIVE_HEADING} (lane ${current.id} repeats it)`,
      );
    }
    current.fields[key] = unescapeMarkdown((field[2] as string).trim());
  }
  for (const block of blocks) {
    const state = block.fields.state as LaneState | undefined;
    if (
      !state ||
      !LANE_STATES.includes(state) ||
      CLOSED_LANE_STATES.includes(state)
    ) {
      throw new CliError(
        `${LANES_FILENAME}: active lane ${block.id} has no valid open state.`,
        1,
      );
    }
    laneDispatch(block);
  }
  return blocks;
}

function parseLines(
  lines: string[],
  heading: string,
  idPattern: RegExp,
): LedgerLine[] {
  const entries: LedgerLine[] = [];
  for (const line of lines) {
    if (isBlankOrPlaceholder(line)) {
      continue;
    }
    const match = /^- (\S+) · (.+)$/.exec(line);
    const id = match?.[1];
    if (!match || !id || !idPattern.test(id)) {
      throw malformed(line, heading);
    }
    entries.push({ id, text: unescapeMarkdown((match[2] as string).trim()) });
  }
  return entries;
}

export function parseLaneLedger(content: string): LaneLedger {
  const normalized = content.replaceAll('\r\n', '\n');
  const title = /^# (.+)$/m.exec(normalized)?.[1]?.trim() ?? 'Lanes';
  const ledger: LaneLedger = {
    title,
    active: parseActive(sectionBody(normalized, ACTIVE_HEADING)),
    closed: parseLines(
      sectionBody(normalized, CLOSED_HEADING),
      CLOSED_HEADING,
      LANE_ID_PATTERN,
    ),
    history: parseLines(
      sectionBody(normalized, HISTORY_HEADING),
      HISTORY_HEADING,
      UPDATE_ID_PATTERN,
    ),
  };
  const ids = [
    ...ledger.active.map((block) => block.id),
    ...ledger.closed.map((line) => line.id),
  ];
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) {
    throw new CliError(
      `${LANES_FILENAME} lists lane ${duplicate} more than once.`,
      1,
    );
  }
  return ledger;
}

export function renderLaneLedger(ledger: LaneLedger): string {
  const active = ledger.active.flatMap((block) => [
    `### ${block.id}`,
    '',
    ...LANE_FIELDS.flatMap((field) => {
      const value = block.fields[field];
      return value === undefined || value === ''
        ? []
        : [`- ${field}: ${escapeBackslashes(value)}`];
    }),
    '',
  ]);
  const lines = (entries: LedgerLine[]): string[] =>
    entries.length === 0
      ? [EMPTY_SECTION, '']
      : [
          ...entries.map(
            (entry) =>
              `- ${entry.id}${SEPARATOR}${escapeBackslashes(entry.text)}`,
          ),
          '',
        ];
  return [
    `# ${ledger.title}`,
    '',
    ...PREAMBLE,
    '',
    ACTIVE_HEADING,
    '',
    ...(active.length === 0 ? [EMPTY_SECTION, ''] : active),
    CLOSED_HEADING,
    '',
    ...lines(ledger.closed),
    HISTORY_HEADING,
    '',
    ...lines(ledger.history),
  ]
    .join('\n')
    .replace(/\n+$/, '\n');
}

/** The project's ledger; an empty one when `lanes.md` does not exist yet. */
export async function readLaneLedger(
  projectDir: string,
  projectName: string,
): Promise<{ ledger: LaneLedger; exists: boolean }> {
  let content: string;
  try {
    content = await readFile(lanesPath(projectDir), 'utf8');
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return {
        ledger: {
          title: `Lanes: ${projectName}`,
          active: [],
          closed: [],
          history: [],
        },
        exists: false,
      };
    }
    throw error;
  }
  return { ledger: parseLaneLedger(content), exists: true };
}

/** The file operations the atomic write uses; injectable for tests. */
export interface LedgerWriteFs {
  writeFile: (path: string, content: string) => Promise<void>;
  rename: (from: string, to: string) => Promise<void>;
  unlink: (path: string) => Promise<void>;
}

const NODE_FS: LedgerWriteFs = {
  writeFile: (path, content) => writeFileContent(path, content, 'utf8'),
  rename: renameFile,
  unlink: unlinkFile,
};

/**
 * Write the ledger atomically: the whole file goes to a temporary file in the
 * same folder, which then replaces `lanes.md` with one rename. A failure at
 * any point leaves the previous `lanes.md` as it was and removes the
 * temporary file, so a crash never leaves a half-written ledger.
 */
export async function writeLaneLedger(
  projectDir: string,
  ledger: LaneLedger,
  fs: LedgerWriteFs = NODE_FS,
): Promise<void> {
  const target = lanesPath(projectDir);
  const temporary = join(
    projectDir,
    `.${LANES_FILENAME}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    await fs.writeFile(temporary, renderLaneLedger(ledger));
    await fs.rename(temporary, target);
  } catch (error) {
    await fs.unlink(temporary).catch(() => undefined);
    throw error;
  }
}
