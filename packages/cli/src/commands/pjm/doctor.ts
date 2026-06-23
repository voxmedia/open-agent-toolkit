import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import type { DoctorCheck } from '@ui/output';

import { CANONICAL_REPO_REFERENCE_PATHS } from './init';

const ALLOWED_TOP_LEVEL_DIRECTORIES = new Set([
  'pjm',
  'reference',
  'knowledge',
  'analysis',
  'reviews',
]);
const ALLOWED_TOP_LEVEL_FILES = new Set(['AGENTS.md']);
const LEGACY_MONOLITHS = ['reference/decision-record.md'] as const;

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : null;

    if (code !== 'ENOENT') {
      throw error;
    }

    return false;
  }
}

async function readIfExists(path: string): Promise<string | null> {
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

async function listDirectoryNames(path: string): Promise<string[]> {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() || entry.isFile())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : null;

    if (code !== 'ENOENT') {
      throw error;
    }

    return [];
  }
}

function containsTemplateFrontmatter(content: string): boolean {
  const frontmatter = getFrontmatterBlock(content);
  return Boolean(
    frontmatter &&
    (/\boat_template\s*:/i.test(frontmatter) ||
      /\boat_template_name\s*:/i.test(frontmatter)),
  );
}

function checkStatus(missing: string[]): 'pass' | 'fail' {
  return missing.length === 0 ? 'pass' : 'fail';
}

function warnStatus(items: string[]): 'pass' | 'warn' {
  return items.length === 0 ? 'pass' : 'warn';
}

export async function runPjmDoctorChecks(
  repoRoot: string,
): Promise<DoctorCheck[]> {
  const checks: DoctorCheck[] = [];

  const missingCanonical: string[] = [];
  for (const relativePath of CANONICAL_REPO_REFERENCE_PATHS) {
    if (!(await pathExists(join(repoRoot, relativePath)))) {
      missingCanonical.push(relativePath);
    }
  }
  checks.push({
    name: 'pjm:canonical_files',
    description: 'PJM canonical file existence',
    status: checkStatus(missingCanonical),
    message:
      missingCanonical.length === 0
        ? 'Canonical PJM files are present.'
        : `Missing canonical PJM files: ${missingCanonical.join(', ')}`,
    fix:
      missingCanonical.length === 0
        ? undefined
        : 'Run `oat pjm init` to restore the canonical PJM scaffold.',
  });

  const templateFrontmatterFiles: string[] = [];
  for (const relativePath of CANONICAL_REPO_REFERENCE_PATHS) {
    if (!relativePath.endsWith('.md')) {
      continue;
    }
    const content = await readIfExists(join(repoRoot, relativePath));
    if (content && containsTemplateFrontmatter(content)) {
      templateFrontmatterFiles.push(relativePath);
    }
  }
  checks.push({
    name: 'pjm:template_frontmatter',
    description: 'Instantiated PJM files are not raw templates',
    status: checkStatus(templateFrontmatterFiles),
    message:
      templateFrontmatterFiles.length === 0
        ? 'No template frontmatter found in canonical PJM files.'
        : `Template frontmatter still present in: ${templateFrontmatterFiles.join(', ')}`,
    fix:
      templateFrontmatterFiles.length === 0
        ? undefined
        : 'Regenerate or manually remove oat_template frontmatter from instantiated files.',
  });

  const topLevelNames = await listDirectoryNames(repoRoot);
  const unknownTopLevel = topLevelNames.filter(
    (name) =>
      !ALLOWED_TOP_LEVEL_DIRECTORIES.has(name) &&
      !ALLOWED_TOP_LEVEL_FILES.has(name),
  );
  checks.push({
    name: 'pjm:top_level_layout',
    description: 'PJM top-level repo-reference layout',
    status: warnStatus(unknownTopLevel),
    message:
      unknownTopLevel.length === 0
        ? 'No unknown top-level PJM folders or files found.'
        : `Unknown top-level PJM entries: ${unknownTopLevel.join(', ')}`,
    fix:
      unknownTopLevel.length === 0
        ? undefined
        : 'Move ad-hoc durable references under reference/ or document an allowed top-level folder.',
  });

  const legacyMonoliths: string[] = [];
  for (const relativePath of LEGACY_MONOLITHS) {
    if (await pathExists(join(repoRoot, relativePath))) {
      legacyMonoliths.push(relativePath);
    }
  }
  checks.push({
    name: 'pjm:legacy_monoliths',
    description: 'Legacy PJM monolith files',
    status: warnStatus(legacyMonoliths),
    message:
      legacyMonoliths.length === 0
        ? 'No legacy PJM monolith files found.'
        : `Legacy PJM monoliths still present: ${legacyMonoliths.join(', ')}`,
    fix:
      legacyMonoliths.length === 0
        ? undefined
        : 'Run `oat decision migrate` or keep the file explicitly documented as legacy.',
  });

  const referenceEntries = await listDirectoryNames(
    join(repoRoot, 'reference'),
  );
  const looseReferenceFiles = referenceEntries
    .filter((name) => name.endsWith('.md'))
    .filter(
      (name) =>
        name !== 'AGENTS.md' &&
        name !== 'decision-record.md' &&
        name !== 'roadmap.md' &&
        name !== 'current-state.md',
    )
    .map((name) => `reference/${name}`);
  checks.push({
    name: 'pjm:loose_reference_files',
    description: 'Loose reference files outside documented destinations',
    status: warnStatus(looseReferenceFiles),
    message:
      looseReferenceFiles.length === 0
        ? 'No loose reference files found.'
        : `Loose reference files found: ${looseReferenceFiles.join(', ')}`,
    fix:
      looseReferenceFiles.length === 0
        ? undefined
        : 'Move loose files into a documented reference subfolder or add a destination guide.',
  });

  const secondRoadmaps: string[] = [];
  for (const relativePath of [
    'reference/roadmap.md',
    'reference/current-state.md',
  ]) {
    if (await pathExists(join(repoRoot, relativePath))) {
      secondRoadmaps.push(relativePath);
    }
  }
  checks.push({
    name: 'pjm:second_roadmap',
    description: 'Duplicate active PJM files under reference',
    status: warnStatus(secondRoadmaps),
    message:
      secondRoadmaps.length === 0
        ? 'No duplicate roadmap/current-state files found under reference/.'
        : `Duplicate active PJM files under reference/: ${secondRoadmaps.join(', ')}`,
    fix:
      secondRoadmaps.length === 0
        ? undefined
        : 'Move active operational docs to pjm/ and leave reference/ for durable append-mostly artifacts.',
  });

  return checks;
}
