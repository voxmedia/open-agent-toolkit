import { readFile as readFileDefault } from 'node:fs/promises';
import { join } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import {
  confirmAction,
  type PromptContext,
} from '@commands/shared/shared.prompts';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import { compileDispatchCeilingPreset } from '@config/dispatch-ceiling-preset';
import {
  normalizeDispatchMatrix,
  validateDispatchRouteTarget,
  walkDispatchMatrix,
  type DispatchMatrixCellRef,
  type DispatchMatrixNormalizationIssue,
} from '@config/dispatch-matrix';
import {
  dispatchPolicyModeDescription,
  dispatchPolicyPolicyDescription,
  managedDispatchPolicyValueList,
} from '@config/dispatch-policy-options';
import {
  VALID_DISPATCH_POLICY_MODES,
  VALID_MANAGED_DISPATCH_POLICIES,
  type OatConfig,
  type OatLocalConfig,
  type OatToolsConfig,
  type OatWorkflowConfig,
  type UserConfig,
  type WorkflowDispatchMatrixTier,
  type WorkflowDispatchProviderValue,
  type WorkflowDispatchRouteTarget,
  type WorkflowDispatchCeilingPreset,
  type WorkflowDispatchPolicyMode,
  type WorkflowManagedDispatchPolicy,
  type WorkflowPostImplementSequence,
  normalizeWorkflowPostImplementSequence,
  readOatConfig,
  readOatLocalConfig,
  readUserConfig,
  writeOatConfig,
  writeOatLocalConfig,
  writeUserConfig,
} from '@config/oat-config';
import {
  resolveEffectiveConfig,
  type ResolvedConfig,
  type ResolvedConfigSource,
} from '@config/resolve';
import { resolveAssetsRoot } from '@fs/assets';
import { resolveProjectRoot } from '@fs/paths';
import {
  normalizeMatrixCellAvailability,
  validateMatrixCell,
  type MatrixCellAvailabilityResponse,
  type ValidateMatrixCellOptions,
} from '@providers/identity/availability';
import {
  createDispatchValidationPassContext,
  validateDispatchMatrixRefs,
} from '@providers/identity/dispatch-validation';
import { Command } from 'commander';

import { createConfigDumpCommand } from './dump';

const DISPATCH_CEILING_PROVIDER_KEY_PREFIX =
  'workflow.dispatchCeiling.providers.';
const DISPATCH_MATRIX_TIERS = [
  'economy',
  'balanced',
  'high',
  'frontier',
] as const satisfies readonly WorkflowDispatchMatrixTier[];

type WorkflowDispatchProviderConfigKey =
  `${typeof DISPATCH_CEILING_PROVIDER_KEY_PREFIX}${string}`;

interface DispatchCeilingProviderConfigKeyParts {
  provider: string;
  tier?: WorkflowDispatchMatrixTier;
}

type ConfigKey =
  | 'activeIdea'
  | 'activeProject'
  | 'archive.awsProfile'
  | 'archive.awsRegion'
  | 'archive.s3SyncOnComplete'
  | 'archive.s3Uri'
  | 'archive.summaryExportPath'
  | 'archive.wrapUpExportPath'
  | 'autoReviewAtCheckpoints'
  | 'lastPausedProject'
  | 'documentation.config'
  | 'documentation.requireForProjectCompletion'
  | 'documentation.root'
  | 'documentation.tooling'
  | 'git.defaultBranch'
  | 'projects.root'
  | 'tools.brainstorm'
  | 'tools.core'
  | 'tools.docs'
  | 'tools.ideas'
  | 'tools.project-management'
  | 'tools.research'
  | 'tools.utility'
  | 'tools.workflows'
  | 'workflow.archiveOnComplete'
  | 'workflow.autoNarrowReReviewScope'
  | 'workflow.autoArtifactReview.analysis'
  | 'workflow.autoArtifactReview.plan'
  | 'workflow.autoReviewAtHillCheckpoints'
  | 'workflow.createPrOnComplete'
  | 'workflow.designMode'
  | 'workflow.dispatchPolicy.mode'
  | 'workflow.dispatchPolicy.policy'
  | 'workflow.dispatchCeiling.preset'
  | 'workflow.dispatchCeiling.providers.claude'
  | 'workflow.dispatchCeiling.providers.codex'
  | WorkflowDispatchProviderConfigKey
  | 'workflow.hillCheckpointDefault'
  | 'workflow.postImplementSequence'
  | 'workflow.reviewExecutionModel'
  | 'worktrees.root';

interface ConfigValue {
  key: ConfigKey;
  value: unknown;
  source: ResolvedConfigSource;
}

interface ConfigCatalogEntry {
  key: string;
  group: string;
  file: string;
  scope: string;
  type: string;
  defaultValue: string;
  mutability: string;
  owningCommand: string;
  description: string;
}

interface ConfigCommandDependencies {
  buildCommandContext: (
    options: Parameters<typeof buildCommandContext>[0],
  ) => CommandContext;
  resolveProjectRoot: (cwd: string) => Promise<string>;
  readOatConfig: (repoRoot: string) => Promise<OatConfig>;
  writeOatConfig: (repoRoot: string, config: OatConfig) => Promise<void>;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
  writeOatLocalConfig: (
    repoRoot: string,
    config: OatLocalConfig,
  ) => Promise<void>;
  readUserConfig: (userConfigDir: string) => Promise<UserConfig>;
  writeUserConfig: (userConfigDir: string, config: UserConfig) => Promise<void>;
  resolveProjectsRoot: (
    repoRoot: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<string>;
  resolveEffectiveConfig: (
    repoRoot: string,
    userConfigDir: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<ResolvedConfig>;
  resolveAssetsRoot: () => Promise<string>;
  readFile: (path: string) => Promise<string>;
  confirmAction: (message: string, ctx: PromptContext) => Promise<boolean>;
  validateMatrixCell: (
    provider: string,
    value: string,
    options: ValidateMatrixCellOptions,
  ) => Promise<MatrixCellAvailabilityResponse>;
  createDispatchValidationPassContext: typeof createDispatchValidationPassContext;
  validateDispatchMatrixRefs: typeof validateDispatchMatrixRefs;
  processEnv: NodeJS.ProcessEnv;
}

type ConfigSurface = 'auto' | 'shared' | 'local' | 'user';

const KEY_ORDER: ConfigKey[] = [
  'activeIdea',
  'activeProject',
  'archive.s3Uri',
  'archive.s3SyncOnComplete',
  'archive.summaryExportPath',
  'archive.wrapUpExportPath',
  'archive.awsProfile',
  'archive.awsRegion',
  'autoReviewAtCheckpoints',
  'lastPausedProject',
  'documentation.root',
  'documentation.tooling',
  'documentation.config',
  'documentation.requireForProjectCompletion',
  'git.defaultBranch',
  'projects.root',
  'tools.brainstorm',
  'tools.core',
  'tools.docs',
  'tools.ideas',
  'tools.project-management',
  'tools.research',
  'tools.utility',
  'tools.workflows',
  'workflow.hillCheckpointDefault',
  'workflow.archiveOnComplete',
  'workflow.createPrOnComplete',
  'workflow.postImplementSequence',
  'workflow.reviewExecutionModel',
  'workflow.autoReviewAtHillCheckpoints',
  'workflow.autoNarrowReReviewScope',
  'workflow.autoArtifactReview.plan',
  'workflow.autoArtifactReview.analysis',
  'workflow.designMode',
  'workflow.dispatchPolicy.mode',
  'workflow.dispatchPolicy.policy',
  'workflow.dispatchCeiling.preset',
  'workflow.dispatchCeiling.providers.codex',
  'workflow.dispatchCeiling.providers.claude',
  'worktrees.root',
];

const CONFIG_CATALOG: ConfigCatalogEntry[] = [
  {
    key: 'projects.root',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'string',
    defaultValue: '.oat/projects/shared',
    mutability: 'read/write',
    owningCommand: 'oat config set projects.root <value>',
    description: 'Root directory for tracked OAT projects in this repository.',
  },
  {
    key: 'worktrees.root',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'string',
    defaultValue: '.worktrees',
    mutability: 'read/write',
    owningCommand: 'oat config set worktrees.root <value>',
    description: 'Root directory used for git worktrees in this repository.',
  },
  {
    key: 'git.defaultBranch',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'string',
    defaultValue: 'main',
    mutability: 'read/write',
    owningCommand: 'oat config set git.defaultBranch <value>',
    description:
      'Default branch used by lifecycle PR flows when base branch auto-detection is unavailable.',
  },
  {
    key: 'autoReviewAtCheckpoints',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'boolean',
    defaultValue: 'false',
    mutability: 'read/write',
    owningCommand: 'oat config set autoReviewAtCheckpoints <true|false>',
    description:
      'Deprecated compatibility alias for workflow.autoReviewAtHillCheckpoints. Prefer `oat config set workflow.autoReviewAtHillCheckpoints <true|false>`.',
  },
  {
    key: 'documentation.root',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'string',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set documentation.root <value>',
    description:
      'Repository-relative root for the docs surface managed by OAT.',
  },
  {
    key: 'documentation.tooling',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'string',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set documentation.tooling <value>',
    description: 'Documentation stack identifier used by docs workflows.',
  },
  {
    key: 'documentation.config',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'string',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set documentation.config <value>',
    description:
      'Repository-relative path to the primary documentation tool config file.',
  },
  {
    key: 'documentation.requireForProjectCompletion',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'boolean',
    defaultValue: 'false',
    mutability: 'read/write',
    owningCommand:
      'oat config set documentation.requireForProjectCompletion <true|false>',
    description:
      'Turns documentation sync from a suggestion into a completion gate for project closeout.',
  },
  {
    key: 'archive.s3Uri',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'string',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set archive.s3Uri <value>',
    description:
      'Base S3 URI used for repo-scoped archived project sync and completion uploads.',
  },
  {
    key: 'archive.s3SyncOnComplete',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'boolean',
    defaultValue: 'false',
    mutability: 'read/write',
    owningCommand: 'oat config set archive.s3SyncOnComplete <true|false>',
    description:
      'Enables completion-time S3 sync after the local archive succeeds.',
  },
  {
    key: 'archive.summaryExportPath',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'string',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set archive.summaryExportPath <value>',
    description:
      'Repository-relative directory where completion copies project summaries for durable tracked reference.',
  },
  {
    key: 'archive.wrapUpExportPath',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'string',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set archive.wrapUpExportPath <value>',
    description:
      'Repository-relative directory where the oat-wrap-up skill writes date-ranged shipping digests. When unset, the skill falls back to `.oat/repo/reference/wrap-ups`.',
  },
  {
    key: 'archive.awsProfile',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'string',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set archive.awsProfile <value>',
    description:
      'AWS named profile forwarded as AWS_PROFILE to every `aws` invocation made by the archive S3 sync (completion + `oat repo archive sync`). Precedence: per-invocation flag > this config value > existing shell env.',
  },
  {
    key: 'archive.awsRegion',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'string',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set archive.awsRegion <value>',
    description:
      'AWS region forwarded as AWS_REGION to every `aws` invocation made by the archive S3 sync (completion + `oat repo archive sync`). Precedence: per-invocation flag > this config value > existing shell env.',
  },
  {
    key: 'tools.brainstorm',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'boolean',
    defaultValue: 'false',
    mutability: 'read/write',
    owningCommand: 'oat tools install / oat tools update',
    description: 'Whether the brainstorm tool pack is installed.',
  },
  {
    key: 'tools.core',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'boolean',
    defaultValue: 'false',
    mutability: 'read/write',
    owningCommand: 'oat tools install / oat tools update',
    description: 'Whether the core tool pack is installed.',
  },
  {
    key: 'tools.docs',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'boolean',
    defaultValue: 'false',
    mutability: 'read/write',
    owningCommand: 'oat tools install / oat tools update',
    description: 'Whether the docs tool pack is installed.',
  },
  {
    key: 'tools.ideas',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'boolean',
    defaultValue: 'false',
    mutability: 'read/write',
    owningCommand: 'oat tools install / oat tools update',
    description: 'Whether the ideas tool pack is installed.',
  },
  {
    key: 'tools.project-management',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'boolean',
    defaultValue: 'false',
    mutability: 'read/write',
    owningCommand: 'oat tools install / oat tools update',
    description: 'Whether the project-management tool pack is installed.',
  },
  {
    key: 'tools.research',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'boolean',
    defaultValue: 'false',
    mutability: 'read/write',
    owningCommand: 'oat tools install / oat tools update',
    description: 'Whether the research tool pack is installed.',
  },
  {
    key: 'tools.utility',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'boolean',
    defaultValue: 'false',
    mutability: 'read/write',
    owningCommand: 'oat tools install / oat tools update',
    description: 'Whether the utility tool pack is installed.',
  },
  {
    key: 'tools.workflows',
    group: 'Shared Repo (.oat/config.json)',
    file: '.oat/config.json',
    scope: 'shared repo',
    type: 'boolean',
    defaultValue: 'false',
    mutability: 'read/write',
    owningCommand: 'oat tools install / oat tools update',
    description: 'Whether the workflows tool pack is installed.',
  },
  {
    key: 'activeProject',
    group: 'Repo Local (.oat/config.local.json)',
    file: '.oat/config.local.json',
    scope: 'repo local',
    type: 'string | null',
    defaultValue: 'null',
    mutability: 'read/write',
    owningCommand: 'oat config set activeProject <value>',
    description:
      'Active OAT project for this repository checkout and developer workspace.',
  },
  {
    key: 'lastPausedProject',
    group: 'Repo Local (.oat/config.local.json)',
    file: '.oat/config.local.json',
    scope: 'repo local',
    type: 'string | null',
    defaultValue: 'null',
    mutability: 'read/write',
    owningCommand: 'oat config set lastPausedProject <value>',
    description:
      'Most recent paused project path for local lifecycle resume flows.',
  },
  {
    key: 'activeIdea',
    group: 'Repo Local (.oat/config.local.json)',
    file: '.oat/config.local.json',
    scope: 'repo local',
    type: 'string | null',
    defaultValue: 'null',
    mutability: 'read/write',
    owningCommand: 'oat config set activeIdea <value>',
    description:
      'Repository-scoped active idea pointer that overrides the user-level active idea when set.',
  },
  {
    key: 'activeIdea',
    group: 'User (~/.oat/config.json)',
    file: '~/.oat/config.json',
    scope: 'user',
    type: 'string | null',
    defaultValue: 'null',
    mutability: 'read/write',
    owningCommand: 'oat config set activeIdea <value> --user',
    description:
      'User-level active idea fallback used when no repo-local active idea is set. Writable via `oat config set activeIdea <value> --user`.',
  },
  {
    key: 'workflow.hillCheckpointDefault',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'every | final',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set workflow.hillCheckpointDefault <value>',
    description:
      'Default HiLL checkpoint behavior in oat-project-implement: "every" pauses after every phase, "final" pauses only after the last phase. When unset, the skill prompts. Resolution: env > local > shared > user > default.',
  },
  {
    key: 'workflow.archiveOnComplete',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'boolean',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set workflow.archiveOnComplete <true|false>',
    description:
      'Skip the "Archive after completion?" prompt in oat-project-complete. When unset, the skill prompts. Resolution: env > local > shared > user > default.',
  },
  {
    key: 'workflow.createPrOnComplete',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'boolean',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set workflow.createPrOnComplete <true|false>',
    description:
      'Skip the "Open a PR?" prompt in oat-project-complete. When true, completion auto-triggers PR creation. Resolution: env > local > shared > user > default.',
  },
  {
    key: 'workflow.postImplementSequence',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'legacy string (wait | summary | pr | docs-pr) | structured JSON object',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand:
      "oat config set workflow.postImplementSequence '<legacy-or-json>'",
    description:
      'Default post-implementation chaining. Legacy strings remain supported unchanged. Structured JSON uses {"preApproval":[...],"postApproval":[...]} with the canonical sequence steps. Plain get/list/dump output serializes structured values as compact JSON; get --json preserves the object value. When unset, the skill prompts. Resolution: env > local > shared > user > default.',
  },
  {
    key: 'workflow.reviewExecutionModel',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'subagent | inline | fresh-session',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set workflow.reviewExecutionModel <value>',
    description:
      'Default execution model for the final review step in oat-project-implement: "subagent" dispatches a review subagent, "inline" runs the review in-context, "fresh-session" prints guidance for running the review in a separate session (with an escape hatch to subagent/inline). When unset, the skill prompts. Resolution: env > local > shared > user > default.',
  },
  {
    key: 'workflow.autoReviewAtHillCheckpoints',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'boolean',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand:
      'oat config set workflow.autoReviewAtHillCheckpoints <true|false>',
    description:
      'Automatically run the extra lifecycle review when a HiLL checkpoint is reached. This does not control Tier 1 per-phase oat-reviewer gates. When unset, the skill prompts. Resolution: env > local > shared > user > legacy autoReviewAtCheckpoints > default.',
  },
  {
    key: 'workflow.autoNarrowReReviewScope',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'boolean',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand:
      'oat config set workflow.autoNarrowReReviewScope <true|false>',
    description:
      'Auto-narrow re-review scope to fix-task commits in oat-project-review-provide when re-reviewing completed fix tasks. Has no effect on initial reviews (there is nothing to narrow to). When unset, the skill prompts. Resolution: env > local > shared > user > default.',
  },
  {
    key: 'workflow.autoArtifactReview.plan',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'boolean',
    defaultValue: 'true',
    mutability: 'read/write',
    owningCommand:
      'oat config set workflow.autoArtifactReview.plan <true|false>',
    description:
      'Automatically run the bounded artifact-review loop for generated plan artifacts before implementation handoff. Resolution: local > shared > user > default.',
  },
  {
    key: 'workflow.autoArtifactReview.analysis',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'boolean',
    defaultValue: 'true',
    mutability: 'read/write',
    owningCommand:
      'oat config set workflow.autoArtifactReview.analysis <true|false>',
    description:
      'Automatically run the bounded accuracy-review loop for generated analysis artifacts before apply workflows consume them. Resolution: local > shared > user > default.',
  },
  {
    key: 'workflow.designMode',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'collaborative | selective | draft',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set workflow.designMode <value>',
    description:
      'Persisted preference for oat-project-design: "collaborative" runs every section section-by-section, "selective" drafts routine sections silently and live-reviews high-risk sections, and "draft" drafts the full design up front for holistic review. Quick-start lightweight design supports collaborative/draft only and treats selective as collaborative when encountered. When unset, the skill prompts. Runtime signals (OAT_NON_INTERACTIVE=1, no TTY) always outrank this preference. Resolution: arg > env > non-interactive context > local > shared > user > default.',
  },
  {
    key: 'workflow.dispatchCeiling.preset',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'balanced | maximum | cost-conscious',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set workflow.dispatchCeiling.preset <value>',
    description:
      'Legacy compatibility alias for capped managed dispatch policies. Provider-neutral ceiling preset that compiles to concrete per-provider values at write time. balanced → Codex: high, Claude: sonnet; maximum → Codex: xhigh, Claude: opus; cost-conscious → Codex: medium, Claude: sonnet. Preset provenance only; runtime dispatch reads concrete providers values. Resolution: local > shared > user > default.',
  },
  {
    key: 'workflow.dispatchPolicy.mode',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'managed | inherit',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set workflow.dispatchPolicy.mode <value>',
    description: dispatchPolicyModeDescription(),
  },
  {
    key: 'workflow.dispatchPolicy.policy',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'economy | balanced | high | frontier | uncapped',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set workflow.dispatchPolicy.policy <value>',
    description: dispatchPolicyPolicyDescription(),
  },
  {
    key: 'workflow.dispatchCeiling.providers.codex',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'low | medium | high | xhigh | max',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand:
      'oat config set workflow.dispatchCeiling.providers.codex <value>',
    description:
      'Explicit Codex ceiling value (advanced/manual). Wins over any preset. Maximum Codex reasoning effort OAT may select for deterministic implementation and review subagent variants. Resolution: local > shared > user > default.',
  },
  {
    key: 'workflow.dispatchCeiling.providers.claude',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'haiku | sonnet | opus | fable',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand:
      'oat config set workflow.dispatchCeiling.providers.claude <value>',
    description:
      'Explicit Claude ceiling value (advanced/manual). Wins over any preset. Maximum Claude model tier OAT may select for provider-native subagent dispatch. Resolution: local > shared > user > default.',
  },
  {
    key: 'sync.defaultStrategy',
    group: 'Sync/Provider (.oat/sync/config.json)',
    file: '.oat/sync/config.json',
    scope: 'project sync',
    type: 'auto | symlink | copy',
    defaultValue: 'auto',
    mutability: 'read/write',
    owningCommand: 'oat providers set --scope project',
    description:
      'Default sync strategy used when a provider does not override its own strategy.',
  },
  {
    key: 'sync.providers.<name>.enabled',
    group: 'Sync/Provider (.oat/sync/config.json)',
    file: '.oat/sync/config.json',
    scope: 'project sync',
    type: 'boolean',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat providers set --scope project --enabled/--disabled',
    description: 'Provider-specific enablement flag for project sync surfaces.',
  },
  {
    key: 'sync.providers.<name>.strategy',
    group: 'Sync/Provider (.oat/sync/config.json)',
    file: '.oat/sync/config.json',
    scope: 'project sync',
    type: 'auto | symlink | copy',
    defaultValue: 'inherit sync.defaultStrategy',
    mutability: 'read/write',
    owningCommand: 'oat providers set --scope project',
    description:
      'Provider-specific sync strategy override for a named provider.',
  },
];

const DEFAULT_DEPENDENCIES: ConfigCommandDependencies = {
  buildCommandContext,
  resolveProjectRoot,
  readOatConfig,
  writeOatConfig,
  readOatLocalConfig,
  writeOatLocalConfig,
  readUserConfig,
  writeUserConfig,
  resolveProjectsRoot,
  resolveEffectiveConfig,
  resolveAssetsRoot,
  readFile: (path) => readFileDefault(path, 'utf8'),
  confirmAction,
  validateMatrixCell,
  createDispatchValidationPassContext,
  validateDispatchMatrixRefs,
  processEnv: process.env,
};

function isConfigKey(value: string): value is ConfigKey {
  return (
    KEY_ORDER.includes(value as ConfigKey) ||
    isDispatchCeilingProviderKey(value)
  );
}

function isDispatchCeilingProviderKey(
  value: string,
): value is WorkflowDispatchProviderConfigKey {
  return (
    value.startsWith(DISPATCH_CEILING_PROVIDER_KEY_PREFIX) &&
    value.slice(DISPATCH_CEILING_PROVIDER_KEY_PREFIX.length).trim().length > 0
  );
}

function isDispatchMatrixTier(
  value: string,
): value is WorkflowDispatchMatrixTier {
  return (DISPATCH_MATRIX_TIERS as readonly string[]).includes(value);
}

function parseDispatchCeilingProviderConfigKey(
  key: WorkflowDispatchProviderConfigKey,
): DispatchCeilingProviderConfigKeyParts {
  const suffix = key.slice(DISPATCH_CEILING_PROVIDER_KEY_PREFIX.length).trim();
  const parts = suffix.split('.').map((part) => part.trim());
  const invalidMessage = `Invalid config key ${key}: expected workflow.dispatchCeiling.providers.<provider> or workflow.dispatchCeiling.providers.<provider>.<tier> with tier one of ${DISPATCH_MATRIX_TIERS.join(
    ' | ',
  )}.`;

  if (parts.some((part) => part.length === 0)) {
    throw new Error(invalidMessage);
  }

  if (parts.length === 1) {
    const provider = parts[0];
    if (!provider) {
      throw new Error(invalidMessage);
    }
    return { provider };
  }

  const tier = parts[parts.length - 1];
  if (!tier || !isDispatchMatrixTier(tier)) {
    throw new Error(invalidMessage);
  }

  const provider = parts.slice(0, -1).join('.').trim();
  if (!provider) {
    throw new Error(invalidMessage);
  }

  return { provider, tier };
}

function providerNameFromConfigKey(
  key: WorkflowDispatchProviderConfigKey,
): string {
  return parseDispatchCeilingProviderConfigKey(key).provider;
}

function normalizeSharedRoot(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Shared config values cannot be empty.');
  }
  return trimmed.replace(/\/+$/, '');
}

const WORKFLOW_ENUM_VALUES = {
  'workflow.hillCheckpointDefault': ['every', 'final'],
  'workflow.postImplementSequence': ['wait', 'summary', 'pr', 'docs-pr'],
  'workflow.reviewExecutionModel': ['subagent', 'inline', 'fresh-session'],
  'workflow.designMode': ['collaborative', 'selective', 'draft'],
  'workflow.dispatchPolicy.mode': [...VALID_DISPATCH_POLICY_MODES],
  'workflow.dispatchPolicy.policy': [...VALID_MANAGED_DISPATCH_POLICIES],
  'workflow.dispatchCeiling.preset': ['balanced', 'maximum', 'cost-conscious'],
  'workflow.dispatchCeiling.providers.codex': [
    'low',
    'medium',
    'high',
    'xhigh',
    'max',
  ],
  'workflow.dispatchCeiling.providers.claude': [
    'haiku',
    'sonnet',
    'opus',
    'fable',
  ],
} as const satisfies Partial<Record<ConfigKey, readonly string[]>>;

function closedDispatchProviderValues(
  provider: string,
): readonly string[] | undefined {
  if (provider === 'codex') {
    return WORKFLOW_ENUM_VALUES['workflow.dispatchCeiling.providers.codex'];
  }
  if (provider === 'claude') {
    return WORKFLOW_ENUM_VALUES['workflow.dispatchCeiling.providers.claude'];
  }
  return undefined;
}

const WORKFLOW_BOOLEAN_KEYS = new Set<ConfigKey>([
  'workflow.archiveOnComplete',
  'workflow.createPrOnComplete',
  'workflow.autoReviewAtHillCheckpoints',
  'workflow.autoNarrowReReviewScope',
  'workflow.autoArtifactReview.plan',
  'workflow.autoArtifactReview.analysis',
]);

function isWorkflowKey(key: ConfigKey): boolean {
  return key.startsWith('workflow.');
}

function isStateKey(key: ConfigKey): boolean {
  return (
    key === 'activeIdea' ||
    key === 'activeProject' ||
    key === 'lastPausedProject'
  );
}

function isStructuralKey(key: ConfigKey): boolean {
  return (
    key === 'projects.root' ||
    key === 'worktrees.root' ||
    key === 'git.defaultBranch' ||
    key.startsWith('documentation.') ||
    key.startsWith('archive.') ||
    key.startsWith('tools.')
  );
}

function validateSurfaceForKey(key: ConfigKey, surface: ConfigSurface): void {
  if (surface === 'auto') {
    return;
  }

  if (isStructuralKey(key)) {
    if (surface !== 'shared') {
      throw new Error(
        `Cannot set structural key '${key}' at '${surface}' scope. Structural keys (projects.root, worktrees.root, git.*, documentation.*, archive.*, tools.*) can only be set at shared scope (.oat/config.json).`,
      );
    }
    return;
  }

  if (isStateKey(key)) {
    // activeIdea has both a repo-local and a user-level surface in the
    // catalog (the user-level entry is the global fallback). Both surfaces
    // are writable; shared is not supported because an idea pointer is not
    // a team decision.
    if (key === 'activeIdea') {
      if (surface !== 'local' && surface !== 'user') {
        throw new Error(
          `Cannot set 'activeIdea' at '${surface}' scope. activeIdea can only be set at local scope (.oat/config.local.json) or user scope (~/.oat/config.json).`,
        );
      }
      return;
    }

    // activeProject and lastPausedProject are per-checkout state only.
    if (surface !== 'local') {
      throw new Error(
        `Cannot set state key '${key}' at '${surface}' scope. State keys (activeProject, lastPausedProject) can only be set at local scope (.oat/config.local.json).`,
      );
    }
    return;
  }

  // Legacy alias remains shared-only. The preferred multi-surface key is
  // workflow.autoReviewAtHillCheckpoints.
  if (key === 'autoReviewAtCheckpoints' && surface !== 'shared') {
    throw new Error(
      `Cannot set 'autoReviewAtCheckpoints' at '${surface}' scope. This legacy key is shared-only; use workflow.autoReviewAtHillCheckpoints for local/user overrides.`,
    );
  }

  // Workflow keys accept any non-auto surface.
}

function defaultSurfaceForKey(key: ConfigKey): ConfigSurface {
  if (isWorkflowKey(key) || isStateKey(key)) {
    return 'local';
  }
  return 'shared';
}

function parseWorkflowValue(
  key: ConfigKey,
  rawValue: string,
): boolean | string | WorkflowPostImplementSequence {
  if (WORKFLOW_BOOLEAN_KEYS.has(key)) {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized !== 'true' && normalized !== 'false') {
      throw new Error(
        `Invalid value for ${key}: expected 'true' or 'false', got '${rawValue}'`,
      );
    }
    return normalized === 'true';
  }

  if (key === 'workflow.postImplementSequence') {
    const normalized = rawValue.trim();
    if (normalized.startsWith('{') || normalized.startsWith('[')) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(normalized);
      } catch {
        throw new Error(
          `Invalid value for ${key}: expected valid structured JSON`,
        );
      }
      const sequence = normalizeWorkflowPostImplementSequence(parsed);
      if (!sequence || Array.isArray(parsed)) {
        throw new Error(
          `Invalid value for ${key}: structured JSON must match {"preApproval":[...],"postApproval":[...]}`,
        );
      }
      return sequence;
    }
  }

  const allowed =
    WORKFLOW_ENUM_VALUES[key as keyof typeof WORKFLOW_ENUM_VALUES];
  if (allowed) {
    const normalized = rawValue.trim();
    if (!(allowed as readonly string[]).includes(normalized)) {
      throw new Error(
        `Invalid value for ${key}: expected one of ${allowed.join(' | ')}, got '${rawValue}'`,
      );
    }
    return normalized;
  }

  if (isDispatchCeilingProviderKey(key)) {
    const { provider } = parseDispatchCeilingProviderConfigKey(key);
    const normalized = rawValue.trim();
    if (normalized.length === 0) {
      throw new Error(
        `Invalid value for ${key}: provider values cannot be empty`,
      );
    }
    const closedValues = closedDispatchProviderValues(provider);
    if (closedValues && !closedValues.includes(normalized)) {
      throw new Error(
        `Invalid value for ${key}: expected one of ${closedValues.join(' | ')}, got '${rawValue}'`,
      );
    }
    return normalized;
  }

  throw new Error(`Unknown workflow key: ${key}`);
}

function dispatchProviderAvailabilityWarning(
  key: WorkflowDispatchProviderConfigKey,
  value: string,
  availability: MatrixCellAvailabilityResponse,
): string | null {
  return matrixCellAvailabilityWarning(key, value, availability);
}

const DISPATCH_MATRIX_RECOMMENDATION_ASSET = join(
  'config',
  'dispatch-matrix-recommendation.json',
);

interface DispatchMatrixRecommendation {
  version: string;
  providers: Record<string, WorkflowDispatchProviderValue>;
  issues: DispatchMatrixNormalizationIssue[];
}

interface DispatchMatrixAvailabilityRef {
  provider: string;
  value: string;
  path: string;
  target?: WorkflowDispatchRouteTarget;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function matrixCellAvailabilityWarning(
  path: string,
  value: string,
  availability: MatrixCellAvailabilityResponse,
): string | null {
  const result = normalizeMatrixCellAvailability(availability);
  if (result.availability === 'valid') {
    return null;
  }
  const details = result.message ? ` ${result.message}` : '';

  if (result.availability === 'unknown-value') {
    return `${path} value '${value}' was not recognized by the provider availability oracle; saving anyway.${details}`;
  }

  return `${path} value '${value}' could not be validated because the provider availability oracle is unavailable; saving anyway.${details}`;
}

function parseDispatchMatrixRecommendation(
  raw: string,
): DispatchMatrixRecommendation {
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error('Dispatch matrix recommendation asset must be an object.');
  }

  const version =
    typeof parsed.version === 'string' ? parsed.version.trim() : '';
  if (!version) {
    throw new Error(
      'Dispatch matrix recommendation asset is missing a version.',
    );
  }

  if (!isRecord(parsed.providers)) {
    throw new Error(
      'Dispatch matrix recommendation asset is missing providers.',
    );
  }

  const normalized = normalizeDispatchMatrix(parsed.providers, {
    pathPrefix: 'workflow.dispatchCeiling.providers',
    compatibilityMode: 'layered-config',
  });

  return {
    version,
    providers: normalized.providers,
    issues: normalized.issues,
  };
}

function collectDispatchMatrixCellRefs(
  providers: Record<string, WorkflowDispatchProviderValue>,
): DispatchMatrixCellRef[] {
  return walkDispatchMatrix(providers, {
    source: 'repo-config',
    pathPrefix: 'workflow.dispatchCeiling.providers',
  });
}

function collectDispatchMatrixTargetValidationErrors(
  refs: DispatchMatrixCellRef[],
  issues: DispatchMatrixNormalizationIssue[],
): string[] {
  const errors = issues.map((issue) => {
    const relativePath = issue.path.startsWith(
      DISPATCH_CEILING_PROVIDER_KEY_PREFIX,
    )
      ? issue.path.slice(DISPATCH_CEILING_PROVIDER_KEY_PREFIX.length)
      : '';
    const provider = relativePath.split(/[.[]/, 1)[0] ?? '';
    const closedValues = closedDispatchProviderValues(provider);
    if (typeof issue.value === 'string' && closedValues) {
      return `Invalid value for ${issue.path}: expected one of ${closedValues.join(' | ')}, got '${issue.value}'`;
    }
    return `${issue.path}: malformed dispatch matrix entry (${issue.kind}).`;
  });
  for (const ref of refs) {
    if (ref.target === null) {
      continue;
    }
    const validation = validateDispatchRouteTarget(ref.provider, ref.target);
    if (!validation.valid) {
      errors.push(`${ref.path}: ${validation.reason}`);
    }
  }

  return errors;
}

function toAvailabilityRef(
  ref: DispatchMatrixCellRef,
): DispatchMatrixAvailabilityRef | null {
  if (ref.value !== null) {
    return { provider: ref.provider, value: ref.value, path: ref.path };
  }
  if (ref.target === null) {
    return null;
  }

  const value = ref.target.model ?? ref.target.effort;
  if (!value) {
    return null;
  }
  return {
    provider: ref.target.harness ?? ref.provider,
    value,
    path: ref.path,
    target: ref.target,
  };
}

function applyWorkflowValue(
  workflow: OatWorkflowConfig,
  key: ConfigKey,
  value: boolean | string | WorkflowPostImplementSequence,
): OatWorkflowConfig {
  const subKey = key.slice('workflow.'.length);

  if (subKey === 'postImplementSequence') {
    return {
      ...workflow,
      postImplementSequence: value as WorkflowPostImplementSequence,
    };
  }

  if (subKey === 'dispatchPolicy.mode') {
    const mode = value as WorkflowDispatchPolicyMode;
    if (mode === 'inherit') {
      return {
        ...workflow,
        dispatchPolicy: { mode },
      };
    }

    const policy = workflow.dispatchPolicy?.policy;
    if (!policy) {
      throw new Error(
        `Cannot set workflow.dispatchPolicy.mode to managed without an existing workflow.dispatchPolicy.policy. Set workflow.dispatchPolicy.policy <${managedDispatchPolicyValueList('|')}> instead.`,
      );
    }

    return {
      ...workflow,
      dispatchPolicy: { mode, policy },
    };
  }

  if (subKey === 'dispatchPolicy.policy') {
    return {
      ...workflow,
      dispatchPolicy: {
        mode: 'managed',
        policy: value as WorkflowManagedDispatchPolicy,
      },
    };
  }

  if (subKey === 'dispatchCeiling.preset') {
    // Presets compile to concrete per-provider values at write time so the
    // resolver (which reads only providers.*) gets a usable ceiling. The preset
    // label is persisted as provenance alongside the compiled providers.
    const compiled = compileDispatchCeilingPreset(
      value as WorkflowDispatchCeilingPreset,
    );
    return {
      ...workflow,
      dispatchCeiling: {
        ...workflow.dispatchCeiling,
        preset: compiled.preset,
        providers: {
          ...workflow.dispatchCeiling?.providers,
          codex: compiled.providers.codex,
          claude: compiled.providers.claude,
        },
      },
    } as OatWorkflowConfig;
  }

  if (isDispatchCeilingProviderKey(key)) {
    const { provider, tier } = parseDispatchCeilingProviderConfigKey(key);
    const providers = workflow.dispatchCeiling?.providers ?? {};
    if (tier) {
      const existingProviderValue = providers[provider];
      const existingTierMap =
        existingProviderValue &&
        typeof existingProviderValue === 'object' &&
        !Array.isArray(existingProviderValue)
          ? existingProviderValue
          : {};

      return {
        ...workflow,
        dispatchCeiling: {
          ...workflow.dispatchCeiling,
          providers: {
            ...providers,
            [provider]: {
              ...existingTierMap,
              [tier]: value as string,
            },
          },
        },
      } as OatWorkflowConfig;
    }

    return {
      ...workflow,
      dispatchCeiling: {
        ...workflow.dispatchCeiling,
        providers: {
          ...providers,
          [provider]: value,
        },
      },
    } as OatWorkflowConfig;
  }

  if (subKey.startsWith('autoArtifactReview.')) {
    const reviewKey = subKey.slice('autoArtifactReview.'.length);
    return {
      ...workflow,
      autoArtifactReview: {
        ...workflow.autoArtifactReview,
        [reviewKey]: value,
      },
    } as OatWorkflowConfig;
  }

  return {
    ...workflow,
    [subKey]: value,
  } as OatWorkflowConfig;
}

function formatResolvedValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.join(',');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

async function getConfigValue(
  repoRoot: string,
  userConfigDir: string,
  key: ConfigKey,
  dependencies: ConfigCommandDependencies,
  preserveRawObject = false,
): Promise<ConfigValue> {
  const resolved = await dependencies.resolveEffectiveConfig(
    repoRoot,
    userConfigDir,
    dependencies.processEnv,
  );

  const entry = resolved.resolved[key];
  if (!entry) {
    return { key, value: null, source: 'default' };
  }

  return {
    key,
    value:
      preserveRawObject && typeof entry.value === 'object'
        ? entry.value
        : formatResolvedValue(entry.value),
    source: entry.source,
  };
}

async function listConfigKeys(
  repoRoot: string,
  userConfigDir: string,
  dependencies: ConfigCommandDependencies,
): Promise<ConfigKey[]> {
  const resolved = await dependencies.resolveEffectiveConfig(
    repoRoot,
    userConfigDir,
    dependencies.processEnv,
  );
  const staticKeys = new Set<string>(KEY_ORDER);
  const dynamicProviderKeys = Object.keys(resolved.resolved)
    .filter(isDispatchCeilingProviderKey)
    .filter((key) => !staticKeys.has(key))
    .sort();

  return [...KEY_ORDER, ...dynamicProviderKeys];
}

async function setConfigValue(
  repoRoot: string,
  userConfigDir: string,
  key: ConfigKey,
  rawValue: string,
  surface: ConfigSurface,
  dependencies: ConfigCommandDependencies,
  warn: (message: string) => void,
): Promise<ConfigValue> {
  validateSurfaceForKey(key, surface);

  const effectiveSurface: ConfigSurface =
    surface === 'auto' ? defaultSurfaceForKey(key) : surface;

  if (isWorkflowKey(key)) {
    const parsedValue = parseWorkflowValue(key, rawValue);
    const displayValue = formatResolvedValue(parsedValue);
    if (typeof parsedValue === 'string' && isDispatchCeilingProviderKey(key)) {
      const availability = await dependencies.validateMatrixCell(
        providerNameFromConfigKey(key),
        parsedValue,
        {
          cwd: repoRoot,
          env: dependencies.processEnv,
          detailed: true,
        },
      );
      const warning = dispatchProviderAvailabilityWarning(
        key,
        parsedValue,
        availability,
      );
      if (warning) {
        warn(warning);
      }
    }

    if (effectiveSurface === 'user') {
      const userConfig = await dependencies.readUserConfig(userConfigDir);
      await dependencies.writeUserConfig(userConfigDir, {
        ...userConfig,
        workflow: applyWorkflowValue(
          userConfig.workflow ?? {},
          key,
          parsedValue,
        ),
      });
      return { key, value: displayValue, source: 'user' };
    }

    if (effectiveSurface === 'local') {
      const localConfig = await dependencies.readOatLocalConfig(repoRoot);
      await dependencies.writeOatLocalConfig(repoRoot, {
        ...localConfig,
        workflow: applyWorkflowValue(
          localConfig.workflow ?? {},
          key,
          parsedValue,
        ),
      });
      return { key, value: displayValue, source: 'local' };
    }

    // shared
    const sharedConfig = await dependencies.readOatConfig(repoRoot);
    await dependencies.writeOatConfig(repoRoot, {
      ...sharedConfig,
      workflow: applyWorkflowValue(
        sharedConfig.workflow ?? {},
        key,
        parsedValue,
      ),
    });
    return { key, value: displayValue, source: 'shared' };
  }

  if (
    key === 'activeIdea' ||
    key === 'activeProject' ||
    key === 'lastPausedProject'
  ) {
    const nextValue = rawValue === '' ? null : rawValue;

    // activeIdea --user writes to ~/.oat/config.json
    if (key === 'activeIdea' && effectiveSurface === 'user') {
      const userConfig = await dependencies.readUserConfig(userConfigDir);
      await dependencies.writeUserConfig(userConfigDir, {
        ...userConfig,
        activeIdea: nextValue,
      });
      return { key, value: nextValue, source: 'user' };
    }

    const localConfig = await dependencies.readOatLocalConfig(repoRoot);
    await dependencies.writeOatLocalConfig(repoRoot, {
      ...localConfig,
      [key]: nextValue,
    });
    return {
      key,
      value: nextValue,
      source: 'local',
    };
  }

  const config = await dependencies.readOatConfig(repoRoot);

  if (key.startsWith('documentation.')) {
    const doc = { ...config.documentation };

    if (key === 'documentation.root') {
      doc.root = normalizeSharedRoot(rawValue);
    } else if (key === 'documentation.tooling') {
      doc.tooling = rawValue.trim();
    } else if (key === 'documentation.config') {
      doc.config = normalizeSharedRoot(rawValue);
    } else if (key === 'documentation.requireForProjectCompletion') {
      doc.requireForProjectCompletion =
        rawValue.trim().toLowerCase() === 'true';
    }

    await dependencies.writeOatConfig(repoRoot, {
      ...config,
      documentation: doc,
    });

    const resultValue =
      key === 'documentation.requireForProjectCompletion'
        ? String(doc.requireForProjectCompletion ?? false)
        : ((doc[
            key.replace('documentation.', '') as keyof typeof doc
          ] as string) ?? null);

    return {
      key,
      value: resultValue,
      source: 'shared',
    };
  }

  if (key.startsWith('archive.')) {
    const archive = { ...config.archive };

    if (key === 'archive.s3Uri') {
      archive.s3Uri = rawValue.trim().replace(/\/+$/, '');
    } else if (key === 'archive.s3SyncOnComplete') {
      archive.s3SyncOnComplete = rawValue.trim().toLowerCase() === 'true';
    } else if (key === 'archive.summaryExportPath') {
      archive.summaryExportPath = normalizeSharedRoot(rawValue);
    } else if (key === 'archive.wrapUpExportPath') {
      archive.wrapUpExportPath = normalizeSharedRoot(rawValue);
    } else if (key === 'archive.awsProfile' || key === 'archive.awsRegion') {
      const subKey = key.slice('archive.'.length) as 'awsProfile' | 'awsRegion';
      const trimmed = rawValue.trim();
      if (trimmed === '') {
        delete archive[subKey];
      } else {
        archive[subKey] = trimmed;
      }
    }

    await dependencies.writeOatConfig(repoRoot, {
      ...config,
      archive,
    });

    const resultValue =
      key === 'archive.s3SyncOnComplete'
        ? String(archive.s3SyncOnComplete ?? false)
        : ((archive[
            key.replace('archive.', '') as keyof typeof archive
          ] as string) ?? null);

    return {
      key,
      value: resultValue,
      source: 'shared',
    };
  }

  if (key.startsWith('tools.')) {
    const packName = key.slice('tools.'.length) as keyof OatToolsConfig;
    const tools = { ...config.tools };
    tools[packName] = rawValue.trim().toLowerCase() === 'true';

    await dependencies.writeOatConfig(repoRoot, {
      ...config,
      tools,
    });

    return {
      key,
      value: String(tools[packName] ?? false),
      source: 'shared',
    };
  }

  if (key === 'git.defaultBranch') {
    const nextValue = rawValue.trim();
    if (!nextValue) {
      throw new Error('Shared config values cannot be empty.');
    }

    await dependencies.writeOatConfig(repoRoot, {
      ...config,
      git: {
        ...config.git,
        defaultBranch: nextValue,
      },
    });

    return {
      key,
      value: nextValue,
      source: 'shared',
    };
  }

  if (key === 'autoReviewAtCheckpoints') {
    const nextValue = rawValue.trim().toLowerCase() === 'true';
    await dependencies.writeOatConfig(repoRoot, {
      ...config,
      autoReviewAtCheckpoints: nextValue,
    });
    return {
      key,
      value: String(nextValue),
      source: 'shared',
    };
  }

  const normalizedValue = normalizeSharedRoot(rawValue);

  if (key === 'projects.root') {
    await dependencies.writeOatConfig(repoRoot, {
      ...config,
      projects: { root: normalizedValue },
    });
  } else {
    await dependencies.writeOatConfig(repoRoot, {
      ...config,
      worktrees: { root: normalizedValue },
    });
  }

  return {
    key,
    value: normalizedValue,
    source: 'shared',
  };
}

interface AdoptDispatchMatrixOptions {
  surface: ConfigSurface;
}

interface AdoptDispatchMatrixResult {
  key: string;
  value: string;
  source: Exclude<ConfigSurface, 'auto'>;
}

async function loadDispatchMatrixRecommendation(
  dependencies: ConfigCommandDependencies,
): Promise<DispatchMatrixRecommendation> {
  const assetsRoot = await dependencies.resolveAssetsRoot();
  const assetPath = join(assetsRoot, DISPATCH_MATRIX_RECOMMENDATION_ASSET);
  return parseDispatchMatrixRecommendation(
    await dependencies.readFile(assetPath),
  );
}

async function validateRecommendationCells(
  repoRoot: string,
  recommendation: DispatchMatrixRecommendation,
  dependencies: ConfigCommandDependencies,
  warn: (message: string) => void,
): Promise<void> {
  const refs = collectDispatchMatrixCellRefs(recommendation.providers);
  const targetErrors = collectDispatchMatrixTargetValidationErrors(
    refs,
    recommendation.issues,
  );
  if (targetErrors.length > 0) {
    throw new Error(targetErrors.join('\n'));
  }

  const availabilityRefs = refs.filter((matrixRef) => {
    const ref = toAvailabilityRef(matrixRef);
    if (ref === null) {
      return false;
    }
    const closedValues = closedDispatchProviderValues(ref.provider);
    if (!ref.target && closedValues && !closedValues.includes(ref.value)) {
      throw new Error(
        `Invalid value for ${ref.path}: expected one of ${closedValues.join(' | ')}, got '${ref.value}'`,
      );
    }
    return true;
  });

  const pass = dependencies.createDispatchValidationPassContext({
    cwd: repoRoot,
    env: dependencies.processEnv,
    validateMatrixCell: dependencies.validateMatrixCell,
  });
  const results = await dependencies.validateDispatchMatrixRefs(
    availabilityRefs,
    pass,
  );

  for (const result of results) {
    const ref = toAvailabilityRef(result.ref)!;
    const warning = matrixCellAvailabilityWarning(ref.path, ref.value, {
      availability: result.status,
      ...(result.diagnostic ? { message: result.diagnostic } : {}),
    });
    if (warning) {
      warn(warning);
    }
  }
}

function applyDispatchMatrixRecommendation(
  workflow: OatWorkflowConfig | undefined,
  recommendation: DispatchMatrixRecommendation,
): OatWorkflowConfig {
  const existingProviders = workflow?.dispatchCeiling?.providers ?? {};
  const providers: Record<string, WorkflowDispatchProviderValue> = {
    ...recommendation.providers,
  };

  for (const [provider, existingValue] of Object.entries(existingProviders)) {
    const recommendedValue = recommendation.providers[provider];
    if (
      recommendedValue &&
      typeof recommendedValue !== 'string' &&
      typeof existingValue !== 'string'
    ) {
      providers[provider] = { ...recommendedValue, ...existingValue };
    } else {
      providers[provider] = existingValue;
    }
  }

  return {
    ...(workflow ?? {}),
    dispatchCeiling: {
      ...workflow?.dispatchCeiling,
      recommendationVersion: recommendation.version,
      providers,
    },
  };
}

async function adoptDispatchMatrixRecommendation(
  repoRoot: string,
  userConfigDir: string,
  options: AdoptDispatchMatrixOptions,
  context: CommandContext,
  dependencies: ConfigCommandDependencies,
): Promise<AdoptDispatchMatrixResult> {
  const source: Exclude<ConfigSurface, 'auto'> =
    options.surface === 'auto' ? 'local' : options.surface;
  const recommendation = await loadDispatchMatrixRecommendation(dependencies);

  if (source === 'user') {
    const userConfig = await dependencies.readUserConfig(userConfigDir);
    await validateRecommendationCells(
      repoRoot,
      recommendation,
      dependencies,
      context.logger.warn,
    );
    await dependencies.writeUserConfig(userConfigDir, {
      ...userConfig,
      workflow: applyDispatchMatrixRecommendation(
        userConfig.workflow,
        recommendation,
      ),
    });
    return {
      key: 'workflow.dispatchCeiling.providers',
      value: recommendation.version,
      source,
    };
  }

  if (source === 'local') {
    const localConfig = await dependencies.readOatLocalConfig(repoRoot);
    await validateRecommendationCells(
      repoRoot,
      recommendation,
      dependencies,
      context.logger.warn,
    );
    await dependencies.writeOatLocalConfig(repoRoot, {
      ...localConfig,
      workflow: applyDispatchMatrixRecommendation(
        localConfig.workflow,
        recommendation,
      ),
    });
    return {
      key: 'workflow.dispatchCeiling.providers',
      value: recommendation.version,
      source,
    };
  }

  const sharedConfig = await dependencies.readOatConfig(repoRoot);
  await validateRecommendationCells(
    repoRoot,
    recommendation,
    dependencies,
    context.logger.warn,
  );
  await dependencies.writeOatConfig(repoRoot, {
    ...sharedConfig,
    workflow: applyDispatchMatrixRecommendation(
      sharedConfig.workflow,
      recommendation,
    ),
  });
  return {
    key: 'workflow.dispatchCeiling.providers',
    value: recommendation.version,
    source,
  };
}

function formatList(values: ConfigValue[]): string {
  const keyWidth = Math.max(
    'Key'.length,
    ...values.map((item) => item.key.length),
  );
  const sourceWidth = Math.max(
    'Source'.length,
    ...values.map((item) => item.source.length),
  );

  const lines = [
    `${'Key'.padEnd(keyWidth)}  Value  ${'Source'.padEnd(sourceWidth)}`,
    `${'-'.repeat(keyWidth)}  -----  ${'-'.repeat(sourceWidth)}`,
  ];

  for (const item of values) {
    lines.push(
      `${item.key.padEnd(keyWidth)}  ${item.value ?? ''}  ${item.source.padEnd(
        sourceWidth,
      )}`,
    );
  }

  return lines.join('\n');
}

function matchesCatalogKey(entryKey: string, requestedKey: string): boolean {
  if (entryKey === requestedKey) {
    return true;
  }

  if (entryKey.includes('<name>')) {
    const escaped = entryKey.replaceAll('.', '\\.').replace('<name>', '[^.]+');
    return new RegExp(`^${escaped}$`).test(requestedKey);
  }

  return false;
}

function formatCatalog(entries: ConfigCatalogEntry[]): string {
  const groups = new Map<string, ConfigCatalogEntry[]>();

  for (const entry of entries) {
    const items = groups.get(entry.group) ?? [];
    items.push(entry);
    groups.set(entry.group, items);
  }

  const lines: string[] = [];
  for (const [group, items] of groups) {
    if (lines.length > 0) {
      lines.push('');
    }
    lines.push(group);
    for (const item of items) {
      lines.push(`  ${item.key} — ${item.description}`);
    }
  }

  return lines.join('\n');
}

function formatCatalogDetails(entries: ConfigCatalogEntry[]): string {
  return entries
    .map((entry) =>
      [
        `Key: ${entry.key}`,
        `Scope: ${entry.scope}`,
        `File: ${entry.file}`,
        `Type: ${entry.type}`,
        `Default: ${entry.defaultValue}`,
        `Mutability: ${entry.mutability}`,
        `Owning command: ${entry.owningCommand}`,
        `Description: ${entry.description}`,
      ].join('\n'),
    )
    .join('\n\n');
}

async function runGet(
  keyArg: string,
  context: CommandContext,
  dependencies: ConfigCommandDependencies,
): Promise<void> {
  try {
    if (!isConfigKey(keyArg)) {
      throw new Error(`Unknown config key: ${keyArg}`);
    }

    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const userConfigDir = join(context.home, '.oat');
    const value = await getConfigValue(
      repoRoot,
      userConfigDir,
      keyArg,
      dependencies,
      context.json,
    );
    if (context.json) {
      context.logger.json({
        status: 'ok',
        ...value,
      });
    } else {
      context.logger.info(formatResolvedValue(value.value) ?? '');
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

async function runSet(
  keyArg: string,
  rawValue: string,
  surface: ConfigSurface,
  context: CommandContext,
  dependencies: ConfigCommandDependencies,
): Promise<void> {
  try {
    if (!isConfigKey(keyArg)) {
      throw new Error(`Unknown config key: ${keyArg}`);
    }

    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const userConfigDir = join(context.home, '.oat');
    const result = await setConfigValue(
      repoRoot,
      userConfigDir,
      keyArg,
      rawValue,
      surface,
      dependencies,
      context.logger.warn,
    );
    if (context.json) {
      context.logger.json({
        status: 'ok',
        ...result,
      });
    } else {
      context.logger.info(`${result.key}=${result.value ?? ''}`);
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

async function runAdopt(
  templateArg: string,
  options: AdoptDispatchMatrixOptions,
  context: CommandContext,
  dependencies: ConfigCommandDependencies,
): Promise<void> {
  try {
    if (templateArg !== 'dispatch-matrix') {
      throw new Error(`Unknown config adoption template: ${templateArg}`);
    }

    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const userConfigDir = join(context.home, '.oat');
    const result = await adoptDispatchMatrixRecommendation(
      repoRoot,
      userConfigDir,
      options,
      context,
      dependencies,
    );

    if (context.json) {
      context.logger.json({
        status: 'ok',
        ...result,
      });
    } else {
      context.logger.info(
        `Adopted dispatch matrix recommendation ${result.value} to ${result.source} config.`,
      );
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

async function runList(
  context: CommandContext,
  dependencies: ConfigCommandDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const userConfigDir = join(context.home, '.oat');
    const values: ConfigValue[] = [];
    for (const key of await listConfigKeys(
      repoRoot,
      userConfigDir,
      dependencies,
    )) {
      values.push(
        await getConfigValue(repoRoot, userConfigDir, key, dependencies),
      );
    }

    if (context.json) {
      context.logger.json({
        status: 'ok',
        values,
      });
    } else {
      context.logger.info(formatList(values));
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

async function runDescribe(
  keyArg: string | undefined,
  context: CommandContext,
): Promise<void> {
  try {
    const entries = keyArg
      ? CONFIG_CATALOG.filter((entry) => matchesCatalogKey(entry.key, keyArg))
      : CONFIG_CATALOG;

    if (entries.length === 0) {
      throw new Error(`Unknown config key: ${keyArg}`);
    }

    if (context.json) {
      context.logger.json({
        status: 'ok',
        key: keyArg ?? null,
        entries,
      });
    } else if (keyArg) {
      context.logger.info(formatCatalogDetails(entries));
    } else {
      context.logger.info(formatCatalog(entries));
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

export function createConfigCommand(
  overrides: Partial<ConfigCommandDependencies> = {},
): Command {
  const dependencies: ConfigCommandDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  return new Command('config')
    .description('Read and write OAT config values')
    .addCommand(
      new Command('get')
        .description('Get a resolved OAT config value')
        .argument('<key>', 'Config key')
        .action(async (key: string, _options: unknown, command: Command) => {
          const context = dependencies.buildCommandContext(
            readGlobalOptions(command),
          );
          await runGet(key, context, dependencies);
        }),
    )
    .addCommand(
      new Command('set')
        .description('Set an OAT config value')
        .argument('<key>', 'Config key')
        .argument('<value>', 'Config value')
        .option(
          '--shared',
          'Write to the shared repo config (.oat/config.json)',
        )
        .option(
          '--local',
          'Write to the repo-local config (.oat/config.local.json)',
        )
        .option('--user', 'Write to the user-level config (~/.oat/config.json)')
        .action(
          async (
            key: string,
            value: string,
            options: { shared?: boolean; local?: boolean; user?: boolean },
            command: Command,
          ) => {
            const context = dependencies.buildCommandContext(
              readGlobalOptions(command),
            );
            try {
              const flagsPresent = [
                options.shared,
                options.local,
                options.user,
              ].filter(Boolean).length;
              if (flagsPresent > 1) {
                throw new Error(
                  '--shared, --local, and --user flags are mutually exclusive; pass at most one.',
                );
              }
              let surface: ConfigSurface = 'auto';
              if (options.shared) surface = 'shared';
              else if (options.local) surface = 'local';
              else if (options.user) surface = 'user';
              await runSet(key, value, surface, context, dependencies);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              if (context.json) {
                context.logger.json({ status: 'error', message });
              } else {
                context.logger.error(message);
              }
              process.exitCode = 1;
            }
          },
        ),
    )
    .addCommand(
      new Command('adopt')
        .description('Adopt a bundled OAT config recommendation')
        .argument('<template>', 'Recommendation template to adopt')
        .option(
          '--shared',
          'Write to the shared repo config (.oat/config.json)',
        )
        .option(
          '--local',
          'Write to the repo-local config (.oat/config.local.json)',
        )
        .option('--user', 'Write to the user-level config (~/.oat/config.json)')
        .option(
          '--yes',
          'Compatibility flag; adoption always preserves explicit existing cells',
        )
        .action(
          async (
            template: string,
            options: {
              shared?: boolean;
              local?: boolean;
              user?: boolean;
              yes?: boolean;
            },
            command: Command,
          ) => {
            const context = dependencies.buildCommandContext(
              readGlobalOptions(command),
            );
            try {
              const flagsPresent = [
                options.shared,
                options.local,
                options.user,
              ].filter(Boolean).length;
              if (flagsPresent > 1) {
                throw new Error(
                  '--shared, --local, and --user flags are mutually exclusive; pass at most one.',
                );
              }
              let surface: ConfigSurface = 'auto';
              if (options.shared) surface = 'shared';
              else if (options.local) surface = 'local';
              else if (options.user) surface = 'user';
              await runAdopt(template, { surface }, context, dependencies);
            } catch (error) {
              const message =
                error instanceof Error ? error.message : String(error);
              if (context.json) {
                context.logger.json({ status: 'error', message });
              } else {
                context.logger.error(message);
              }
              process.exitCode = 1;
            }
          },
        ),
    )
    .addCommand(
      new Command('list')
        .description('List resolved OAT config values with sources')
        .action(async (_options: unknown, command: Command) => {
          const context = dependencies.buildCommandContext(
            readGlobalOptions(command),
          );
          await runList(context, dependencies);
        }),
    )
    .addCommand(
      createConfigDumpCommand({
        buildCommandContext: dependencies.buildCommandContext,
        resolveProjectRoot: dependencies.resolveProjectRoot,
        processEnv: dependencies.processEnv,
      }),
    )
    .addCommand(
      new Command('describe')
        .description('Describe supported OAT config surfaces and keys')
        .argument('[key]', 'Config key to describe')
        .action(
          async (
            key: string | undefined,
            _options: unknown,
            command: Command,
          ) => {
            const context = dependencies.buildCommandContext(
              readGlobalOptions(command),
            );
            await runDescribe(key, context);
          },
        ),
    );
}
