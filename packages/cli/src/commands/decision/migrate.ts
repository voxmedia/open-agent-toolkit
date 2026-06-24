import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import YAML from 'yaml';

import { initializeDecisionRecords } from './init';
import { regenerateDecisionIndex } from './regenerate-index';
import { generateDecisionId } from './shared/generate-id';

export interface DecisionMigrationOptions {
  referenceRoot: string;
  dryRun?: boolean;
  deleteLegacy?: boolean;
}

export interface DecisionMigrationMapping {
  legacyId: string;
  id: string;
  title: string;
  date: string;
  filePath: string;
}

export interface DecisionMigrationResult {
  referenceRoot: string;
  decisionsRoot: string;
  dryRun: boolean;
  deletedLegacy: boolean;
  mappings: DecisionMigrationMapping[];
  written: string[];
}

interface LegacyDecisionSection {
  legacyId: string;
  title: string;
  date: string;
  status: string;
  body: string;
}

interface PreparedDecisionMigration {
  mapping: DecisionMigrationMapping;
  content: string;
}

// Real-world `decision-record.md` files use `### ADR-NNN: Title` headings (and
// `## ADR-NNN: Title` in older fixtures), optionally without a trailing title.
// The capture groups are: [1] legacy id (e.g. `ADR-001`), [2] optional title.
const LEGACY_HEADING_PATTERN =
  /^#{2,3}\s+((?:ADR|DR)-\d+)(?::\s*(.+?))?\s*$/gim;
const LEGACY_ID_PATTERN = /^(?:ADR|DR)-\d+$/i;

interface LegacyIndexRow {
  id: string;
  date?: string;
  status?: string;
  title?: string;
}

function parseLegacyIndexRows(content: string): LegacyIndexRow[] {
  const rows: LegacyIndexRow[] = [];

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) {
      continue;
    }

    const cells = trimmed
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    const id = cells[0];
    if (!id || id === 'ID' || /^-+$/.test(id)) {
      continue;
    }

    if (!LEGACY_ID_PATTERN.test(id)) {
      continue;
    }

    // The real-world Decision Index is `| ID | Date | Status | Title |`. We use
    // it both as a parity check and as a fallback source for Date/Status/Title.
    rows.push({
      id,
      date: cells[1] || undefined,
      status: cells[2] || undefined,
      title: cells[3] || undefined,
    });
  }

  return rows;
}

function parseLegacyIndexIds(content: string): string[] {
  return parseLegacyIndexRows(content).map((row) => row.id);
}

// Matches both the real-world bold form (`- **Date:** 2026-01-30`) and the
// older plain form (`- Date: 2026-01-30`). The optional `**` markers wrap the
// `Field:` label, so the colon stays inside the emphasis on the bold form.
function parseLegacyField(section: string, field: string): string | null {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `^-\\s*\\*{0,2}${escapedField}:\\*{0,2}\\s*(.+?)\\s*$`,
    'im',
  );
  return regex.exec(section)?.[1]?.trim() ?? null;
}

function parseLegacyDecisionSections(content: string): LegacyDecisionSection[] {
  const indexRows = new Map(
    parseLegacyIndexRows(content).map((row) => [row.id, row]),
  );
  const matches = [...content.matchAll(LEGACY_HEADING_PATTERN)];
  return matches.map((match, index) => {
    const sectionStart = match.index ?? 0;
    const sectionEnd = matches[index + 1]?.index ?? content.length;
    const section = content.slice(sectionStart, sectionEnd).trim();
    const legacyId = match[1]!;
    const indexRow = indexRows.get(legacyId);
    const title = (match[2]?.trim() || indexRow?.title || legacyId).trim();
    const date = parseLegacyField(section, 'Date') ?? indexRow?.date ?? null;
    if (!date) {
      throw new Error(`Legacy decision ${legacyId} is missing a Date field.`);
    }

    return {
      legacyId,
      title,
      date,
      status:
        parseLegacyField(section, 'Status') ?? indexRow?.status ?? 'proposed',
      body: section,
    };
  });
}

function assertSafeLegacyDelete(
  legacyIndexIds: string[],
  sections: LegacyDecisionSection[],
): void {
  if (sections.length === 0) {
    throw new Error(
      'Refusing to delete legacy decision source because no legacy decision sections were parsed.',
    );
  }

  if (legacyIndexIds.length === 0) {
    return;
  }

  const sectionIds = new Set(sections.map((section) => section.legacyId));
  const missingSections = legacyIndexIds.filter((id) => !sectionIds.has(id));
  if (legacyIndexIds.length !== sections.length || missingSections.length > 0) {
    throw new Error(
      `Refusing to delete legacy decision source because parsed index count (${legacyIndexIds.length}) does not match parsed section count (${sections.length}). Missing sections: ${missingSections.join(', ') || 'none'}.`,
    );
  }
}

function renderMigratedRecord(
  section: LegacyDecisionSection,
  id: string,
): string {
  const frontmatter = YAML.stringify({
    id,
    title: section.title,
    date: section.date,
    status: section.status,
    legacy_id: section.legacyId,
  }).trimEnd();

  return `---\n${frontmatter}\n---\n\n${section.body.trimEnd()}\n`;
}

function prepareDecisionMigrations(
  sections: LegacyDecisionSection[],
  decisionsRoot: string,
): PreparedDecisionMigration[] {
  return sections.map((section) => {
    const id = generateDecisionId(section.title, section.date);
    const mapping = {
      legacyId: section.legacyId,
      id,
      title: section.title,
      date: section.date,
      filePath: join(decisionsRoot, `${id}.md`),
    };

    return {
      mapping,
      content: renderMigratedRecord(section, id),
    };
  });
}

function assertUniqueMigrationTargets(
  preparedMigrations: PreparedDecisionMigration[],
): void {
  const seen = new Map<string, string>();
  for (const prepared of preparedMigrations) {
    const previousLegacyId = seen.get(prepared.mapping.filePath);
    if (previousLegacyId) {
      throw new Error(
        `Duplicate decision migration target ${prepared.mapping.filePath} generated for ${previousLegacyId} and ${prepared.mapping.legacyId}. Use unique date/title combinations before rerunning migration.`,
      );
    }

    seen.set(prepared.mapping.filePath, prepared.mapping.legacyId);
  }
}

async function readExistingTarget(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : null;

    if (code !== 'ENOENT') {
      throw error;
    }

    return null;
  }
}

async function findPendingWrites(
  preparedMigrations: PreparedDecisionMigration[],
): Promise<PreparedDecisionMigration[]> {
  const pendingWrites: PreparedDecisionMigration[] = [];

  for (const prepared of preparedMigrations) {
    const existingContent = await readExistingTarget(prepared.mapping.filePath);
    if (existingContent === null) {
      pendingWrites.push(prepared);
      continue;
    }

    if (existingContent !== prepared.content) {
      throw new Error(
        `Decision migration target ${prepared.mapping.filePath} already exists with different content. Resolve or move the conflicting file before rerunning migration.`,
      );
    }
  }

  return pendingWrites;
}

async function verifyMigratedTargets(
  preparedMigrations: PreparedDecisionMigration[],
): Promise<void> {
  for (const prepared of preparedMigrations) {
    const existingContent = await readExistingTarget(prepared.mapping.filePath);
    if (existingContent !== prepared.content) {
      throw new Error(
        `Decision migration target ${prepared.mapping.filePath} was not verified after migration. Rerun without --delete-legacy after resolving the target record.`,
      );
    }
  }
}

export async function migrateDecisionRecords(
  options: DecisionMigrationOptions,
): Promise<DecisionMigrationResult> {
  const legacyPath = join(options.referenceRoot, 'decision-record.md');
  const decisionsRoot = join(options.referenceRoot, 'decisions');
  const legacyContent = await readFile(legacyPath, 'utf8');
  const legacyIndexIds = parseLegacyIndexIds(legacyContent);
  const sections = parseLegacyDecisionSections(legacyContent);

  if (options.deleteLegacy) {
    assertSafeLegacyDelete(legacyIndexIds, sections);
  }

  const preparedMigrations = prepareDecisionMigrations(sections, decisionsRoot);
  assertUniqueMigrationTargets(preparedMigrations);
  const mappings = preparedMigrations.map((prepared) => prepared.mapping);

  if (options.dryRun) {
    return {
      referenceRoot: options.referenceRoot,
      decisionsRoot,
      dryRun: true,
      deletedLegacy: false,
      mappings,
      written: [],
    };
  }

  const pendingWrites = await findPendingWrites(preparedMigrations);
  await initializeDecisionRecords(decisionsRoot);

  const written: string[] = [];
  try {
    for (const prepared of pendingWrites) {
      await writeFile(prepared.mapping.filePath, prepared.content, {
        encoding: 'utf8',
        flag: 'wx',
      });
      written.push(prepared.mapping.filePath);
    }

    await regenerateDecisionIndex(decisionsRoot);
    await verifyMigratedTargets(preparedMigrations);
  } catch (error) {
    await Promise.all(written.map((path) => rm(path, { force: true })));
    throw error;
  }

  let deletedLegacy = false;
  if (options.deleteLegacy) {
    await rm(legacyPath);
    deletedLegacy = true;
  }

  return {
    referenceRoot: options.referenceRoot,
    decisionsRoot,
    dryRun: false,
    deletedLegacy,
    mappings,
    written,
  };
}
