import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { copyDirectory, copySingleFile, dirExists, fileExists } from '@fs/io';

export const IDEA_SKILLS = [
  'oat-idea-new',
  'oat-idea-ideate',
  'oat-idea-summarize',
  'oat-idea-scratchpad',
] as const;

const INFRA_FILE_MAPPINGS = [
  { src: 'ideas-backlog.md', dest: '.oat/ideas/backlog.md' },
  { src: 'ideas-scratchpad.md', dest: '.oat/ideas/scratchpad.md' },
] as const;

const RUNTIME_TEMPLATE_MAPPINGS = [
  { src: 'idea-discovery.md', dest: '.oat/templates/ideas/idea-discovery.md' },
  { src: 'idea-summary.md', dest: '.oat/templates/ideas/idea-summary.md' },
] as const;

export interface InstallIdeasOptions {
  assetsRoot: string;
  targetRoot: string;
  force?: boolean;
}

export interface InstallIdeasResult {
  copiedSkills: string[];
  updatedSkills: string[];
  skippedSkills: string[];
  copiedInfraFiles: string[];
  updatedInfraFiles: string[];
  skippedInfraFiles: string[];
  copiedTemplates: string[];
  updatedTemplates: string[];
  skippedTemplates: string[];
}

async function pathExists(path: string): Promise<boolean> {
  return (await fileExists(path)) || (await dirExists(path));
}

async function copySkill(
  source: string,
  destination: string,
  force: boolean,
): Promise<'copied' | 'updated' | 'skipped'> {
  const exists = await pathExists(destination);

  if (exists && !force) {
    return 'skipped';
  }

  if (exists && force) {
    await rm(destination, { recursive: true, force: true });
    await copyDirectory(source, destination);
    return 'updated';
  }

  await copyDirectory(source, destination);
  return 'copied';
}

async function copyFile(
  source: string,
  destination: string,
  force: boolean,
): Promise<'copied' | 'updated' | 'skipped'> {
  const exists = await pathExists(destination);

  if (exists && !force) {
    return 'skipped';
  }

  if (exists && force) {
    await rm(destination, { recursive: true, force: true });
    await copySingleFile(source, destination);
    return 'updated';
  }

  await copySingleFile(source, destination);
  return 'copied';
}

export async function installIdeas(
  options: InstallIdeasOptions,
): Promise<InstallIdeasResult> {
  const force = options.force ?? false;
  const ideasTemplatesRoot = join(options.assetsRoot, 'templates', 'ideas');

  const result: InstallIdeasResult = {
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
    copiedInfraFiles: [],
    updatedInfraFiles: [],
    skippedInfraFiles: [],
    copiedTemplates: [],
    updatedTemplates: [],
    skippedTemplates: [],
  };

  for (const skill of IDEA_SKILLS) {
    const source = join(options.assetsRoot, 'skills', skill);
    const destination = join(options.targetRoot, '.agents', 'skills', skill);
    const status = await copySkill(source, destination, force);

    if (status === 'copied') {
      result.copiedSkills.push(skill);
    } else if (status === 'updated') {
      result.updatedSkills.push(skill);
    } else {
      result.skippedSkills.push(skill);
    }
  }

  for (const mapping of INFRA_FILE_MAPPINGS) {
    const source = join(ideasTemplatesRoot, mapping.src);
    const destination = join(options.targetRoot, mapping.dest);
    const status = await copyFile(source, destination, force);

    if (status === 'copied') {
      result.copiedInfraFiles.push(mapping.dest);
    } else if (status === 'updated') {
      result.updatedInfraFiles.push(mapping.dest);
    } else {
      result.skippedInfraFiles.push(mapping.dest);
    }
  }

  for (const mapping of RUNTIME_TEMPLATE_MAPPINGS) {
    const source = join(ideasTemplatesRoot, mapping.src);
    const destination = join(options.targetRoot, mapping.dest);
    const status = await copyFile(source, destination, force);

    if (status === 'copied') {
      result.copiedTemplates.push(mapping.dest);
    } else if (status === 'updated') {
      result.updatedTemplates.push(mapping.dest);
    } else {
      result.skippedTemplates.push(mapping.dest);
    }
  }

  return result;
}
