#!/usr/bin/env bash
set -euo pipefail

# Physical paths: run through a symlinked checkout, a logical path made node
# resolve the inventory module to a different path than argv[1], so every
# lookup printed nothing (the likely trigger of the Wave 3 disk fill).
SCRIPT_DIR="$(cd -P "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_ROOT="$(cd -P "${SCRIPT_DIR}/../../.." && pwd -P)"
ASSETS="${OAT_ASSETS_DIR:-${REPO_ROOT}/packages/cli/assets}"
INVENTORY="${SCRIPT_DIR}/bundle-inputs.mjs"

# Every guard below runs before the first mkdir, cp, mv, or rm. An inventory
# lookup that prints nothing collapses "${REPO_ROOT}/<value>" to the repository
# root, and the docs copy then copies the whole repository into its own staging
# directory until the disk fills (Wave 3, 2026-10-01). Fail closed instead.
fail_bundle() {
  echo "bundle-assets: $*" >&2
  exit 1
}

# Print the physical absolute form of a path that may not exist yet: resolve
# the nearest existing ancestor with `cd -P` and `pwd -P`, so neither a symlink
# alias nor a `<symlink>/..` spelling can hide a staging directory inside a
# copied source, and append the missing components. A logical `cd` would trim
# `<symlink>/..` as text while the kernel follows the symlink first.
physical_path() {
  local path="$1" suffix="" name resolved
  case "${path}" in
    /*) ;;
    *) path="${PWD}/${path}" ;;
  esac
  while [ ! -d "${path}" ]; do
    name="$(basename "${path}")"
    case "${name}" in
      .) ;;
      ..)
        echo "bundle-assets: cannot resolve '..' below a missing directory in ${1}" >&2
        return 1
        ;;
      *) suffix="/${name}${suffix}" ;;
    esac
    path="$(dirname "${path}")"
  done
  resolved="$(cd -P "${path}" && pwd -P)" || return 1
  resolved="${resolved%/}${suffix}"
  printf '%s\n' "${resolved:-/}"
}

# True when $1 is $2 or lies below it. Both arguments are physical paths.
path_is_within() {
  [ "$2" = "/" ] && return 0
  [ "$1" = "$2" ] && return 0
  case "$1" in
    "$2"/*) return 0 ;;
  esac
  return 1
}

# Print "${REPO_ROOT}/<value>" for an inventory path lookup, or exit when the
# value is empty, absolute, climbs with '..', or physically names the
# repository root.
require_inventory_path() {
  local key="$1" value
  value="$(node "${INVENTORY}" --get "${key}")" ||
    fail_bundle "inventory lookup '${key}' failed."
  [ -n "${value}" ] ||
    fail_bundle "inventory lookup '${key}' printed nothing; refusing to build from the repository root."
  case "${value}" in
    /*) fail_bundle "inventory lookup '${key}' returned an absolute path (${value}); expected a repository-relative path." ;;
  esac
  case "/${value}/" in
    */../*) fail_bundle "inventory lookup '${key}' contains a '..' segment (${value}); expected a path inside the repository." ;;
  esac
  if [ "$(physical_path "${REPO_ROOT}/${value}")" = "${REPO_ROOT}" ]; then
    fail_bundle "inventory lookup '${key}' resolves to the repository root (${value}); refusing to copy the repository into its own bundle."
  fi
  printf '%s\n' "${REPO_ROOT}/${value}"
}

DOCS_SOURCE="$(require_inventory_path docsRoot)" || exit 1
MIGRATION_PROMPT_SOURCE="$(require_inventory_path migrationPrompt)" || exit 1
DISPATCH_MATRIX_RECOMMENDATION_SOURCE="$(require_inventory_path dispatchMatrix)" || exit 1

# The bundle is published into ASSETS by rename rather than rebuilt in place.
# `resolveAssetsRoot` in the CLI honours a non-empty OAT_ASSETS_DIR, but every
# DEFAULT consumer still reads the shared assets directory, so an in-place
# `rm -rf` + repopulate leaves that directory absent or half-written for the
# whole duration of the copy. Any concurrent default reader — notably the parts
# of the smoke suite that have not opted out by pointing OAT_ASSETS_DIR at a
# private bundle — can observe the gap and fail with "Bundled asset metadata
# not found". Staging first narrows that window to the two renames below, and
# leaves the previous bundle intact if the build fails.
STAGING="${ASSETS}.staging.$$"
PREVIOUS="${ASSETS}.previous.$$"

# Destination rule. Publishing renames whatever sits at ASSETS to PREVIOUS and
# deletes it, so an OAT_ASSETS_DIR override is published only when it is
# absent, an empty directory, or a directory holding bundle-metadata.json (a
# previous bundle); anything else is refused. The default destination,
# packages/cli/assets, is exempt: a fresh checkout holds its tracked files
# without bundle-metadata.json.
if [ -n "${OAT_ASSETS_DIR:-}" ] && { [ -e "${ASSETS}" ] || [ -L "${ASSETS}" ]; }; then
  if [ ! -d "${ASSETS}" ] ||
    { [ ! -f "${ASSETS}/bundle-metadata.json" ] && [ -n "$(ls -A "${ASSETS}")" ]; }; then
    fail_bundle "refusing to build: the assets destination (${ASSETS}) is neither an empty directory nor a previous bundle (no bundle-metadata.json); remove it or choose an empty directory."
  fi
fi

# Recursion rule. The staging directory must not be at or inside a recursively
# copied source root (skills, templates, docs), or the copy would copy that tree
# into itself. Compared on physical paths, so a symlink alias or `<link>/..`
# cannot hide it.
STAGING_PHYSICAL="$(physical_path "${STAGING}")" || exit 1
for source_root in "${REPO_ROOT}/.agents/skills" "${REPO_ROOT}/.oat/templates" "${DOCS_SOURCE}"; do
  source_root_physical="$(physical_path "${source_root}")" || exit 1
  if path_is_within "${STAGING_PHYSICAL}" "${source_root_physical}"; then
    fail_bundle "refusing to build: the staging directory (${STAGING_PHYSICAL}) is at or inside the recursively copied source ${source_root_physical}."
  fi
done

# The trap must not destroy the only surviving copy. If the first rename below
# succeeded and the second then failed, ASSETS does not exist while PREVIOUS
# holds the entire previous bundle; deleting it unconditionally would leave no
# assets directory at all — the opposite of what staging is for. Restore in that
# case, and only discard PREVIOUS when ASSETS is actually present.
cleanup() {
  rm -rf "${STAGING}"
  if [ -e "${PREVIOUS}" ]; then
    if [ -e "${ASSETS}" ]; then
      rm -rf "${PREVIOUS}"
    else
      mv "${PREVIOUS}" "${ASSETS}"
    fi
  fi
}
trap cleanup EXIT

rm -rf "${STAGING}" "${PREVIOUS}"
mkdir -p "${STAGING}/skills" "${STAGING}/agents" "${STAGING}/templates" "${STAGING}/scripts" "${STAGING}/docs" "${STAGING}/migration" "${STAGING}/config"

cp "${REPO_ROOT}/NOTICES.md" "${STAGING}/NOTICES.md"

while IFS= read -r skill; do
  [ -n "${skill}" ] || continue
  cp -RL "${REPO_ROOT}/.agents/skills/${skill}" "${STAGING}/skills/"
  rm -rf "${STAGING}/skills/${skill}/tests"
done < <(node "${INVENTORY}" --list skills)

while IFS= read -r agent; do
  [ -n "${agent}" ] || continue
  cp "${REPO_ROOT}/.agents/agents/${agent}" "${STAGING}/agents/"
done < <(node "${INVENTORY}" --list agents)

while IFS= read -r template; do
  [ -n "${template}" ] || continue
  cp "${REPO_ROOT}/.oat/templates/${template}" "${STAGING}/templates/"
done < <(node "${INVENTORY}" --list templateFiles)

while IFS= read -r template_dir; do
  [ -n "${template_dir}" ] || continue
  cp -R "${REPO_ROOT}/.oat/templates/${template_dir}" "${STAGING}/templates/"
done < <(node "${INVENTORY}" --list templateDirectories)

node --input-type=module - "${REPO_ROOT}" "${STAGING}" "${INVENTORY}" <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.argv[2];
const assetsRoot = process.argv[3];
const inventoryPath = process.argv[4];
const { BUNDLE_INPUTS } = await import(pathToFileURL(inventoryPath));
const versions = Object.fromEntries(
  BUNDLE_INPUTS.publicVersionPackages.map((name) => {
    const pkg = JSON.parse(
      readFileSync(join(repoRoot, 'packages', name, 'package.json'), 'utf8'),
    );
    return [name, pkg.version];
  }),
);

writeFileSync(
  join(assetsRoot, 'public-package-versions.json'),
  `${JSON.stringify(versions, null, 2)}\n`,
  'utf8',
);

writeFileSync(
  join(assetsRoot, 'bundle-metadata.json'),
  `${JSON.stringify(
    {
      schemaVersion: 1,
      oatVersion: versions.cli,
    },
    null,
    2,
  )}\n`,
  'utf8',
);
EOF

# Bundle OAT documentation for core pack (oat-docs skill)
if [ -d "${DOCS_SOURCE}" ]; then
  cp -R "${DOCS_SOURCE}/." "${STAGING}/docs/"
fi

while IFS= read -r script; do
  [ -n "${script}" ] || continue
  SOURCE_SCRIPT="${REPO_ROOT}/.oat/scripts/${script}"
  if [ ! -f "${SOURCE_SCRIPT}" ]; then
    echo "Required bundle script source is missing: ${SOURCE_SCRIPT}" >&2
    exit 1
  fi
  cp "${SOURCE_SCRIPT}" "${STAGING}/scripts/"
done < <(node "${INVENTORY}" --list oatScripts)

if [ -f "${MIGRATION_PROMPT_SOURCE}" ]; then
  cp "${MIGRATION_PROMPT_SOURCE}" "${STAGING}/migration/pjm-restructure.md"
fi

cp "${DISPATCH_MATRIX_RECOMMENDATION_SOURCE}" "${STAGING}/config/dispatch-matrix-recommendation.json"

# Publish. Both moves are renames within one directory, so the window in which
# ASSETS does not resolve is bounded by a single rename rather than by the copy
# above. STAGING and PREVIOUS are siblings of ASSETS to keep them on the same
# filesystem, which is what makes the renames atomic.
mkdir -p "$(dirname "${ASSETS}")"
if [ -e "${ASSETS}" ]; then
  mv "${ASSETS}" "${PREVIOUS}"
fi
mv "${STAGING}" "${ASSETS}"
rm -rf "${PREVIOUS}"
