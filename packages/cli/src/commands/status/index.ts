import { join, normalize } from 'node:path';
import { Command } from 'commander';
import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '../../app/command-context';
import { type DriftReport, detectDrift, detectStrays } from '../../drift';
import { type CanonicalEntry, scanCanonical } from '../../engine';
import { resolveProjectRoot, resolveScopeRoot } from '../../fs/paths';
import { loadManifest, type Manifest } from '../../manifest';
import { claudeAdapter } from '../../providers/claude';
import { codexAdapter } from '../../providers/codex';
import { cursorAdapter } from '../../providers/cursor';
import {
  getActiveAdapters,
  getSyncMappings,
  type PathMapping,
  type ProviderAdapter,
} from '../../providers/shared';
import { confirmAction, type PromptContext } from '../../shared/prompts';
import {
  type ContentType,
  SCOPE_CONTENT_TYPES,
  type Scope,
} from '../../shared/types';
import { formatStatusTable } from '../../ui/output';

type ConcreteScope = Exclude<Scope, 'all'>;

const DEFAULT_REMEDIATION = 'Run "oat init" to adopt stray entries.';

interface StatusSummary {
  total: number;
  inSync: number;
  drifted: number;
  missing: number;
  stray: number;
}

interface StatusJsonPayload {
  scope: Scope;
  reports: DriftReport[];
  summary: StatusSummary;
  remediation?: string;
}

interface StatusDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveScopeRoot: (
    scope: ConcreteScope,
    context: CommandContext,
  ) => Promise<string>;
  loadManifest: (manifestPath: string) => Promise<Manifest>;
  scanCanonical: (
    scopeRoot: string,
    scope: ConcreteScope,
  ) => Promise<CanonicalEntry[]>;
  getAdapters: () => ProviderAdapter[];
  getActiveAdapters: (
    adapters: ProviderAdapter[],
    scopeRoot: string,
  ) => Promise<ProviderAdapter[]>;
  getSyncMappings: (adapter: ProviderAdapter, scope: Scope) => PathMapping[];
  detectDrift: (
    entry: Manifest['entries'][number],
    scopeRoot: string,
  ) => Promise<DriftReport>;
  detectStrays: (
    provider: string,
    providerDir: string,
    manifest: Manifest,
    canonicalEntries: CanonicalEntry[],
  ) => Promise<DriftReport[]>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
  formatStatusTable: (reports: DriftReport[]) => string;
}

const DEFAULT_DEPENDENCIES: StatusDependencies = {
  buildCommandContext,
  async resolveScopeRoot(scope, context) {
    if (scope === 'project') {
      return resolveProjectRoot(context.cwd);
    }

    return resolveScopeRoot(scope, context.cwd, context.home);
  },
  loadManifest,
  scanCanonical,
  getAdapters() {
    return [claudeAdapter, cursorAdapter, codexAdapter];
  },
  getActiveAdapters,
  getSyncMappings,
  detectDrift,
  detectStrays,
  confirmAction,
  formatStatusTable,
};

function readGlobalOptions(command: Command): GlobalOptions {
  return command.optsWithGlobals() as GlobalOptions;
}

function normalizePath(inputPath: string): string {
  return normalize(inputPath).replaceAll('\\', '/');
}

function entryInsideMapping(
  entryProviderPath: string,
  mappingProviderDir: string,
): boolean {
  const normalizedEntryPath = normalizePath(entryProviderPath);
  const normalizedProviderDir = normalizePath(mappingProviderDir);
  return (
    normalizedEntryPath === normalizedProviderDir ||
    normalizedEntryPath.startsWith(`${normalizedProviderDir}/`)
  );
}

function contentTypeAllowed(
  contentType: ContentType,
  scope: ConcreteScope,
): boolean {
  return SCOPE_CONTENT_TYPES[scope].includes(contentType);
}

function resolveScopes(scope: Scope): ConcreteScope[] {
  if (scope === 'all') {
    return ['project', 'user'];
  }
  return [scope];
}

function summarizeReports(reports: DriftReport[]): StatusSummary {
  const summary: StatusSummary = {
    total: reports.length,
    inSync: 0,
    drifted: 0,
    missing: 0,
    stray: 0,
  };

  for (const report of reports) {
    if (report.state.status === 'in_sync') {
      summary.inSync += 1;
      continue;
    }

    if (report.state.status === 'drifted') {
      summary.drifted += 1;
      continue;
    }

    if (report.state.status === 'missing') {
      summary.missing += 1;
      continue;
    }

    summary.stray += 1;
  }

  return summary;
}

async function collectScopeReports(
  scope: ConcreteScope,
  context: CommandContext,
  dependencies: StatusDependencies,
): Promise<DriftReport[]> {
  const scopeRoot = await dependencies.resolveScopeRoot(scope, context);
  const manifestPath = join(scopeRoot, '.oat', 'sync', 'manifest.json');
  const manifest = await dependencies.loadManifest(manifestPath);
  const canonicalEntries = await dependencies.scanCanonical(scopeRoot, scope);
  const adapters = dependencies.getAdapters();
  const activeAdapters = await dependencies.getActiveAdapters(
    adapters,
    scopeRoot,
  );
  const reports: DriftReport[] = [];

  for (const adapter of activeAdapters) {
    const mappings = dependencies.getSyncMappings(adapter, scope);
    const mappingContentTypes = new Set(
      mappings.map((mapping) => mapping.contentType),
    );

    for (const entry of manifest.entries) {
      if (entry.provider !== adapter.name) {
        continue;
      }
      if (!mappingContentTypes.has(entry.contentType)) {
        continue;
      }
      if (!contentTypeAllowed(entry.contentType, scope)) {
        continue;
      }
      if (
        !mappings.some((mapping) =>
          entryInsideMapping(entry.providerPath, mapping.providerDir),
        )
      ) {
        continue;
      }

      reports.push(await dependencies.detectDrift(entry, scopeRoot));
    }

    for (const mapping of mappings) {
      const providerDir = join(scopeRoot, mapping.providerDir);
      const strays = await dependencies.detectStrays(
        adapter.name,
        providerDir,
        manifest,
        canonicalEntries,
      );
      reports.push(...strays);
    }
  }

  return reports;
}

async function runStatusCommand(
  context: CommandContext,
  dependencies: StatusDependencies,
): Promise<void> {
  const reports: DriftReport[] = [];

  for (const scope of resolveScopes(context.scope)) {
    const scopeReports = await collectScopeReports(
      scope,
      context,
      dependencies,
    );
    reports.push(...scopeReports);
  }

  const summary = summarizeReports(reports);
  const hasIssues = summary.total > 0 && summary.inSync !== summary.total;

  if (context.json) {
    const payload: StatusJsonPayload = {
      scope: context.scope,
      reports,
      summary,
    };
    if (!context.interactive && summary.stray > 0) {
      payload.remediation = DEFAULT_REMEDIATION;
    }
    context.logger.json(payload);
  } else {
    context.logger.info(dependencies.formatStatusTable(reports));
  }

  if (summary.stray > 0) {
    if (context.interactive) {
      const shouldAdopt = await dependencies.confirmAction(
        'Stray entries detected. Adopt them now with `oat init`?',
        { interactive: context.interactive },
      );
      if (shouldAdopt && !context.json) {
        context.logger.info(DEFAULT_REMEDIATION);
      }
    } else if (!context.json) {
      context.logger.warn(DEFAULT_REMEDIATION);
    }
  }

  process.exitCode = hasIssues ? 1 : 0;
}

export function createStatusCommand(
  overrides: Partial<StatusDependencies> = {},
): Command {
  const dependencies: StatusDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('status')
    .description('Report provider sync and drift status')
    .action(async (_options, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      await runStatusCommand(context, dependencies);
    });
}
