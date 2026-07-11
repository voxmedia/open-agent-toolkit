import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { VALID_CLAUDE_DISPATCH_CEILINGS } from '@config/oat-config';
import { fileExists } from '@fs/io';

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

export interface CodexRunOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
}

export interface CodexRunResult {
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
  runCodex: (
    args: string[],
    options: CodexRunOptions,
  ) => Promise<CodexRunResult>;
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

export interface CursorTaskProbeResult extends MatrixCellAvailabilityResult {
  decisive: boolean;
  evidence: 'task-probe' | 'subagent-allow-list' | 'none';
}

export interface CursorCatalogResult {
  status: 'resolved' | 'unavailable' | 'failed';
  candidates: string[];
  sourceCommand: 'models' | 'list-models' | null;
  diagnostic: string | null;
}

interface CursorCatalogEntry {
  slug: string;
}

interface CodexCatalogEntry {
  slug: string;
  supportedEfforts: string[] | null;
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

async function runCodex(
  args: string[],
  options: CodexRunOptions,
): Promise<CodexRunResult> {
  try {
    const { stdout, stderr } = await execFileAsync('codex', args, {
      cwd: options.cwd,
      env: options.env,
      maxBuffer: 16 * 1024 * 1024,
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
  runCodex,
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

const CURSOR_SUBAGENT_PROBE_SENTINEL = 'OAT_CURSOR_SUBAGENT_MODEL_VALID';

function hasCursorSubagentProbeSentinel(stdout: string): boolean {
  return stdout
    .split(/\r?\n/)
    .some((line) => line.trim() === CURSOR_SUBAGENT_PROBE_SENTINEL);
}

function cursorSubagentProbePrompt(model: string): string {
  return [
    'Validate whether a Cursor subagent Task can be launched with a specific model.',
    `Use the Task tool once with model "${model}" and ask the subagent to reply exactly: ${CURSOR_SUBAGENT_PROBE_SENTINEL}.`,
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

function availabilityDependencies(
  options: ValidateMatrixCellOptions,
): AvailabilityOracleDependencies {
  return {
    ...DEFAULT_DEPENDENCIES,
    env: options.env ?? DEFAULT_DEPENDENCIES.env,
    ...options.dependencies,
  };
}

function cursorCatalogDiagnostic(
  results: CursorAgentRunResult[],
): string | null {
  const messages = unique(
    results
      .flatMap((result) => [result.stderr, result.stdout])
      .map((message) => message.trim())
      .filter((message) => message.length > 0),
  );
  return messages.length > 0 ? messages.join('\n') : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringFromUnknown(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function extractCodexEffort(value: unknown): string | null {
  if (typeof value === 'string') {
    return stringFromUnknown(value);
  }

  if (!isRecord(value)) {
    return null;
  }

  return (
    stringFromUnknown(value.effort) ??
    stringFromUnknown(value.id) ??
    stringFromUnknown(value.name)
  );
}

function extractCodexEfforts(model: Record<string, unknown>): string[] {
  const efforts: string[] = [];
  for (const key of [
    'supported_reasoning_levels',
    'supported_reasoning_efforts',
    'supported_efforts',
  ]) {
    const value = model[key];
    if (!Array.isArray(value)) {
      continue;
    }
    efforts.push(
      ...value
        .map(extractCodexEffort)
        .filter((effort): effort is string => effort !== null),
    );
  }

  const defaultEffort = stringFromUnknown(model.default_reasoning_level);
  if (defaultEffort) {
    efforts.push(defaultEffort);
  }

  return unique(efforts);
}

function parseCodexCatalog(stdout: string): CodexCatalogEntry[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout) as unknown;
  } catch {
    return null;
  }

  if (!isRecord(parsed) || !Array.isArray(parsed.models)) {
    return null;
  }

  const entries: CodexCatalogEntry[] = [];
  for (const model of parsed.models) {
    if (!isRecord(model)) {
      continue;
    }
    const slug = stringFromUnknown(model.slug);
    if (!slug) {
      continue;
    }
    const supportedEfforts = extractCodexEfforts(model);
    entries.push({
      slug,
      supportedEfforts: supportedEfforts.length > 0 ? supportedEfforts : null,
    });
  }

  return entries.length > 0 ? entries : null;
}

function codexTargetFromValue(
  value: string,
  target?: ValidateMatrixCellOptions['target'],
): { model: string | null; effort: string | null } {
  const targetModel = stringFromUnknown(target?.model);
  const targetEffort = stringFromUnknown(target?.effort);
  if (targetModel && targetEffort) {
    return { model: targetModel, effort: targetEffort };
  }

  const [model, effort] = value.split('/');
  return {
    model: stringFromUnknown(model),
    effort: stringFromUnknown(effort),
  };
}

function codexUnsupportedEffortMessage(
  model: string,
  effort: string,
  supportedEfforts: string[],
): string {
  return `Codex debug models lists '${model}', but effort '${effort}' is not supported. Supported Codex efforts: ${supportedEfforts.join(
    ', ',
  )}.`;
}

async function validateCodexCell(
  value: string,
  cwd: string,
  dependencies: AvailabilityOracleDependencies,
  target?: ValidateMatrixCellOptions['target'],
): Promise<MatrixCellAvailabilityResult> {
  const { model, effort } = codexTargetFromValue(value, target);
  if (!model || !effort || value.trim().length === 0) {
    return { availability: 'unknown-value' };
  }

  const result = await dependencies.runCodex(['debug', 'models'], {
    cwd,
    env: dependencies.env ?? process.env,
  });
  if (!result.ok) {
    return { availability: 'unvalidated' };
  }

  const catalog = parseCodexCatalog(result.stdout);
  if (!catalog) {
    return { availability: 'unvalidated' };
  }

  const entry = catalog.find((modelEntry) => modelEntry.slug === model);
  if (!entry) {
    return {
      availability: 'unknown-value',
      message: `Codex debug models does not list '${model}'.`,
    };
  }

  if (!entry.supportedEfforts) {
    return {
      availability: 'unvalidated',
      message: `Codex debug models lists '${model}', but supported reasoning efforts could not be parsed.`,
    };
  }

  if (!entry.supportedEfforts.includes(effort)) {
    return {
      availability: 'unknown-value',
      allowedValues: entry.supportedEfforts,
      message: codexUnsupportedEffortMessage(
        model,
        effort,
        entry.supportedEfforts,
      ),
    };
  }

  return { availability: 'valid' };
}

export async function probeCursorSubagentModel(
  value: string,
  options: ValidateMatrixCellOptions,
): Promise<CursorTaskProbeResult> {
  const dependencies = availabilityDependencies(options);
  const env = dependencies.env ?? process.env;
  const runOptions = { cwd: options.cwd, env };
  const probeResult = await dependencies.runCursorAgent(
    cursorSubagentProbeArgs(value, env),
    runOptions,
  );
  const probeOutput = `${probeResult.stdout}\n${probeResult.stderr}`;

  if (probeResult.ok && hasCursorSubagentProbeSentinel(probeResult.stdout)) {
    return {
      availability: 'valid',
      decisive: true,
      evidence: 'task-probe',
    };
  }

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
      decisive: true,
      evidence: 'subagent-allow-list',
    };
  }

  return {
    availability: 'unvalidated',
    decisive: false,
    evidence: 'none',
  };
}

export async function resolveCursorModelCatalog(
  options: ValidateMatrixCellOptions,
): Promise<CursorCatalogResult> {
  const dependencies = availabilityDependencies(options);
  const env = dependencies.env ?? process.env;
  const runOptions = { cwd: options.cwd, env };
  const attempts: CursorAgentRunResult[] = [];

  const modelsResult = await dependencies.runCursorAgent(
    [...apiKeyArgs(env), 'models'],
    runOptions,
  );
  attempts.push(modelsResult);
  if (modelsResult.ok) {
    const candidates = parseCursorCatalog(modelsResult.stdout).map(
      (entry) => entry.slug,
    );
    if (candidates.length > 0) {
      return {
        status: 'resolved',
        candidates,
        sourceCommand: 'models',
        diagnostic: null,
      };
    }
  }

  const listResult = await dependencies.runCursorAgent(
    [...apiKeyArgs(env), '--list-models'],
    runOptions,
  );
  attempts.push(listResult);
  if (listResult.ok) {
    const candidates = parseCursorCatalog(listResult.stdout).map(
      (entry) => entry.slug,
    );
    if (candidates.length > 0) {
      return {
        status: 'resolved',
        candidates,
        sourceCommand: 'list-models',
        diagnostic: null,
      };
    }
  }

  return {
    status: attempts.every((result) => !result.ok) ? 'unavailable' : 'failed',
    candidates: [],
    sourceCommand: null,
    diagnostic: cursorCatalogDiagnostic(attempts),
  };
}

export async function validateCursorSubagentModel(
  value: string,
  options: ValidateMatrixCellOptions,
): Promise<MatrixCellAvailabilityResult> {
  const taskProbe = await probeCursorSubagentModel(value, options);
  if (taskProbe.decisive) {
    const { decisive: _decisive, evidence: _evidence, ...result } = taskProbe;
    return result;
  }

  const catalog = await resolveCursorModelCatalog(options);
  if (catalog.status === 'resolved') {
    const availability: MatrixCellAvailability = catalog.candidates.includes(
      value,
    )
      ? 'valid'
      : 'unknown-value';
    return {
      availability: availability === 'valid' ? 'unvalidated' : 'unknown-value',
      message: cursorCatalogContextMessage(value, availability),
    };
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

  const dependencies = availabilityDependencies(options);

  if (normalizedProvider === 'claude') {
    const availability = (
      VALID_CLAUDE_DISPATCH_CEILINGS as readonly string[]
    ).includes(normalizedValue)
      ? 'valid'
      : 'unknown-value';
    return options.detailed ? { availability } : availability;
  }

  if (normalizedProvider === 'codex') {
    const result = await validateCodexCell(
      normalizedValue,
      options.cwd,
      dependencies,
      options.target,
    );
    return options.detailed ? result : result.availability;
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
