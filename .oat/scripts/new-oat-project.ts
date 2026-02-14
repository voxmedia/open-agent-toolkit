#!/usr/bin/env tsx

import { spawnSync } from 'node:child_process';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cwd, env, stderr } from 'node:process';

/**
 * NOTE (dogfood → CLI):
 *
 * This script lives in `.oat/scripts/` as a dogfooding-first, deterministic
 * project scaffolder. It is intentionally written with minimal assumptions so
 * we can iterate quickly inside this repo.
 *
 * When we build the proper `oat` CLI:
 * - Extract the core logic into a reusable module under `packages/cli/` (e.g.
 *   `packages/cli/src/project/scaffold.ts`).
 * - Implement a CLI command like `oat project new <name>` that calls that module.
 * - Either:
 *   - keep this file as a thin wrapper that prefers invoking the CLI (if present)
 *     and falls back to local template-copy behavior, or
 *   - delete this script once the CLI is stable and templates are bundled with it.
 *
 * Keeping this here for now avoids prematurely locking in CLI packaging/template
 * bundling decisions while still giving deterministic behavior during dogfood.
 */

type Args = {
  projectName: string;
  force: boolean;
  setActive: boolean;
  refreshDashboard: boolean;
};

function usage(): string {
  return [
    'Usage: tsx .oat/scripts/new-oat-project.ts <project-name> [--force] [--no-set-active] [--no-dashboard]',
    '',
    'Creates an OAT project directory under {PROJECTS_ROOT} and scaffolds project artifacts from .oat/templates/.',
    '',
    'Resolution order for {PROJECTS_ROOT}:',
    '  1) $OAT_PROJECTS_ROOT',
    '  2) .oat/projects-root',
    '  3) .agent/projects (fallback)',
  ].join('\n');
}

function parseArgs(argv: string[]): Args {
  const positional: string[] = [];
  let force = false;
  let setActive = true;
  let refreshDashboard = true;

  for (const arg of argv) {
    if (arg === '--force') force = true;
    else if (arg === '--no-set-active') setActive = false;
    else if (arg === '--no-dashboard') refreshDashboard = false;
    else if (arg === '--help' || arg === '-h') {
      // eslint-disable-next-line no-console
      console.log(usage());
      process.exit(0);
    } else if (!arg.startsWith('-')) positional.push(arg);
  }

  const projectName = positional[0];
  if (!projectName) {
    // eslint-disable-next-line no-console
    console.error(usage());
    process.exit(1);
  }

  return { projectName, force, setActive, refreshDashboard };
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

async function dirExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function resolveProjectsRoot(repoRoot: string): Promise<string> {
  const envRoot = env.OAT_PROJECTS_ROOT?.trim();
  if (envRoot) return envRoot.replace(/\/+$/, '');

  const rootFile = join(repoRoot, '.oat', 'projects-root');
  if (await fileExists(rootFile)) {
    const fromFile = (await readFile(rootFile, 'utf8')).trim();
    if (fromFile) return fromFile.replace(/\/+$/, '');
  }

  return '.agent/projects';
}

function validateProjectName(name: string): void {
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
  return (
    template
      .replaceAll('{Project Name}', projectName)
      .replaceAll('YYYY-MM-DD', today)
      // Templates are stored with oat_template markers; project artifacts should not carry them.
      .replaceAll(/\n?oat_template:\s*true\s*\n/gi, '\n')
      .replaceAll(/\n?oat_template_name:\s*[^\n]*\n/gi, '\n')
  );
}

async function scaffoldFromTemplates(
  repoRoot: string,
  projectPath: string,
  projectName: string,
  today: string,
  force: boolean,
): Promise<void> {
  const templatesDir = join(repoRoot, '.oat', 'templates');
  const templateFiles = (await readdir(templatesDir)).filter((f) =>
    f.endsWith('.md'),
  );

  await mkdir(projectPath, { recursive: true });
  await mkdir(join(projectPath, 'reviews'), { recursive: true });
  await mkdir(join(projectPath, 'pr'), { recursive: true });

  for (const file of templateFiles) {
    const src = join(templatesDir, file);
    const dest = join(projectPath, file);

    if (await fileExists(dest)) continue;

    const template = await readFile(src, 'utf8');
    const rendered = applyTemplateReplacements(template, projectName, today);
    await writeFile(dest, rendered, 'utf8');
  }

  if (force) {
    // Force mode is intentionally non-destructive: it never overwrites existing artifacts.
    // If the directory exists already, we only ensure the expected structure + missing files.
  }
}

async function writeActiveProjectPointer(
  repoRoot: string,
  projectPath: string,
): Promise<void> {
  await mkdir(join(repoRoot, '.oat'), { recursive: true });
  await writeFile(
    join(repoRoot, '.oat', 'active-project'),
    `${projectPath}\n`,
    'utf8',
  );
}

function refreshRepoDashboard(repoRoot: string): void {
  const script = join(repoRoot, '.oat', 'scripts', 'generate-oat-state.sh');
  const res = spawnSync('bash', [script], { cwd: repoRoot, stdio: 'inherit' });
  if (res.status !== 0) {
    stderr.write(
      'Warning: failed to refresh .oat/state.md (generate-oat-state.sh).\n',
    );
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = cwd();

  validateProjectName(args.projectName);

  const projectsRoot = await resolveProjectsRoot(repoRoot);
  const projectPath = join(projectsRoot, args.projectName);

  // Non-destructive behavior:
  // - If project directory exists, we only create missing expected files/dirs.
  // - We never overwrite existing artifacts (even with --force).
  if ((await dirExists(projectPath)) === false) {
    await mkdir(projectPath, { recursive: true });
  }

  const today = new Date().toISOString().slice(0, 10);
  await scaffoldFromTemplates(
    repoRoot,
    projectPath,
    args.projectName,
    today,
    args.force,
  );

  if (args.setActive) {
    await writeActiveProjectPointer(repoRoot, projectPath);
  }

  if (args.refreshDashboard) {
    refreshRepoDashboard(repoRoot);
  }

  // eslint-disable-next-line no-console
  console.log(`Created/updated OAT project: ${args.projectName}`);
  // eslint-disable-next-line no-console
  console.log(`Project path: ${projectPath}`);
  if (args.setActive) {
    // eslint-disable-next-line no-console
    console.log('Active project pointer updated: .oat/active-project');
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
});
