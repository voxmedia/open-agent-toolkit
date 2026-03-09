import { chmod, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  copyDirWithVersionCheck,
  copyFileWithStatus,
} from '@commands/init/tools/shared/copy-helpers';
import {
  WORKFLOW_AGENTS,
  WORKFLOW_SCRIPTS,
  WORKFLOW_SKILLS,
  WORKFLOW_TEMPLATES,
} from '@commands/init/tools/shared/skill-manifest';
import { readOatConfig, writeOatConfig } from '@config/oat-config';
import { dirExists, ensureDir, fileExists } from '@fs/io';

export {
  WORKFLOW_AGENTS,
  WORKFLOW_SCRIPTS,
  WORKFLOW_SKILLS,
  WORKFLOW_TEMPLATES,
};

export interface InstallWorkflowsOptions {
  assetsRoot: string;
  targetRoot: string;
  force?: boolean;
}

export interface InstallWorkflowsResult {
  copiedSkills: string[];
  updatedSkills: string[];
  skippedSkills: string[];
  outdatedSkills: Array<{
    name: string;
    installed: string | null;
    bundled: string | null;
  }>;
  copiedAgents: string[];
  updatedAgents: string[];
  skippedAgents: string[];
  copiedTemplates: string[];
  updatedTemplates: string[];
  skippedTemplates: string[];
  copiedScripts: string[];
  updatedScripts: string[];
  skippedScripts: string[];
  projectsRootInitialized: boolean;
  projectsRootConfigInitialized: boolean;
  projectsDirsScaffolded: boolean;
  resolvedProjectsRoot: string;
}

export async function installWorkflows(
  options: InstallWorkflowsOptions,
): Promise<InstallWorkflowsResult> {
  const force = options.force ?? false;

  const result: InstallWorkflowsResult = {
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
    outdatedSkills: [],
    copiedAgents: [],
    updatedAgents: [],
    skippedAgents: [],
    copiedTemplates: [],
    updatedTemplates: [],
    skippedTemplates: [],
    copiedScripts: [],
    updatedScripts: [],
    skippedScripts: [],
    projectsRootInitialized: false,
    projectsRootConfigInitialized: false,
    projectsDirsScaffolded: false,
    resolvedProjectsRoot: '',
  };

  for (const skill of WORKFLOW_SKILLS) {
    const source = join(options.assetsRoot, 'skills', skill);
    const destination = join(options.targetRoot, '.agents', 'skills', skill);
    const copyResult = await copyDirWithVersionCheck(
      source,
      destination,
      force,
    );

    if (copyResult.status === 'copied') {
      result.copiedSkills.push(skill);
    } else if (copyResult.status === 'updated') {
      result.updatedSkills.push(skill);
    } else if (copyResult.status === 'outdated') {
      result.outdatedSkills.push({
        name: skill,
        installed: copyResult.installedVersion ?? null,
        bundled: copyResult.bundledVersion ?? null,
      });
    } else {
      result.skippedSkills.push(skill);
    }
  }

  for (const agent of WORKFLOW_AGENTS) {
    const source = join(options.assetsRoot, 'agents', agent);
    const destination = join(options.targetRoot, '.agents', 'agents', agent);
    const copyStatus = await copyFileWithStatus(source, destination, force);

    if (copyStatus === 'copied') {
      result.copiedAgents.push(agent);
    } else if (copyStatus === 'updated') {
      result.updatedAgents.push(agent);
    } else {
      result.skippedAgents.push(agent);
    }
  }

  for (const template of WORKFLOW_TEMPLATES) {
    const source = join(options.assetsRoot, 'templates', template);
    const destination = join(options.targetRoot, '.oat', 'templates', template);
    const copyStatus = await copyFileWithStatus(source, destination, force);

    if (copyStatus === 'copied') {
      result.copiedTemplates.push(template);
    } else if (copyStatus === 'updated') {
      result.updatedTemplates.push(template);
    } else {
      result.skippedTemplates.push(template);
    }
  }

  for (const script of WORKFLOW_SCRIPTS) {
    const source = join(options.assetsRoot, 'scripts', script);
    const destination = join(options.targetRoot, '.oat', 'scripts', script);
    const sourceExists = await fileExists(source);

    if (!sourceExists) {
      result.skippedScripts.push(script);
      continue;
    }

    const copyStatus = await copyFileWithStatus(source, destination, force);
    if (copyStatus !== 'skipped') {
      await chmod(destination, 0o755);
    }

    if (copyStatus === 'copied') {
      result.copiedScripts.push(script);
    } else if (copyStatus === 'updated') {
      result.updatedScripts.push(script);
    } else {
      result.skippedScripts.push(script);
    }
  }

  const projectsRootPath = join(options.targetRoot, '.oat', 'projects-root');
  const hasProjectsRoot = await fileExists(projectsRootPath);
  if (!hasProjectsRoot) {
    await ensureDir(dirname(projectsRootPath));
    await writeFile(projectsRootPath, '.oat/projects/shared\n', 'utf8');
    result.projectsRootInitialized = true;
  }

  const config = await readOatConfig(options.targetRoot);
  if (!config.projects?.root?.trim()) {
    await writeOatConfig(options.targetRoot, {
      ...config,
      projects: { root: '.oat/projects/shared' },
    });
    result.projectsRootConfigInitialized = true;
  }

  const effectiveRoot = config.projects?.root?.trim() || '.oat/projects/shared';
  result.resolvedProjectsRoot = effectiveRoot;
  const sharedDir = join(options.targetRoot, effectiveRoot);
  const projectsBase = dirname(sharedDir);
  const localGitkeep = join(projectsBase, 'local', '.gitkeep');
  const archivedGitkeep = join(projectsBase, 'archived', '.gitkeep');

  const sharedExists = await dirExists(sharedDir);
  if (!sharedExists) {
    await ensureDir(sharedDir);
    await ensureDir(dirname(localGitkeep));
    await ensureDir(dirname(archivedGitkeep));
    if (!(await fileExists(localGitkeep))) {
      await writeFile(localGitkeep, '', 'utf8');
    }
    if (!(await fileExists(archivedGitkeep))) {
      await writeFile(archivedGitkeep, '', 'utf8');
    }
    result.projectsDirsScaffolded = true;
  }

  return result;
}
