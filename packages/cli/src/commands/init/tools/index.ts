import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
  type ScopeSelectionMode,
} from '@app/command-context';
import { copyDirWithStatus } from '@commands/init/tools/shared/copy-helpers';
import { applyGitignore } from '@commands/local/apply';
import { addLocalPaths } from '@commands/local/manage';
import {
  type UpsertSectionResult,
  removeAgentsMdSection,
  upsertAgentsMdSection,
} from '@commands/shared/agents-md';
import { withScopeOption } from '@commands/shared/scope-option';
import {
  type MultiSelectChoice,
  type PromptContext,
  type SelectChoice,
  selectManyWithAbort,
  selectWithAbort,
} from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  canonicalPathsForPacks,
  getInstalledCanonicalPaths,
  setInstalledCanonicalPaths,
} from '@commands/tools/shared/install-sync-context';
import {
  inventoryPack,
  type InventoryPackInput,
  type PackInventory,
} from '@commands/tools/shared/pack-inventory';
import {
  reconcilePackLifecycles,
  type PackLifecycleRequest,
  type PackLifecycleResult,
} from '@commands/tools/shared/pack-lifecycle';
import { getPackDefinition } from '@commands/tools/shared/pack-manifest';
import { reconcileProjectToolsConfig } from '@commands/tools/shared/project-tools-config';
import { scanTools } from '@commands/tools/shared/scan-tools';
import type { ScanToolsOptions } from '@commands/tools/shared/scan-tools';
import type { ToolInfo } from '@commands/tools/shared/types';
import {
  type OatConfig,
  readOatConfig,
  resolveLocalPaths,
  writeOatConfig,
} from '@config/oat-config';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot, resolveScopeRoot } from '@fs/paths';
import type { ConcreteScope } from '@shared/types';
import { Command } from 'commander';

import { createInitToolsBrainstormCommand } from './brainstorm';
import {
  installBrainstorm as defaultInstallBrainstorm,
  type InstallBrainstormOptions,
  type InstallBrainstormResult,
} from './brainstorm/install-brainstorm';
import { createInitToolsCoreCommand } from './core';
import {
  installCore as defaultInstallCore,
  type InstallCoreOptions,
  type InstallCoreResult,
} from './core/install-core';
import { createInitToolsDocsCommand } from './docs';
import {
  installDocs as defaultInstallDocs,
  type InstallDocsOptions,
  type InstallDocsResult,
} from './docs/install-docs';
import { createInitToolsIdeasCommand } from './ideas';
import {
  installIdeas as defaultInstallIdeas,
  type InstallIdeasOptions,
  type InstallIdeasResult,
} from './ideas/install-ideas';
import {
  buildPackInstallStateMap,
  buildPackInstallStateMapFromInventory,
  type PackInstallState,
} from './install-state';
import { createInitToolsProjectManagementCommand } from './project-management';
import {
  installProjectManagement as defaultInstallProjectManagement,
  type InstallProjectManagementOptions,
  type InstallProjectManagementResult,
} from './project-management/install-project-management';
import { createInitToolsResearchCommand } from './research';
import {
  installResearch as defaultInstallResearch,
  type InstallResearchOptions,
  type InstallResearchResult,
} from './research/install-research';
import {
  DOCS_SKILLS,
  RESEARCH_SKILLS,
  UTILITY_SKILLS,
  resolvePackDefaultScope,
} from './shared/skill-manifest';
import { createInitToolsUtilityCommand } from './utility';
import {
  installUtility as defaultInstallUtility,
  type InstallUtilityOptions,
  type InstallUtilityResult,
} from './utility/install-utility';
import { createInitToolsWorkflowsCommand } from './workflows';
import {
  installWorkflows as defaultInstallWorkflows,
  type InstallWorkflowsOptions,
  type InstallWorkflowsResult,
} from './workflows/install-workflows';

type InstallScope = 'project' | 'user';
type PackInstallTarget = InstallScope | 'both';
export type ToolPack =
  | 'core'
  | 'ideas'
  | 'docs'
  | 'workflows'
  | 'utility'
  | 'project-management'
  | 'research'
  | 'brainstorm';

export interface InitToolsDependencies {
  buildCommandContext: (options: GlobalOptions) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  resolveScopeRoot: (scope: InstallScope, cwd: string, home: string) => string;
  resolveAssetsRoot: () => Promise<string>;
  scanTools: (options: ScanToolsOptions) => Promise<ToolInfo[]>;
  selectManyWithAbort: <T extends string>(
    message: string,
    choices: MultiSelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T[] | null>;
  selectWithAbort: <T extends string>(
    message: string,
    choices: SelectChoice<T>[],
    ctx: PromptContext,
  ) => Promise<T | null>;
  installCore: (options: InstallCoreOptions) => Promise<InstallCoreResult>;
  installDocs: (options: InstallDocsOptions) => Promise<InstallDocsResult>;
  installIdeas: (options: InstallIdeasOptions) => Promise<InstallIdeasResult>;
  installWorkflows: (
    options: InstallWorkflowsOptions,
  ) => Promise<InstallWorkflowsResult>;
  installUtility: (
    options: InstallUtilityOptions,
  ) => Promise<InstallUtilityResult>;
  installProjectManagement: (
    options: InstallProjectManagementOptions,
  ) => Promise<InstallProjectManagementResult>;
  installResearch: (
    options: InstallResearchOptions,
  ) => Promise<InstallResearchResult>;
  installBrainstorm: (
    options: InstallBrainstormOptions,
  ) => Promise<InstallBrainstormResult>;
  copyDirWithStatus: (
    source: string,
    destination: string,
    force: boolean,
  ) => Promise<'copied' | 'updated' | 'skipped'>;
  /** @deprecated Phase 2 installs are additive; retained for test-harness compatibility. */
  removeDirectory?: (target: string) => Promise<void>;
  /** @deprecated Phase 2 installs are additive; retained for test-harness compatibility. */
  removeFile?: (target: string) => Promise<void>;
  addLocalPaths: (
    repoRoot: string,
    paths: string[],
  ) => Promise<{ added: string[]; all: string[] }>;
  applyGitignore: (
    repoRoot: string,
    localPaths: string[],
  ) => Promise<{ action: string }>;
  readOatConfig: (repoRoot: string) => Promise<OatConfig>;
  writeOatConfig: (repoRoot: string, config: OatConfig) => Promise<void>;
  resolveLocalPaths: (config: OatConfig) => string[];
  upsertAgentsMdSection: (
    repoRoot: string,
    key: string,
    body: string,
  ) => Promise<UpsertSectionResult>;
  removeAgentsMdSection: (repoRoot: string, key: string) => Promise<boolean>;
  reconcilePacks?: (
    requests: readonly PackLifecycleRequest[],
    options?: { dryRun?: boolean },
  ) => Promise<PackLifecycleResult[]>;
  inventoryPack?: (input: InventoryPackInput) => Promise<PackInventory>;
}

interface OutdatedSkillRecord {
  name: string;
  installed: string | null;
  bundled: string | null;
  targetRoot: string;
  selectionKey: string;
}

interface InitToolsRunMetadata {
  affectedScopes: ConcreteScope[];
  appliedScopes: ConcreteScope[];
}

function formatVersionForDisplay(version: string | null): string {
  return version ?? '(unversioned)';
}

const ALL_TOOL_PACKS = [
  'core',
  'ideas',
  'docs',
  'workflows',
  'utility',
  'project-management',
  'research',
  'brainstorm',
] as const satisfies readonly ToolPack[];

type UserEligiblePack = Exclude<ToolPack, 'core'>;

let lastRunInitToolsMetadata: InitToolsRunMetadata | null = null;
const appliedScopesByCommand = new WeakMap<Command, ConcreteScope[]>();

const DEFAULT_DEPENDENCIES: InitToolsDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  resolveScopeRoot,
  resolveAssetsRoot,
  scanTools,
  selectManyWithAbort,
  selectWithAbort,
  installCore: defaultInstallCore,
  installDocs: defaultInstallDocs,
  installIdeas: defaultInstallIdeas,
  installWorkflows: defaultInstallWorkflows,
  installUtility: defaultInstallUtility,
  installProjectManagement: defaultInstallProjectManagement,
  installResearch: defaultInstallResearch,
  installBrainstorm: defaultInstallBrainstorm,
  copyDirWithStatus,
  addLocalPaths,
  applyGitignore,
  readOatConfig,
  writeOatConfig,
  resolveLocalPaths,
  upsertAgentsMdSection,
  removeAgentsMdSection,
  reconcilePacks: reconcilePackLifecycles,
  inventoryPack,
};

const USER_ELIGIBLE_PACKS: ReadonlySet<ToolPack> = new Set([
  'ideas',
  'docs',
  'workflows',
  'utility',
  'project-management',
  'research',
  'brainstorm',
]);

type PackScopeMap = Record<ToolPack, PackInstallTarget>;
type PackInstallStateMap = Record<ToolPack, PackInstallState>;

interface ScopeReconcileResult {
  adds: ConcreteScope[];
}

function isUserEligiblePack(pack: ToolPack): pack is UserEligiblePack {
  return USER_ELIGIBLE_PACKS.has(pack);
}

/**
 * Concrete scopes implied by a desired end-state placement.
 */
function scopesForEndState(end: PackInstallTarget): ConcreteScope[] {
  switch (end) {
    case 'project':
      return ['project'];
    case 'user':
      return ['user'];
    case 'both':
      return ['project', 'user'];
  }
}

/**
 * Concrete scopes a pack is currently installed at.
 */
function scopesForLocation(
  location: PackInstallState['location'],
): ConcreteScope[] {
  switch (location) {
    case 'project':
      return ['project'];
    case 'user':
      return ['user'];
    case 'both':
      return ['project', 'user'];
    default:
      return [];
  }
}

/**
 * Pure diff of current placement vs a desired end-state into the set of
 * scopes to add (install into) and remove (delete from). This is the single
 * source of truth that the reconciliation loop drives off of, so installs and
 * removals only ever touch scopes that actually change.
 */
function reconcilePackScope(
  current: PackInstallState['location'],
  desired: PackInstallTarget,
): ScopeReconcileResult {
  const currentScopes = new Set(scopesForLocation(current));
  const desiredScopes = new Set(scopesForEndState(desired));
  const adds = [...desiredScopes].filter((scope) => !currentScopes.has(scope));
  return { adds };
}

interface PackScopeChange {
  pack: ToolPack;
  scope: ConcreteScope;
}

/**
 * Render a batch change summary (`+ pack@scope` adds / `- pack@scope` removes)
 * for the interactive removal-confirmation gate. Pure for snapshot-friendly
 * testing.
 */
export function formatReconcileSummary(
  adds: PackScopeChange[],
  removes: PackScopeChange[],
): string {
  const lines = ['Review pending changes:'];
  for (const { pack, scope } of adds) {
    lines.push(`  + ${pack}@${scope}`);
  }
  for (const { pack, scope } of removes) {
    lines.push(`  - ${pack}@${scope}`);
  }
  return lines.join('\n');
}

/**
 * Additive union of a pack's current placement with a requested scope. Never
 * returns a placement narrower than current — installing at one scope can
 * never remove the pack from another scope.
 */
function unionScopeWithCurrent(
  current: PackInstallState['location'],
  requested: InstallScope,
): PackInstallTarget {
  const scopes = new Set<ConcreteScope>([
    ...scopesForLocation(current),
    requested,
  ]);
  if (scopes.has('project') && scopes.has('user')) {
    return 'both';
  }
  return scopes.has('user') ? 'user' : 'project';
}

async function loadInstalledPackStates(
  projectRoot: string | null,
  userRoot: string,
  assetsRoot: string,
  dependencies: InitToolsDependencies,
): Promise<PackInstallStateMap> {
  if (dependencies.reconcilePacks && dependencies.inventoryPack) {
    const inventories = await Promise.all(
      ALL_TOOL_PACKS.map((pack) =>
        dependencies.inventoryPack!({
          pack,
          assetsRoot,
          ...(projectRoot ? { projectRoot } : {}),
          userRoot,
        }),
      ),
    );
    return buildPackInstallStateMapFromInventory(ALL_TOOL_PACKS, inventories);
  }
  const [projectTools, userTools] = await Promise.all([
    projectRoot
      ? dependencies.scanTools({
          scope: 'project',
          scopeRoot: projectRoot,
          assetsRoot,
        })
      : Promise.resolve([]),
    dependencies.scanTools({
      scope: 'user',
      scopeRoot: userRoot,
      assetsRoot,
    }),
  ]);

  return buildPackInstallStateMap(ALL_TOOL_PACKS, [
    ...projectTools,
    ...userTools,
  ]);
}

function formatInstalledLocation(
  location: PackInstallState['location'],
): string {
  switch (location) {
    case 'project':
      return 'project';
    case 'user':
      return 'user';
    case 'both':
      return 'project + user';
    default:
      return 'not installed';
  }
}

function buildPackChoices(
  installedPackStates: PackInstallStateMap,
): MultiSelectChoice<ToolPack>[] {
  return [
    {
      label: `Core [user]${installedPackStates.core.location === 'not-installed' ? '' : ` (installed: ${formatInstalledLocation(installedPackStates.core.location)})`}`,
      value: 'core',
      checked: true,
    },
    {
      label: `Ideas [project|user]${installedPackStates.ideas.location === 'not-installed' ? '' : ` (installed: ${formatInstalledLocation(installedPackStates.ideas.location)})`}`,
      value: 'ideas',
      checked: true,
    },
    {
      label: `Docs [project|user]${installedPackStates.docs.location === 'not-installed' ? '' : ` (installed: ${formatInstalledLocation(installedPackStates.docs.location)})`}`,
      value: 'docs',
      checked: true,
    },
    {
      label: `Project Management [project|user]${installedPackStates['project-management'].location === 'not-installed' ? '' : ` (installed: ${formatInstalledLocation(installedPackStates['project-management'].location)})`}`,
      value: 'project-management',
      checked: false,
    },
    {
      label: `Workflows [project|user]${installedPackStates.workflows.location === 'not-installed' ? '' : ` (installed: ${formatInstalledLocation(installedPackStates.workflows.location)})`}`,
      value: 'workflows',
      checked: true,
    },
    {
      label: `Utility [project|user]${installedPackStates.utility.location === 'not-installed' ? '' : ` (installed: ${formatInstalledLocation(installedPackStates.utility.location)})`}`,
      value: 'utility',
      checked: true,
    },
    {
      label: `Research [project|user]${installedPackStates.research.location === 'not-installed' ? '' : ` (installed: ${formatInstalledLocation(installedPackStates.research.location)})`}`,
      value: 'research',
      checked: true,
    },
    {
      label: `Brainstorm [project|user]${installedPackStates.brainstorm.location === 'not-installed' ? '' : ` (installed: ${formatInstalledLocation(installedPackStates.brainstorm.location)})`} — Always-on brainstorming entry point with visual companion`,
      value: 'brainstorm',
      checked: true,
    },
  ];
}

export function consumeInitToolsRunMetadata(): InitToolsRunMetadata | null {
  const metadata = lastRunInitToolsMetadata;
  lastRunInitToolsMetadata = null;
  return metadata;
}

/**
 * Resolve a possibly-deferred scope-selection signal into a concrete mode.
 *
 * The `gate` value is the guided-setup deferred signal: it must only be turned
 * into a prompt once pack selection is complete and at least one user-eligible
 * pack is in play (callers guard the empty case). In an interactive session it
 * shows the `Customize per-pack scope? (y/N)` gate — yes -> `interactive`
 * (per-pack radio), no -> `defaults` (additive per-pack defaults). A
 * non-interactive `gate` never prompts and resolves to `defaults`. Any
 * non-`gate` value passes through unchanged so `oat tools install` keeps its
 * existing behavior (it always offers the per-pack radio).
 */
async function resolveDeferredGate(
  scopeSelection: ScopeSelectionMode | undefined,
  interactive: boolean,
  dependencies: InitToolsDependencies,
): Promise<ScopeSelectionMode | undefined> {
  if (scopeSelection !== 'gate') {
    return scopeSelection;
  }

  if (!interactive) {
    return 'defaults';
  }

  const selection = await dependencies.selectWithAbort(
    'Customize per-pack scope? (y/N)',
    [
      {
        label: 'No, use recommended defaults',
        value: 'no',
        description: 'Apply per-pack defaults without extra prompts',
      },
      {
        label: 'Yes, customize each pack',
        value: 'yes',
        description: 'Choose project, user, or both for each eligible pack',
      },
    ],
    { interactive },
  );

  return selection === 'yes' ? 'interactive' : 'defaults';
}

async function resolvePackScopes(
  context: CommandContext,
  selections: ToolPack[],
  installedPackStates: PackInstallStateMap,
  dependencies: InitToolsDependencies,
): Promise<PackScopeMap> {
  const scopes: Partial<PackScopeMap> = {};

  // Scope eligibility is release-owned by the canonical manifest.
  for (const pack of selections) {
    if (!getPackDefinition(pack).allowedScopes.includes('user')) {
      scopes[pack] = 'project';
    }
  }

  // Core pack is always user-scoped, regardless of user-eligible selection
  if (selections.includes('core')) {
    scopes.core = 'user';
  }

  const eligiblePacks = selections.filter((pack) => isUserEligiblePack(pack));

  if (eligiblePacks.length === 0) {
    // No user-eligible pack was selected, so the deferred guided-setup gate is
    // skipped entirely — there is nothing whose scope a user could customize.
    return scopes as PackScopeMap;
  }

  // Deferred guided-setup gate: resolve `gate` into a concrete mode now that
  // pack selection is done and at least one user-eligible pack exists. In an
  // interactive session, prompt `Customize per-pack scope? (y/N)`: yes routes
  // to the per-pack radio (`interactive`), no routes to additive defaults.
  // Non-interactive sessions never prompt and always take defaults.
  const scopeSelection = await resolveDeferredGate(
    context.scopeSelection,
    context.interactive,
    dependencies,
  );
  if (scopeSelection === 'defaults') {
    for (const pack of eligiblePacks) {
      scopes[pack] = resolvePackDefaultEndState(
        pack,
        installedPackStates[pack].location,
      );
    }
    return scopes as PackScopeMap;
  }

  // Explicit --scope is additive for regular tools installs: union the
  // requested scope with the pack's current placement so installing at one
  // scope never removes another. Guided setup passes `scopeSelection`, which
  // intentionally takes precedence over this global init scope.
  if (
    scopeSelection !== 'interactive' &&
    (context.scope === 'project' || context.scope === 'user')
  ) {
    const requested: InstallScope = context.scope;
    for (const pack of eligiblePacks) {
      scopes[pack] = unionScopeWithCurrent(
        installedPackStates[pack].location,
        requested,
      );
    }
    return scopes as PackScopeMap;
  }

  // Non-interactive resolution (`defaults` mode is already handled above).
  //
  // Migration-safety contract: existing-install detection wins over
  // PACK_METADATA defaultScope. If the pack is already installed at any
  // scope, preserve that placement so non-prompting resolution never silently
  // migrates a user's prior install across scopes. Only when the pack is not
  // yet present do we consult PACK_METADATA[name]?.defaultScope (with absent
  // entries falling back to 'project' for backwards compatibility).
  if (!context.interactive) {
    for (const pack of eligiblePacks) {
      scopes[pack] = resolvePackDefaultEndState(
        pack,
        installedPackStates[pack].location,
      );
    }
    return scopes as PackScopeMap;
  }

  // Interactive: for each user-eligible pack, choose its desired end-state
  // placement (project / user / both). The default offered is the pack's
  // current placement (or its default scope when not yet installed), so
  // breezing through accepting defaults is a no-op and never removes a scope.
  for (const pack of eligiblePacks) {
    const currentLocation = installedPackStates[pack].location;
    const defaultEndState = resolvePackDefaultEndState(pack, currentLocation);
    const selection = await dependencies.selectWithAbort(
      `Where should ${pack} install?`,
      buildPackEndStateChoices(pack, currentLocation, defaultEndState),
      { interactive: context.interactive },
    );
    const requested = selection ?? defaultEndState;
    scopes[pack] =
      requested === 'both'
        ? 'both'
        : unionScopeWithCurrent(currentLocation, requested);
  }

  return scopes as PackScopeMap;
}

/**
 * Default end-state offered for a pack in the interactive selector: its
 * current placement when installed, or its configured default scope when not
 * yet present.
 */
function resolvePackDefaultEndState(
  pack: UserEligiblePack,
  currentLocation: PackInstallState['location'],
): PackInstallTarget {
  switch (currentLocation) {
    case 'project':
      return 'project';
    case 'user':
      return 'user';
    case 'both':
      return 'both';
    default:
      return resolvePackDefaultScope(pack);
  }
}

/**
 * Per-pack end-state options (project / user / both) for the interactive
 * selector. The default end-state is listed first so the underlying
 * single-select highlights it.
 */
function buildPackEndStateChoices(
  pack: UserEligiblePack,
  currentLocation: PackInstallState['location'],
  defaultEndState: PackInstallTarget,
): SelectChoice<PackInstallTarget>[] {
  const currentLabel =
    currentLocation === 'not-installed'
      ? 'not installed'
      : `current: ${formatInstalledLocation(currentLocation)}`;
  const baseChoices: SelectChoice<PackInstallTarget>[] = [
    {
      label: `Project scope (${pack})`,
      value: 'project',
      description: 'Install at project scope only',
    },
    {
      label: `User scope (${pack})`,
      value: 'user',
      description: 'Install at user scope only',
    },
    {
      label: `Project + user (${pack})`,
      value: 'both',
      description: 'Install at both scopes',
    },
  ];

  // Annotate the option matching the default so the prompt communicates the
  // current placement, and order it first so it is the highlighted default.
  const annotated = baseChoices.map((choice) =>
    choice.value === defaultEndState
      ? { ...choice, label: `${choice.label} [${currentLabel}]` }
      : choice,
  );
  const defaultChoice = annotated.find(
    (choice) => choice.value === defaultEndState,
  );
  const rest = annotated.filter((choice) => choice.value !== defaultEndState);
  return defaultChoice ? [defaultChoice, ...rest] : annotated;
}

function reportSuccess(
  context: CommandContext,
  packs: PackScopeInfo[],
  syncScopes: ConcreteScope[],
): void {
  if (context.json) {
    context.logger.json({
      status: 'ok',
      installedPacks: packs,
      syncScopes,
    });
    return;
  }

  context.logger.info(
    `Installed tool packs: ${packs.map(({ pack, scope }) => `${pack} (${formatInstalledLocation(scope)})`).join(', ')}`,
  );
  syncScopes.forEach((scope, index) => {
    context.logger.info(
      `${index === 0 ? 'Run' : 'Also run'}: oat sync --scope ${scope}`,
    );
  });
  if (syncScopes.length === 0) {
    context.logger.info('No sync needed.');
  }
}

function reportOutdatedSkills(
  context: CommandContext,
  outdatedSkills: OutdatedSkillRecord[],
): void {
  if (outdatedSkills.length === 0) {
    return;
  }

  context.logger.info('Outdated skills:');
  for (const skill of outdatedSkills) {
    context.logger.info(
      `  ${skill.name} (${skill.targetRoot})  ${formatVersionForDisplay(skill.installed)} -> ${formatVersionForDisplay(skill.bundled)}`,
    );
  }
}

async function updateOutdatedSkills(
  outdatedSkills: OutdatedSkillRecord[],
  assetsRoot: string,
  dependencies: InitToolsDependencies,
): Promise<string[]> {
  const updatedNames: string[] = [];

  for (const skill of outdatedSkills) {
    const source = join(assetsRoot, 'skills', skill.name);
    const destination = join(skill.targetRoot, '.agents', 'skills', skill.name);
    await dependencies.copyDirWithStatus(source, destination, true);
    updatedNames.push(skill.name);
  }

  return updatedNames;
}

const PACK_DESCRIPTIONS: Record<ToolPack, string> = {
  core: 'Diagnostics and documentation (oat-doctor, oat-docs)',
  docs: 'Documentation and instruction governance workflows',
  workflows:
    'Project lifecycle (create, discover, plan, implement, review, complete)',
  ideas: 'Idea capture and refinement',
  'project-management':
    'Local backlog, roadmap, and reference doc management (oat-pjm-* skills)',
  utility:
    'Standalone utilities (skill authoring, maintainability review, code reviews)',
  research: 'Research, analysis, verification, and synthesis',
  brainstorm: 'Always-on brainstorming entry point with visual companion',
};

interface PackScopeInfo {
  pack: ToolPack;
  scope: PackInstallTarget;
}

export function buildToolPacksSectionBody(packs: PackScopeInfo[]): string {
  const userPacks = packs.filter(
    (p) => p.scope === 'user' || p.scope === 'both',
  );
  const hasWorkflows = packs.some((p) => p.pack === 'workflows');

  const lines = [
    '## Tool Packs',
    '',
    '- **Skills directory:** `.agents/skills/`',
    '- **Discover available skills:** scan `.agents/skills/*/SKILL.md`',
    '- **Refresh provider views:** `oat sync --scope all`',
    '- **Update skills to latest versions:** `oat tools update`',
  ];

  if (userPacks.length > 0) {
    const userPackNames = userPacks.map((p) => p.pack).join(', ');
    lines.push(
      `- **User-scoped skills:** \`~/.agents/skills/\` (${userPackNames} packs installed at user scope)`,
    );
  }

  lines.push('', '### Installed Packs', '');

  for (const { pack, scope } of packs) {
    const suffix =
      scope === 'user'
        ? ' _(user scope)_'
        : scope === 'both'
          ? ' _(project + user scope)_'
          : '';
    lines.push(`- **${pack}** — ${PACK_DESCRIPTIONS[pack]}${suffix}`);
  }

  if (hasWorkflows) {
    lines.push(
      '',
      '### Workflow Execution Continuation',
      '',
      '- This guidance applies only to OAT project lifecycle execution, such as `oat-project-implement`, and OAT project review/receive flows. It does not apply to non-OAT tasks or ad-hoc work outside the OAT project workflow.',
      '- When executing an OAT project implementation or OAT project review workflow, do not stop at task boundaries, phase boundaries, or other clean checkpoints unless the configured HiLL checkpoint has been reached, a real blocker exists, or explicit user input is required.',
      '- Status summaries, completed bookkeeping, and "clean boundary" pauses are not valid stop reasons. After updating tracking artifacts, continue execution until an allowed stop condition applies.',
    );
  }

  return lines.join('\n');
}

export async function runInitTools(
  context: CommandContext,
  dependencies: InitToolsDependencies,
): Promise<ToolPack[]> {
  lastRunInitToolsMetadata = null;

  try {
    const userRoot = dependencies.resolveScopeRoot(
      'user',
      context.cwd,
      context.home,
    );
    const assetsRoot = await dependencies.resolveAssetsRoot();
    let projectRoot: string | null = null;
    try {
      projectRoot = await dependencies.resolveProjectRoot(context.cwd);
    } catch (error) {
      if (context.scope === 'project') throw error;
    }
    const initialPackStates = await loadInstalledPackStates(
      projectRoot,
      userRoot,
      assetsRoot,
      dependencies,
    );
    const selectedPacks: ToolPack[] = context.interactive
      ? ((await dependencies.selectManyWithAbort(
          'Select tool packs to install',
          buildPackChoices(initialPackStates),
          { interactive: context.interactive },
        )) ?? [])
      : [
          'core',
          'ideas',
          'docs',
          'workflows',
          'utility',
          'research',
          'brainstorm',
        ];

    if (!context.interactive) {
      selectedPacks.push('project-management');
    }
    if (selectedPacks.length === 0) {
      lastRunInitToolsMetadata = { affectedScopes: [], appliedScopes: [] };
      if (!context.json) {
        context.logger.info('No tool packs selected.');
      }
      process.exitCode = 0;
      return [];
    }

    const packScopes = await resolvePackScopes(
      context,
      selectedPacks,
      initialPackStates,
      dependencies,
    );

    function scopeRoot(scope: ConcreteScope): string {
      if (scope === 'user') return userRoot;
      if (!projectRoot) {
        throw new Error('Project scope is unavailable outside a repository');
      }
      return projectRoot;
    }

    const outdatedSkills: OutdatedSkillRecord[] = [];
    const affectedScopes = new Set<ConcreteScope>();

    if (dependencies.reconcilePacks) {
      const requests: PackLifecycleRequest[] = [];
      for (const pack of selectedPacks) {
        const targets =
          pack === 'core'
            ? [{ scope: 'user' as const, root: userRoot }]
            : scopesForEndState(packScopes[pack]).map((scope) => ({
                scope,
                root: scopeRoot(scope),
              }));
        for (const target of targets) {
          requests.push({
            pack,
            scope: target.scope,
            scopeRoot: target.root,
            assetsRoot,
            action: 'install',
          });
        }
      }
      const lifecycle = await dependencies.reconcilePacks(requests);
      for (const { plan } of lifecycle) {
        if (plan.operations.length > 0) affectedScopes.add(plan.scope);
      }
      if (
        requests.some(
          ({ pack, scope }) => pack === 'workflows' && scope === 'project',
        )
      ) {
        const repoRoot = scopeRoot('project');
        const existingConfig = await dependencies.readOatConfig(repoRoot);
        const paths = [
          '.oat/projects/**/pr',
          '.oat/projects/**/reviews/archived',
        ];
        const existing = new Set(
          dependencies.resolveLocalPaths(existingConfig),
        );
        if (!paths.every((path) => existing.has(path))) {
          const addResult = await dependencies.addLocalPaths(repoRoot, paths);
          if (addResult.added.length > 0) {
            const config = await dependencies.readOatConfig(repoRoot);
            await dependencies.applyGitignore(
              repoRoot,
              dependencies.resolveLocalPaths(config),
            );
          }
        }
      }
    } else {
      // Reconcile current placement vs the desired end-state per user-eligible
      // pack into adds/removes. Installs copy idempotently into the full desired
      // end-state, but only the scopes that actually changed (an add or a
      // confirmed remove) are recorded in `affectedScopes`, so auto-sync never
      // prunes a preserved scope.
      const reconciliationByPack = new Map<
        UserEligiblePack,
        ScopeReconcileResult
      >();
      for (const pack of selectedPacks) {
        if (!isUserEligiblePack(pack)) {
          continue;
        }
        reconciliationByPack.set(
          pack,
          reconcilePackScope(
            initialPackStates[pack].location,
            packScopes[pack],
          ),
        );
      }

      // Scopes a pack should install into (its full desired end-state for
      // user-eligible packs; the resolved scope otherwise). Re-installing an
      // already-present scope is an idempotent copy.
      function packTargets(pack: ToolPack): string[] {
        return packScopes[pack] === 'both'
          ? [scopeRoot('project'), userRoot]
          : [scopeRoot(packScopes[pack] === 'user' ? 'user' : 'project')];
      }

      // Only scopes that received a new add for this pack should be auto-synced.
      function addedScopes(pack: ToolPack): Set<ConcreteScope> {
        return new Set(
          reconciliationByPack.get(pack as UserEligiblePack)?.adds,
        );
      }
      if (selectedPacks.includes('core')) {
        // Core pack always installs at user scope, regardless of userEligibleScope
        affectedScopes.add('user');
        const coreResult = await dependencies.installCore({
          assetsRoot,
          targetRoot: userRoot,
        });
        for (const skill of coreResult.outdatedSkills) {
          outdatedSkills.push({
            ...skill,
            targetRoot: userRoot,
            selectionKey: `${skill.name}:${userRoot}`,
          });
        }
      }

      if (selectedPacks.includes('ideas')) {
        const ideasAdded = addedScopes('ideas');
        for (const targetRoot of packTargets('ideas')) {
          const targetScope: ConcreteScope =
            targetRoot === userRoot ? 'user' : 'project';
          if (ideasAdded.has(targetScope)) {
            affectedScopes.add(targetScope);
          }
          const ideasResult = await dependencies.installIdeas({
            assetsRoot,
            targetRoot,
          });
          for (const skill of ideasResult.outdatedSkills) {
            outdatedSkills.push({
              ...skill,
              targetRoot,
              selectionKey: `${skill.name}:${targetRoot}`,
            });
          }
        }
      }

      if (selectedPacks.includes('docs')) {
        const docsAdded = addedScopes('docs');
        for (const targetRoot of packTargets('docs')) {
          const targetScope: ConcreteScope =
            targetRoot === userRoot ? 'user' : 'project';
          if (docsAdded.has(targetScope)) {
            affectedScopes.add(targetScope);
          }
          const docsResult = await dependencies.installDocs({
            assetsRoot,
            targetRoot,
            skills: [...DOCS_SKILLS],
          });
          for (const skill of docsResult.outdatedSkills) {
            outdatedSkills.push({
              ...skill,
              targetRoot,
              selectionKey: `${skill.name}:${targetRoot}`,
            });
          }
        }
      }

      if (selectedPacks.includes('workflows')) {
        const workflowsAdded = addedScopes('workflows');
        for (const targetRoot of packTargets('workflows')) {
          const targetScope: ConcreteScope =
            targetRoot === userRoot ? 'user' : 'project';
          if (workflowsAdded.has(targetScope)) {
            affectedScopes.add(targetScope);
          }

          const workflowsResult = await dependencies.installWorkflows({
            assetsRoot,
            targetRoot,
            scope: targetScope,
          });
          for (const skill of workflowsResult.outdatedSkills) {
            outdatedSkills.push({
              ...skill,
              targetRoot,
              selectionKey: `${skill.name}:${targetRoot}`,
            });
          }

          if (targetScope === 'project') {
            const resolvedRoot =
              workflowsResult.resolvedProjectsRoot || '.oat/projects/shared';
            const projectsBase = resolvedRoot.replace(/\/[^/]+$/, '');
            const PR_ARCHIVE_LOCAL_PATHS = [
              `${projectsBase}/**/pr`,
              `${projectsBase}/**/reviews/archived`,
            ];

            const existingConfig = await dependencies.readOatConfig(
              scopeRoot('project'),
            );
            const existingLocalPaths = new Set(
              dependencies.resolveLocalPaths(existingConfig),
            );
            const alreadyConfigured = PR_ARCHIVE_LOCAL_PATHS.every((p) =>
              existingLocalPaths.has(p),
            );

            if (!alreadyConfigured) {
              let makeLocal = true;
              if (context.interactive) {
                const selected = await dependencies.selectWithAbort(
                  'Should shared-project PR directories and archived review history be local-only (gitignored) or version-controlled?',
                  [
                    {
                      label: 'Local only (recommended)',
                      value: 'local',
                      description:
                        'PR artifacts and archived reviews stay local; active reviews remain tracked until received',
                    },
                    {
                      label: 'Version controlled',
                      value: 'tracked',
                      description:
                        'PR artifacts and archived reviews are committed to the repo too',
                    },
                  ],
                  { interactive: context.interactive },
                );
                makeLocal = selected !== 'tracked';
              }

              if (makeLocal) {
                const addResult = await dependencies.addLocalPaths(
                  scopeRoot('project'),
                  PR_ARCHIVE_LOCAL_PATHS,
                );
                if (addResult.added.length > 0) {
                  const config = await dependencies.readOatConfig(
                    scopeRoot('project'),
                  );
                  const allPaths = dependencies.resolveLocalPaths(config);
                  await dependencies.applyGitignore(
                    scopeRoot('project'),
                    allPaths,
                  );
                }
              }
            }
          }
        }
      }

      if (selectedPacks.includes('utility')) {
        const utilityAdded = addedScopes('utility');
        for (const targetRoot of packTargets('utility')) {
          const targetScope: ConcreteScope =
            targetRoot === userRoot ? 'user' : 'project';
          if (utilityAdded.has(targetScope)) {
            affectedScopes.add(targetScope);
          }
          const utilityResult = await dependencies.installUtility({
            assetsRoot,
            targetRoot,
            skills: [...UTILITY_SKILLS],
          });
          for (const skill of utilityResult.outdatedSkills) {
            outdatedSkills.push({
              ...skill,
              targetRoot,
              selectionKey: `${skill.name}:${targetRoot}`,
            });
          }
        }
      }

      if (selectedPacks.includes('project-management')) {
        const projectManagementAdded = addedScopes('project-management');
        for (const targetRoot of packTargets('project-management')) {
          const targetScope: ConcreteScope =
            targetRoot === userRoot ? 'user' : 'project';
          if (projectManagementAdded.has(targetScope)) {
            affectedScopes.add(targetScope);
          }
          const projectManagementResult =
            await dependencies.installProjectManagement({
              assetsRoot,
              targetRoot,
            });
          for (const skill of projectManagementResult.outdatedSkills) {
            outdatedSkills.push({
              ...skill,
              targetRoot,
              selectionKey: `${skill.name}:${targetRoot}`,
            });
          }
        }
      }

      if (selectedPacks.includes('research')) {
        const researchAdded = addedScopes('research');
        for (const targetRoot of packTargets('research')) {
          const targetScope: ConcreteScope =
            targetRoot === userRoot ? 'user' : 'project';
          if (researchAdded.has(targetScope)) {
            affectedScopes.add(targetScope);
          }
          const researchResult = await dependencies.installResearch({
            assetsRoot,
            targetRoot,
            skills: [...RESEARCH_SKILLS],
          });
          for (const skill of researchResult.outdatedSkills) {
            outdatedSkills.push({
              ...skill,
              targetRoot,
              selectionKey: `${skill.name}:${targetRoot}`,
            });
          }
        }
      }

      if (selectedPacks.includes('brainstorm')) {
        const brainstormAdded = addedScopes('brainstorm');
        for (const targetRoot of packTargets('brainstorm')) {
          const targetScope: ConcreteScope =
            targetRoot === userRoot ? 'user' : 'project';
          if (brainstormAdded.has(targetScope)) {
            affectedScopes.add(targetScope);
          }
          const brainstormResult = await dependencies.installBrainstorm({
            assetsRoot,
            targetRoot,
          });
          for (const skill of brainstormResult.outdatedSkills) {
            outdatedSkills.push({
              ...skill,
              targetRoot,
              selectionKey: `${skill.name}:${targetRoot}`,
            });
          }
        }
      }
    }

    if (outdatedSkills.length > 0) {
      reportOutdatedSkills(context, outdatedSkills);

      if (context.interactive) {
        const selectedNames =
          (await dependencies.selectManyWithAbort(
            'Update outdated skills?',
            outdatedSkills.map((skill) => ({
              label: `${skill.name} (${skill.targetRoot}) (${skill.installed} -> ${skill.bundled})`,
              value: skill.selectionKey,
              checked: true,
            })),
            { interactive: context.interactive },
          )) ?? [];

        const selectedSet = new Set(selectedNames);
        const selectedOutdated = outdatedSkills.filter((skill) =>
          selectedSet.has(skill.selectionKey),
        );
        const updatedNames = await updateOutdatedSkills(
          selectedOutdated,
          assetsRoot,
          dependencies,
        );

        if (updatedNames.length > 0) {
          context.logger.info(
            `Updated outdated skills: ${updatedNames.join(', ')}`,
          );
        }
      } else {
        context.logger.info(
          'Non-interactive mode: outdated skills were not updated.',
        );
        context.logger.info('Use --force to update installed skills.');
      }
    }

    const packScopeInfo: PackScopeInfo[] = selectedPacks.map((pack) => ({
      pack,
      scope: packScopes[pack],
    }));
    const adoptsProject = packScopeInfo.some(({ scope }) => scope !== 'user');
    const sectionBody = buildToolPacksSectionBody(packScopeInfo);
    const sectionResult = adoptsProject
      ? await dependencies.upsertAgentsMdSection(
          scopeRoot('project'),
          'tools',
          sectionBody,
        )
      : { action: 'no-change' as const };
    // Pack placement never writes the project-management or decisions AGENTS
    // sections. Those belong to explicit repository adoption (`oat pjm init`,
    // via `initializeRepoReference`), which owns the `pjm.initialized` marker.
    if (adoptsProject) {
      await dependencies.removeAgentsMdSection(
        scopeRoot('project'),
        'workflows',
      );
    }

    if (!context.json && sectionResult.action !== 'no-change') {
      context.logger.info(
        `AGENTS.md tool packs section ${sectionResult.action}.`,
      );
    }

    const affectedScopesList = [...affectedScopes];
    const appliedScopes = [
      ...new Set(
        packScopeInfo.flatMap(({ scope }) => scopesForEndState(scope)),
      ),
    ];
    lastRunInitToolsMetadata = {
      affectedScopes: affectedScopesList,
      appliedScopes,
    };
    reportSuccess(context, packScopeInfo, affectedScopesList);
    process.exitCode = 0;
    return selectedPacks;
  } catch (error) {
    lastRunInitToolsMetadata = null;
    const message = error instanceof Error ? error.message : String(error);
    if (context.json) {
      context.logger.json({ status: 'error', message });
    } else {
      context.logger.error(message);
    }
    process.exitCode = 1;
    return [];
  }
}

export async function runInitToolsWithDefaults(
  context: CommandContext,
): Promise<ToolPack[]> {
  return runInitTools(context, { ...DEFAULT_DEPENDENCIES });
}

function createReconciledPackCommand(
  pack: ToolPack,
  dependencies: InitToolsDependencies,
): Command {
  const definition = getPackDefinition(pack);
  const descriptions: Record<ToolPack, string> = {
    core: 'Install OAT core skills (diagnostics, docs)',
    ideas: 'Install OAT ideas skills, templates, and idea workflow files',
    docs: 'Install OAT docs workflow skills',
    'project-management': 'Install OAT project-management skills and templates',
    workflows: 'Install OAT workflows skills, agents, templates, and scripts',
    utility: 'Install OAT utility skills',
    research: 'Install OAT research skills',
    brainstorm:
      'Install OAT brainstorm skill (always-on entry point with visual companion)',
  };
  const base = new Command(pack).description(descriptions[pack]);
  const packCommand = pack === 'core' ? base : withScopeOption(base);
  return packCommand
    .option('--force', 'Reconcile managed assets to bundled content')
    .action(async (_options: unknown, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      try {
        const explicitScope =
          command.getOptionValueSourceWithGlobals('scope') === 'cli';
        const scopes: ConcreteScope[] =
          explicitScope && context.scope === 'all'
            ? [...definition.allowedScopes]
            : [
                context.scope === 'project' || context.scope === 'user'
                  ? context.scope
                  : definition.defaultScope,
              ];
        for (const scope of scopes) {
          if (!definition.allowedScopes.includes(scope)) {
            throw new Error(`Pack ${pack} does not allow ${scope} scope`);
          }
        }
        const assetsRoot = await dependencies.resolveAssetsRoot();
        const requests = await Promise.all(
          scopes.map(
            async (scope): Promise<PackLifecycleRequest> => ({
              pack,
              scope,
              scopeRoot:
                scope === 'project'
                  ? await dependencies.resolveProjectRoot(context.cwd)
                  : dependencies.resolveScopeRoot(
                      'user',
                      context.cwd,
                      context.home,
                    ),
              assetsRoot,
              action: 'install',
            }),
          ),
        );
        const results = await dependencies.reconcilePacks!(requests);
        appliedScopesByCommand.set(
          command,
          results.map(({ request }) => request.scope),
        );
        setInstalledCanonicalPaths(command, canonicalPathsForPacks([pack]));

        // Project-scope placement installs capability only. The
        // project-management and decisions AGENTS sections are written by the
        // explicit adoption action (`oat pjm init`), never by pack placement.

        if (context.json) {
          context.logger.json({
            status: 'ok',
            pack,
            scopes,
            results,
          });
        } else {
          context.logger.info(`Installed ${pack} tool pack.`);
          for (const result of results) {
            context.logger.info(`Scope: ${result.request.scope}`);
            context.logger.info(`Target root: ${result.request.scopeRoot}`);
            context.logger.info(
              `Reconciled operations: ${result.apply!.applied.length}`,
            );
            context.logger.info(
              `Run: oat sync --scope ${result.request.scope}`,
            );
          }
        }
        process.exitCode = 0;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (context.json) context.logger.json({ status: 'error', message });
        else context.logger.error(message);
        process.exitCode = 1;
      }
    });
}

export function createInitToolsCommand(
  overrides: Partial<InitToolsDependencies> = {},
): Command {
  const dependencies: InitToolsDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };
  const hasLegacyInstallerOverrides = [
    'installCore',
    'installIdeas',
    'installDocs',
    'installWorkflows',
    'installUtility',
    'installProjectManagement',
    'installResearch',
    'installBrainstorm',
  ].some((key) => Object.prototype.hasOwnProperty.call(overrides, key));
  if (
    hasLegacyInstallerOverrides &&
    !Object.prototype.hasOwnProperty.call(overrides, 'reconcilePacks')
  ) {
    dependencies.reconcilePacks = undefined;
  }

  async function reconcileAfterInstall(actionCommand: Command): Promise<void> {
    if (process.exitCode !== undefined && process.exitCode !== 0) {
      return;
    }
    if (getInstalledCanonicalPaths(actionCommand).length === 0) {
      return;
    }

    const context = dependencies.buildCommandContext(
      readGlobalOptions(actionCommand),
    );
    const appliedScopes =
      appliedScopesByCommand.get(actionCommand) ??
      (dependencies.reconcilePacks
        ? []
        : context.scope === 'user'
          ? ['user']
          : ['project']);
    if (!appliedScopes.includes('project')) return;
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    await reconcileProjectToolsConfig(
      {
        repoRoot,
        cwd: context.cwd,
        home: context.home,
      },
      dependencies,
    );
  }

  const packCommands = dependencies.reconcilePacks
    ? (
        [
          'core',
          'ideas',
          'docs',
          'project-management',
          'workflows',
          'utility',
          'research',
          'brainstorm',
        ] as const
      ).map((pack) => createReconciledPackCommand(pack, dependencies))
    : [
        createInitToolsCoreCommand(),
        createInitToolsIdeasCommand(),
        createInitToolsDocsCommand(),
        createInitToolsProjectManagementCommand(),
        createInitToolsWorkflowsCommand(),
        createInitToolsUtilityCommand(),
        createInitToolsResearchCommand(),
        createInitToolsBrainstormCommand({
          buildCommandContext: dependencies.buildCommandContext,
          resolveProjectRoot: dependencies.resolveProjectRoot,
          resolveScopeRoot: dependencies.resolveScopeRoot,
          resolveAssetsRoot: dependencies.resolveAssetsRoot,
          installBrainstorm: dependencies.installBrainstorm,
          scanTools: dependencies.scanTools,
        }),
      ];
  for (const packCommand of packCommands) {
    packCommand.hook('postAction', async (_thisCommand, actionCommand) => {
      await reconcileAfterInstall(actionCommand);
    });
  }

  const command = new Command('tools').description(
    'Install OAT tool packs (core, ideas, docs, workflows, utility, project-management, research, brainstorm)',
  );
  for (const packCommand of packCommands) {
    command.addCommand(packCommand);
  }
  command.action(async (_options: unknown, actionCommand: Command) => {
    const context = dependencies.buildCommandContext(
      readGlobalOptions(actionCommand),
    );
    const selectedPacks = await runInitTools(context, dependencies);
    appliedScopesByCommand.set(
      actionCommand,
      lastRunInitToolsMetadata?.appliedScopes ?? [],
    );
    setInstalledCanonicalPaths(
      actionCommand,
      canonicalPathsForPacks(selectedPacks),
    );
    await reconcileAfterInstall(actionCommand);
  });

  return command;
}
