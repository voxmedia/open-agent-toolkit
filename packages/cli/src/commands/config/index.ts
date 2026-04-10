import { join } from 'node:path';

import { buildCommandContext, type CommandContext } from '@app/command-context';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  type OatConfig,
  type OatLocalConfig,
  type OatToolsConfig,
  type OatWorkflowConfig,
  type UserConfig,
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
import { resolveProjectRoot } from '@fs/paths';
import { Command } from 'commander';

import { createConfigDumpCommand } from './dump';

type ConfigKey =
  | 'activeIdea'
  | 'activeProject'
  | 'archive.s3SyncOnComplete'
  | 'archive.s3Uri'
  | 'archive.summaryExportPath'
  | 'autoReviewAtCheckpoints'
  | 'lastPausedProject'
  | 'documentation.config'
  | 'documentation.requireForProjectCompletion'
  | 'documentation.root'
  | 'documentation.tooling'
  | 'git.defaultBranch'
  | 'projects.root'
  | 'tools.core'
  | 'tools.docs'
  | 'tools.ideas'
  | 'tools.project-management'
  | 'tools.research'
  | 'tools.utility'
  | 'tools.workflows'
  | 'workflow.archiveOnComplete'
  | 'workflow.autoNarrowReReviewScope'
  | 'workflow.createPrOnComplete'
  | 'workflow.hillCheckpointDefault'
  | 'workflow.postImplementSequence'
  | 'workflow.reviewExecutionModel'
  | 'worktrees.root';

interface ConfigValue {
  key: ConfigKey;
  value: string | null;
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
  processEnv: NodeJS.ProcessEnv;
}

type ConfigSurface = 'auto' | 'shared' | 'local' | 'user';

const KEY_ORDER: ConfigKey[] = [
  'activeIdea',
  'activeProject',
  'archive.s3Uri',
  'archive.s3SyncOnComplete',
  'archive.summaryExportPath',
  'autoReviewAtCheckpoints',
  'lastPausedProject',
  'documentation.root',
  'documentation.tooling',
  'documentation.config',
  'documentation.requireForProjectCompletion',
  'git.defaultBranch',
  'projects.root',
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
  'workflow.autoNarrowReReviewScope',
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
      'Controls whether OAT automatically runs review gates at configured phase checkpoints.',
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
    owningCommand: 'user config APIs (not surfaced via oat config set)',
    description:
      'User-level active idea fallback when no repo-local active idea is set.',
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
    type: 'wait | summary | pr | docs-pr',
    defaultValue: 'unset',
    mutability: 'read/write',
    owningCommand: 'oat config set workflow.postImplementSequence <value>',
    description:
      'Default post-implementation chaining: "wait" stops without auto-chaining, "summary" generates summary only, "pr" runs pr-final (which auto-generates summary), "docs-pr" runs docs sync then pr-final. When unset, the skill prompts. Resolution: env > local > shared > user > default.',
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
      'Auto-narrow re-review scope to fix-task commits in oat-project-review-provide. When unset, the skill prompts. Resolution: env > local > shared > user > default.',
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
  processEnv: process.env,
};

function isConfigKey(value: string): value is ConfigKey {
  return KEY_ORDER.includes(value as ConfigKey);
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
} as const satisfies Partial<Record<ConfigKey, readonly string[]>>;

const WORKFLOW_BOOLEAN_KEYS = new Set<ConfigKey>([
  'workflow.archiveOnComplete',
  'workflow.createPrOnComplete',
  'workflow.autoNarrowReReviewScope',
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

  // autoReviewAtCheckpoints is currently shared-only. Multi-surface support
  // for behavioral keys is out of scope for p01-t04 (workflow.* keys only).
  if (key === 'autoReviewAtCheckpoints' && surface !== 'shared') {
    throw new Error(
      `Cannot set 'autoReviewAtCheckpoints' at '${surface}' scope. This key is currently shared-only.`,
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
): boolean | string {
  if (WORKFLOW_BOOLEAN_KEYS.has(key)) {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized !== 'true' && normalized !== 'false') {
      throw new Error(
        `Invalid value for ${key}: expected 'true' or 'false', got '${rawValue}'`,
      );
    }
    return normalized === 'true';
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

  throw new Error(`Unknown workflow key: ${key}`);
}

function applyWorkflowValue(
  workflow: OatWorkflowConfig,
  key: ConfigKey,
  value: boolean | string,
): OatWorkflowConfig {
  const subKey = key.slice('workflow.'.length);
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
  return String(value);
}

async function getConfigValue(
  repoRoot: string,
  userConfigDir: string,
  key: ConfigKey,
  dependencies: ConfigCommandDependencies,
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
    value: formatResolvedValue(entry.value),
    source: entry.source,
  };
}

async function setConfigValue(
  repoRoot: string,
  userConfigDir: string,
  key: ConfigKey,
  rawValue: string,
  surface: ConfigSurface,
  dependencies: ConfigCommandDependencies,
): Promise<ConfigValue> {
  validateSurfaceForKey(key, surface);

  const effectiveSurface: ConfigSurface =
    surface === 'auto' ? defaultSurfaceForKey(key) : surface;

  if (isWorkflowKey(key)) {
    const parsedValue = parseWorkflowValue(key, rawValue);
    const displayValue =
      typeof parsedValue === 'boolean' ? String(parsedValue) : parsedValue;

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
    );
    if (context.json) {
      context.logger.json({
        status: 'ok',
        ...value,
      });
    } else {
      context.logger.info(value.value ?? '');
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

async function runList(
  context: CommandContext,
  dependencies: ConfigCommandDependencies,
): Promise<void> {
  try {
    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const userConfigDir = join(context.home, '.oat');
    const values: ConfigValue[] = [];
    for (const key of KEY_ORDER) {
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
