import { execSync } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { parseFrontmatterField } from '@commands/shared/frontmatter';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import { ensureDir, fileExists } from '@fs/io';

export interface GitOperations {
  isGitRepo(root: string): boolean;
  diffFileCount(root: string, sha: string): number;
}

export interface GenerateStateOptions {
  repoRoot: string;
  env?: NodeJS.ProcessEnv;
  today?: string;
  git?: GitOperations;
}

export interface GenerateStateResult {
  dashboardPath: string;
  projectName: string | null;
  projectStatus: string;
  stalenessStatus: string;
  recommendedStep: string;
  recommendedReason: string;
}

interface ProjectState {
  phase: string;
  phaseStatus: string;
  currentTask: string;
  lifecycle: string;
  blockers: string;
  hilCheckpoints: string;
  hilCompleted: string;
  hilStatus: string;
  workflowMode: string;
}

interface ActiveProject {
  name: string;
  path: string;
  status: string;
}

interface KnowledgeStatus {
  generatedAt: string;
  mergeBaseSha: string;
  status: string;
}

interface StalenessInfo {
  filesChanged: number;
  ageDays: number;
  status: string;
}

const defaultGit: GitOperations = {
  isGitRepo(root: string): boolean {
    try {
      execSync('git rev-parse --git-dir', {
        cwd: root,
        stdio: 'pipe',
      });
      return true;
    } catch {
      return false;
    }
  },
  diffFileCount(root: string, sha: string): number {
    try {
      const output = execSync(`git diff --name-only ${sha} HEAD`, {
        cwd: root,
        stdio: 'pipe',
        encoding: 'utf8',
      });
      if (!output.trim()) return 0;
      return output.trim().split('\n').length;
    } catch {
      return 0;
    }
  },
};

async function hasAnyProjects(projectsRoot: string): Promise<boolean> {
  try {
    const entries = await readdir(projectsRoot, { withFileTypes: true });
    return entries.some((e) => e.isDirectory());
  } catch {
    return false;
  }
}

async function readActiveProject(
  repoRoot: string,
  projectsRoot: string,
): Promise<ActiveProject> {
  const result: ActiveProject = { name: '', path: '', status: 'not set' };
  const pointerPath = join(repoRoot, '.oat', 'active-project');

  if (!(await fileExists(pointerPath))) return result;

  let rawValue: string;
  try {
    rawValue = (await readFile(pointerPath, 'utf8')).trim();
  } catch {
    return result;
  }

  if (!rawValue) return result;

  if (rawValue.includes('/')) {
    result.name = basename(rawValue);
    result.path = rawValue;
  } else {
    result.name = rawValue;
    result.path = `${projectsRoot}/${rawValue}`;
  }

  const fullProjectPath = join(repoRoot, result.path);

  try {
    const entries = await readdir(fullProjectPath);
    if (!entries) {
      result.status = 'directory missing';
      return result;
    }
  } catch {
    result.status = 'directory missing';
    return result;
  }

  if (!(await fileExists(join(fullProjectPath, 'state.md')))) {
    result.status = 'state.md missing';
    return result;
  }

  result.status = 'active';
  return result;
}

export function phaseInHilList(phase: string, listStr: string): boolean {
  return listStr.includes(`"${phase}"`);
}

async function readProjectState(
  repoRoot: string,
  projectPath: string,
): Promise<ProjectState> {
  const stateFile = join(repoRoot, projectPath, 'state.md');

  const phase =
    (await parseFrontmatterField(stateFile, 'oat_phase')) || 'unknown';
  const phaseStatus =
    (await parseFrontmatterField(stateFile, 'oat_phase_status')) || 'unknown';
  let currentTask = await parseFrontmatterField(stateFile, 'oat_current_task');
  if (!currentTask || currentTask === 'null') currentTask = '-';
  const lifecycle =
    (await parseFrontmatterField(stateFile, 'oat_lifecycle')) || 'active';
  const blockers =
    (await parseFrontmatterField(stateFile, 'oat_blockers')) || '[]';
  const hilCheckpoints =
    (await parseFrontmatterField(stateFile, 'oat_hil_checkpoints')) || '[]';
  const hilCompleted =
    (await parseFrontmatterField(stateFile, 'oat_hil_completed')) || '[]';
  const workflowMode =
    (await parseFrontmatterField(stateFile, 'oat_workflow_mode')) || 'full';

  let hilStatus: string;
  if (phaseInHilList(phase, hilCheckpoints)) {
    hilStatus = phaseInHilList(phase, hilCompleted) ? 'passed' : 'pending';
  } else {
    hilStatus = 'n/a';
  }

  return {
    phase,
    phaseStatus,
    currentTask,
    lifecycle,
    blockers,
    hilCheckpoints,
    hilCompleted,
    hilStatus,
    workflowMode,
  };
}

async function readKnowledgeStatus(repoRoot: string): Promise<KnowledgeStatus> {
  const indexFile = join(
    repoRoot,
    '.oat',
    'repo',
    'knowledge',
    'project-index.md',
  );
  const result: KnowledgeStatus = {
    generatedAt: '',
    mergeBaseSha: '',
    status: 'not generated',
  };

  if (!(await fileExists(indexFile))) return result;

  result.generatedAt = await parseFrontmatterField(
    indexFile,
    'oat_generated_at',
  );
  result.mergeBaseSha = await parseFrontmatterField(
    indexFile,
    'oat_source_main_merge_base_sha',
  );

  if (result.generatedAt) {
    result.status = 'generated';
  }

  return result;
}

function calculateStaleness(
  knowledge: KnowledgeStatus,
  git: GitOperations,
  repoRoot: string,
  today: string,
): StalenessInfo {
  const result: StalenessInfo = {
    filesChanged: 0,
    ageDays: 0,
    status: 'fresh',
  };

  if (!knowledge.mergeBaseSha) {
    result.status = 'unknown';
    return result;
  }

  try {
    result.filesChanged = git.diffFileCount(repoRoot, knowledge.mergeBaseSha);
  } catch {
    result.filesChanged = 0;
  }

  if (knowledge.generatedAt) {
    const genDate = new Date(knowledge.generatedAt);
    const todayDate = new Date(today);
    if (
      !Number.isNaN(genDate.getTime()) &&
      !Number.isNaN(todayDate.getTime())
    ) {
      result.ageDays = Math.floor(
        (todayDate.getTime() - genDate.getTime()) / 86400000,
      );
    }
  }

  if (result.filesChanged > 20 || result.ageDays > 7) {
    result.status = 'stale';
  } else if (result.filesChanged > 5 || result.ageDays > 3) {
    result.status = 'aging';
  }

  return result;
}

function computeNextStep(
  projectStatus: string,
  hasProjects: boolean,
  state: ProjectState | null,
): { step: string; reason: string } {
  if (projectStatus === 'not set') {
    if (hasProjects) {
      return {
        step: 'oat-project-open',
        reason: 'Select an existing project to continue work',
      };
    }
    return {
      step: 'oat-project-new',
      reason: 'Create a new project to start work',
    };
  }

  if (projectStatus !== 'active') {
    return {
      step: 'oat-project-open',
      reason: `Current project has issues: ${projectStatus}`,
    };
  }

  if (!state) {
    return { step: 'oat-project-progress', reason: 'Check current progress' };
  }

  // HiL checkpoint gating
  if (
    state.phaseStatus === 'complete' &&
    phaseInHilList(state.phase, state.hilCheckpoints) &&
    !phaseInHilList(state.phase, state.hilCompleted)
  ) {
    const phaseSkillMap: Record<string, string> = {
      discovery: 'oat-project-discover',
      spec: 'oat-project-spec',
      design: 'oat-project-design',
      plan: 'oat-project-plan',
      implement: 'oat-project-implement',
    };
    return {
      step: phaseSkillMap[state.phase] ?? 'oat-project-progress',
      reason: `Complete ${state.phase} HiL approval before advancing`,
    };
  }

  // Workflow mode routing
  const key = `${state.workflowMode}:${state.phase}:${state.phaseStatus}`;
  const routeMap: Record<string, { step: string; reason: string }> = {
    'full:discovery:in_progress': {
      step: 'oat-project-discover',
      reason: 'Continue discovery phase',
    },
    'full:discovery:complete': {
      step: 'oat-project-spec',
      reason: 'Create specification from discovery',
    },
    'full:spec:in_progress': {
      step: 'oat-project-spec',
      reason: 'Continue specification phase',
    },
    'full:spec:complete': {
      step: 'oat-project-design',
      reason: 'Create design from specification',
    },
    'full:design:in_progress': {
      step: 'oat-project-design',
      reason: 'Continue design phase',
    },
    'full:design:complete': {
      step: 'oat-project-plan',
      reason: 'Create implementation plan from design',
    },
    'quick:discovery:in_progress': {
      step: 'oat-project-discover',
      reason: 'Continue quick discovery phase',
    },
    'quick:discovery:complete': {
      step: 'oat-project-plan',
      reason: 'Generate plan directly for quick workflow',
    },
    'import:plan:in_progress': {
      step: 'oat-project-import-plan',
      reason: 'Continue import-plan normalization',
    },
  };

  if (routeMap[key]) return routeMap[key]!;

  // Shared routing (wildcard mode)
  const sharedKey = `${state.phase}:${state.phaseStatus}`;
  const sharedMap: Record<string, { step: string; reason: string }> = {
    'plan:in_progress': {
      step: 'oat-project-plan',
      reason: 'Continue planning phase',
    },
    'plan:complete': {
      step: 'oat-project-implement',
      reason: 'Start implementation',
    },
    'implement:in_progress': {
      step: 'oat-project-implement',
      reason: 'Continue implementation',
    },
    'implement:complete': {
      step: 'oat-project-pr-final',
      reason: 'Generate final PR description (final review passed)',
    },
  };

  if (sharedMap[sharedKey]) return sharedMap[sharedKey]!;

  return { step: 'oat-project-progress', reason: 'Check current progress' };
}

async function listAvailableProjects(
  repoRoot: string,
  projectsRoot: string,
): Promise<string> {
  const fullRoot = join(repoRoot, projectsRoot);
  try {
    const entries = await readdir(fullRoot, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());

    if (dirs.length === 0) return '*(No projects found)*';

    const lines: string[] = [];
    for (const dir of dirs) {
      const stateFile = join(fullRoot, dir.name, 'state.md');
      if (await fileExists(stateFile)) {
        const phase =
          (await parseFrontmatterField(stateFile, 'oat_phase')) || 'unknown';
        lines.push(`- **${dir.name}** - ${phase}`);
      }
    }

    return lines.length > 0 ? lines.join('\n') : '*(No projects found)*';
  } catch {
    return '*(No projects directory found)*';
  }
}

function buildDashboardMarkdown(
  project: ActiveProject,
  state: ProjectState | null,
  knowledge: KnowledgeStatus,
  staleness: StalenessInfo,
  nextStep: { step: string; reason: string },
  projectsList: string,
  generatedDate: string,
): string {
  const timestamp = `${generatedDate}`;
  const lines: string[] = [];

  lines.push('---');
  lines.push('oat_generated: true');
  lines.push(`oat_generated_at: ${generatedDate}`);
  lines.push('---');
  lines.push('');
  lines.push('# OAT Repo State Dashboard');
  lines.push('');
  lines.push(`**Generated:** ${timestamp}`);
  lines.push('');
  lines.push('## Active Project');
  lines.push('');

  if (project.status === 'not set') {
    lines.push('*(not set)*');
  } else {
    lines.push(`**${project.name}** (\`${project.path}\`)`);
  }
  lines.push('');

  if (project.status === 'active' && state) {
    lines.push('## Active Project Summary');
    lines.push('');
    lines.push('| Field | Value |');
    lines.push('|-------|-------|');
    lines.push(`| Mode | ${state.workflowMode} |`);
    lines.push(`| Phase | ${state.phase} |`);
    lines.push(`| Status | ${state.phaseStatus} |`);
    lines.push(`| HiL Gate | ${state.hilStatus} |`);
    lines.push(`| Current Task | ${state.currentTask} |`);
    lines.push('');
    lines.push(`Details: \`${project.path}/state.md\``);
    lines.push('');
  } else if (project.status !== 'not set') {
    lines.push(`**Warning:** ${project.status}`);
    lines.push('');
  }

  lines.push('## Knowledge Status');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|-------|-------|');
  lines.push(`| Generated | ${knowledge.generatedAt || 'N/A'} |`);
  lines.push(`| Age | ${staleness.ageDays} days |`);
  lines.push(`| Files Changed | ${staleness.filesChanged} |`);
  lines.push(`| Status | ${staleness.status} |`);
  lines.push('');

  lines.push('## Recommended Next Step');
  lines.push('');
  lines.push(`**${nextStep.step}** - ${nextStep.reason}`);
  lines.push('');

  lines.push('## Quick Commands');
  lines.push('');
  lines.push('- `oat-project-progress` - Check current status');
  lines.push('- `oat-repo-knowledge-index` - Refresh knowledge base');
  lines.push('- `oat-project-new` - Create a full-lifecycle project');
  lines.push('- `oat-project-quick-start` - Create a quick workflow project');
  lines.push('- `oat-project-import-plan` - Import an external provider plan');
  lines.push('- `oat-project-open` - Switch active project');
  lines.push('- `oat-project-clear-active` - Clear active project');
  lines.push('- `oat-project-complete` - Mark project complete');
  lines.push('');

  lines.push('## Available Projects');
  lines.push('');
  lines.push(projectsList);
  lines.push('');

  return lines.join('\n');
}

export async function generateStateDashboard(
  options: GenerateStateOptions,
): Promise<GenerateStateResult> {
  const { repoRoot } = options;
  const env = options.env ?? process.env;
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const git = options.git ?? defaultGit;

  const dashboardPath = join(repoRoot, '.oat', 'state.md');
  const projectsRoot = await resolveProjectsRoot(repoRoot, env);
  const hasProjects = await hasAnyProjects(join(repoRoot, projectsRoot));

  const project = await readActiveProject(repoRoot, projectsRoot);

  let state: ProjectState | null = null;
  if (project.status === 'active') {
    state = await readProjectState(repoRoot, project.path);
  }

  const knowledge = await readKnowledgeStatus(repoRoot);
  const staleness = calculateStaleness(knowledge, git, repoRoot, today);
  const nextStep = computeNextStep(project.status, hasProjects, state);

  const projectsList = await listAvailableProjects(repoRoot, projectsRoot);
  const markdown = buildDashboardMarkdown(
    project,
    state,
    knowledge,
    staleness,
    nextStep,
    projectsList,
    today,
  );

  await ensureDir(join(repoRoot, '.oat'));
  await writeFile(dashboardPath, markdown, 'utf8');

  return {
    dashboardPath,
    projectName: project.name || null,
    projectStatus: project.status,
    stalenessStatus: staleness.status,
    recommendedStep: nextStep.step,
    recommendedReason: nextStep.reason,
  };
}
