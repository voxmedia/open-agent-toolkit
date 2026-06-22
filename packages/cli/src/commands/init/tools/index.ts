import { rm, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import {
  buildCommandContext,
  type CommandContext,
  type GlobalOptions,
} from '@app/command-context';
import { copyDirWithStatus } from '@commands/init/tools/shared/copy-helpers';
import { applyGitignore } from '@commands/local/apply';
import { addLocalPaths } from '@commands/local/manage';
import {
  type UpsertSectionResult,
  removeAgentsMdSection,
  upsertAgentsMdSection,
} from '@commands/shared/agents-md';
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
  setInstalledCanonicalPaths,
} from '@commands/tools/shared/install-sync-context';
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
  BRAINSTORM_SKILLS,
  DOCS_SKILLS,
  IDEA_SKILLS,
  RESEARCH_AGENTS,
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
  removeDirectory: (target: string) => Promise<void>;
  removeFile: (target: string) => Promise<void>;
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

type UserEligiblePack = Extract<
  ToolPack,
  'ideas' | 'docs' | 'utility' | 'research' | 'brainstorm'
>;

const USER_ELIGIBLE_PACK_MEMBERS: Record<
  UserEligiblePack,
  { skills: readonly string[]; agents: readonly string[] }
> = {
  ideas: {
    skills: IDEA_SKILLS,
    agents: [],
  },
  docs: {
    skills: DOCS_SKILLS,
    agents: [],
  },
  utility: {
    skills: UTILITY_SKILLS,
    agents: [],
  },
  research: {
    skills: RESEARCH_SKILLS,
    agents: RESEARCH_AGENTS,
  },
  brainstorm: {
    skills: BRAINSTORM_SKILLS,
    agents: [],
  },
};

let lastRunInitToolsMetadata: InitToolsRunMetadata | null = null;

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
  removeDirectory: async (target) => {
    await rm(target, { recursive: true, force: true });
  },
  removeFile: async (target) => {
    try {
      await unlink(target);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !('code' in error) ||
        error.code !== 'ENOENT'
      ) {
        throw error;
      }
    }
  },
  addLocalPaths,
  applyGitignore,
  readOatConfig,
  writeOatConfig,
  resolveLocalPaths,
  upsertAgentsMdSection,
  removeAgentsMdSection,
};

const USER_ELIGIBLE_PACKS: ReadonlySet<ToolPack> = new Set([
  'ideas',
  'docs',
  'utility',
  'research',
  'brainstorm',
]);

type PackScopeMap = Record<ToolPack, PackInstallTarget>;
type PackInstallStateMap = Record<ToolPack, PackInstallState>;

interface ScopeReconcileResult {
  adds: ConcreteScope[];
  removes: ConcreteScope[];
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
  const removes = [...currentScopes].filter(
    (scope) => !desiredScopes.has(scope),
  );
  return { adds, removes };
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
  projectRoot: string,
  userRoot: string,
  assetsRoot: string,
  dependencies: InitToolsDependencies,
): Promise<PackInstallStateMap> {
  const [projectTools, userTools] = await Promise.all([
    dependencies.scanTools({
      scope: 'project',
      scopeRoot: projectRoot,
      assetsRoot,
    }),
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
      label: `Project Management [project]${installedPackStates['project-management'].location === 'not-installed' ? '' : ` (installed: ${formatInstalledLocation(installedPackStates['project-management'].location)})`}`,
      value: 'project-management',
      checked: false,
    },
    {
      label: `Workflows [project]${installedPackStates.workflows.location === 'not-installed' ? '' : ` (installed: ${formatInstalledLocation(installedPackStates.workflows.location)})`}`,
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

async function removePackFromScope(
  pack: UserEligiblePack,
  root: string,
  dependencies: InitToolsDependencies,
): Promise<void> {
  const members = USER_ELIGIBLE_PACK_MEMBERS[pack];

  for (const skill of members.skills) {
    await dependencies.removeDirectory(join(root, '.agents', 'skills', skill));
  }

  for (const agent of members.agents) {
    await dependencies.removeFile(join(root, '.agents', 'agents', agent));
  }
}

async function resolvePackScopes(
  context: CommandContext,
  selections: ToolPack[],
  installedPackStates: PackInstallStateMap,
  dependencies: InitToolsDependencies,
): Promise<PackScopeMap> {
  const scopes: Partial<PackScopeMap> = {};

  // Workflows is always project-only
  for (const pack of selections) {
    if (!USER_ELIGIBLE_PACKS.has(pack)) {
      scopes[pack] = 'project';
    }
  }

  // Core pack is always user-scoped, regardless of user-eligible selection
  if (selections.includes('core')) {
    scopes.core = 'user';
  }

  const eligiblePacks = selections.filter((pack) => isUserEligiblePack(pack));

  if (eligiblePacks.length === 0) {
    return scopes as PackScopeMap;
  }

  const scopeSelection = context.scopeSelection;
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

  // Defaults-mode/non-interactive resolution.
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
    scopes[pack] = selection ?? defaultEndState;
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

function buildInstalledToolsConfig(
  selectedPacks: ToolPack[],
  installedPackStates: PackInstallStateMap,
  existingTools: OatConfig['tools'],
): OatConfig['tools'] {
  const selectedPackSet = new Set(selectedPacks);
  const tools = { ...existingTools };

  for (const pack of ALL_TOOL_PACKS) {
    tools[pack] =
      selectedPackSet.has(pack) ||
      installedPackStates[pack].location !== 'not-installed';
  }

  return tools;
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
    const projectRoot = await dependencies.resolveProjectRoot(context.cwd);
    const userRoot = dependencies.resolveScopeRoot(
      'user',
      context.cwd,
      context.home,
    );
    const assetsRoot = await dependencies.resolveAssetsRoot();
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
      lastRunInitToolsMetadata = { affectedScopes: [] };
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
      return scope === 'user' ? userRoot : projectRoot;
    }

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
        reconcilePackScope(initialPackStates[pack].location, packScopes[pack]),
      );
    }

    // Scopes a pack should install into (its full desired end-state for
    // user-eligible packs; the resolved scope otherwise). Re-installing an
    // already-present scope is an idempotent copy.
    function packTargets(pack: ToolPack): string[] {
      return packScopes[pack] === 'both'
        ? [projectRoot, userRoot]
        : [packScopes[pack] === 'user' ? userRoot : projectRoot];
    }

    // Only scopes that received a new add for this pack should be auto-synced.
    function addedScopes(pack: ToolPack): Set<ConcreteScope> {
      return new Set(reconciliationByPack.get(pack as UserEligiblePack)?.adds);
    }
    const outdatedSkills: OutdatedSkillRecord[] = [];
    const affectedScopes = new Set<ConcreteScope>();

    // Collect all staged removals across packs. Removals are interactive-only
    // and gated behind a single batch confirmation (added in p01-t03);
    // non-interactive paths are strictly additive and can never remove.
    const stagedRemovals: Array<{
      pack: UserEligiblePack;
      scope: ConcreteScope;
    }> = [];
    for (const [pack, reconciliation] of reconciliationByPack) {
      for (const scope of reconciliation.removes) {
        stagedRemovals.push({ pack, scope });
      }
    }

    if (stagedRemovals.length > 0 && !context.interactive) {
      // Strictly-additive guard: removals must never be applied
      // non-interactively. This should be unreachable because non-interactive
      // resolution unions with current placement, but we fail loud rather than
      // silently delete a user's install.
      throw new Error(
        'Non-interactive install attempted to remove a pack from a scope; ' +
          'install is strictly additive in non-interactive mode.',
      );
    }

    // Interactive removal gate: if any pack would lose a scope, surface one
    // batch change summary and require a single confirmation before mutating
    // anything. Declining aborts with zero changes (no installs, no removals).
    if (stagedRemovals.length > 0 && context.interactive) {
      const stagedAdds: PackScopeChange[] = [];
      for (const [pack, reconciliation] of reconciliationByPack) {
        for (const scope of reconciliation.adds) {
          stagedAdds.push({ pack, scope });
        }
      }

      context.logger.info(formatReconcileSummary(stagedAdds, stagedRemovals));
      const confirmation = await dependencies.selectWithAbort(
        'Apply these changes? Removals will delete the listed scoped installs.',
        [
          {
            label: 'No, cancel (recommended)',
            value: 'no',
            description: 'Make no changes',
          },
          {
            label: 'Yes, apply adds and removals',
            value: 'yes',
            description: 'Install adds and delete the listed removals',
          },
        ],
        { interactive: context.interactive },
      );

      if (confirmation !== 'yes') {
        lastRunInitToolsMetadata = { affectedScopes: [] };
        if (!context.json) {
          context.logger.info('No changes applied.');
        }
        process.exitCode = 0;
        return [];
      }
    }

    // Removals are deferred until after the add phase below: for a confirmed
    // move (e.g. user -> project), the replacement install must succeed before
    // the preserved scope is deleted. If any installer throws, the catch
    // handler aborts and these removals never run, so the pack is never left
    // installed in neither scope (review I1; design.md:86/114).

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
      affectedScopes.add('project');
      const workflowsResult = await dependencies.installWorkflows({
        assetsRoot,
        targetRoot: projectRoot,
      });
      for (const skill of workflowsResult.outdatedSkills) {
        outdatedSkills.push({
          ...skill,
          targetRoot: projectRoot,
          selectionKey: `${skill.name}:${projectRoot}`,
        });
      }

      const resolvedRoot =
        workflowsResult.resolvedProjectsRoot || '.oat/projects/shared';
      const projectsBase = resolvedRoot.replace(/\/[^/]+$/, '');
      const PR_ARCHIVE_LOCAL_PATHS = [
        `${projectsBase}/**/pr`,
        `${projectsBase}/**/reviews/archived`,
      ];

      const existingConfig = await dependencies.readOatConfig(projectRoot);
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
            projectRoot,
            PR_ARCHIVE_LOCAL_PATHS,
          );
          if (addResult.added.length > 0) {
            const config = await dependencies.readOatConfig(projectRoot);
            const allPaths = dependencies.resolveLocalPaths(config);
            await dependencies.applyGitignore(projectRoot, allPaths);
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
      const targetRoot = projectRoot;
      affectedScopes.add('project');
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

    // Apply confirmed removals only after every add has succeeded, so a failed
    // replacement install can never leave a pack uninstalled in both scopes.
    for (const { pack, scope } of stagedRemovals) {
      await removePackFromScope(pack, scopeRoot(scope), dependencies);
      affectedScopes.add(scope);
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
    const sectionBody = buildToolPacksSectionBody(packScopeInfo);
    const sectionResult = await dependencies.upsertAgentsMdSection(
      projectRoot,
      'tools',
      sectionBody,
    );
    // Migrate: remove legacy <!-- OAT workflows --> section if present
    await dependencies.removeAgentsMdSection(projectRoot, 'workflows');

    if (!context.json && sectionResult.action !== 'no-change') {
      context.logger.info(
        `AGENTS.md tool packs section ${sectionResult.action}.`,
      );
    }

    const config = await dependencies.readOatConfig(projectRoot);
    const tools = buildInstalledToolsConfig(
      selectedPacks,
      initialPackStates,
      config.tools,
    );
    await dependencies.writeOatConfig(projectRoot, { ...config, tools });

    const affectedScopesList = [...affectedScopes];
    lastRunInitToolsMetadata = {
      affectedScopes: affectedScopesList,
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

export function createInitToolsCommand(
  overrides: Partial<InitToolsDependencies> = {},
): Command {
  const dependencies: InitToolsDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('tools')
    .description(
      'Install OAT tool packs (core, ideas, docs, workflows, utility, project-management, research, brainstorm)',
    )
    .addCommand(createInitToolsCoreCommand())
    .addCommand(createInitToolsIdeasCommand())
    .addCommand(createInitToolsDocsCommand())
    .addCommand(createInitToolsProjectManagementCommand())
    .addCommand(createInitToolsWorkflowsCommand())
    .addCommand(createInitToolsUtilityCommand())
    .addCommand(createInitToolsResearchCommand())
    .addCommand(createInitToolsBrainstormCommand())
    .action(async (_options: unknown, command: Command) => {
      const context = dependencies.buildCommandContext(
        readGlobalOptions(command),
      );
      const selectedPacks = await runInitTools(context, dependencies);
      setInstalledCanonicalPaths(
        command,
        canonicalPathsForPacks(selectedPacks),
      );
    });
}
