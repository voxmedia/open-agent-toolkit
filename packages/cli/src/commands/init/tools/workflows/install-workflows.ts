import { chmod, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  copyDirWithStatus,
  copyFileWithStatus,
} from '@commands/init/tools/shared/copy-helpers';
import { readOatConfig, writeOatConfig } from '@config/oat-config';
import { ensureDir, fileExists } from '@fs/io';

export const WORKFLOW_SKILLS = [
  'oat-project-clear-active',
  'oat-project-complete',
  'oat-project-design',
  'oat-project-discover',
  'oat-project-implement',
  'oat-project-import-plan',
  'oat-project-new',
  'oat-project-open',
  'oat-project-plan',
  'oat-project-plan-writing',
  'oat-project-pr-final',
  'oat-project-pr-progress',
  'oat-project-progress',
  'oat-project-promote-spec-driven',
  'oat-project-quick-start',
  'oat-project-review-provide',
  'oat-project-review-receive',
  'oat-project-review-receive-remote',
  'oat-project-spec',
  'oat-repo-knowledge-index',
  'oat-worktree-bootstrap',
] as const;

export const WORKFLOW_AGENTS = [
  'oat-codebase-mapper.md',
  'oat-reviewer.md',
] as const;

export const WORKFLOW_TEMPLATES = [
  'state.md',
  'discovery.md',
  'spec.md',
  'design.md',
  'plan.md',
  'implementation.md',
] as const;

export const WORKFLOW_SCRIPTS = [
  'generate-oat-state.sh',
  'generate-thin-index.sh',
] as const;

export interface InstallWorkflowsOptions {
  assetsRoot: string;
  targetRoot: string;
  force?: boolean;
}

export interface InstallWorkflowsResult {
  copiedSkills: string[];
  updatedSkills: string[];
  skippedSkills: string[];
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
}

export async function installWorkflows(
  options: InstallWorkflowsOptions,
): Promise<InstallWorkflowsResult> {
  const force = options.force ?? false;

  const result: InstallWorkflowsResult = {
    copiedSkills: [],
    updatedSkills: [],
    skippedSkills: [],
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
  };

  for (const skill of WORKFLOW_SKILLS) {
    const source = join(options.assetsRoot, 'skills', skill);
    const destination = join(options.targetRoot, '.agents', 'skills', skill);
    const copyStatus = await copyDirWithStatus(source, destination, force);

    if (copyStatus === 'copied') {
      result.copiedSkills.push(skill);
    } else if (copyStatus === 'updated') {
      result.updatedSkills.push(skill);
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

  return result;
}
