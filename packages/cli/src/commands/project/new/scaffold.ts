import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import { generateStateDashboard } from '@commands/state/generate';
import { fileExists } from '@fs/io';

export type ProjectScaffoldMode = 'full' | 'quick' | 'import';

export interface ScaffoldProjectOptions {
  repoRoot: string;
  projectName: string;
  mode?: ProjectScaffoldMode;
  force?: boolean;
  setActive?: boolean;
  refreshDashboard?: boolean;
  env?: NodeJS.ProcessEnv;
  today?: string;
  refreshDashboardCallback?: (repoRoot: string) => void | Promise<void>;
}

export interface ScaffoldProjectResult {
  mode: ProjectScaffoldMode;
  projectsRoot: string;
  projectPath: string;
  createdFiles: string[];
  skippedFiles: string[];
  activePointerUpdated: boolean;
  dashboardRefreshed: boolean;
}

const TEMPLATES_BY_MODE: Record<ProjectScaffoldMode, string[]> = {
  full: [
    'state.md',
    'discovery.md',
    'spec.md',
    'design.md',
    'plan.md',
    'implementation.md',
  ],
  quick: ['state.md', 'discovery.md', 'plan.md', 'implementation.md'],
  import: ['state.md', 'plan.md', 'implementation.md'],
};

function validateProjectName(name: string): void {
  if (name.startsWith('-')) {
    throw new Error(
      `Invalid project name "${name}". Project names must not start with a dash.`,
    );
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(
      `Invalid project name "${name}". Use only letters, numbers, dash, and underscore.`,
    );
  }
}

function applyTemplateReplacements(
  template: string,
  projectName: string,
  today: string,
): string {
  return template
    .replaceAll('{Project Name}', projectName)
    .replaceAll('YYYY-MM-DD', today)
    .replaceAll(/\n?oat_template:\s*true\s*\n/gi, '\n')
    .replaceAll(/\n?oat_template_name:\s*[^\n]*\n/gi, '\n');
}

async function defaultRefreshDashboard(repoRoot: string): Promise<void> {
  await generateStateDashboard({ repoRoot });
}

async function scaffoldModeTemplates(
  repoRoot: string,
  projectPath: string,
  projectName: string,
  mode: ProjectScaffoldMode,
  today: string,
): Promise<{ createdFiles: string[]; skippedFiles: string[] }> {
  const templatesDir = join(repoRoot, '.oat', 'templates');
  const createdFiles: string[] = [];
  const skippedFiles: string[] = [];

  for (const templateFile of TEMPLATES_BY_MODE[mode]) {
    const src = join(templatesDir, templateFile);
    const dest = join(repoRoot, projectPath, templateFile);

    if (await fileExists(dest)) {
      skippedFiles.push(templateFile);
      continue;
    }

    const template = await readFile(src, 'utf8');
    const rendered = applyTemplateReplacements(template, projectName, today);
    await writeFile(dest, rendered, 'utf8');
    createdFiles.push(templateFile);
  }

  return { createdFiles, skippedFiles };
}

async function ensureStructure(
  repoRoot: string,
  projectPath: string,
  mode: ProjectScaffoldMode,
): Promise<void> {
  const projectRoot = join(repoRoot, projectPath);
  await mkdir(projectRoot, { recursive: true });
  await mkdir(join(projectRoot, 'reviews'), { recursive: true });
  await mkdir(join(projectRoot, 'pr'), { recursive: true });

  if (mode === 'import') {
    const referencesDir = join(projectRoot, 'references');
    await mkdir(referencesDir, { recursive: true });
    const gitkeepPath = join(referencesDir, '.gitkeep');
    if (!(await fileExists(gitkeepPath))) {
      await writeFile(gitkeepPath, '', 'utf8');
    }
  }
}

async function writeActiveProjectPointer(
  repoRoot: string,
  projectPath: string,
): Promise<void> {
  await mkdir(join(repoRoot, '.oat'), { recursive: true });
  await writeFile(join(repoRoot, '.oat', 'active-project'), `${projectPath}\n`);
}

export async function scaffoldProject(
  options: ScaffoldProjectOptions,
): Promise<ScaffoldProjectResult> {
  const mode = options.mode ?? 'full';
  const setActive = options.setActive ?? true;
  const refreshDashboard = options.refreshDashboard ?? true;
  const env = options.env ?? process.env;
  const today = options.today ?? new Date().toISOString().slice(0, 10);

  validateProjectName(options.projectName);
  const projectsRoot = await resolveProjectsRoot(options.repoRoot, env);
  const projectPath = join(projectsRoot, options.projectName);
  // `--force` is currently accepted for compatibility with the legacy script.
  // Scaffold behavior is always non-destructive (create missing files only).
  void options.force;

  await ensureStructure(options.repoRoot, projectPath, mode);
  const { createdFiles, skippedFiles } = await scaffoldModeTemplates(
    options.repoRoot,
    projectPath,
    options.projectName,
    mode,
    today,
  );

  if (setActive) {
    await writeActiveProjectPointer(options.repoRoot, projectPath);
  }

  let dashboardRefreshed = false;
  if (refreshDashboard) {
    try {
      await (options.refreshDashboardCallback ?? defaultRefreshDashboard)(
        options.repoRoot,
      );
      dashboardRefreshed = true;
    } catch (error) {
      console.error(
        `Warning: dashboard refresh failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    mode,
    projectsRoot,
    projectPath,
    createdFiles,
    skippedFiles,
    activePointerUpdated: setActive,
    dashboardRefreshed,
  };
}
