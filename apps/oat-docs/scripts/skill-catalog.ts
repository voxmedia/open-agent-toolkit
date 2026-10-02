import { lstat, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { PackDefinition } from '@oat-repo/pack-manifest';
import { format } from 'oxfmt';

import {
  loadSkillMapping,
  validateSkillMapping,
  type SkillMappingValidation,
} from './skill-mapping';

const startMarker = '<!-- oat:skill-catalog:start -->';
const endMarker = '<!-- oat:skill-catalog:end -->';

function markdownText(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .trim()
    .replace(
      /[&<>\\`*_[\]{}()#!|]/g,
      (character) => `&#${character.charCodeAt(0)};`,
    );
}

function compare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function declared(value: boolean | null): string {
  return value === null ? 'not declared' : String(value);
}

export async function renderSkillCatalog(
  validation: SkillMappingValidation,
  catalogPage = 'skills/index.md',
): Promise<string> {
  if (validation.pendingAnchors.length)
    throw new Error('Cannot generate a catalog with pending guide anchors');
  const families = [
    ...new Set(validation.mapping.skills.map((skill) => skill.family)),
  ].sort(compare);
  const inventory = new Map(
    validation.inventory.map((skill) => [skill.name, skill]),
  );
  const lines = [
    startMarker,
    '',
    'Generated from canonical skill metadata and the reviewed guide mapping. Do not edit this block; run `pnpm docs:skills:generate` after changing those sources.',
    '',
    'Follow a skill name for its invocation, prerequisites, scenario and output. Project applicability describes existing-project prerequisites; conditional details are in each guide.',
    '',
    'Visibility reports source metadata: “user” is `user-invocable` and “model disabled” is `disable-model-invocation`. “Not declared” is not an explicit visibility setting.',
  ];
  for (const family of families) {
    lines.push(
      '',
      `### ${markdownText(family)}`,
      '',
      '| Skill | Description | Visibility | Project applicability |',
      '| --- | --- | --- | --- |',
    );
    const guides = validation.mapping.skills
      .filter((skill) => skill.family === family)
      .sort((left, right) => compare(left.name, right.name));
    for (const guide of guides) {
      const skill = inventory.get(guide.name);
      if (!skill?.eligible)
        throw new Error(
          `Catalog requires eligible canonical metadata for ${guide.name}`,
        );
      const page = posix.relative(posix.dirname(catalogPage), guide.page);
      const applicability = {
        required: 'Requires project',
        optional: 'Project optional',
        none: 'No existing project required',
      }[guide.applicability];
      const visibility = `user: ${declared(skill.userInvocable)}; model disabled: ${declared(skill.disableModelInvocation)}`;
      lines.push(
        `| [\`${skill.name}\`](${page || posix.basename(guide.page)}#${guide.anchor}) | ${markdownText(skill.description)} | ${markdownText(visibility)} | ${applicability} |`,
      );
    }
  }
  lines.push('', endMarker);
  const result = await format(catalogPage, lines.join('\n'), {
    proseWrap: 'preserve',
  });
  if (result.errors.length)
    throw new Error(`Catalog formatting failed: ${result.errors[0]!.message}`);
  return result.code.trimEnd();
}

function replaceCatalog(markdown: string, block: string): string {
  const starts = [
    ...markdown.matchAll(/^<!-- oat:skill-catalog:start -->(?=\r?$)/gm),
  ];
  const ends = [
    ...markdown.matchAll(/^<!-- oat:skill-catalog:end -->(?=\r?$)/gm),
  ];
  if (
    starts.length !== 1 ||
    ends.length !== 1 ||
    starts[0]!.index >= ends[0]!.index
  )
    throw new Error(
      'Catalog page must contain exactly one ordered pair of standalone skill-catalog markers',
    );
  const newline = markdown.includes('\r\n') ? '\r\n' : '\n';
  return (
    markdown.slice(0, starts[0]!.index) +
    block.replace(/\n/g, newline) +
    markdown.slice(ends[0]!.index + endMarker.length)
  );
}

export async function updateSkillCatalog({
  repoRoot,
  docsRoot,
  mappingPath,
  catalogPath = join(docsRoot, 'skills/index.md'),
  mode,
  manifest,
}: {
  repoRoot: string;
  docsRoot: string;
  mappingPath: string;
  catalogPath?: string;
  mode: 'write' | 'check';
  manifest?: readonly PackDefinition[];
}): Promise<{ changed: boolean; skillCount: number }> {
  const catalogPage = relative(docsRoot, catalogPath).split(sep).join('/');
  if (
    !catalogPage ||
    catalogPage.startsWith('../') ||
    catalogPage === '..' ||
    !catalogPage.endsWith('.md')
  )
    throw new Error('Catalog must be a Markdown page inside the docs root');
  let path = resolve(docsRoot);
  for (const segment of catalogPage.split('/')) {
    if ((await lstat(path)).isSymbolicLink())
      throw new Error('Catalog path must not traverse symlinks');
    path = join(path, segment);
  }
  if (!(await lstat(path)).isFile())
    throw new Error('Catalog must be a real Markdown file');
  const validation = await validateSkillMapping({
    repoRoot,
    docsRoot,
    mapping: await loadSkillMapping(mappingPath),
    manifest,
  });
  const original = await readFile(catalogPath, 'utf8');
  const generated = replaceCatalog(
    original,
    await renderSkillCatalog(validation, catalogPage),
  );
  const changed = original !== generated;
  if (changed && mode === 'check')
    throw new Error(
      'Committed skill catalog is stale; run pnpm docs:skills:generate',
    );
  if (changed) await writeFile(catalogPath, generated);
  return { changed, skillCount: validation.mapping.skills.length };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !['--write', '--check'].includes(args[0]!))
    throw new Error(
      'Usage: docs:skills:generate (--write) or docs:skills:check (--check)',
    );
  const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const result = await updateSkillCatalog({
    repoRoot: resolve(appRoot, '..', '..'),
    docsRoot: join(appRoot, 'docs'),
    mappingPath: join(appRoot, 'skill-docs.json'),
    mode: args[0] === '--write' ? 'write' : 'check',
  });
  console.log(
    `Skill catalog ${result.changed ? 'generated' : 'current'}: ${result.skillCount} skills.`,
  );
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
