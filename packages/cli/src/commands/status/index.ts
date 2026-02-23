import { basename, join, relative } from 'node:path';
import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import {
  adoptStrayToCanonical,
  isAdoptionConflictError,
} from '@commands/shared/adopt-stray';
import {
  type CodexRoleStray,
  detectCodexRoleStrays,
  regenerateCodexAfterAdoption,
} from '@commands/shared/codex-strays';
import {
  confirmAction,
  type MultiSelectChoice,
  type PromptContext,
  selectManyWithAbort,
} from '@commands/shared/shared.prompts';
import {
  readGlobalOptions,
  resolveConcreteScopes,
} from '@commands/shared/shared.utils';
import { type DriftReport, detectDrift, detectStrays } from '@drift/index';
import { type CanonicalEntry, scanCanonical } from '@engine/index';
import {
  normalizeToPosixPath,
  resolveProjectRoot,
  resolveScopeRoot,
} from '@fs/paths';
import type { Manifest } from '@manifest/index';
import { loadManifest, saveManifest } from '@manifest/manager';
import { claudeAdapter } from '@providers/claude';
import { codexAdapter } from '@providers/codex';
import {
  applyCodexProjectExtensionPlan,
  type CodexExtensionPlan,
  computeCodexProjectExtensionPlan,
} from '@providers/codex/codec/sync-extension';
import { copilotAdapter } from '@providers/copilot';
import { cursorAdapter } from '@providers/cursor';
import { geminiAdapter } from '@providers/gemini';
import {
  getActiveAdapters,
  getSyncMappings,
  type PathMapping,
  type ProviderAdapter,
} from '@providers/shared';
import {
  type ConcreteScope,
  type ContentType,
  SCOPE_CONTENT_TYPES,
  type Scope,
} from '@shared/types';
import { formatStatusTable } from '@ui/output';
import { Command } from 'commander';

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
  detectCodexRoleStrays: (
    scopeRoot: string,
    canonicalEntries: CanonicalEntry[],
  ) => Promise<CodexRoleStray[]>;
  computeCodexProjectExtensionPlan: (
    scopeRoot: string,
    canonicalEntries: CanonicalEntry[],
  ) => Promise<CodexExtensionPlan>;
  applyCodexProjectExtensionPlan: (
    scopeRoot: string,
    plan: CodexExtensionPlan,
  ) => Promise<unknown>;
  selectManyWithAbort: <T extends string>(
    message: string,
    choices: MultiSelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T[] | null>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
  adoptStray: (
    scopeRoot: string,
    stray: StatusStrayCandidate,
    manifest: Manifest,
    options?: { replaceCanonical?: boolean },
  ) => Promise<Manifest>;
  formatStatusTable: (reports: DriftReport[]) => string;
}

interface StatusStrayCandidate {
  provider: string;
  report: DriftReport;
  mapping: PathMapping;
  adoption?: {
    kind: 'codex_role';
    roleName: string;
    description?: string;
  };
}

interface ScopeReportCollection {
  scope: ConcreteScope;
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
    return [
      claudeAdapter,
      cursorAdapter,
      codexAdapter,
      copilotAdapter,
      geminiAdapter,
    ];
  },
  getActiveAdapters,
  getSyncMappings,
  detectDrift,
  detectStrays,
  detectCodexRoleStrays,
  computeCodexProjectExtensionPlan,
  applyCodexProjectExtensionPlan,
  selectManyWithAbort,
  confirmAction,
  adoptStray: adoptStrayDefault,
  formatStatusTable,
};

function entryInsideMapping(
  entryProviderPath: string,
  mappingProviderDir: string,
): boolean {
  const normalizedEntryPath = normalizeToPosixPath(entryProviderPath);
  const normalizedProviderDir = normalizeToPosixPath(mappingProviderDir);
  return (
    normalizedEntryPath === normalizedProviderDir ||
    normalizedEntryPath.startsWith(`${normalizedProviderDir}/`)
  );
}

function canonicalInsideMapping(
  canonicalPath: string,
  mappingCanonicalDir: string,
): boolean {
  const normalizedCanonicalPath = normalizeToPosixPath(canonicalPath);
  const normalizedCanonicalDir = normalizeToPosixPath(mappingCanonicalDir);
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
  options?: { replaceCanonical?: boolean },
): Promise<Manifest> {
  return adoptStrayToCanonical(scopeRoot, stray, manifest, options);
}

function formatPathForScope(
  scope: ConcreteScope,
  providerPath: string,
): string {
  if (scope === 'project') {
    return providerPath;
  }
  if (providerPath.startsWith('./')) {
    return `~/${providerPath.slice(2)}`;
  }
  if (providerPath.startsWith('.')) {
    return `~/${providerPath}`;
  }
  return `~/${providerPath}`;
}

function formatStrayChoiceLabel(
  scope: ConcreteScope,
  providerPath: string,
  provider: string,
): string {
  return `[${scope}] ${basename(providerPath)} (${provider})`;
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
      (entry) =>
        `${entry.provider}|${normalizeToPosixPath(entry.canonicalPath)}`,
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

        const canonicalPath = normalizeToPosixPath(
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
          providerPath: normalizeToPosixPath(
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

  if (
    scope === 'project' &&
    activeAdapters.some((adapter) => adapter.name === 'codex')
  ) {
    const codexExtensionPlan =
      await dependencies.computeCodexProjectExtensionPlan(
        scopeRoot,
        canonicalEntries,
      );
    for (const operation of codexExtensionPlan.operations) {
      if (operation.action === 'skip') {
        continue;
      }
      if (operation.target === 'role') {
        reports.push({
          canonical: operation.roleName
            ? `.agents/agents/${operation.roleName}.md`
            : null,
          provider: 'codex',
          providerPath: operation.path,
          state:
            operation.action === 'create'
              ? { status: 'missing' }
              : { status: 'drifted', reason: 'modified' },
        });
      } else {
        reports.push({
          canonical: null,
          provider: 'codex',
          providerPath: operation.path,
          state: { status: 'drifted', reason: 'modified' },
        });
      }
    }

    const codexStrays = await dependencies.detectCodexRoleStrays(
      scopeRoot,
      canonicalEntries,
    );
    for (const codexStray of codexStrays) {
      const report: DriftReport = {
        canonical: null,
        provider: 'codex',
        providerPath: codexStray.providerPath,
        state: { status: 'stray' },
      };
      reports.push(report);
      strayCandidates.push({
        provider: 'codex',
        report,
        mapping: {
          contentType: 'agent',
          canonicalDir: '.agents/agents',
          providerDir: '.codex/agents',
          nativeRead: false,
        },
        adoption: {
          kind: 'codex_role',
          roleName: codexStray.roleName,
          description: codexStray.description,
        },
      });
    }
  }

  return {
    scope,
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
        if (scopeCollection.strayCandidates.length === 0) {
          continue;
        }

        let manifestChanged = false;

        const selectedValues = await dependencies.selectManyWithAbort(
          `Select stray entries to adopt [${scopeCollection.scope}]`,
          scopeCollection.strayCandidates.map((strayCandidate, index) => ({
            label: formatStrayChoiceLabel(
              scopeCollection.scope,
              strayCandidate.report.providerPath,
              strayCandidate.provider,
            ),
            value: String(index),
            description: formatPathForScope(
              scopeCollection.scope,
              strayCandidate.report.providerPath,
            ),
          })),
          { interactive: context.interactive },
        );
        const selectedIndices = new Set(
          (selectedValues ?? []).map((value) => Number.parseInt(value, 10)),
        );
        let adoptedCount = 0;
        let codexStrayAdopted = false;

        for (const [
          index,
          strayCandidate,
        ] of scopeCollection.strayCandidates.entries()) {
          if (!selectedIndices.has(index)) {
            continue;
          }

          try {
            scopeCollection.manifest = await dependencies.adoptStray(
              scopeCollection.scopeRoot,
              strayCandidate,
              scopeCollection.manifest,
            );
            adoptedCount += 1;
            manifestChanged = true;
            codexStrayAdopted =
              codexStrayAdopted || strayCandidate.provider === 'codex';
          } catch (error) {
            if (!isAdoptionConflictError(error)) {
              throw error;
            }

            const shouldReplace = await dependencies.confirmAction(
              `Conflict detected for ${formatPathForScope(
                scopeCollection.scope,
                strayCandidate.report.providerPath,
              )}. Replace canonical with stray content?`,
              { interactive: context.interactive },
            );

            if (!shouldReplace) {
              context.logger.warn(
                `Skipped adopting conflicting stray [${scopeCollection.scope}] ${formatPathForScope(
                  scopeCollection.scope,
                  strayCandidate.report.providerPath,
                )}.`,
              );
              continue;
            }

            scopeCollection.manifest = await dependencies.adoptStray(
              scopeCollection.scopeRoot,
              strayCandidate,
              scopeCollection.manifest,
              { replaceCanonical: true },
            );
            adoptedCount += 1;
            manifestChanged = true;
            codexStrayAdopted =
              codexStrayAdopted || strayCandidate.provider === 'codex';
          }
        }

        if (codexStrayAdopted && scopeCollection.scope === 'project') {
          await regenerateCodexAfterAdoption({
            scopeRoot: scopeCollection.scopeRoot,
            scanCanonical: async () =>
              dependencies.scanCanonical(
                scopeCollection.scopeRoot,
                scopeCollection.scope,
              ),
            computeExtensionPlan: dependencies.computeCodexProjectExtensionPlan,
            applyExtensionPlan: dependencies.applyCodexProjectExtensionPlan,
          });
        }

        if (manifestChanged) {
          await dependencies.saveManifest(
            scopeCollection.manifestPath,
            scopeCollection.manifest,
          );
          context.logger.success(
            `Adopted ${adoptedCount} stray entr${
              adoptedCount === 1 ? 'y' : 'ies'
            } [${scopeCollection.scope}].`,
          );
        } else {
          context.logger.info(
            `No stray entries adopted [${scopeCollection.scope}].`,
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
