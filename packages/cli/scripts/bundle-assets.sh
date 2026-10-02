#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
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
# alias nor a `<symlink>/..` spelling can hide a destination inside a copied
# source, and append the missing components. A logical `cd` would trim
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
# value is empty, absolute, climbs with '..', or names the repository root.
require_inventory_path() {
  local key="$1" value normalized
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
  normalized="/${value}/"
  while :; do
    case "${normalized}" in
      *//*) normalized="${normalized//\/\///}" ;;
      */./*) normalized="${normalized//\/.\///}" ;;
      *) break ;;
    esac
  done
  if [ "${normalized}" = "/" ] ||
    [ "$(physical_path "${REPO_ROOT}/${value}")" = "$(physical_path "${REPO_ROOT}")" ]; then
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

# No destination may be, sit inside, or contain any directory the bundle copies
# from: the recursively copied skills, templates, and docs roots, and the
# directories whose files are copied one by one (agents, OAT scripts, and the
# migration-prompt and dispatch-matrix config). A destination inside a
# recursively copied root copies that tree into itself; publishing onto a
# destination that is or contains a source directory renames the canonical
# source away and deletes it. NOTICES.md comes from the repository root, which
# contains every root below, so a destination at or above it is refused too.
# Checked on physical paths before the trap is installed, so a refusal touches
# nothing.
COPIED_SOURCE_ROOTS=(
  "skills root|${REPO_ROOT}/.agents/skills"
  "agents directory|${REPO_ROOT}/.agents/agents"
  "templates root|${REPO_ROOT}/.oat/templates"
  "OAT scripts directory|${REPO_ROOT}/.oat/scripts"
  "docs source|${DOCS_SOURCE}"
  "migration prompt directory|$(dirname "${MIGRATION_PROMPT_SOURCE}")"
  "dispatch matrix directory|$(dirname "${DISPATCH_MATRIX_RECOMMENDATION_SOURCE}")"
)
for destination_entry in "assets destination|${ASSETS}" "staging directory|${STAGING}" "previous-bundle directory|${PREVIOUS}"; do
  destination_label="${destination_entry%%|*}"
  destination_path="$(physical_path "${destination_entry#*|}")" || exit 1
  for source_entry in "${COPIED_SOURCE_ROOTS[@]}"; do
    source_label="${source_entry%%|*}"
    source_path="$(physical_path "${source_entry#*|}")" || exit 1
    if path_is_within "${destination_path}" "${source_path}"; then
      fail_bundle "refusing to build: the ${destination_label} (${destination_path}) is inside the copied ${source_label} (${source_path})."
    fi
    if path_is_within "${source_path}" "${destination_path}"; then
      fail_bundle "refusing to build: the copied ${source_label} (${source_path}) is inside the ${destination_label} (${destination_path})."
    fi
  done
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
