import {
  readOatConfig,
  readOatLocalConfig,
  readUserConfig,
  type OatConfig,
  type OatLocalConfig,
  type UserConfig,
} from './oat-config';

export type ResolvedConfigSource =
  | 'shared'
  | 'local'
  | 'user'
  | 'env'
  | 'default';

export interface ResolvedKeyEntry {
  value: unknown;
  source: ResolvedConfigSource;
}

export interface ResolvedConfig {
  shared: OatConfig;
  local: OatLocalConfig;
  user: UserConfig;
  resolved: Record<string, ResolvedKeyEntry>;
}

export interface ResolveEffectiveConfigDependencies {
  readOatConfig: (repoRoot: string) => Promise<OatConfig>;
  readOatLocalConfig: (repoRoot: string) => Promise<OatLocalConfig>;
  readUserConfig: (userConfigDir: string) => Promise<UserConfig>;
}

const DEFAULT_DEPENDENCIES: ResolveEffectiveConfigDependencies = {
  readOatConfig,
  readOatLocalConfig,
  readUserConfig,
};

const DEFAULT_SHARED_CONFIG = {
  projects: { root: '.oat/projects/shared' },
  worktrees: { root: '.worktrees' },
  git: { defaultBranch: 'main' },
  archive: {
    s3Uri: null,
    s3SyncOnComplete: false,
    summaryExportPath: null,
  },
  documentation: {
    root: null,
    tooling: null,
    config: null,
    index: null,
    requireForProjectCompletion: false,
  },
  autoReviewAtCheckpoints: false,
} satisfies Record<string, unknown>;

const DEFAULT_LOCAL_CONFIG = {
  activeProject: null,
  lastPausedProject: null,
  activeIdea: null,
} satisfies Record<string, unknown>;

const DEFAULT_USER_CONFIG = {
  activeIdea: null,
} satisfies Record<string, unknown>;

const ENV_OVERRIDE_MAP = {
  'projects.root': 'OAT_PROJECTS_ROOT',
  'worktrees.root': 'OAT_WORKTREES_ROOT',
} as const satisfies Record<string, string>;

export async function resolveEffectiveConfig(
  repoRoot: string,
  userConfigDir: string,
  env: NodeJS.ProcessEnv = process.env,
  overrides: Partial<ResolveEffectiveConfigDependencies> = {},
): Promise<ResolvedConfig> {
  const dependencies: ResolveEffectiveConfigDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };

  const [shared, local, user] = await Promise.all([
    dependencies.readOatConfig(repoRoot),
    dependencies.readOatLocalConfig(repoRoot),
    dependencies.readUserConfig(userConfigDir),
  ]);

  const sharedValues = flattenConfig(shared);
  const localValues = flattenConfig(local);
  const userValues = flattenConfig(user);
  const defaultValues = {
    ...flattenConfig(DEFAULT_SHARED_CONFIG),
    ...flattenConfig(DEFAULT_LOCAL_CONFIG),
    ...flattenConfig(DEFAULT_USER_CONFIG),
  };

  const keys = new Set([
    ...Object.keys(defaultValues),
    ...Object.keys(sharedValues),
    ...Object.keys(localValues),
    ...Object.keys(userValues),
  ]);

  const resolved: Record<string, ResolvedKeyEntry> = {};
  for (const key of [...keys].sort()) {
    const envValue = resolveEnvOverride(key, env);
    if (envValue !== undefined) {
      resolved[key] = { value: envValue, source: 'env' };
      continue;
    }

    const localValue = localValues[key];
    if (isResolvedValue(localValue)) {
      resolved[key] = { value: localValue, source: 'local' };
      continue;
    }

    const sharedValue = sharedValues[key];
    if (isResolvedValue(sharedValue)) {
      resolved[key] = { value: sharedValue, source: 'shared' };
      continue;
    }

    const userValue = userValues[key];
    if (isResolvedValue(userValue)) {
      resolved[key] = { value: userValue, source: 'user' };
      continue;
    }

    if (key in defaultValues) {
      resolved[key] = {
        value: defaultValues[key] ?? null,
        source: 'default',
      };
    }
  }

  return {
    shared,
    local,
    user,
    resolved,
  };
}

function flattenConfig(value: unknown, prefix = ''): Record<string, unknown> {
  if (!isRecord(value)) {
    return {};
  }

  const flattened: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    if (key === 'version') {
      continue;
    }

    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (isRecord(nestedValue)) {
      Object.assign(flattened, flattenConfig(nestedValue, nextKey));
      continue;
    }

    flattened[nextKey] = nestedValue;
  }

  return flattened;
}

function resolveEnvOverride(
  key: string,
  env: NodeJS.ProcessEnv,
): string | undefined {
  const envKey = ENV_OVERRIDE_MAP[key as keyof typeof ENV_OVERRIDE_MAP];
  if (!envKey) {
    return undefined;
  }

  const value = env[envKey]?.trim();
  return value ? value.replace(/\/+$/, '') : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isResolvedValue(value: unknown): boolean {
  return value !== undefined && value !== null;
}
