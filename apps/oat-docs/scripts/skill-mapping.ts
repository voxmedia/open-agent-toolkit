import { lstat, readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { markdownAnchors } from '@oat-repo/nav-markdown';
import { PACK_MANIFEST, type PackDefinition } from '@oat-repo/pack-manifest';
import YAML from 'yaml';

export type ProjectApplicability = 'required' | 'optional' | 'none';

export interface SkillGuide {
  name: string;
  family: string;
  page: string;
  anchor: string;
  applicability: ProjectApplicability;
  applicabilityNotes: string;
}

export interface SkillExclusion {
  name: string;
  reason: string;
}

export interface SkillMapping {
  version: 1;
  skills: SkillGuide[];
  excluded: SkillExclusion[];
}

export interface CanonicalSkill {
  name: string;
  description: string;
  userInvocable: boolean | null;
  disableModelInvocation: boolean | null;
  packs: string[];
  sourcePath: string;
  eligible: boolean;
  exclusionReasons: string[];
}

export interface SkillMappingValidation {
  mapping: SkillMapping;
  inventory: CanonicalSkill[];
  pendingAnchors: string[];
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  keys: string[],
  label: string,
): void {
  if (
    Object.keys(value).length !== keys.length ||
    keys.some((key) => !Object.hasOwn(value, key))
  )
    throw new Error(`${label} must contain exactly: ${keys.join(', ')}`);
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim())
    throw new Error(`${label} must be a nonempty trimmed string`);
  return value;
}

export function parseSkillMapping(input: unknown): SkillMapping {
  const mapping = object(input, 'Skill mapping');
  exactKeys(mapping, ['version', 'skills', 'excluded'], 'Skill mapping');
  if (mapping.version !== 1)
    throw new Error('Unsupported skill mapping version');
  if (!Array.isArray(mapping.skills) || !Array.isArray(mapping.excluded))
    throw new Error('Skill mapping skills and excluded must be arrays');
  const skills = mapping.skills.map((value, index): SkillGuide => {
    const label = `skills[${index}]`;
    const entry = object(value, label);
    exactKeys(
      entry,
      [
        'name',
        'family',
        'page',
        'anchor',
        'applicability',
        'applicabilityNotes',
      ],
      label,
    );
    const name = string(entry.name, `${label}.name`);
    const family = string(entry.family, `${label}.family`);
    const page = string(entry.page, `${label}.page`);
    const anchor = string(entry.anchor, `${label}.anchor`);
    const applicabilityNotes = string(
      entry.applicabilityNotes,
      `${label}.applicabilityNotes`,
    );
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))
      throw new Error(`${label}.name must be a canonical skill name`);
    if (
      !/^(?:[a-z0-9-]+\/)*[a-z0-9-]+\.md$/.test(page) ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(anchor)
    )
      throw new Error(
        `${label} must use a docs-relative Markdown page and stable anchor`,
      );
    if (
      typeof entry.applicability !== 'string' ||
      !['required', 'optional', 'none'].includes(entry.applicability)
    )
      throw new Error(
        `${label}.applicability must be required, optional or none`,
      );
    return {
      name,
      family,
      page,
      anchor,
      applicability: entry.applicability as ProjectApplicability,
      applicabilityNotes,
    };
  });
  const excluded = mapping.excluded.map((value, index): SkillExclusion => {
    const label = `excluded[${index}]`;
    const entry = object(value, label);
    exactKeys(entry, ['name', 'reason'], label);
    return {
      name: string(entry.name, `${label}.name`),
      reason: string(entry.reason, `${label}.reason`),
    };
  });
  return { version: 1, skills, excluded };
}

export async function loadSkillMapping(path: string): Promise<SkillMapping> {
  return parseSkillMapping(JSON.parse(await readFile(path, 'utf8')));
}

export async function readSkillInventory(
  repoRoot: string,
  manifest: readonly PackDefinition[] = PACK_MANIFEST,
): Promise<CanonicalSkill[]> {
  const root = join(repoRoot, '.agents/skills');
  const shipped = new Map<string, string[]>();
  for (const pack of manifest) {
    for (const asset of pack.assets) {
      if (asset.kind !== 'skill') continue;
      if (!asset.source || !/^skills\/[a-z0-9-]+$/.test(asset.source))
        throw new Error(
          `Pack ${pack.name} has unsupported skill source ${asset.source}`,
        );
      const name = asset.source.slice('skills/'.length);
      const packs = shipped.get(name) ?? [];
      packs.push(pack.name);
      shipped.set(name, packs);
    }
  }
  const inventory: CanonicalSkill[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isSymbolicLink())
      throw new Error(`Canonical skill ${entry.name} must be a real directory`);
    if (!entry.isDirectory()) continue;
    const sourcePath = `.agents/skills/${entry.name}/SKILL.md`;
    const path = join(repoRoot, sourcePath);
    if (!(await lstat(path)).isFile())
      throw new Error(`${sourcePath} must be a real skill source`);
    const content = await readFile(path, 'utf8');
    const block = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content)?.[1];
    if (block === undefined)
      throw new Error(`${sourcePath} has no frontmatter`);
    const document = YAML.parseDocument(block, { uniqueKeys: true });
    if (document.errors.length)
      throw new Error(
        `${sourcePath} has malformed frontmatter: ${document.errors[0]!.message}`,
      );
    const metadata = object(document.toJS(), sourcePath);
    const name = string(metadata.name, `${sourcePath} name`);
    const description = string(
      typeof metadata.description === 'string'
        ? metadata.description.trim()
        : metadata.description,
      `${sourcePath} description`,
    );
    if (name !== entry.name)
      throw new Error(
        `${sourcePath} name does not match canonical directory ${entry.name}`,
      );
    for (const field of ['user-invocable', 'disable-model-invocation']) {
      if (metadata[field] !== undefined && typeof metadata[field] !== 'boolean')
        throw new Error(`${sourcePath} ${field} must be boolean when declared`);
    }
    const packs = shipped.get(name) ?? [];
    const exclusionReasons: string[] = [];
    if (!packs.length) exclusionReasons.push('currently-unshipped');
    if (/^Retired(?:\b|[.:])/i.test(description))
      exclusionReasons.push('retired');
    if (metadata['user-invocable'] === false)
      exclusionReasons.push('not-user-invocable');
    inventory.push({
      name,
      description,
      userInvocable:
        (metadata['user-invocable'] as boolean | undefined) ?? null,
      disableModelInvocation:
        (metadata['disable-model-invocation'] as boolean | undefined) ?? null,
      packs,
      sourcePath,
      eligible: exclusionReasons.length === 0,
      exclusionReasons,
    });
  }
  for (const name of shipped.keys()) {
    if (!inventory.some((skill) => skill.name === name))
      throw new Error(`Shipped skill ${name} has no real canonical directory`);
  }
  return inventory.sort((left, right) => left.name.localeCompare(right.name));
}

async function readOwnerPage(
  docsRoot: string,
  page: string,
): Promise<string | null> {
  let path = docsRoot;
  for (const segment of page.split('/')) {
    path = join(path, segment);
    const info = await lstat(path).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!info) return null;
    if (info.isSymbolicLink())
      throw new Error(`Guide ${page} must not traverse symlinks`);
    if (segment === page.split('/').at(-1)) {
      if (!info.isFile())
        throw new Error(`Guide ${page} must be a Markdown file`);
    } else if (!info.isDirectory())
      throw new Error(`Guide ${page} has a non-directory parent`);
  }
  return readFile(path, 'utf8');
}

export async function validateSkillMapping({
  repoRoot,
  docsRoot,
  mapping: input,
  allowPendingAnchors = false,
  manifest = PACK_MANIFEST,
}: {
  repoRoot: string;
  docsRoot: string;
  mapping: unknown;
  allowPendingAnchors?: boolean;
  manifest?: readonly PackDefinition[];
}): Promise<SkillMappingValidation> {
  const mapping = parseSkillMapping(input);
  const inventory = await readSkillInventory(repoRoot, manifest);
  const names = new Set<string>();
  const owners = new Set<string>();
  const errors: string[] = [];
  for (const entry of [...mapping.skills, ...mapping.excluded]) {
    if (names.has(entry.name))
      errors.push(`Duplicate accounting for ${entry.name}`);
    names.add(entry.name);
    const skill = inventory.find((candidate) => candidate.name === entry.name);
    if (!skill) errors.push(`Phantom skill ${entry.name}`);
    else if ('page' in entry && !skill.eligible)
      errors.push(
        `Ineligible skill ${entry.name} cannot own a guide (${skill.exclusionReasons.join(', ')})`,
      );
    else if (!('page' in entry) && skill.eligible)
      errors.push(`Eligible skill ${entry.name} cannot be excluded`);
    if ('page' in entry) {
      const owner = `${entry.page}#${entry.anchor}`;
      if (owners.has(owner)) errors.push(`Duplicate guide ownership ${owner}`);
      owners.add(owner);
    }
  }
  for (const skill of inventory) {
    if (!names.has(skill.name))
      errors.push(
        `Missing ${skill.eligible ? 'guide' : 'exclusion'} for ${skill.name}`,
      );
  }
  if (errors.length) throw new Error(errors.join('\n'));
  const pendingAnchors: string[] = [];
  const pages = new Map<string, Set<string> | null>();
  for (const entry of mapping.skills) {
    if (!pages.has(entry.page)) {
      const content = await readOwnerPage(docsRoot, entry.page);
      pages.set(entry.page, content === null ? null : markdownAnchors(content));
    }
    if (!pages.get(entry.page)?.has(entry.anchor)) {
      const target = `${entry.page}#${entry.anchor}`;
      if (allowPendingAnchors) pendingAnchors.push(target);
      else errors.push(`Missing guide anchor ${target}`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return { mapping, inventory, pendingAnchors };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--allow-pending-anchors') || args.length > 1)
    throw new Error('Usage: docs:skills:validate [--allow-pending-anchors]');
  const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const result = await validateSkillMapping({
    repoRoot: resolve(appRoot, '..', '..'),
    docsRoot: join(appRoot, 'docs'),
    mapping: await loadSkillMapping(join(appRoot, 'skill-docs.json')),
    allowPendingAnchors: args.includes('--allow-pending-anchors'),
  });
  console.log(
    `Validated ${result.mapping.skills.length} eligible skills and ${result.mapping.excluded.length} exclusions from ${result.inventory.length} canonical directories.`,
  );
  for (const target of result.pendingAnchors)
    console.log(`Pending anchor: ${target}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
