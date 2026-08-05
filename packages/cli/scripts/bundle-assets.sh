#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ASSETS="${OAT_ASSETS_DIR:-${REPO_ROOT}/packages/cli/assets}"
INVENTORY="${SCRIPT_DIR}/bundle-inputs.mjs"
DOCS_SOURCE="${REPO_ROOT}/$(node "${INVENTORY}" --get docsRoot)"
MIGRATION_PROMPT_SOURCE="${REPO_ROOT}/$(node "${INVENTORY}" --get migrationPrompt)"
DISPATCH_MATRIX_RECOMMENDATION_SOURCE="${REPO_ROOT}/$(node "${INVENTORY}" --get dispatchMatrix)"

rm -rf "${ASSETS}"
mkdir -p "${ASSETS}/skills" "${ASSETS}/agents" "${ASSETS}/templates" "${ASSETS}/scripts" "${ASSETS}/docs" "${ASSETS}/migration" "${ASSETS}/config"

cp "${REPO_ROOT}/NOTICES.md" "${ASSETS}/NOTICES.md"

while IFS= read -r skill; do
  [ -n "${skill}" ] || continue
  cp -RL "${REPO_ROOT}/.agents/skills/${skill}" "${ASSETS}/skills/"
  rm -rf "${ASSETS}/skills/${skill}/tests"
done < <(node "${INVENTORY}" --list skills)

while IFS= read -r agent; do
  [ -n "${agent}" ] || continue
  cp "${REPO_ROOT}/.agents/agents/${agent}" "${ASSETS}/agents/"
done < <(node "${INVENTORY}" --list agents)

while IFS= read -r template; do
  [ -n "${template}" ] || continue
  cp "${REPO_ROOT}/.oat/templates/${template}" "${ASSETS}/templates/"
done < <(node "${INVENTORY}" --list templateFiles)

while IFS= read -r template_dir; do
  [ -n "${template_dir}" ] || continue
  cp -R "${REPO_ROOT}/.oat/templates/${template_dir}" "${ASSETS}/templates/"
done < <(node "${INVENTORY}" --list templateDirectories)

node --input-type=module - "${REPO_ROOT}" "${ASSETS}" "${INVENTORY}" <<'EOF'
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
  cp -R "${DOCS_SOURCE}/." "${ASSETS}/docs/"
fi

while IFS= read -r script; do
  [ -n "${script}" ] || continue
  SOURCE_SCRIPT="${REPO_ROOT}/.oat/scripts/${script}"
  if [ -f "${SOURCE_SCRIPT}" ]; then
    cp "${SOURCE_SCRIPT}" "${ASSETS}/scripts/"
  fi
done < <(node "${INVENTORY}" --list oatScripts)

if [ -f "${MIGRATION_PROMPT_SOURCE}" ]; then
  cp "${MIGRATION_PROMPT_SOURCE}" "${ASSETS}/migration/pjm-restructure.md"
fi

cp "${DISPATCH_MATRIX_RECOMMENDATION_SOURCE}" "${ASSETS}/config/dispatch-matrix-recommendation.json"
