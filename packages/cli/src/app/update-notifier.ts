import { readFile as readFileDefault } from 'node:fs/promises';
import { join } from 'node:path';

import { readUserConfig, type UserConfig } from '@config/oat-config';
import { atomicWriteJson } from '@fs/io';
import type { CliLogger } from '@ui/logger';

const CHECK_TTL_MS = 24 * 60 * 60 * 1000;
const NOTICE_TTL_MS = 72 * 60 * 60 * 1000;
const REGISTRY_TIMEOUT_MS = 1500;
const REGISTRY_URL =
  'https://registry.npmjs.org/@open-agent-toolkit%2fcli/latest';
const STABLE_VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

type StableVersion = readonly [major: number, minor: number, patch: number];

export interface UpdateCheckCache {
  checkedAt?: string;
  latestVersion?: string;
  lastNotifiedAt?: string;
  lastNotifiedVersion?: string;
}

export interface UpdateNotifierOptions {
  currentVersion: string;
  home: string;
  interactive: boolean;
  json: boolean;
  argv: string[];
  env: NodeJS.ProcessEnv;
  logger: CliLogger;
}

export interface UpdateNotifierDependencies {
  now: () => Date;
  readFile: (path: string) => Promise<string>;
  atomicWriteJson: (path: string, data: unknown) => Promise<void>;
  readUserConfig: (userConfigDir: string) => Promise<UserConfig>;
  fetch: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
  createTimeoutSignal: (timeoutMs: number) => AbortSignal;
}

const DEFAULT_DEPENDENCIES: UpdateNotifierDependencies = {
  now: () => new Date(),
  readFile: (path) => readFileDefault(path, 'utf8'),
  atomicWriteJson,
  readUserConfig,
  fetch: (input, init) => globalThis.fetch(input, init),
  createTimeoutSignal: (timeoutMs) => AbortSignal.timeout(timeoutMs),
};

function parseStableVersion(value: unknown): StableVersion | null {
  if (typeof value !== 'string') {
    return null;
  }

  const match = STABLE_VERSION_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const version = match.slice(1).map(Number);
  if (
    version.length !== 3 ||
    version.some((part) => !Number.isSafeInteger(part))
  ) {
    return null;
  }

  return version as unknown as StableVersion;
}

function compareVersions(left: StableVersion, right: StableVersion): number {
  for (let index = 0; index < left.length; index += 1) {
    const difference = left[index]! - right[index]!;
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

function isUtcTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    UTC_TIMESTAMP_PATTERN.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function normalizeCache(value: unknown): UpdateCheckCache {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  const raw = value as Record<string, unknown>;
  const cache: UpdateCheckCache = {};
  if (isUtcTimestamp(raw.checkedAt)) {
    cache.checkedAt = raw.checkedAt;
  }
  if (parseStableVersion(raw.latestVersion)) {
    cache.latestVersion = raw.latestVersion as string;
  }
  if (isUtcTimestamp(raw.lastNotifiedAt)) {
    cache.lastNotifiedAt = raw.lastNotifiedAt;
  }
  if (parseStableVersion(raw.lastNotifiedVersion)) {
    cache.lastNotifiedVersion = raw.lastNotifiedVersion as string;
  }
  return cache;
}

async function readUpdateCache(
  path: string,
  dependencies: UpdateNotifierDependencies,
): Promise<UpdateCheckCache> {
  try {
    return normalizeCache(JSON.parse(await dependencies.readFile(path)));
  } catch {
    return {};
  }
}

function isTruthyEnvironmentValue(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== '0' && normalized !== 'false';
}

function isSourceDevelopment(argv: string[]): boolean {
  return argv
    .slice(0, 2)
    .some((argument) => /\.(?:[cm]?ts|tsx)$/.test(argument));
}

function isEphemeralRunner(argv: string[], env: NodeJS.ProcessEnv): boolean {
  if (
    env.npm_command?.trim().toLowerCase() === 'exec' ||
    env.npm_lifecycle_event?.trim().toLowerCase() === 'npx' ||
    /(?:^|[/\\])(?:npx(?:-cli)?|pnpx|bunx)(?:\.[cm]?js|\.cmd)?$/.test(
      env.npm_execpath ?? '',
    )
  ) {
    return true;
  }

  const invocation = argv.slice(0, 2).join('/');
  return (
    /(?:^|[/\\])(?:npx|pnpx|bunx)(?:\.cmd)?(?:$|[/\\])/.test(invocation) ||
    /[/\\](?:_npx|dlx)[/\\]/.test(invocation)
  );
}

function isStaticallyEligible(options: UpdateNotifierOptions): boolean {
  if (!options.interactive || options.json) {
    return false;
  }
  if (
    isTruthyEnvironmentValue(options.env.CI) ||
    options.env.NODE_ENV?.trim().toLowerCase() === 'test' ||
    isTruthyEnvironmentValue(options.env.VITEST) ||
    isTruthyEnvironmentValue(options.env.VITEST_WORKER_ID) ||
    isTruthyEnvironmentValue(options.env.JEST_WORKER_ID)
  ) {
    return false;
  }
  if (options.env.NO_UPDATE_NOTIFIER === '1') {
    return false;
  }
  return (
    !isSourceDevelopment(options.argv) &&
    !isEphemeralRunner(options.argv, options.env)
  );
}

function isTtlFresh(
  timestamp: string | undefined,
  nowMs: number,
  ttlMs: number,
): boolean {
  if (timestamp === undefined) {
    return false;
  }
  const ageMs = nowMs - Date.parse(timestamp);
  return ageMs >= 0 && ageMs < ttlMs;
}

async function fetchLatestVersion(
  dependencies: UpdateNotifierDependencies,
): Promise<string | null> {
  try {
    const response = await dependencies.fetch(REGISTRY_URL, {
      headers: { accept: 'application/json' },
      signal: dependencies.createTimeoutSignal(REGISTRY_TIMEOUT_MS),
    });
    if (!response.ok) {
      return null;
    }

    const metadata = (await response.json()) as unknown;
    if (
      typeof metadata !== 'object' ||
      metadata === null ||
      Array.isArray(metadata)
    ) {
      return null;
    }

    const version = (metadata as Record<string, unknown>).version;
    return parseStableVersion(version) ? (version as string) : null;
  } catch {
    return null;
  }
}

function shouldNotify(
  cache: UpdateCheckCache,
  latestVersion: string,
  nowMs: number,
): boolean {
  return (
    cache.lastNotifiedVersion !== latestVersion ||
    !isTtlFresh(cache.lastNotifiedAt, nowMs, NOTICE_TTL_MS)
  );
}

function formatNotice(currentVersion: string, latestVersion: string): string {
  return (
    `Update available: ${currentVersion} → ${latestVersion}\n` +
    'Run: npm install -g @open-agent-toolkit/cli@latest'
  );
}

interface UpdateAvailabilityState {
  cache: UpdateCheckCache;
  cacheChanged: boolean;
  cachePath: string;
  dependencies: UpdateNotifierDependencies;
  latestVersion: string | null;
  nowMs: number;
  nowTimestamp: string;
}

async function resolveUpdateAvailabilityState(
  options: UpdateNotifierOptions,
  overrides: Partial<UpdateNotifierDependencies>,
): Promise<UpdateAvailabilityState | null> {
  if (!isStaticallyEligible(options)) {
    return null;
  }

  const currentVersion = parseStableVersion(options.currentVersion);
  if (!currentVersion) {
    return null;
  }

  const dependencies: UpdateNotifierDependencies = {
    ...DEFAULT_DEPENDENCIES,
    ...overrides,
  };
  const userConfigDir = join(options.home, '.oat');
  const userConfig = await dependencies.readUserConfig(userConfigDir);
  if (userConfig.updateNotifications === false) {
    return null;
  }

  const cachePath = join(userConfigDir, 'update-check.json');
  let cache = await readUpdateCache(cachePath, dependencies);
  const now = dependencies.now();
  const nowMs = now.getTime();
  const nowTimestamp = now.toISOString();
  let cacheChanged = false;

  if (!isTtlFresh(cache.checkedAt, nowMs, CHECK_TTL_MS)) {
    const latestVersion = await fetchLatestVersion(dependencies);
    cache = {
      ...cache,
      checkedAt: nowTimestamp,
      ...(latestVersion ? { latestVersion } : {}),
    };
    cacheChanged = true;
  }

  const latestVersion = cache.latestVersion;
  const parsedLatestVersion = parseStableVersion(latestVersion);
  return {
    cache,
    cacheChanged,
    cachePath,
    dependencies,
    latestVersion:
      latestVersion &&
      parsedLatestVersion &&
      compareVersions(parsedLatestVersion, currentVersion) > 0
        ? latestVersion
        : null,
    nowMs,
    nowTimestamp,
  };
}

async function persistUpdateCache(state: UpdateAvailabilityState) {
  if (!state.cacheChanged) {
    return;
  }
  try {
    await state.dependencies.atomicWriteJson(state.cachePath, state.cache);
  } catch {
    // Cache persistence is best-effort and must not affect the command.
  }
}

export async function resolveUpdateAvailability(
  options: UpdateNotifierOptions,
  overrides: Partial<UpdateNotifierDependencies> = {},
): Promise<string | null> {
  try {
    const state = await resolveUpdateAvailabilityState(options, overrides);
    if (!state) {
      return null;
    }
    await persistUpdateCache(state);
    return state.latestVersion;
  } catch {
    return null;
  }
}

export async function maybeNotifyAboutUpdate(
  options: UpdateNotifierOptions,
  overrides: Partial<UpdateNotifierDependencies> = {},
): Promise<void> {
  try {
    const state = await resolveUpdateAvailabilityState(options, overrides);
    if (!state) {
      return;
    }

    if (
      state.latestVersion &&
      shouldNotify(state.cache, state.latestVersion, state.nowMs)
    ) {
      try {
        options.logger.warn(
          formatNotice(options.currentVersion, state.latestVersion),
        );
        state.cache = {
          ...state.cache,
          lastNotifiedAt: state.nowTimestamp,
          lastNotifiedVersion: state.latestVersion,
        };
        state.cacheChanged = true;
      } catch {
        // Notification output is best-effort and must not affect the command.
      }
    }

    await persistUpdateCache(state);
  } catch {
    // The notifier never changes command state, even on unexpected failures.
  }
}
