#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ASSETS="${OAT_ASSETS_DIR:-${REPO_ROOT}/packages/cli/assets}"
INVENTORY="${SCRIPT_DIR}/bundle-inputs.mjs"
DOCS_SOURCE="${REPO_ROOT}/$(node "${INVENTORY}" --get docsRoot)"
MIGRATION_PROMPT_SOURCE="${REPO_ROOT}/$(node "${INVENTORY}" --get migrationPrompt)"
DISPATCH_MATRIX_RECOMMENDATION_SOURCE="${REPO_ROOT}/$(node "${INVENTORY}" --get dispatchMatrix)"

# The bundle is published into ASSETS by rename rather than rebuilt in place.
# `resolveAssetsRoot` in the CLI reads the shared assets directory directly and
# honours no override, so an in-place `rm -rf` + repopulate leaves that
# directory absent or half-written for the whole duration of the copy. Any
# concurrent reader — notably the smoke suite, which runs many files in
# parallel against this one shared path — can observe the gap and fail with
# "Bundled asset metadata not found". Staging first narrows that window to the
# two renames below, and leaves the previous bundle intact if the build fails.
STAGING="${ASSETS}.staging.$$"
PREVIOUS="${ASSETS}.previous.$$"

cleanup() {
  rm -rf "${STAGING}" "${PREVIOUS}"
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
  if [ -f "${SOURCE_SCRIPT}" ]; then
    cp "${SOURCE_SCRIPT}" "${STAGING}/scripts/"
  fi
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
