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

const LEGACY_HEADING_PATTERN = /^##\s+((?:ADR|DR)-\d+):\s+(.+?)\s*$/gim;
const LEGACY_ID_PATTERN = /^(?:ADR|DR)-\d+$/i;

function parseLegacyIndexIds(content: string): string[] {
  const ids: string[] = [];

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

    if (LEGACY_ID_PATTERN.test(id)) {
      ids.push(id);
    }
  }

  return ids;
}

function parseLegacyField(section: string, field: string): string | null {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^-\\s*${escapedField}:\\s*(.+?)\\s*$`, 'im');
  return regex.exec(section)?.[1]?.trim() ?? null;
}

function parseLegacyDecisionSections(content: string): LegacyDecisionSection[] {
  const matches = [...content.matchAll(LEGACY_HEADING_PATTERN)];
  return matches.map((match, index) => {
    const sectionStart = match.index ?? 0;
    const sectionEnd = matches[index + 1]?.index ?? content.length;
    const section = content.slice(sectionStart, sectionEnd).trim();
    const legacyId = match[1]!;
    const title = match[2]!.trim();
    const date = parseLegacyField(section, 'Date');
    if (!date) {
      throw new Error(`Legacy decision ${legacyId} is missing a Date field.`);
    }

    return {
      legacyId,
      title,
      date,
      status: parseLegacyField(section, 'Status') ?? 'proposed',
      body: section,
    };
  });
}

function assertSafeLegacyDelete(
  legacyIndexIds: string[],
  sections: LegacyDecisionSection[],
): void {
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

  const mappings = sections.map((section) => {
    const id = generateDecisionId(section.title, section.date);
    return {
      legacyId: section.legacyId,
      id,
      title: section.title,
      date: section.date,
      filePath: join(decisionsRoot, `${id}.md`),
    };
  });

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

  await initializeDecisionRecords(decisionsRoot);

  const written: string[] = [];
  for (const [index, section] of sections.entries()) {
    const mapping = mappings[index]!;
    await writeFile(
      mapping.filePath,
      renderMigratedRecord(section, mapping.id),
      {
        encoding: 'utf8',
        flag: 'wx',
      },
    );
    written.push(mapping.filePath);
  }

  await regenerateDecisionIndex(decisionsRoot);

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
