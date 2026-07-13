---
oat_status: complete
oat_ready_for: null
oat_last_updated: 2026-07-13
oat_generated: false
oat_template: false
---

# Design: cli-update-notifications

## Overview

OAT will add a cross-cutting, notification-only update check to normal
interactive CLI command execution. A root Commander hook will invoke a small
update-notification service before command actions. The service will immediately
return for JSON, non-interactive, CI, test, source-development, ephemeral
package-runner, or explicitly suppressed invocations.

Eligible invocations will read a dedicated cache under `~/.oat`. At most once
per 24 hours, the service will make a short, abortable request to the npm
registry's `latest` endpoint for `@open-agent-toolkit/cli`. When the returned
stable version is newer than the running stable version, OAT will emit a
human-readable warning and the documented npm global-install command. The same
version will be announced at most once per 72 hours. All fetch, parse, read, and
write failures are best-effort: they do not escape the service or affect the
requested command's exit status.

The implementation will use Node's built-in `fetch`, `AbortSignal`, and
filesystem APIs rather than add a runtime dependency. Stable `x.y.z` versions
are compared numerically; prerelease or malformed values are ignored because
the first release follows only npm's stable `latest` channel.

## Architecture

### System Context

The notifier sits in CLI bootstrap, after command registration and before a
leaf command action. It uses existing OAT version, logger, config, and atomic
JSON-write primitives, but remains independent of command-specific handlers.

**Key Components:**

- **Bootstrap hook:** Supplies command/global context to the notifier for every
  actionable command without modifying individual handlers.
- **Eligibility policy:** Applies TTY, JSON, environment, source-run, ephemeral
  invocation, and persisted-preference suppression rules.
- **Registry checker:** Fetches and validates npm `latest` metadata with a
  strict timeout.
- **Cache store:** Persists availability and notice timestamps in
  `~/.oat/update-check.json`.
- **Config surface:** Exposes a user-level `updateNotifications` boolean,
  defaulting to enabled, through existing `oat config` commands.

### Component Diagram

```text
index.ts / Commander preAction
        |
        v
maybeNotifyAboutUpdate(command context)
        |
        +--> eligibility policy --> user config + environment
        |
        +--> cache store <-------> ~/.oat/update-check.json
        |
        +--> npm registry (only when 24h TTL expired)
        |
        +--> centralized human logger warning
```

### Data Flow

```text
1. A leaf command is about to execute.
2. Build the existing global command context.
3. Return immediately when the invocation is ineligible.
4. Read and validate the update cache; treat malformed/missing data as empty.
5. If the check TTL expired, fetch `/@open-agent-toolkit%2fcli/latest` with a
   short abort timeout and atomically cache a valid stable version.
6. Compare the cached latest version with the running OAT version.
7. If newer and the notice interval expired, warn with current/latest versions
   and `npm install -g @open-agent-toolkit/cli@latest`.
8. Atomically record the announced version and timestamp.
9. Swallow operational errors and continue the requested command unchanged.
```

## Component Design

### Update Notification Service

**Purpose:** Coordinate eligibility, cache refresh, comparison, and output for
one CLI invocation.

**Responsibilities:**

- Never throw into command dispatch.
- Avoid network access unless the check TTL has expired.
- Avoid duplicate notices inside the notification TTL.
- Keep side effects injectable for deterministic unit tests.

**Interfaces:**

```typescript
interface UpdateNotifierOptions {
  currentVersion: string;
  home: string;
  interactive: boolean;
  json: boolean;
  argv: string[];
  env: NodeJS.ProcessEnv;
  logger: CliLogger;
}

async function maybeNotifyAboutUpdate(
  options: UpdateNotifierOptions,
  dependencies?: UpdateNotifierDependencies,
): Promise<void>;
```

**Dependencies:**

- Existing OAT version and centralized logger.
- Existing user-config reader and atomic JSON writer.
- Built-in `fetch`, `AbortSignal`, time, and filesystem APIs.

**Design Decisions:**

- Keep orchestration under `app/` because it is bootstrap behavior rather than
  a user-invoked command.
- Use dependency injection for fetch, clock, cache I/O, and user config to make
  timeout, failure, and TTL behavior testable without live network calls.

### Eligibility Policy

**Purpose:** Ensure the notifier is invisible to automation and unsupported
install contexts.

**Responsibilities:**

- Require an interactive, non-JSON command context.
- Skip `CI`, test runners, source `.ts` entrypoints, npm/pnpm ephemeral exec
  contexts, and `NO_UPDATE_NOTIFIER=1`.
- Respect `updateNotifications: false` in user config.

**Interfaces:**

```typescript
function shouldCheckForUpdates(
  input: UpdateEligibilityInput,
): boolean;
```

**Design Decisions:**

- Suppression is fail-safe: uncertainty about an ephemeral or development
  invocation favors skipping the check.
- Help and version output naturally bypass the command action hook.

### Registry and Cache Adapters

**Purpose:** Isolate external metadata and persistent TTL state.

**Responsibilities:**

- Accept only a registry object containing a strict stable `version`.
- Abort the registry request after a short fixed timeout.
- Validate cache fields individually and ignore malformed state.
- Write complete cache snapshots atomically.

**Interfaces:**

```typescript
interface UpdateCheckCache {
  checkedAt?: string;
  latestVersion?: string;
  lastNotifiedAt?: string;
  lastNotifiedVersion?: string;
}

async function fetchLatestVersion(signal: AbortSignal): Promise<string | null>;
async function readUpdateCache(path: string): Promise<UpdateCheckCache>;
async function writeUpdateCache(
  path: string,
  cache: UpdateCheckCache,
): Promise<void>;
```

**Design Decisions:**

- A failed attempted refresh records no untrusted version and is silently
  ignored. Cache policy prevents repeated successful checks; a short timeout
  bounds failure cost.
- The cache is separate from configuration because timestamps are runtime state,
  not user-authored preferences.

### User Configuration

**Purpose:** Give users a durable opt-out that applies across repositories.

**Responsibilities:**

- Add optional `updateNotifications?: boolean` to normalized user config.
- Expose get/set/describe/list metadata through `oat config`.
- Default missing values to enabled without rewriting user config.

**Interfaces:**

```typescript
interface UserConfig {
  version: number;
  updateNotifications?: boolean;
}
```

**Design Decisions:**

- The preference is user-scoped because it describes a person's global CLI
  experience, not repository policy.

## Data Models

### UpdateCheckCache

The cache stores only timestamps and public package versions. Timestamps are
ISO 8601 UTC strings. Versions must match stable `major.minor.patch` syntax.
Invalid fields are discarded independently. The cache contains no registry
credentials, command arguments, repository paths, or user data.

## API Design

The external interface is configuration-only:

```bash
oat config get updateNotifications
oat config set updateNotifications false --user
```

The default is enabled. `NO_UPDATE_NOTIFIER=1` suppresses checks for a single
process regardless of the persisted preference. Update notices are human
output only and do not alter JSON response schemas.

## Error Handling

- Cache missing or malformed: continue with empty cache.
- User config unreadable: skip update checking for that invocation.
- Registry timeout, DNS, HTTP, or JSON failure: return silently.
- Invalid or prerelease registry/current version: return silently.
- Cache write failure: do not fail or change the command result; repeated
  notices are possible until a write succeeds.
- Unexpected notifier error: the bootstrap wrapper catches it and continues.
- Optional verbose diagnostics may report suppression or failures, but default
  output remains silent.

## Testing Strategy

### Unit Tests

- Numeric stable-version comparison, equality, malformed input, and prereleases.
- Eligibility across TTY/JSON, CI, test, source, ephemeral, environment opt-out,
  and persisted opt-out cases.
- Fresh/stale cache behavior, 24-hour registry TTL, 72-hour notice TTL, and
  version-specific re-notification.
- Successful registry response plus timeout, non-2xx, malformed JSON, and
  invalid version responses.
- Cache read/write failure containment.
- Exact notice content and guarantee that failures do not throw.
- User-config normalization and config get/set/describe/list support.

### Integration Tests

- A representative registered command invokes the notifier hook.
- JSON and non-interactive command paths do not emit update warnings.
- Help and version output do not invoke update checking.
- Existing command exit behavior is unchanged when notifier dependencies fail.

### End-to-End Tests

No live-registry E2E test is required. Focused integration tests use injected
registry/cache adapters so tests are deterministic, offline-safe, and do not
write to the real user home.

