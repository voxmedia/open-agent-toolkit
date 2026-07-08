import { execFile } from 'node:child_process';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { VALID_CLAUDE_DISPATCH_CEILINGS } from '@config/oat-config';
import { fileExists } from '@fs/io';
import { buildCodexMaterializedRoleName } from '@providers/codex/codec/materialize';

const execFileAsync = promisify(execFile);

export type MatrixCellAvailability = 'valid' | 'unknown-value' | 'unvalidated';

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

async function validateCursorCell(
  value: string,
  cwd: string,
  dependencies: AvailabilityOracleDependencies,
): Promise<MatrixCellAvailability> {
  const env = dependencies.env ?? process.env;
  const runOptions = { cwd, env };
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
      return availability;
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
      return availability;
    }
  }

  return 'unvalidated';
}

export async function validateMatrixCell(
  provider: string,
  value: string,
  options: ValidateMatrixCellOptions,
): Promise<MatrixCellAvailability> {
  const normalizedProvider = provider.trim().toLowerCase();
  const normalizedValue = value.trim();
  if (!normalizedProvider || !normalizedValue) {
    return 'unknown-value';
  }

  const dependencies: AvailabilityOracleDependencies = {
    ...DEFAULT_DEPENDENCIES,
    env: options.env ?? DEFAULT_DEPENDENCIES.env,
    ...options.dependencies,
  };

  if (normalizedProvider === 'claude') {
    return (VALID_CLAUDE_DISPATCH_CEILINGS as readonly string[]).includes(
      normalizedValue,
    )
      ? 'valid'
      : 'unknown-value';
  }

  if (normalizedProvider === 'codex') {
    return validateCodexCell(
      normalizedValue,
      options.cwd,
      dependencies,
      options.target,
    );
  }

  if (normalizedProvider === 'cursor') {
    return validateCursorCell(normalizedValue, options.cwd, dependencies);
  }

  return 'unvalidated';
}
