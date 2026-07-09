import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { VALID_CLAUDE_DISPATCH_CEILINGS } from '@config/oat-config';
import { fileExists } from '@fs/io';
import { buildCodexMaterializedRoleName } from '@providers/codex/codec/materialize';

const execFileAsync = promisify(execFile);

export type MatrixCellAvailability = 'valid' | 'unknown-value' | 'unvalidated';

export interface MatrixCellAvailabilityResult {
  availability: MatrixCellAvailability;
  allowedValues?: string[];
  message?: string;
}

export type MatrixCellAvailabilityResponse =
  | MatrixCellAvailability
  | MatrixCellAvailabilityResult;

export interface CursorAgentRunOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
}

export interface CursorAgentRunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

export interface AvailabilityOracleDependencies {
  pathExists: (path: string) => Promise<boolean>;
  runCursorAgent: (
    args: string[],
    options: CursorAgentRunOptions,
  ) => Promise<CursorAgentRunResult>;
  env?: NodeJS.ProcessEnv;
}

export interface ValidateMatrixCellOptions {
  cwd: string;
  detailed?: boolean;
  env?: NodeJS.ProcessEnv;
  dependencies?: Partial<AvailabilityOracleDependencies>;
  target?: {
    model?: string;
    effort?: string;
  } | null;
}

interface CursorCatalogEntry {
  slug: string;
}

export function normalizeMatrixCellAvailability(
  result: MatrixCellAvailabilityResponse,
): MatrixCellAvailabilityResult {
  return typeof result === 'string' ? { availability: result } : result;
}

async function runCursorAgent(
  args: string[],
  options: CursorAgentRunOptions,
): Promise<CursorAgentRunResult> {
  try {
    const { stdout, stderr } = await execFileAsync('cursor-agent', args, {
      cwd: options.cwd,
      env: options.env,
      maxBuffer: 1024 * 1024,
      timeout: 10_000,
    });
    return {
      ok: true,
      stdout: String(stdout),
      stderr: String(stderr),
    };
  } catch (error) {
    const failure = error as Error & {
      stdout?: string | Buffer;
      stderr?: string | Buffer;
    };
    return {
      ok: false,
      stdout: String(failure.stdout ?? ''),
      stderr: String(failure.stderr ?? failure.message),
    };
  }
}

const DEFAULT_DEPENDENCIES: AvailabilityOracleDependencies = {
  pathExists: fileExists,
  runCursorAgent,
  env: process.env,
};

function apiKeyArgs(env: NodeJS.ProcessEnv): string[] {
  const apiKey = env.CURSOR_API_KEY;
  return typeof apiKey === 'string' && apiKey.length > 0
    ? ['--api-key', apiKey]
    : [];
}

function parseCursorCatalog(stdout: string): CursorCatalogEntry[] {
  const entries: CursorCatalogEntry[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^(\S+)\s+-\s+(.+)$/);
    if (!match) {
      continue;
    }
    const [, slug] = match;
    if (slug) {
      entries.push({ slug });
    }
  }
  return entries;
}

function availabilityFromCursorCatalog(
  value: string,
  stdout: string,
): MatrixCellAvailability | null {
  const entries = parseCursorCatalog(stdout);
  if (entries.length === 0) {
    return null;
  }
  return entries.some((entry) => entry.slug === value)
    ? 'valid'
    : 'unknown-value';
}

function cursorSubagentProbePrompt(model: string): string {
  return [
    'Validate whether a Cursor subagent Task can be launched with a specific model.',
    `Use the Task tool once with model "${model}" and ask the subagent to reply exactly: OAT_CURSOR_SUBAGENT_MODEL_VALID.`,
    'After the subagent returns, print only its exact reply.',
  ].join('\n');
}

function cursorSubagentProbeArgs(
  model: string,
  env: NodeJS.ProcessEnv,
): string[] {
  return [
    ...apiKeyArgs(env),
    '-p',
    cursorSubagentProbePrompt(model),
    '--output-format=text',
    '--force',
  ];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function extractModelSlugs(value: string): string[] {
  const matches = value.match(/\b[a-z][a-z0-9]*(?:[-.][a-z0-9]+)+\b/gi) ?? [];
  return unique(
    matches
      .map((match) => match.replace(/[),.;:]+$/g, ''))
      .filter((match) => /\d/.test(match)),
  );
}

function parseCursorAllowedSubagentModels(output: string): string[] {
  const sections: string[] = [];
  const patterns = [
    /\ballowed\s+(?:subagent\s+)?models?\s*:?\s*([^\n]+)/gi,
    /\bsupported\s+(?:subagent\s+)?models?\s*:?\s*([^\n]+)/gi,
    /\bvalid\s+(?:subagent\s+)?models?\s*:?\s*([^\n]+)/gi,
    /\bone\s+of\s*:?\s*([^\n]+)/gi,
  ];

  for (const pattern of patterns) {
    for (const match of output.matchAll(pattern)) {
      if (match[1]) {
        sections.push(match[1]);
      }
    }
  }

  return unique(sections.flatMap(extractModelSlugs));
}

function cursorAllowedModelsMessage(allowedValues: string[]): string {
  return `Allowed subagent models: ${allowedValues.join(', ')}.`;
}

function cursorRejectedMessage(allowedValues: string[]): string {
  return `Cursor rejected this model for subagent Task dispatch. ${cursorAllowedModelsMessage(
    allowedValues,
  )}`;
}

function cursorCatalogContextMessage(
  value: string,
  availability: MatrixCellAvailability | null,
): string | undefined {
  if (availability === 'valid') {
    return `Cursor's broad model catalog lists '${value}', but subagent Task dispatch could not be validated.`;
  }
  if (availability === 'unknown-value') {
    return `Cursor's broad model catalog does not list '${value}'.`;
  }
  return undefined;
}

async function validateCodexCell(
  value: string,
  cwd: string,
  dependencies: AvailabilityOracleDependencies,
  target?: ValidateMatrixCellOptions['target'],
): Promise<MatrixCellAvailability> {
  const model = target?.model?.trim();
  const effort = target?.effort?.trim();
  if (!model || !effort || value.trim().length === 0) {
    return 'unknown-value';
  }

  try {
    const implementerRole = buildCodexMaterializedRoleName({
      agentName: 'oat-phase-implementer',
      model,
      effort,
    });
    const reviewerRole = buildCodexMaterializedRoleName({
      agentName: 'oat-reviewer',
      model,
      effort,
    });
    const implementerExists = await dependencies.pathExists(
      join(cwd, '.codex', 'agents', `${implementerRole}.toml`),
    );
    const reviewerExists = await dependencies.pathExists(
      join(cwd, '.codex', 'agents', `${reviewerRole}.toml`),
    );
    return implementerExists && reviewerExists ? 'valid' : 'unknown-value';
  } catch {
    return 'unvalidated';
  }
}

export async function validateCursorSubagentModel(
  value: string,
  options: ValidateMatrixCellOptions,
): Promise<MatrixCellAvailabilityResult> {
  const dependencies: AvailabilityOracleDependencies = {
    ...DEFAULT_DEPENDENCIES,
    env: options.env ?? DEFAULT_DEPENDENCIES.env,
    ...options.dependencies,
  };
  const env = dependencies.env ?? process.env;
  const runOptions = { cwd: options.cwd, env };
  const probeResult = await dependencies.runCursorAgent(
    cursorSubagentProbeArgs(value, env),
    runOptions,
  );

  if (probeResult.ok) {
    return { availability: 'valid' };
  }

  const probeOutput = `${probeResult.stdout}\n${probeResult.stderr}`;
  const allowedValues = parseCursorAllowedSubagentModels(probeOutput);
  if (allowedValues.length > 0) {
    const availability = allowedValues.includes(value)
      ? 'valid'
      : 'unknown-value';
    return {
      availability,
      allowedValues,
      message:
        availability === 'valid'
          ? cursorAllowedModelsMessage(allowedValues)
          : cursorRejectedMessage(allowedValues),
    };
  }

  const modelsResult = await dependencies.runCursorAgent(
    [...apiKeyArgs(env), 'models'],
    runOptions,
  );
  if (modelsResult.ok) {
    const availability = availabilityFromCursorCatalog(
      value,
      modelsResult.stdout,
    );
    if (availability !== null) {
      return {
        availability:
          availability === 'valid' ? 'unvalidated' : 'unknown-value',
        message: cursorCatalogContextMessage(value, availability),
      };
    }
  }

  const listResult = await dependencies.runCursorAgent(
    [...apiKeyArgs(env), '--list-models'],
    runOptions,
  );
  if (listResult.ok) {
    const availability = availabilityFromCursorCatalog(
      value,
      listResult.stdout,
    );
    if (availability !== null) {
      return {
        availability:
          availability === 'valid' ? 'unvalidated' : 'unknown-value',
        message: cursorCatalogContextMessage(value, availability),
      };
    }
  }

  return { availability: 'unvalidated' };
}

export async function validateMatrixCell(
  provider: string,
  value: string,
  options: ValidateMatrixCellOptions,
): Promise<MatrixCellAvailabilityResponse> {
  const normalizedProvider = provider.trim().toLowerCase();
  const normalizedValue = value.trim();
  if (!normalizedProvider || !normalizedValue) {
    return options.detailed
      ? { availability: 'unknown-value' }
      : 'unknown-value';
  }

  const dependencies: AvailabilityOracleDependencies = {
    ...DEFAULT_DEPENDENCIES,
    env: options.env ?? DEFAULT_DEPENDENCIES.env,
    ...options.dependencies,
  };

  if (normalizedProvider === 'claude') {
    const availability = (
      VALID_CLAUDE_DISPATCH_CEILINGS as readonly string[]
    ).includes(normalizedValue)
      ? 'valid'
      : 'unknown-value';
    return options.detailed ? { availability } : availability;
  }

  if (normalizedProvider === 'codex') {
    const availability = await validateCodexCell(
      normalizedValue,
      options.cwd,
      dependencies,
      options.target,
    );
    return options.detailed ? { availability } : availability;
  }

  if (normalizedProvider === 'cursor') {
    const result = await validateCursorSubagentModel(normalizedValue, {
      ...options,
      dependencies,
    });
    return options.detailed ? result : result.availability;
  }

  return options.detailed ? { availability: 'unvalidated' } : 'unvalidated';
}
