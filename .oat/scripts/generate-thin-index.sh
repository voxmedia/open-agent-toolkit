#!/bin/bash
# generate-thin-index.sh - Generate thin project-index.md for quick orientation
#
# Usage: ./generate-thin-index.sh [HEAD_SHA] [MERGE_BASE_SHA]
#
# If SHAs not provided, computes them from current git state.
# Output: Writes .oat/knowledge/repo/project-index.md

set -e

# Get SHAs from args or compute
HEAD_SHA="${1:-$(git rev-parse HEAD 2>/dev/null || echo "unknown")}"
MERGE_BASE_SHA="${2:-$(git merge-base HEAD origin/main 2>/dev/null || git rev-parse HEAD 2>/dev/null || echo "unknown")}"

# Current date (portable)
DATE=$(date +%F)

# Get repo name from package.json or directory (supports node, jq, or grep fallback)
REPO_NAME=""
if [ -f package.json ]; then
  # Try node first
  if command -v node >/dev/null 2>&1; then
    REPO_NAME=$(node -pe "try{require('./package.json').name||''}catch(e){''}" 2>/dev/null)
  # Try jq second
  elif command -v jq >/dev/null 2>&1; then
    REPO_NAME=$(jq -r '.name // ""' package.json 2>/dev/null)
  # Fallback to grep
  else
    REPO_NAME=$(grep -m1 '"name"' package.json 2>/dev/null | sed 's/.*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
  fi
fi
if [ -z "$REPO_NAME" ]; then
  REPO_NAME=$(basename "$(pwd)")
fi

# Quick directory tree (2 levels, exclude common noise)
TREE=$(find . -maxdepth 2 -mindepth 1 \
  -not -path '*/.git/*' \
  -not -path '*/node_modules/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  -not -path '*/.next/*' \
  -not -path '*/.turbo/*' \
  -not -path '*/coverage/*' \
  -print 2>/dev/null | sed 's#^\./##' | sort | head -200)

# Detect package manager
PKG_MANAGER="unknown"
[ -f pnpm-lock.yaml ] && PKG_MANAGER="pnpm"
[ -f yarn.lock ] && PKG_MANAGER="yarn"
[ -f package-lock.json ] && PKG_MANAGER="npm"
[ -f Pipfile.lock ] && PKG_MANAGER="pipenv"
[ -f poetry.lock ] && PKG_MANAGER="poetry"
[ -f Cargo.lock ] && PKG_MANAGER="cargo"
[ -f go.mod ] && PKG_MANAGER="go"

# Extract scripts from package.json if Node project (supports node, jq, or grep fallback)
SCRIPTS=""
if [ -f package.json ]; then
  if command -v node >/dev/null 2>&1; then
    SCRIPTS=$(node -pe "try{Object.keys(require('./package.json').scripts||{}).join(', ')}catch(e){''}" 2>/dev/null || echo "")
  elif command -v jq >/dev/null 2>&1; then
    SCRIPTS=$(jq -r '.scripts // {} | keys | join(", ")' package.json 2>/dev/null || echo "")
  else
    # Fallback: extract script names with grep (crude but works for most cases)
    SCRIPTS=$(grep -E '^\s+"[a-zA-Z0-9:_-]+"\s*:' package.json 2>/dev/null | \
      sed -n '/"scripts"/,/^[[:space:]]*}/p' | \
      grep -E '^\s+"[a-zA-Z0-9:_-]+"\s*:' | \
      sed 's/.*"\([^"]*\)".*/\1/' | \
      tr '\n' ', ' | sed 's/, $//')
  fi
fi

# Find entry points (cheap heuristics)
ENTRYPOINTS=$(find . -maxdepth 4 -type f \
  \( -name 'index.*' -o -name 'main.*' -o -name 'app.*' -o -name 'server.*' -o -name 'cli.*' \) \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  -print 2>/dev/null | sed 's#^\./##' | sort | head -50)

# Detect key config files (portable - check each individually)
CONFIGS=""
for cfg in package.json pnpm-lock.yaml yarn.lock package-lock.json \
           tsconfig.json biome.json eslint.config.js eslint.config.mjs .eslintrc.js .eslintrc.json \
           vitest.config.ts vitest.config.js jest.config.ts jest.config.js pytest.ini pyproject.toml \
           go.mod Cargo.toml Makefile; do
  [ -f "$cfg" ] && CONFIGS="$CONFIGS $cfg"
done
CONFIGS=$(echo "$CONFIGS" | xargs)  # trim whitespace

# Extract test command from scripts (supports node, jq, or grep fallback)
TEST_CMD=""
if [ -f package.json ]; then
  if command -v node >/dev/null 2>&1; then
    TEST_CMD=$(node -pe "try{require('./package.json').scripts?.test||''}catch(e){''}" 2>/dev/null || echo "")
  elif command -v jq >/dev/null 2>&1; then
    TEST_CMD=$(jq -r '.scripts.test // ""' package.json 2>/dev/null || echo "")
  else
    # Fallback: look for test script with grep
    TEST_CMD=$(grep -A1 '"test"' package.json 2>/dev/null | grep -v '"test"' | head -1 | sed 's/.*"test"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' | tr -d ',')
  fi
fi
if [ -z "$TEST_CMD" ] && [ -f Makefile ]; then
  grep -q "^test:" Makefile 2>/dev/null && TEST_CMD="make test"
fi

# Format testing section
if [ -n "$TEST_CMD" ]; then
  TESTING_SECTION="**Test Command:** \`${TEST_CMD}\`"
else
  TESTING_SECTION="*Test command will be documented after analysis.*"
fi

# Format entry points as list
ENTRYPOINTS_LIST=""
if [ -n "$ENTRYPOINTS" ]; then
  ENTRYPOINTS_LIST=$(echo "$ENTRYPOINTS" | while read -r ep; do echo "- \`$ep\`"; done)
else
  ENTRYPOINTS_LIST="- None detected"
fi

# Format tree as markdown code block content
TREE_FORMATTED=$(echo "$TREE" | sed 's/^/  /')

# Format configs as list
CONFIGS_LIST=""
if [ -n "$CONFIGS" ]; then
  for cfg in $CONFIGS; do
    CONFIGS_LIST="$CONFIGS_LIST
- \`$cfg\`"
  done
else
  CONFIGS_LIST="
- None detected"
fi

# Ensure output directory exists
mkdir -p .oat/knowledge/repo

# Write the thin index
cat > .oat/knowledge/repo/project-index.md <<EOF
---
oat_generated: true
oat_generated_at: ${DATE}
oat_source_head_sha: ${HEAD_SHA}
oat_source_main_merge_base_sha: ${MERGE_BASE_SHA}
oat_index_type: thin
oat_warning: "GENERATED FILE - Thin index, will be enriched after mapper completion"
---

# ${REPO_NAME}

## Overview

*Overview will be enriched after codebase analysis completes.*

## Quick Orientation

**Package Manager:** ${PKG_MANAGER}

**Key Scripts:** ${SCRIPTS:-None detected}

**Entry Points:**
${ENTRYPOINTS_LIST}

## Project Structure (Top-Level)

\`\`\`
${TREE_FORMATTED}
\`\`\`

## Configuration Files
${CONFIGS_LIST}

## Testing

${TESTING_SECTION}

## Next Steps

This is a thin index generated for quick orientation. Full details will be available after codebase analysis completes in:

- [stack.md](stack.md) - Technologies and dependencies (pending)
- [architecture.md](architecture.md) - System design and patterns (pending)
- [structure.md](structure.md) - Directory layout (pending)
- [integrations.md](integrations.md) - External services (pending)
- [testing.md](testing.md) - Test structure and practices (pending)
- [conventions.md](conventions.md) - Code style and patterns (pending)
- [concerns.md](concerns.md) - Technical debt and issues (pending)
EOF

echo "Generated .oat/knowledge/repo/project-index.md (thin index)"
echo "  Repo: ${REPO_NAME}"
echo "  Package Manager: ${PKG_MANAGER}"
echo "  Entry Points: $(echo "$ENTRYPOINTS" | wc -l | tr -d ' ') detected"
