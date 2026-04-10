import { buildCommandContext, type CommandContext } from '@app/command-context';
import { resolveProjectsRoot } from '@commands/shared/oat-paths';
import { readGlobalOptions } from '@commands/shared/shared.utils';
import {
  type OatConfig,
  type OatLocalConfig,
  type OatToolsConfig,
  readOatConfig,
  readOatLocalConfig,
  writeOatConfig,
  writeOatLocalConfig,
} from '@config/oat-config';
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
  source: string;
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
  resolveProjectsRoot: (
    repoRoot: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<string>;
  processEnv: NodeJS.ProcessEnv;
}

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
    defaultValue: 'null',
    mutability: 'read/write',
    owningCommand: 'oat config set workflow.hillCheckpointDefault <value>',
    description:
      'Default HiLL checkpoint behavior in oat-project-implement: "every" pauses after every phase, "final" pauses only after the last phase. When unset, the skill prompts. Resolution: local > shared > user.',
  },
  {
    key: 'workflow.archiveOnComplete',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'boolean',
    defaultValue: 'null',
    mutability: 'read/write',
    owningCommand: 'oat config set workflow.archiveOnComplete <true|false>',
    description:
      'Skip the "Archive after completion?" prompt in oat-project-complete. When unset, the skill prompts. Resolution: local > shared > user.',
  },
  {
    key: 'workflow.createPrOnComplete',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'boolean',
    defaultValue: 'null',
    mutability: 'read/write',
    owningCommand: 'oat config set workflow.createPrOnComplete <true|false>',
    description:
      'Skip the "Open a PR?" prompt in oat-project-complete. When true, completion auto-triggers PR creation. Resolution: local > shared > user.',
  },
  {
    key: 'workflow.postImplementSequence',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'wait | summary | pr | docs-pr',
    defaultValue: 'null',
    mutability: 'read/write',
    owningCommand: 'oat config set workflow.postImplementSequence <value>',
    description:
      'Default post-implementation chaining: "wait" stops without auto-chaining, "summary" generates summary only, "pr" runs pr-final (which auto-generates summary), "docs-pr" runs docs sync then pr-final. When unset, the skill prompts. Resolution: local > shared > user.',
  },
  {
    key: 'workflow.reviewExecutionModel',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'subagent | inline | fresh-session',
    defaultValue: 'null',
    mutability: 'read/write',
    owningCommand: 'oat config set workflow.reviewExecutionModel <value>',
    description:
      'Default execution model for the final review step in oat-project-implement: "subagent" dispatches a review subagent, "inline" runs the review in-context, "fresh-session" prints guidance for running the review in a separate session (with an escape hatch to subagent/inline). When unset, the skill prompts. Resolution: local > shared > user.',
  },
  {
    key: 'workflow.autoNarrowReReviewScope',
    group: 'Workflow Preferences (3-layer: local > shared > user)',
    file: '.oat/config.local.json | .oat/config.json | ~/.oat/config.json',
    scope: 'workflow',
    type: 'boolean',
    defaultValue: 'null',
    mutability: 'read/write',
    owningCommand:
      'oat config set workflow.autoNarrowReReviewScope <true|false>',
    description:
      'Auto-narrow re-review scope to fix-task commits in oat-project-review-provide. When unset, the skill prompts. Resolution: local > shared > user.',
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
  resolveProjectsRoot,
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

async function resolveProjectsRootWithSource(
  repoRoot: string,
  dependencies: ConfigCommandDependencies,
): Promise<ConfigValue> {
  const envRoot = dependencies.processEnv.OAT_PROJECTS_ROOT?.trim();
  if (envRoot) {
    return {
      key: 'projects.root',
      value: envRoot.replace(/\/+$/, ''),
      source: 'env',
    };
  }

  const config = await dependencies.readOatConfig(repoRoot);
  const configRoot = config.projects?.root?.trim();
  if (configRoot) {
    return {
      key: 'projects.root',
      value: configRoot.replace(/\/+$/, ''),
      source: 'config.json',
    };
  }

  const value = await dependencies.resolveProjectsRoot(
    repoRoot,
    dependencies.processEnv,
  );
  return {
    key: 'projects.root',
    value,
    source: 'default',
  };
}

async function getConfigValue(
  repoRoot: string,
  key: ConfigKey,
  dependencies: ConfigCommandDependencies,
): Promise<ConfigValue> {
  if (key === 'projects.root') {
    return resolveProjectsRootWithSource(repoRoot, dependencies);
  }

  if (key.startsWith('documentation.')) {
    const config = await dependencies.readOatConfig(repoRoot);
    const doc = config.documentation;
    let value: string | null = null;

    if (key === 'documentation.root') {
      value = doc?.root ?? null;
    } else if (key === 'documentation.tooling') {
      value = doc?.tooling ?? null;
    } else if (key === 'documentation.config') {
      value = doc?.config ?? null;
    } else if (key === 'documentation.requireForProjectCompletion') {
      value =
        doc?.requireForProjectCompletion != null
          ? String(doc.requireForProjectCompletion)
          : 'false';
    }

    return {
      key,
      value,
      source: doc ? 'config.json' : 'default',
    };
  }

  if (key.startsWith('archive.')) {
    const config = await dependencies.readOatConfig(repoRoot);
    const archive = config.archive;
    let value: string | null = null;

    if (key === 'archive.s3Uri') {
      value = archive?.s3Uri ?? null;
    } else if (key === 'archive.s3SyncOnComplete') {
      value =
        archive?.s3SyncOnComplete != null
          ? String(archive.s3SyncOnComplete)
          : 'false';
    } else if (key === 'archive.summaryExportPath') {
      value = archive?.summaryExportPath ?? null;
    }

    return {
      key,
      value,
      source: archive ? 'config.json' : 'default',
    };
  }

  if (key.startsWith('tools.')) {
    const config = await dependencies.readOatConfig(repoRoot);
    const packName = key.slice('tools.'.length) as keyof OatToolsConfig;
    const tools = config.tools ?? {};
    return {
      key,
      value: String(tools[packName] ?? false),
      source: config.tools ? 'config.json' : 'default',
    };
  }

  if (key === 'git.defaultBranch') {
    const config = await dependencies.readOatConfig(repoRoot);
    return {
      key,
      value: config.git?.defaultBranch ?? null,
      source: config.git?.defaultBranch ? 'config.json' : 'default',
    };
  }

  if (key === 'worktrees.root') {
    const envRoot = dependencies.processEnv.OAT_WORKTREES_ROOT?.trim();
    if (envRoot) {
      return {
        key,
        value: envRoot.replace(/\/+$/, ''),
        source: 'env',
      };
    }

    const config = await dependencies.readOatConfig(repoRoot);
    const value = config.worktrees?.root?.trim();
    if (value) {
      return {
        key,
        value: value.replace(/\/+$/, ''),
        source: 'config.json',
      };
    }

    return {
      key,
      value: '.worktrees',
      source: 'default',
    };
  }

  if (key === 'autoReviewAtCheckpoints') {
    const config = await dependencies.readOatConfig(repoRoot);
    return {
      key,
      value:
        config.autoReviewAtCheckpoints != null
          ? String(config.autoReviewAtCheckpoints)
          : 'false',
      source:
        config.autoReviewAtCheckpoints != null ? 'config.json' : 'default',
    };
  }

  const localConfig = await dependencies.readOatLocalConfig(repoRoot);
  const localKey = key as keyof OatLocalConfig;
  const hasKey = Object.hasOwn(localConfig, localKey);
  const value = (localConfig[localKey] as string | null | undefined) ?? null;
  return {
    key,
    value,
    source: hasKey ? 'config.local.json' : 'default',
  };
}

async function setConfigValue(
  repoRoot: string,
  key: ConfigKey,
  rawValue: string,
  dependencies: ConfigCommandDependencies,
): Promise<ConfigValue> {
  if (
    key === 'activeIdea' ||
    key === 'activeProject' ||
    key === 'lastPausedProject'
  ) {
    const localConfig = await dependencies.readOatLocalConfig(repoRoot);
    const nextValue = rawValue === '' ? null : rawValue;
    await dependencies.writeOatLocalConfig(repoRoot, {
      ...localConfig,
      [key]: nextValue,
    });
    return {
      key,
      value: nextValue,
      source: 'config.local.json',
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
      source: 'config.json',
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
      source: 'config.json',
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
      source: 'config.json',
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
      source: 'config.json',
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
      source: 'config.json',
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
    source: 'config.json',
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
    const value = await getConfigValue(repoRoot, keyArg, dependencies);
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
  context: CommandContext,
  dependencies: ConfigCommandDependencies,
): Promise<void> {
  try {
    if (!isConfigKey(keyArg)) {
      throw new Error(`Unknown config key: ${keyArg}`);
    }

    const repoRoot = await dependencies.resolveProjectRoot(context.cwd);
    const result = await setConfigValue(
      repoRoot,
      keyArg,
      rawValue,
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
    const values: ConfigValue[] = [];
    for (const key of KEY_ORDER) {
      values.push(await getConfigValue(repoRoot, key, dependencies));
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
        .action(
          async (
            key: string,
            value: string,
            _options: unknown,
            command: Command,
          ) => {
            const context = dependencies.buildCommandContext(
              readGlobalOptions(command),
            );
            await runSet(key, value, context, dependencies);
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
