import { chmod, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import {
  copyDirWithStatus,
  copyFileWithStatus,
} from '@commands/init/tools/shared/copy-helpers';
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
  'oat-project-promote-full',
  'oat-project-quick-start',
  'oat-project-review-provide',
  'oat-project-review-receive',
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
  };

  for (const skill of WORKFLOW_SKILLS) {
    const source = join(options.assetsRoot, 'skills', skill);
    const destination = join(options.targetRoot, '.agents', 'skills', skill);
    const status = await copyDirWithStatus(source, destination, force);

    if (status === 'copied') {
      result.copiedSkills.push(skill);
    } else if (status === 'updated') {
      result.updatedSkills.push(skill);
    } else {
      result.skippedSkills.push(skill);
    }
  }

  for (const agent of WORKFLOW_AGENTS) {
    const source = join(options.assetsRoot, 'agents', agent);
    const destination = join(options.targetRoot, '.agents', 'agents', agent);
    const status = await copyFileWithStatus(source, destination, force);

    if (status === 'copied') {
      result.copiedAgents.push(agent);
    } else if (status === 'updated') {
      result.updatedAgents.push(agent);
    } else {
      result.skippedAgents.push(agent);
    }
  }

  for (const template of WORKFLOW_TEMPLATES) {
    const source = join(options.assetsRoot, 'templates', template);
    const destination = join(options.targetRoot, '.oat', 'templates', template);
    const status = await copyFileWithStatus(source, destination, force);

    if (status === 'copied') {
      result.copiedTemplates.push(template);
    } else if (status === 'updated') {
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

    const status = await copyFileWithStatus(source, destination, force);
    if (status !== 'skipped') {
      await chmod(destination, 0o755);
    }

    if (status === 'copied') {
      result.copiedScripts.push(script);
    } else if (status === 'updated') {
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

  return result;
}
