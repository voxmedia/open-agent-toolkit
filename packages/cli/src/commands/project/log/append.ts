import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, isAbsolute, join, resolve } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  resolveActiveProject,
  type ActiveProjectResolution,
} from '@config/oat-config';
import { resolveEffectiveConfig, type ResolvedConfig } from '@config/resolve';
import { resolveAssetsRoot } from '@fs/assets';
import { dirExists, fileExists } from '@fs/io';
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import {
  composeJudgmentHeading,
  composeStructuralHeading,
  isProjectLogEntryMarker,
  isProjectLogSectionMarker,
  PROJECT_LOG_AREA_MAX_LENGTH,
  PROJECT_LOG_HEADING_DELIMITER,
  PROJECT_LOG_SCOPES,
  PROJECT_LOG_TYPES,
  type ProjectLogScope,
  type ProjectLogType,
} from './grammar';

const PROJECT_LOG_FILENAME = 'project-log.md';
const SYNTHESIS_HEADING_PREFIX = '\n## End-of-run synthesis';

export interface AppendProjectLogInput {
  repoRoot: string;
  home?: string;
  project?: string;
  structural?: boolean;
  type?: string;
  scope?: string;
  area?: string;
  producer?: string;
  ref?: string;
  body?: string;
  versionNote?: string;
}

export type ProjectLogAppendResult =
  | {
      status: 'appended';
      logPath: string;
      heading: string;
      created: boolean;
    }
  | {
      status: 'skipped';
      reason: 'projectLog=false';
    };

export interface AppendProjectLogDependencies {
  resolveActiveProject: (repoRoot: string) => Promise<ActiveProjectResolution>;
  resolveEffectiveConfig: (
    repoRoot: string,
    userConfigDir: string,
    env?: NodeJS.ProcessEnv,
  ) => Promise<ResolvedConfig>;
  resolveAssetsRoot: () => Promise<string>;
  now: () => Date;
}

const DEFAULT_APPEND_DEPENDENCIES: AppendProjectLogDependencies = {
  resolveActiveProject,
  resolveEffectiveConfig,
  resolveAssetsRoot,
  now: () => new Date(),
};

interface AppendCommandOptions {
  structural?: boolean;
  type?: string;
  scope?: string;
  area?: string;
  producer?: string;
  ref?: string;
  body?: string;
  versionNote?: string;
  project?: string;
}

export interface ProjectLogAppendCommandDependencies extends AppendProjectLogDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readStdin: () => Promise<string>;
}

const DEFAULT_COMMAND_DEPENDENCIES: ProjectLogAppendCommandDependencies = {
  ...DEFAULT_APPEND_DEPENDENCIES,
  buildCommandContext,
  resolveProjectRoot,
  readStdin: async () => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8');
  },
};

function validateSingleLine(
  value: string | undefined,
  option: string,
  maxLength = PROJECT_LOG_AREA_MAX_LENGTH,
): string {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    throw new Error(
      `${option} is required and must be a non-empty single line.`,
    );
  }
  if (/[\r\n]/.test(value ?? '')) {
    throw new Error(
      `${option} must be a single line without newline characters.`,
    );
  }
  if (normalized.length > maxLength) {
    throw new Error(`${option} must be at most ${maxLength} characters.`);
  }
  return normalized;
}

function validateHeadingField(
  value: string | undefined,
  option: string,
): string {
  const normalized = validateSingleLine(value, option);
  if (normalized.includes(PROJECT_LOG_HEADING_DELIMITER)) {
    throw new Error(
      `${option} must not contain the project-log heading delimiter '${PROJECT_LOG_HEADING_DELIMITER}'.`,
    );
  }
  return normalized;
}

function validateVersionNote(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return validateSingleLine(value, '--version-note', Number.MAX_SAFE_INTEGER);
}

function containsCommandOwnedMarker(body: string): boolean {
  return body
    .split(/\r?\n/)
    .some(
      (line) =>
        isProjectLogSectionMarker(line) || isProjectLogEntryMarker(line),
    );
}

function validateEntry(
  input: AppendProjectLogInput,
  date: string,
): {
  heading: string;
  body: string;
  versionNote: string | undefined;
} {
  const body = input.body?.trim();
  if (!body) {
    throw new Error('--body is required and must contain non-whitespace text.');
  }
  const versionNote = validateVersionNote(input.versionNote);

  if (input.structural) {
    if (
      input.type !== undefined ||
      input.scope !== undefined ||
      input.area !== undefined
    ) {
      throw new Error(
        '--structural cannot be combined with judgment flags --type, --scope, or --area.',
      );
    }
    if (/[\r\n]/.test(body)) {
      throw new Error(
        '--body for structural entries must be one line without newline characters.',
      );
    }
    const producer = validateHeadingField(input.producer, '--producer');
    const ref = validateHeadingField(input.ref, '--ref');
    return {
      heading: composeStructuralHeading({ date, producer, ref }),
      body,
      versionNote,
    };
  }

  if (input.producer !== undefined || input.ref !== undefined) {
    throw new Error(
      'Judgment entries cannot use structural flags --producer or --ref; add --structural or remove those flags.',
    );
  }
  if (!input.type) {
    throw new Error(
      `--type is required for judgment entries; accepted values: ${PROJECT_LOG_TYPES.join(
        ' | ',
      )}.`,
    );
  }
  if (!(PROJECT_LOG_TYPES as readonly string[]).includes(input.type)) {
    throw new Error(
      `Invalid --type '${input.type}'; accepted values: ${PROJECT_LOG_TYPES.join(
        ' | ',
      )}.`,
    );
  }
  if (!input.scope) {
    throw new Error(
      `--scope is required for judgment entries; accepted values: ${PROJECT_LOG_SCOPES.join(
        ' | ',
      )}.`,
    );
  }
  if (!(PROJECT_LOG_SCOPES as readonly string[]).includes(input.scope)) {
    throw new Error(
      `Invalid --scope '${input.scope}'; accepted values: ${PROJECT_LOG_SCOPES.join(
        ' | ',
      )}.`,
    );
  }
  if (containsCommandOwnedMarker(body)) {
    throw new Error(
      '--body for judgment entries must not contain command-owned level-two or level-three Markdown headings.',
    );
  }
  const area = validateHeadingField(input.area, '--area');
  return {
    heading: composeJudgmentHeading({
      date,
      type: input.type as ProjectLogType,
      scope: input.scope as ProjectLogScope,
      area,
    }),
    body,
    versionNote,
  };
}

async function resolveTargetProject(
  input: AppendProjectLogInput,
  dependencies: AppendProjectLogDependencies,
): Promise<string> {
  if (input.project) {
    const projectPath = isAbsolute(input.project)
      ? resolve(input.project)
      : resolve(input.repoRoot, input.project);
    if (
      !(await dirExists(projectPath)) ||
      !(await fileExists(join(projectPath, 'state.md')))
    ) {
      throw new Error(
        `Project path is missing or invalid: ${input.project}. Pass --project <path> for a directory containing state.md.`,
      );
    }
    return projectPath;
  }

  const active = await dependencies.resolveActiveProject(input.repoRoot);
  if (active.status !== 'active' || !active.path) {
    throw new Error(
      'No active project resolves. Set activeProject or pass --project <path>.',
    );
  }
  return resolve(input.repoRoot, active.path);
}

export function instantiateProjectLogTemplate(
  template: string,
  projectName: string,
  date: string,
): string {
  const instantiated = template
    .replaceAll('{Project Name}', projectName)
    .replaceAll('YYYY-MM-DD', date)
    .replaceAll(/\n?oat_template:\s*true\s*\n/gi, '\n')
    .replaceAll(/\n?oat_template_name:\s*[^\n]*\n/gi, '\n');
  return instantiated.endsWith('\n') ? instantiated : `${instantiated}\n`;
}

async function appendEntry(
  logPath: string,
  heading: string,
  body: string,
  versionNote: string | undefined,
): Promise<void> {
  const bodyWithVersion = versionNote?.trim()
    ? `${body} (observed on ${versionNote.trim()})`
    : body;
  const entry = `\n${heading}\n\n${bodyWithVersion}\n`;
  const content = await readFile(logPath, 'utf8');
  const synthesisIndex = content.indexOf(SYNTHESIS_HEADING_PREFIX);

  if (synthesisIndex >= 0) {
    await writeFile(
      logPath,
      `${content.slice(0, synthesisIndex)}${entry}${content.slice(
        synthesisIndex,
      )}`,
      'utf8',
    );
    return;
  }

  await appendFile(
    logPath,
    `${content.endsWith('\n') ? '' : '\n'}${entry}`,
    'utf8',
  );
}

export async function appendProjectLog(
  input: AppendProjectLogInput,
  overrides: Partial<AppendProjectLogDependencies> = {},
): Promise<ProjectLogAppendResult> {
  const dependencies = { ...DEFAULT_APPEND_DEPENDENCIES, ...overrides };
  const projectPath = await resolveTargetProject(input, dependencies);
  const logPath = join(projectPath, PROJECT_LOG_FILENAME);
  const logExists = await fileExists(logPath);

  if (!logExists) {
    const effective = await dependencies.resolveEffectiveConfig(
      input.repoRoot,
      join(input.home ?? homedir(), '.oat'),
    );
    if (effective.resolved['workflow.projectLog']?.value === false) {
      return { status: 'skipped', reason: 'projectLog=false' };
    }
  }

  const date = dependencies.now().toISOString().slice(0, 10);
  const { heading, body, versionNote } = validateEntry(input, date);
  let created = false;

  if (!logExists) {
    const assetsRoot = await dependencies.resolveAssetsRoot();
    const template = await readFile(
      join(assetsRoot, 'templates', PROJECT_LOG_FILENAME),
      'utf8',
    );
    await writeFile(
      logPath,
      instantiateProjectLogTemplate(template, basename(projectPath), date),
      'utf8',
    );
    created = true;
  }

  await appendEntry(logPath, heading, body, versionNote);
  return { status: 'appended', logPath, heading, created };
}

async function runAppendCommand(
  options: AppendCommandOptions,
  context: CommandContext,
  dependencies: ProjectLogAppendCommandDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const body =
      options.body === '-' ? await dependencies.readStdin() : options.body;
    const result = await appendProjectLog(
      {
        repoRoot,
        home: context.home,
        ...options,
        body,
      },
      dependencies,
    );

    if (context.json) {
      context.logger.json(result);
    } else if (result.status === 'appended') {
      context.logger.success(`Appended project log entry: ${result.logPath}`);
    }
    process.exitCode = 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
  }
}

export function createProjectLogAppendCommand(
  overrides: Partial<ProjectLogAppendCommandDependencies> = {},
): Command {
  const dependencies = { ...DEFAULT_COMMAND_DEPENDENCIES, ...overrides };

  return new Command('append')
    .description('Append a validated entry to the active project log')
    .option('--structural', 'Write a structural lifecycle entry')
    .option(
      '--type <type>',
      'Judgment type: bug, friction, worked-well, feedback',
    )
    .option('--scope <scope>', 'Judgment scope: project or general')
    .option(
      '--area <area>',
      'Short single-line judgment area (maximum 120 characters)',
    )
    .option('--producer <producer>', 'Structural producer skill or command')
    .option('--ref <ref>', 'Structural phase, scope, or artifact reference')
    .option('--body <text>', 'Entry body, or - to read the body from stdin')
    .option('--version-note <text>', 'Append an observed-on version clause')
    .option(
      '--project <path>',
      'Explicit project path; defaults to the active project',
    )
    .addHelpText(
      'after',
      `
Entry contract:
  Log breaks, surprises, workarounds, or notable successes; record evidence, not narrative.
  worked-well entries are do-not-regress evidence. Judgment bodies should use 1–3 sentences.
  High-value judgments may use Observation:, Impact:, and Recommendation: fields.
  Structural bodies are one line and reference artifacts by path instead of inlining them.
  Add --version-note for tool-related observations.
  Never record secret values (tokens, keys, signed URLs, or credentials); reference secrets by name or source.
  Prior entries are never edited or struck through. Append a new judgment entry that references and explains a correction.

Heading grammars:
  ### YYYY-MM-DD · <project|general> · <bug|friction|worked-well|feedback> · <area>
  ### YYYY-MM-DD · structural · <producer> · <ref>
`,
    )
    .action(async (options: AppendCommandOptions, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runAppendCommand(options, context, dependencies);
    });
}
