import { rename } from 'node:fs/promises';
import {
  basename,
  dirname,
  join,
  normalize,
  relative,
  resolve,
} from 'node:path';
import { Command } from 'commander';
import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '../../app/command-context';
import { type DriftReport, detectDrift, detectStrays } from '../../drift';
import { type CanonicalEntry, scanCanonical } from '../../engine';
import { createSymlink, ensureDir } from '../../fs/io';
import { resolveProjectRoot, resolveScopeRoot } from '../../fs/paths';
import type { Manifest } from '../../manifest';
import { computeDirectoryHash } from '../../manifest/hash';
import { addEntry, loadManifest, saveManifest } from '../../manifest/manager';
import type { ManifestEntry } from '../../manifest/manifest.types';
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
  type ConcreteScope,
  type ContentType,
  SCOPE_CONTENT_TYPES,
  type Scope,
} from '../../shared/types';
import { formatStatusTable } from '../../ui/output';
import { readGlobalOptions, resolveConcreteScopes } from '../shared';

const DEFAULT_REMEDIATION = 'Run "oat init" to adopt stray entries.';
const ADOPT_PROMPT_PREFIX = 'Adopt stray';

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
  saveManifest: (manifestPath: string, manifest: Manifest) => Promise<void>;
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
  adoptStray: (
    scopeRoot: string,
    stray: StatusStrayCandidate,
    manifest: Manifest,
  ) => Promise<Manifest>;
  formatStatusTable: (reports: DriftReport[]) => string;
}

interface StatusStrayCandidate {
  provider: string;
  report: DriftReport;
  mapping: PathMapping;
}

interface ScopeReportCollection {
  scopeRoot: string;
  manifestPath: string;
  manifest: Manifest;
  reports: DriftReport[];
  strayCandidates: StatusStrayCandidate[];
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
  saveManifest,
  scanCanonical,
  getAdapters() {
    return [claudeAdapter, cursorAdapter, codexAdapter];
  },
  getActiveAdapters,
  getSyncMappings,
  detectDrift,
  detectStrays,
  confirmAction,
  adoptStray: adoptStrayDefault,
  formatStatusTable,
};

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

function canonicalInsideMapping(
  canonicalPath: string,
  mappingCanonicalDir: string,
): boolean {
  const normalizedCanonicalPath = normalizePath(canonicalPath);
  const normalizedCanonicalDir = normalizePath(mappingCanonicalDir);
  return (
    normalizedCanonicalPath === normalizedCanonicalDir ||
    normalizedCanonicalPath.startsWith(`${normalizedCanonicalDir}/`)
  );
}

function contentTypeAllowed(
  contentType: ContentType,
  scope: ConcreteScope,
): boolean {
  return SCOPE_CONTENT_TYPES[scope].includes(contentType);
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

async function adoptStrayDefault(
  scopeRoot: string,
  stray: StatusStrayCandidate,
  manifest: Manifest,
): Promise<Manifest> {
  const providerAbsolutePath = resolve(scopeRoot, stray.report.providerPath);
  const entryName = basename(stray.report.providerPath);
  const canonicalAbsolutePath = resolve(
    scopeRoot,
    stray.mapping.canonicalDir,
    entryName,
  );

  await ensureDir(dirname(canonicalAbsolutePath));
  await rename(providerAbsolutePath, canonicalAbsolutePath);
  const strategy = await createSymlink(
    canonicalAbsolutePath,
    providerAbsolutePath,
  );

  const canonicalPath = normalizePath(
    relative(scopeRoot, canonicalAbsolutePath),
  );
  const providerPath = normalizePath(relative(scopeRoot, providerAbsolutePath));
  const manifestEntry: ManifestEntry = {
    canonicalPath,
    providerPath,
    provider: stray.provider,
    contentType: stray.mapping.contentType,
    strategy,
    contentHash:
      strategy === 'copy'
        ? await computeDirectoryHash(canonicalAbsolutePath)
        : null,
    lastSynced: new Date().toISOString(),
  };

  return addEntry(manifest, manifestEntry);
}

async function collectScopeReports(
  scope: ConcreteScope,
  context: CommandContext,
  dependencies: StatusDependencies,
): Promise<ScopeReportCollection> {
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
  const strayCandidates: StatusStrayCandidate[] = [];
  const trackedCanonicalByProvider = new Set(
    manifest.entries.map(
      (entry) => `${entry.provider}|${normalizePath(entry.canonicalPath)}`,
    ),
  );

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
      for (const canonicalEntry of canonicalEntries) {
        if (canonicalEntry.type !== mapping.contentType) {
          continue;
        }

        const canonicalPath = normalizePath(
          relative(scopeRoot, canonicalEntry.canonicalPath),
        );
        if (!canonicalInsideMapping(canonicalPath, mapping.canonicalDir)) {
          continue;
        }

        const trackedKey = `${adapter.name}|${canonicalPath}`;
        if (trackedCanonicalByProvider.has(trackedKey)) {
          continue;
        }

        reports.push({
          canonical: canonicalPath,
          provider: adapter.name,
          providerPath: normalizePath(
            join(mapping.providerDir, canonicalEntry.name),
          ),
          state: { status: 'missing' },
        });
      }
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
      for (const stray of strays) {
        if (stray.state.status !== 'stray') {
          continue;
        }
        strayCandidates.push({
          provider: adapter.name,
          report: stray,
          mapping,
        });
      }
    }
  }

  return {
    scopeRoot,
    manifestPath,
    manifest,
    reports,
    strayCandidates,
  };
}

async function runStatusCommand(
  context: CommandContext,
  dependencies: StatusDependencies,
): Promise<void> {
  const reports: DriftReport[] = [];
  const scopeCollections: ScopeReportCollection[] = [];

  for (const scope of resolveConcreteScopes(context.scope)) {
    const scopeReportCollection = await collectScopeReports(
      scope,
      context,
      dependencies,
    );
    reports.push(...scopeReportCollection.reports);
    scopeCollections.push(scopeReportCollection);
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
      for (const scopeCollection of scopeCollections) {
        let manifestChanged = false;

        for (const strayCandidate of scopeCollection.strayCandidates) {
          const shouldAdopt = await dependencies.confirmAction(
            `${ADOPT_PROMPT_PREFIX} ${strayCandidate.report.providerPath} from ${strayCandidate.provider}?`,
            { interactive: context.interactive },
          );
          if (!shouldAdopt) {
            continue;
          }

          scopeCollection.manifest = await dependencies.adoptStray(
            scopeCollection.scopeRoot,
            strayCandidate,
            scopeCollection.manifest,
          );
          manifestChanged = true;
        }

        if (manifestChanged) {
          await dependencies.saveManifest(
            scopeCollection.manifestPath,
            scopeCollection.manifest,
          );
        }
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
