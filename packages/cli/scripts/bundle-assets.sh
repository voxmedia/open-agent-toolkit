#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ASSETS="${OAT_ASSETS_DIR:-${REPO_ROOT}/packages/cli/assets}"
MIGRATION_PROMPT_SOURCE="${REPO_ROOT}/packages/cli/assets/migration/pjm-restructure.md"
DISPATCH_MATRIX_RECOMMENDATION_SOURCE="${REPO_ROOT}/packages/cli/config/dispatch-matrix-recommendation.json"
MIGRATION_PROMPT_TMP=""

if [ -f "${MIGRATION_PROMPT_SOURCE}" ]; then
  MIGRATION_PROMPT_TMP="$(mktemp)"
  cp "${MIGRATION_PROMPT_SOURCE}" "${MIGRATION_PROMPT_TMP}"
fi

rm -rf "${ASSETS}"
mkdir -p "${ASSETS}/skills" "${ASSETS}/agents" "${ASSETS}/templates" "${ASSETS}/scripts" "${ASSETS}/docs" "${ASSETS}/migration" "${ASSETS}/config"

SKILLS=(
  authoring-docs
  create-agnostic-skill
  oat-dispatch-subagents
  oat-agent-instructions-analyze
  oat-agent-instructions-apply
  oat-brainstorm
  oat-docs
  oat-docs-analyze
  oat-docs-apply
  oat-docs-authoring
  oat-docs-bootstrap
  oat-doctor
  oat-repo-improve
  oat-repo-maintainability-review
  oat-idea-ideate
  oat-idea-new
  oat-idea-scratchpad
  oat-idea-summarize
  oat-pjm-add-backlog-item
  oat-pjm-decision
  oat-pjm-review-backlog
  oat-pjm-update-repo-reference
  oat-cursor-cloud-projects
  oat-project-autonomous
  oat-project-capture
  oat-project-clear-active
  oat-project-complete
  oat-project-design
  oat-project-dispatch-subagents
  oat-project-discover
  oat-project-document
  oat-project-implement
  oat-project-import-plan
  oat-project-new
  oat-project-next
  oat-project-open
  oat-project-plan
  oat-project-plan-writing
  oat-project-pr-final
  oat-project-pr-progress
  oat-project-progress
  oat-project-promote-spec-driven
  oat-project-quick-start
  oat-project-reconcile
  oat-project-revise
  oat-project-review-provide
  oat-project-review-provide-remote
  oat-project-review-receive
  oat-project-review-receive-remote
  oat-project-spec
  oat-project-split
  oat-project-summary
  oat-repo-knowledge-index
  oat-review-provide
  oat-review-provide-remote
  oat-review-receive
  oat-review-receive-remote
  oat-worktree-bootstrap
  oat-worktree-bootstrap-auto
  oat-wrap-up
  analyze
  compare
  deep-research
  skeptic
  synthesize
)

for skill in "${SKILLS[@]}"; do
  cp -RL "${REPO_ROOT}/.agents/skills/${skill}" "${ASSETS}/skills/"
  rm -rf "${ASSETS}/skills/${skill}/tests"
done

for agent in oat-codebase-mapper.md oat-phase-implementer.md oat-reviewer.md skeptical-evaluator.md; do
  cp "${REPO_ROOT}/.agents/agents/${agent}" "${ASSETS}/agents/"
done

for template in backlog-item.md roadmap.md current-state.md decision.md repo-agents.md pjm-agents.md reference-agents.md repo-readme.md pjm-handoffs-readme.md state.md discovery.md spec.md design.md plan.md implementation.md summary.md project-log.md; do
  cp "${REPO_ROOT}/.oat/templates/${template}" "${ASSETS}/templates/"
done
cp -R "${REPO_ROOT}/.oat/templates/ideas" "${ASSETS}/templates/"
cp -R "${REPO_ROOT}/.oat/templates/docs-app-mkdocs" "${ASSETS}/templates/"
cp -R "${REPO_ROOT}/.oat/templates/docs-app-fuma" "${ASSETS}/templates/"

node - "${REPO_ROOT}" "${ASSETS}" <<'EOF'
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const repoRoot = process.argv[2];
const assetsRoot = process.argv[3];
const packageNames = ['cli', 'docs-config', 'docs-theme', 'docs-transforms'];
const versions = Object.fromEntries(
  packageNames.map((name) => {
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
EOF

# Bundle OAT documentation for core pack (oat-docs skill)
if [ -d "${REPO_ROOT}/apps/oat-docs/docs" ]; then
  cp -R "${REPO_ROOT}/apps/oat-docs/docs/." "${ASSETS}/docs/"
fi

for script in generate-oat-state.sh generate-thin-index.sh resolve-tracking.sh; do
  SOURCE_SCRIPT="${REPO_ROOT}/.oat/scripts/${script}"
  if [ -f "${SOURCE_SCRIPT}" ]; then
    cp "${SOURCE_SCRIPT}" "${ASSETS}/scripts/"
  fi
done

if [ -n "${MIGRATION_PROMPT_TMP}" ]; then
  cp "${MIGRATION_PROMPT_TMP}" "${ASSETS}/migration/pjm-restructure.md"
  rm -f "${MIGRATION_PROMPT_TMP}"
fi

cp "${DISPATCH_MATRIX_RECOMMENDATION_SOURCE}" "${ASSETS}/config/dispatch-matrix-recommendation.json"
