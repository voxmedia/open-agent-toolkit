#!/usr/bin/env bash
# Bootstrap a git worktree for OAT development.
#
# Copies local-only files from the main worktree (env, config.local.json,
# MCP configs, local + archived projects), then fills gaps from S3 for
# archived projects that exist on other machines. Finally installs deps,
# builds, syncs OAT localPaths into the worktree, and refreshes provider
# views via `oat sync`.
#
# Idempotent — safe to re-run in an existing worktree.
#
# Usage:
#   pnpm run worktree:init
#   SKIP_S3_ARCHIVE_SYNC=1 pnpm run worktree:init   # skip remote archive sync

set -euo pipefail

current_root="$(git rev-parse --show-toplevel)"
common_git_dir="$(git rev-parse --path-format=absolute --git-common-dir)"
main_root="$(cd "${common_git_dir}/.." && pwd -P)"

copy_file() {
  local src="$1"
  local dest="$2"

  if [[ ! -f "$src" ]]; then
    echo "skip (missing): ${src}"
    return 0
  fi

  if [[ "$src" == "$dest" ]]; then
    echo "skip (already present): ${dest}"
    return 0
  fi

  mkdir -p "$(dirname "$dest")"
  cp "$src" "$dest"
  echo "copied: ${dest#"${current_root}/"}"
}

copy_env_files() {
  while IFS= read -r -d '' src; do
    local rel_path="${src#"${main_root}/"}"
    local dest="${current_root}/${rel_path}"
    copy_file "$src" "$dest"
  done < <(
    find "$main_root" -type f \
      \( -name ".env" -o -name ".env.local" -o -name ".env.*.local" \) \
      -not -path "*/.git/*" \
      -not -path "*/node_modules/*" \
      -not -path "*/.turbo/*" \
      -not -path "*/dist/*" \
      -not -path "*/build/*" \
      -not -path "*/.worktrees/*" \
      -not -path "*/.claude/worktrees/*" \
      -print0
  )
}

copy_directory_tree() {
  local rel_path="$1"
  local src="${main_root}/${rel_path}"
  local dest="${current_root}/${rel_path}"

  if [[ ! -d "$src" ]]; then
    echo "skip (missing): ${rel_path}"
    return 0
  fi

  if [[ "$src" == "$dest" ]]; then
    echo "skip (already present): ${rel_path}"
    return 0
  fi

  mkdir -p "$dest"
  cp -R "${src}/." "${dest}/"
  echo "copied: ${rel_path}"
}

copy_matching_files() {
  local pattern_args=("$@")

  while IFS= read -r -d '' src; do
    local rel_path="${src#"${main_root}/"}"
    local dest="${current_root}/${rel_path}"
    copy_file "$src" "$dest"
  done < <(
    find "$main_root" \
      -path "*/.git" -prune -o \
      -path "*/node_modules" -prune -o \
      -path "*/.turbo" -prune -o \
      -path "*/dist" -prune -o \
      -path "*/build" -prune -o \
      -path "*/.worktrees" -prune -o \
      -path "*/.claude/worktrees" -prune -o \
      -type f \( "${pattern_args[@]}" \) \
      -print0
  )
}

run_smoke_bootstrap() {
  local marker_path="$1"
  local validation_output
  local config_source
  local baseline_commit
  local manifest_path
  local source_root
  local source_common_git_dir
  local config_destination="${current_root}/.oat/config.local.json"
  local journal_script="${current_root}/tools/smoke/runner/journal.mjs"

  validation_output="$(
    node - "$marker_path" <<'NODE'
const {
  lstatSync,
  readFileSync,
} = require('node:fs');
const { createHash } = require('node:crypto');
const {
  dirname,
  isAbsolute,
  join,
  normalize,
  relative,
  sep,
} = require('node:path');
const { isDeepStrictEqual } = require('node:util');

const markerPath = process.argv[2];
const expectedPolicy = {
  config: {
    copy: 'marker-source-only',
    preserveBytes: true,
  },
  copyPrimary: {
    archivedProjects: false,
    environment: false,
    localProjects: false,
    mcp: false,
  },
  localPathSync: false,
  providerViewSync: false,
  s3ArchiveSync: false,
  sharedHooks: false,
};

function fail(message) {
  throw new Error(`Invalid smoke bootstrap marker: ${message}`);
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`${label} is not valid JSON (${error.message})`);
  }
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail(`${label} must be an object`);
  }
  return value;
}

function requireAbsolutePath(value, label) {
  if (
    typeof value !== 'string' ||
    !isAbsolute(value) ||
    normalize(value) !== value ||
    /[\0\r\n\t]/u.test(value)
  ) {
    fail(`${label} must be a normalized absolute path`);
  }
  return value;
}

function requireRegularFile(path, label) {
  let stats;
  try {
    stats = lstatSync(path);
  } catch {
    fail(`${label} is missing`);
  }
  if (!stats.isFile() || stats.isSymbolicLink()) {
    fail(`${label} must be a real regular file`);
  }
}

function requireRealDirectory(path, label) {
  let stats;
  try {
    stats = lstatSync(path);
  } catch {
    fail(`${label} is missing`);
  }
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    fail(`${label} must be a real directory`);
  }
}

function isWithin(path, root) {
  const candidate = relative(root, path);
  return (
    candidate !== '' &&
    candidate !== '..' &&
    !candidate.startsWith(`..${sep}`)
  );
}

requireRegularFile(markerPath, 'tracked marker');
const marker = requirePlainObject(readJson(markerPath, 'marker'), 'marker');
if (
  !isDeepStrictEqual(Object.keys(marker).sort(), [
    'branch',
    'configSha256',
    'configSource',
    'manifestPath',
    'policy',
    'runIdentity',
    'schemaVersion',
  ])
) {
  fail('marker fields do not match schema version 2');
}
if (marker.schemaVersion !== 2) {
  fail('schemaVersion must equal 2');
}
if (
  typeof marker.configSha256 !== 'string' ||
  !/^[0-9a-f]{64}$/u.test(marker.configSha256)
) {
  fail('configSha256 must be a lowercase SHA-256 digest');
}
const configSource = requireAbsolutePath(
  marker.configSource,
  'configSource',
);
const manifestPath = requireAbsolutePath(
  marker.manifestPath,
  'manifestPath',
);
if (!isDeepStrictEqual(marker.policy, expectedPolicy)) {
  fail('policy does not match the closed smoke bootstrap policy');
}
requireRegularFile(configSource, 'configSource');
requireRegularFile(manifestPath, 'manifestPath');

const manifest = requirePlainObject(
  readJson(manifestPath, 'manifest'),
  'manifest',
);
const sourceWorktree = requireAbsolutePath(
  manifest.worktreePath,
  'manifest.worktreePath',
);
const fixtureProject = requireAbsolutePath(
  manifest.fixtureProjectPath,
  'manifest.fixtureProjectPath',
);
const sourceMarkerPath = join(sourceWorktree, '.oat/smoke-bootstrap.json');
const expectedConfigSource = join(sourceWorktree, '.oat/config.local.json');
const expectedBootstrap = {
  branch: marker.branch,
  configSha256: marker.configSha256,
  configSource,
  manifestPath,
  markerPath: sourceMarkerPath,
  policy: expectedPolicy,
  runIdentity: marker.runIdentity,
};

if (
  marker.branch !== manifest.branch ||
  marker.runIdentity !== manifest.runIdentity ||
  manifest.manifestPath !== manifestPath ||
  dirname(manifestPath) !== dirname(sourceWorktree) ||
  configSource !== expectedConfigSource ||
  fixtureProject !== join(sourceWorktree, '.oat/projects/smoke-fixture') ||
  !isWithin(configSource, sourceWorktree) ||
  !isWithin(fixtureProject, sourceWorktree)
) {
  fail('manifest or config paths escape the disposable smoke run');
}
if (
  manifest.provisioningState !== 'ready' ||
  manifest.readiness?.status !== 'ready' ||
  typeof manifest.sourceCommitSha !== 'string' ||
  !/^[0-9a-f]{40}$/u.test(manifest.sourceCommitSha) ||
  typeof manifest.baselineCommitSha !== 'string' ||
  !/^[0-9a-f]{40}$/u.test(manifest.baselineCommitSha)
) {
  fail('manifest is not a ready committed smoke baseline');
}
if (
  !isDeepStrictEqual(manifest.intendedSmokeBootstrap, expectedBootstrap) ||
  !isDeepStrictEqual(manifest.effectiveSmokeBootstrap, expectedBootstrap)
) {
  fail('manifest bootstrap environment does not match the marker');
}
if (
  !Array.isArray(manifest.createdPaths) ||
  !manifest.createdPaths.includes(configSource) ||
  !manifest.createdPaths.includes(sourceMarkerPath)
) {
  fail('manifest does not own the smoke config and marker');
}

requireRealDirectory(sourceWorktree, 'manifest.worktreePath');
requireRealDirectory(dirname(manifestPath), 'smoke run directory');
requireRealDirectory(join(sourceWorktree, '.oat'), 'source .oat directory');
requireRealDirectory(fixtureProject, 'manifest.fixtureProjectPath');
requireRegularFile(sourceMarkerPath, 'source marker');
if (!readFileSync(markerPath).equals(readFileSync(sourceMarkerPath))) {
  fail('tracked marker differs from the provisioned source marker');
}
if (
  createHash('sha256').update(readFileSync(configSource)).digest('hex') !==
  marker.configSha256
) {
  fail('configSource bytes do not match configSha256');
}

const config = requirePlainObject(
  readJson(configSource, 'configSource'),
  'configSource',
);
if (
  config.activeProject !== fixtureProject ||
  !isDeepStrictEqual(config.smoke, {
    driveMode: manifest.driveMode,
    harness: manifest.harness,
    scenario: manifest.appliedScenario,
  }) ||
  !isDeepStrictEqual(config.workflow?.postImplementSequence, {
    preApproval: [],
    postApproval: [],
  })
) {
  fail('smoke config values do not match the provisioned fixture');
}

process.stdout.write(
  `${configSource}\t${manifest.baselineCommitSha}\t${manifestPath}`,
);
NODE
  )"

  IFS=$'\t' read -r config_source baseline_commit manifest_path <<<"$validation_output"
  source_root="$(cd "$(dirname "$config_source")/.." && pwd -P)"
  source_common_git_dir="$(
    git -C "$source_root" rev-parse --path-format=absolute --git-common-dir
  )"

  if [[ "$source_common_git_dir" != "$common_git_dir" ]]; then
    echo "error: smoke config source belongs to a different repository" >&2
    return 1
  fi
  if ! git -C "$current_root" merge-base --is-ancestor "$baseline_commit" HEAD; then
    echo "error: smoke baseline is not an ancestor of the target worktree" >&2
    return 1
  fi
  if [[ ! -f "$journal_script" || -L "$journal_script" ]]; then
    echo "error: smoke ownership journal is missing or unsafe" >&2
    return 1
  fi

  echo "registering nested smoke worktree ownership"
  node "$journal_script" register \
    --manifest "$manifest_path" \
    --marker "$marker_path" \
    --worktree "$current_root"

  echo "smoke bootstrap marker: ${marker_path#"${current_root}/"}"
  echo "copying only the provisioned smoke config"
  mkdir -p "$(dirname "$config_destination")"
  if [[ "$config_source" != "$config_destination" ]]; then
    if [[ -e "$config_destination" || -L "$config_destination" ]]; then
      if [[ ! -f "$config_destination" || -L "$config_destination" ]]; then
        echo "error: existing smoke config destination is unsafe" >&2
        return 1
      fi
      rm "$config_destination"
    fi
    cp "$config_source" "$config_destination"
  fi
  if ! cmp -s "$config_source" "$config_destination"; then
    echo "error: smoke config byte verification failed" >&2
    return 1
  fi

  echo "verifying fixture-scoped child readiness"
  test -f "${current_root}/.oat/projects/smoke-fixture/plan.md"
  test -f "${current_root}/.oat/projects/smoke-fixture/state.md"
  test -f "${current_root}/.oat/projects/smoke-fixture/implementation.md"
  test -d "${current_root}/workspace/logs"
  if ! cmp -s "$config_source" "$config_destination"; then
    echo "error: readiness checks changed the provisioned smoke config" >&2
    return 1
  fi
  echo "smoke bootstrap complete"
}

smoke_marker_path="${current_root}/.oat/smoke-bootstrap.json"
if git -C "$current_root" ls-files --error-unmatch -- \
  ".oat/smoke-bootstrap.json" >/dev/null 2>&1; then
  if [[ ! -d "${current_root}/.oat" || -L "${current_root}/.oat" ||
    ! -f "$smoke_marker_path" || -L "$smoke_marker_path" ]]; then
    echo "error: tracked smoke bootstrap marker is missing or unsafe" >&2
    exit 1
  fi
  run_smoke_bootstrap "$smoke_marker_path"
  exit 0
elif [[ -e "$smoke_marker_path" || -L "$smoke_marker_path" ]]; then
  echo "error: refusing untracked smoke bootstrap marker" >&2
  exit 1
fi

echo "main worktree: ${main_root}"
echo "target worktree: ${current_root}"

echo "copying local environment files from main worktree"
copy_env_files

echo "copying local config files from main worktree"
copy_file "${main_root}/.oat/config.local.json" "${current_root}/.oat/config.local.json"
copy_matching_files \
  -name ".mcp.json" \
  -o -path "*/.claude/settings.local.json" \
  -o -path "*/.cursor/mcp.json"

echo "copying local and archived projects from main worktree"
copy_directory_tree ".oat/projects/local"
copy_directory_tree ".oat/projects/archived"

echo "installing dependencies"
pnpm install

echo "configuring git hooks"
pnpm run hooks setup

# Build before any `pnpm run cli` call. Workspace packages (e.g.,
# @open-agent-toolkit/control-plane) export from dist/ via package.json
# `main`, so tsx cannot resolve them until they are built.
echo "building workspace"
pnpm run build

if [[ "${SKIP_S3_ARCHIVE_SYNC:-}" == "1" ]]; then
  echo "skip S3 archived-project sync: SKIP_S3_ARCHIVE_SYNC=1"
else
  echo "syncing archived projects from S3 (cross-machine archives)"
  bash "${current_root}/scripts/sync-archived-projects-from-s3.sh" --warn-only
fi

if [[ "$current_root" != "$main_root" ]]; then
  echo "syncing OAT local paths into worktree"
  pnpm run --silent cli -- local sync "$current_root"
else
  echo "skip local path sync: already in main worktree"
fi

echo "syncing OAT canonical content to provider views"
pnpm run --silent cli -- sync
