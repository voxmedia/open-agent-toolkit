import { execFile } from 'node:child_process';
import { readFile as defaultReadFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  classifyModelFamily,
  type ModelFamily,
} from '@providers/identity/family';
import type { IdentityProvenance } from '@providers/identity/provenance';
import { Command } from 'commander';

const execFileAsync = promisify(execFile);

export interface CursorAgentRunOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
}

export interface CursorAgentRunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

export interface CursorProbeDependencies {
  runCursorAgent: (
    args: string[],
    options: CursorAgentRunOptions,
  ) => Promise<CursorAgentRunResult>;
  readFile: (path: string, encoding: BufferEncoding) => Promise<string>;
  env?: NodeJS.ProcessEnv;
}

interface CursorCurrentTargetCommandDependencies extends CursorProbeDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
}

export type CursorCurrentTargetSource =
  | 'cursor-agent models'
  | '--list-models'
  | 'init-event'
  | 'cli-config'
  | 'unknown';

export interface CursorCurrentTarget {
  value: string;
  source: CursorCurrentTargetSource;
  provenance: IdentityProvenance;
  family: ModelFamily;
  rawValue?: string;
}

interface CatalogEntry {
  slug: string;
  displayName: string;
  current: boolean;
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

const DEFAULT_DEPENDENCIES: CursorCurrentTargetCommandDependencies = {
  buildCommandContext,
  runCursorAgent,
  readFile: async (path, encoding) => defaultReadFile(path, encoding),
  env: process.env,
};

function apiKeyArgs(env: NodeJS.ProcessEnv): string[] {
  const apiKey = env.CURSOR_API_KEY;
  return typeof apiKey === 'string' && apiKey.length > 0
    ? ['--api-key', apiKey]
    : [];
}

function buildModelsArgs(env: NodeJS.ProcessEnv): string[] {
  return [...apiKeyArgs(env), 'models'];
}

function buildListModelsArgs(env: NodeJS.ProcessEnv): string[] {
  return [...apiKeyArgs(env), '--list-models'];
}

function buildInitEventArgs(env: NodeJS.ProcessEnv): string[] {
  return [
    ...apiKeyArgs(env),
    '-p',
    '--mode',
    'ask',
    '--trust',
    '--output-format',
    'stream-json',
    'ok',
  ];
}

function stripMarkers(displayName: string): string {
  return displayName.replace(/\s+\((current|default)\)/gi, '').trim();
}

function parseCatalog(stdout: string): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(/^(\S+)\s+-\s+(.+)$/);
    if (!match) {
      continue;
    }
    const [, slug, display] = match;
    if (!slug || !display) {
      continue;
    }
    entries.push({
      slug,
      displayName: stripMarkers(display),
      current: /\(current\)/i.test(display),
    });
  }
  return entries;
}

function mergeCatalogEntries(
  left: CatalogEntry[],
  right: CatalogEntry[],
): CatalogEntry[] {
  const bySlug = new Map<string, CatalogEntry>();
  for (const entry of [...left, ...right]) {
    const existing = bySlug.get(entry.slug);
    bySlug.set(entry.slug, {
      ...entry,
      current: entry.current || existing?.current === true,
    });
  }
  return [...bySlug.values()];
}

function currentCatalogEntry(
  entries: CatalogEntry[],
): CatalogEntry | undefined {
  return entries.find((entry) => entry.current);
}

function isSingleToken(value: string): boolean {
  return /^\S+$/.test(value);
}

function mapThroughCatalog(
  value: string,
  catalog: CatalogEntry[],
): string | undefined {
  const normalized = value.trim();
  const match = catalog.find(
    (entry) => entry.slug === normalized || entry.displayName === normalized,
  );
  if (match) {
    return match.slug;
  }
  return isSingleToken(normalized) ? normalized : undefined;
}

function target(
  value: string,
  source: CursorCurrentTargetSource,
  provenance: IdentityProvenance,
  rawValue?: string,
): CursorCurrentTarget {
  return {
    value,
    source,
    provenance,
    family: classifyModelFamily({ value }),
    ...(rawValue && rawValue !== value ? { rawValue } : {}),
  };
}

function unknown(
  source: CursorCurrentTargetSource = 'unknown',
  rawValue?: string,
): CursorCurrentTarget {
  return target(
    'unknown',
    source,
    source === 'unknown' ? 'unknown' : 'inferred',
    rawValue,
  );
}

function parseInitEventModel(stdout: string): string | undefined {
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed) as { model?: unknown };
      if (typeof parsed.model === 'string' && parsed.model.trim().length > 0) {
        return parsed.model.trim();
      }
    } catch {
      continue;
    }
  }
  return undefined;
}

function readConfigModel(raw: string): string | undefined {
  const parsed = JSON.parse(raw) as { model?: unknown };
  return typeof parsed.model === 'string' && parsed.model.trim().length > 0
    ? parsed.model.trim()
    : undefined;
}

export async function probeCursorCurrentTarget(options: {
  cwd: string;
  home: string;
  dependencies?: Partial<CursorProbeDependencies>;
}): Promise<CursorCurrentTarget> {
  const dependencies: CursorProbeDependencies = {
    runCursorAgent,
    readFile: async (path, encoding) => defaultReadFile(path, encoding),
    env: process.env,
    ...options.dependencies,
  };
  const env = dependencies.env ?? process.env;
  const runOptions = { cwd: options.cwd, env };
  let catalog: CatalogEntry[] = [];

  const modelsResult = await dependencies.runCursorAgent(
    buildModelsArgs(env),
    runOptions,
  );
  if (modelsResult.ok) {
    catalog = mergeCatalogEntries(catalog, parseCatalog(modelsResult.stdout));
    const current = currentCatalogEntry(catalog);
    if (current) {
      return target(current.slug, 'cursor-agent models', 'inferred');
    }
  }

  const listResult = await dependencies.runCursorAgent(
    buildListModelsArgs(env),
    runOptions,
  );
  if (listResult.ok) {
    const listEntries = parseCatalog(listResult.stdout);
    catalog = mergeCatalogEntries(catalog, listEntries);
    const current = currentCatalogEntry(listEntries);
    if (current) {
      return target(current.slug, '--list-models', 'inferred');
    }
  }

  const initResult = await dependencies.runCursorAgent(
    buildInitEventArgs(env),
    runOptions,
  );
  if (initResult.ok) {
    const rawModel = parseInitEventModel(initResult.stdout);
    if (rawModel) {
      const mapped = mapThroughCatalog(rawModel, catalog);
      return mapped
        ? target(mapped, 'init-event', 'inferred', rawModel)
        : unknown('init-event', rawModel);
    }
  }

  try {
    const rawConfig = await dependencies.readFile(
      join(options.home, '.cursor', 'cli-config.json'),
      'utf8',
    );
    const rawModel = readConfigModel(rawConfig);
    if (rawModel) {
      const mapped = mapThroughCatalog(rawModel, catalog);
      return mapped
        ? target(mapped, 'cli-config', 'inferred', rawModel)
        : unknown('cli-config', rawModel);
    }
  } catch {
    return unknown();
  }

  return unknown();
}

function emitResult(
  context: CommandContext,
  result: CursorCurrentTarget,
): void {
  if (context.json) {
    context.logger.json(result);
    return;
  }
  context.logger.info(
    `${result.value} source=${result.source} provenance=${result.provenance}`,
  );
}

export function createCursorCurrentTargetCommand(
  overrides: Partial<CursorCurrentTargetCommandDependencies> = {},
): Command {
  const dependencies: CursorCurrentTargetCommandDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('cursor-current-target')
    .description('Probe the current Cursor model target')
    .option('--json', 'Output JSON')
    .action(async (_options: unknown, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      const result = await probeCursorCurrentTarget({
        cwd: context.cwd,
        home: context.home,
        dependencies,
      });
      emitResult(context, result);
    });
}
