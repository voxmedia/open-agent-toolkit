#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
ASSETS="${REPO_ROOT}/packages/cli/assets"

rm -rf "${ASSETS}"
mkdir -p "${ASSETS}/skills" "${ASSETS}/agents" "${ASSETS}/templates" "${ASSETS}/scripts"

SKILLS=(
  oat-idea-ideate
  oat-idea-new
  oat-idea-scratchpad
  oat-idea-summarize
  oat-project-clear-active
  oat-project-complete
  oat-project-design
  oat-project-discover
  oat-project-implement
  oat-project-import-plan
  oat-project-new
  oat-project-open
  oat-project-plan
  oat-project-plan-writing
  oat-project-pr-final
  oat-project-pr-progress
  oat-project-progress
  oat-project-promote-full
  oat-project-quick-start
  oat-project-review-provide
  oat-project-review-receive
  oat-project-spec
  oat-repo-knowledge-index
  oat-worktree-bootstrap
  oat-review-provide
  oat-agent-instructions-analyze
  oat-agent-instructions-apply
)

for skill in "${SKILLS[@]}"; do
  cp -R "${REPO_ROOT}/.agents/skills/${skill}" "${ASSETS}/skills/"
done

for agent in oat-codebase-mapper.md oat-reviewer.md; do
  cp "${REPO_ROOT}/.agents/agents/${agent}" "${ASSETS}/agents/"
done

for template in state.md discovery.md spec.md design.md plan.md implementation.md; do
  cp "${REPO_ROOT}/.oat/templates/${template}" "${ASSETS}/templates/"
done
cp -R "${REPO_ROOT}/.oat/templates/ideas" "${ASSETS}/templates/"

for script in generate-oat-state.sh generate-thin-index.sh; do
  SOURCE_SCRIPT="${REPO_ROOT}/.oat/scripts/${script}"
  if [ -f "${SOURCE_SCRIPT}" ]; then
    cp "${SOURCE_SCRIPT}" "${ASSETS}/scripts/"
  fi
done
