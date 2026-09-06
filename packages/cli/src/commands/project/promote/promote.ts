import {
  mkdir as defaultMkdir,
  readFile as defaultReadFile,
  rename as defaultRename,
  writeFile as defaultWriteFile,
} from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  applyTemplateReplacements,
  resolveTemplateSource as defaultResolveTemplateSource,
} from '@commands/project/new/scaffold';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import {
  buildSyncTarget,
  pushSynced as defaultPushSynced,
  type PushResult,
  type SyncTarget,
} from '@commands/project/sync/ref-sync';
import { getFrontmatterBlock } from '@commands/shared/frontmatter';
import { replaceFrontmatter } from '@commands/shared/frontmatter-write';
import { resolveProjectsRoot as defaultResolveProjectsRoot } from '@commands/shared/oat-paths';
import { resolveProjectScope } from '@commands/shared/project-scope';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { fileExists as defaultFileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';
import YAML from 'yaml';

const PROMOTED_FILES = [
  'discovery.md',
  'references/lite-plan.md',
  'plan.md',
  'state.md',
] as const;

const LITE_SECTION_HEADINGS = [
  ['Summary', 'summary'],
  ['Decisions', 'decisions'],
  ['Assumptions', 'assumptions'],
  ['Out of Scope', 'outOfScope'],
  ['Validation Criteria', 'validationCriteria'],
] as const;

export interface LitePlanSections {
  summary: string;
  decisions: string;
  assumptions: string;
  outOfScope: string;
  validationCriteria: string;
}

type PromotionReason =
  | 'promoted'
  | 'unsupported-target'
  | 'not-lite'
  | 'lite-plan-reference-exists'
  | 'invalid-lite-plan'
  | 'scope-unresolved'
  | 'project-unreadable'
  | 'template-unreadable'
  | 'write-failed'
  | 'persistence-failed';

export type PromotionResult =
  | {
      status: 'promoted';
      reason: 'promoted';
      files: string[];
    }
  | {
      status: 'refused';
      reason: Exclude<PromotionReason, 'promoted'>;
      files: string[];
    };

interface ProjectPromoteOptions {
  to: string;
}

export interface ProjectPromoteDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveProjectsRoot: (
    repoRoot: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<string>;
  resolveTemplateSource: typeof defaultResolveTemplateSource;
  readFile: typeof defaultReadFile;
  writeFile: typeof defaultWriteFile;
  mkdir: typeof defaultMkdir;
  rename: typeof defaultRename;
  fileExists: typeof defaultFileExists;
  gitRunner: GitRunner;
  pushSynced: (
    target: SyncTarget,
    git: GitRunner,
    options: { message?: string },
  ) => Promise<PushResult>;
  processEnv: NodeJS.ProcessEnv;
  now: () => Date;
}

const DEFAULT_DEPENDENCIES: ProjectPromoteDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveProjectsRoot: defaultResolveProjectsRoot,
  resolveTemplateSource: defaultResolveTemplateSource,
  readFile: defaultReadFile,
  writeFile: defaultWriteFile,
  mkdir: defaultMkdir,
  rename: defaultRename,
  fileExists: defaultFileExists,
  gitRunner: defaultGitRunner,
  pushSynced: defaultPushSynced,
  processEnv: process.env,
  now: () => new Date(),
};

function extractSection(content: string, heading: string): string | null {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headingMatch = new RegExp(`^## ${escapedHeading}[ \\t]*$`, 'm').exec(
    content,
  );
  if (!headingMatch) return null;

  const bodyStart = headingMatch.index + headingMatch[0].length;
  const remaining = content.slice(bodyStart);
  const nextHeading = /^##\s+/m.exec(remaining);
  const bodyEnd = nextHeading ? bodyStart + nextHeading.index : content.length;
  const body = content.slice(bodyStart, bodyEnd).trim();
  return body.length > 0 ? body : null;
}

function extractLitePlanSections(planContent: string): LitePlanSections | null {
  const sections: Partial<LitePlanSections> = {};
  for (const [heading, key] of LITE_SECTION_HEADINGS) {
    const body = extractSection(planContent, heading);
    if (!body) return null;
    sections[key] = body;
  }
  return sections as LitePlanSections;
}

function containsUnresolvedTemplateContent(
  sections: LitePlanSections,
  templateSections: LitePlanSections,
): boolean {
  return LITE_SECTION_HEADINGS.some(([, key]) => {
    const content = sections[key];
    const templateContent = templateSections[key];
    if (content === templateContent) return true;

    const markers =
      templateContent
        .match(/\[[^\]\n]+\]|\{[^{}\n]+\}/g)
        ?.filter((marker) => !/^\[\s*\]$/.test(marker)) ?? [];
    return markers.some((marker) => content.includes(marker));
  });
}

export function parseLitePlanSections(
  planContent: string,
  liteTemplateContent?: string,
): LitePlanSections | null {
  const sections = extractLitePlanSections(planContent);
  if (!sections || !liteTemplateContent) return sections;

  const templateSections = extractLitePlanSections(liteTemplateContent);
  if (
    !templateSections ||
    containsUnresolvedTemplateContent(sections, templateSections)
  ) {
    return null;
  }
  return sections;
}

function readObjectFrontmatter(
  content: string,
  filePath: string,
): Record<string, unknown> {
  const block = getFrontmatterBlock(content);
  if (!block) {
    throw new Error(`${filePath} is missing frontmatter`);
  }
  const parsed: unknown = YAML.parse(block);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${filePath} frontmatter must be a YAML object`);
  }
  return parsed as Record<string, unknown>;
}

function replaceSection(
  content: string,
  heading: string,
  body: string,
): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headingMatch = new RegExp(`^## ${escapedHeading}[ \\t]*$`, 'm').exec(
    content,
  );
  if (!headingMatch) {
    throw new Error(`discovery template is missing ## ${heading}`);
  }
  const bodyStart = headingMatch.index + headingMatch[0].length;
  const remaining = content.slice(bodyStart);
  const nextHeading = /^##\s+/m.exec(remaining);
  const bodyEnd = nextHeading ? bodyStart + nextHeading.index : content.length;
  const suffix = content.slice(bodyEnd).replace(/^\s*/, '');
  return `${content.slice(0, bodyStart)}\n\n${body.trim()}\n\n${suffix}`;
}

function renderDiscovery(
  template: string,
  projectName: string,
  today: string,
  nowUtc: string,
  sections: LitePlanSections,
): string {
  let rendered = applyTemplateReplacements(
    template,
    projectName,
    today,
    nowUtc,
    'quick',
  );
  for (const [heading, body] of [
    ['Initial Request', sections.summary],
    ['Key Decisions', sections.decisions],
    ['Assumptions', sections.assumptions],
    ['Out of Scope', sections.outOfScope],
    ['Success Criteria', sections.validationCriteria],
  ] as const) {
    rendered = replaceSection(rendered, heading, body);
  }
  return rendered;
}

function renderQuickState(
  stateContent: string,
  statePath: string,
  nowUtc: string,
): string {
  const frontmatter = readObjectFrontmatter(stateContent, statePath);
  frontmatter['oat_workflow_mode'] = 'quick';
  frontmatter['oat_phase'] = 'discovery';
  frontmatter['oat_phase_status'] = 'complete';
  frontmatter['oat_ready_for'] = 'oat-project-quick-start';
  frontmatter['oat_project_state_updated'] = nowUtc;
  return replaceFrontmatter(
    stateContent,
    YAML.stringify(frontmatter).trimEnd(),
  );
}

function repoRelativePath(repoRoot: string, path: string): string {
  return relative(repoRoot, path).split(sep).join('/');
}

async function persistPromotion(
  repoRoot: string,
  projectsRoot: string,
  projectRoot: string,
  projectName: string,
  scope: 'shared' | 'local' | 'synced',
  dependencies: ProjectPromoteDependencies,
): Promise<void> {
  const message = `chore(oat): promote ${projectName} to quick`;
  if (scope === 'synced') {
    const target = buildSyncTarget(repoRoot, projectsRoot, projectName);
    const result = await dependencies.pushSynced(
      target,
      dependencies.gitRunner,
      { message },
    );
    if (result.status !== 'pushed' && result.status !== 'up-to-date') {
      throw new Error(`synced promotion push ${result.status}`);
    }
    return;
  }
  if (scope === 'local') {
    return;
  }

  const pathspecs = PROMOTED_FILES.map((file) =>
    repoRelativePath(repoRoot, join(projectRoot, file)),
  );
  await dependencies.gitRunner.run(['add', '--', ...pathspecs], {
    cwd: repoRoot,
  });
  await dependencies.gitRunner.run(
    ['commit', '-m', message, '--', ...pathspecs],
    { cwd: repoRoot },
  );
}

async function promoteProject(
  projectPath: string,
  options: ProjectPromoteOptions,
  context: CommandContext,
  dependencies: ProjectPromoteDependencies,
): Promise<PromotionResult> {
  if (options.to !== 'quick') {
    return { status: 'refused', reason: 'unsupported-target', files: [] };
  }

  const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
  const projectRoot = isAbsolute(projectPath)
    ? resolve(projectPath)
    : resolve(repoRoot, projectPath);
  const projectName = basename(projectRoot);
  const statePath = join(projectRoot, 'state.md');
  const planPath = join(projectRoot, 'plan.md');
  const referencePath = join(projectRoot, 'references', 'lite-plan.md');

  let stateContent: string;
  let planContent: string;
  try {
    [stateContent, planContent] = await Promise.all([
      dependencies.readFile(statePath, 'utf8'),
      dependencies.readFile(planPath, 'utf8'),
    ]);
  } catch {
    return { status: 'refused', reason: 'project-unreadable', files: [] };
  }

  let stateFrontmatter: Record<string, unknown>;
  try {
    stateFrontmatter = readObjectFrontmatter(stateContent, statePath);
  } catch {
    return { status: 'refused', reason: 'project-unreadable', files: [] };
  }
  if (stateFrontmatter['oat_workflow_mode'] !== 'lite') {
    return { status: 'refused', reason: 'not-lite', files: [] };
  }
  if (await dependencies.fileExists(referencePath)) {
    return {
      status: 'refused',
      reason: 'lite-plan-reference-exists',
      files: [],
    };
  }

  const userOatRoot = join(context.home, '.oat');
  let liteTemplateContent: string;
  try {
    const liteTemplatePath = await dependencies.resolveTemplateSource(
      userOatRoot,
      repoRoot,
      'plan-lite.md',
    );
    liteTemplateContent = await dependencies.readFile(liteTemplatePath, 'utf8');
  } catch {
    return { status: 'refused', reason: 'template-unreadable', files: [] };
  }

  const sections = parseLitePlanSections(planContent, liteTemplateContent);
  if (!sections) {
    return { status: 'refused', reason: 'invalid-lite-plan', files: [] };
  }

  const projectsRoot = await dependencies.resolveProjectsRoot(
    repoRoot,
    dependencies.processEnv,
  );
  const scope = resolveProjectScope(projectRoot, projectsRoot, repoRoot);
  if (!scope) {
    return { status: 'refused', reason: 'scope-unresolved', files: [] };
  }

  const now = dependencies.now();
  const nowUtc = now.toISOString();
  const today = nowUtc.slice(0, 10);
  let discoveryContent: string;
  let quickPlanContent: string;
  let quickStateContent: string;
  try {
    const [discoveryTemplatePath, quickPlanTemplatePath] = await Promise.all([
      dependencies.resolveTemplateSource(userOatRoot, repoRoot, 'discovery.md'),
      dependencies.resolveTemplateSource(userOatRoot, repoRoot, 'plan.md'),
    ]);
    const [discoveryTemplate, quickPlanTemplate] = await Promise.all([
      dependencies.readFile(discoveryTemplatePath, 'utf8'),
      dependencies.readFile(quickPlanTemplatePath, 'utf8'),
    ]);
    discoveryContent = renderDiscovery(
      discoveryTemplate,
      projectName,
      today,
      nowUtc,
      sections,
    );
    quickPlanContent = applyTemplateReplacements(
      quickPlanTemplate,
      projectName,
      today,
      nowUtc,
      'quick',
    );
    quickStateContent = renderQuickState(stateContent, statePath, nowUtc);
  } catch {
    return { status: 'refused', reason: 'template-unreadable', files: [] };
  }

  const writtenFiles: string[] = [];
  try {
    await dependencies.mkdir(join(projectRoot, 'references'), {
      recursive: true,
    });
    await dependencies.writeFile(
      join(projectRoot, 'discovery.md'),
      discoveryContent,
      'utf8',
    );
    writtenFiles.push('discovery.md');
    await dependencies.rename(planPath, referencePath);
    writtenFiles.push('references/lite-plan.md');
    await dependencies.writeFile(planPath, quickPlanContent, 'utf8');
    writtenFiles.push('plan.md');
    await dependencies.writeFile(statePath, quickStateContent, 'utf8');
    writtenFiles.push('state.md');
  } catch {
    return { status: 'refused', reason: 'write-failed', files: writtenFiles };
  }

  try {
    await persistPromotion(
      repoRoot,
      projectsRoot,
      projectRoot,
      projectName,
      scope,
      dependencies,
    );
  } catch {
    return {
      status: 'refused',
      reason: 'persistence-failed',
      files: writtenFiles,
    };
  }

  return {
    status: 'promoted',
    reason: 'promoted',
    files: [...PROMOTED_FILES],
  };
}

export function createProjectPromoteCommand(
  overrides: Partial<ProjectPromoteDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_DEPENDENCIES, ...overrides };
  return new Command('promote')
    .description('Promote an authored lite project to the quick workflow')
    .argument('<project-path>', 'Lite project path to promote')
    .requiredOption('--to <mode>', 'Target workflow mode')
    .action(
      async (
        projectPath: string,
        options: ProjectPromoteOptions,
        command: Command,
      ) => {
        const context = dependencies.buildCommandContext(
          readGlobalOptions(command),
        );
        const result = await promoteProject(
          projectPath,
          options,
          context,
          dependencies,
        );
        if (context.json) {
          context.logger.json(result);
        } else if (result.status === 'promoted') {
          context.logger.info(`Promoted ${projectPath} to quick.`);
        } else {
          context.logger.error(`Promotion refused: ${result.reason}.`);
        }
        process.exitCode = result.status === 'promoted' ? 0 : 1;
      },
    );
}
