---
name: oat-index
description: Generate or regenerate comprehensive knowledge base of the codebase using parallel mapper agents.
---

# Knowledge Base Generation

Generate a comprehensive analysis of the codebase using parallel mapper agents.

## Process

### Step 1: Check Existing Knowledge

```bash
ls -la .oat/knowledge/repo/ 2>/dev/null
```

**If exists:**
- List current files with timestamps
- Ask: "Refresh (delete + regenerate) or Skip?"
- If Refresh: `rm -rf .oat/knowledge/repo/*.md && mkdir -p .oat/knowledge/repo`
- If Skip: Exit

**If doesn't exist:**
- Continue to Step 2

### Step 2: Create Knowledge Directory

```bash
mkdir -p .oat/knowledge/repo
```

### Step 3: Get Git SHAs for Frontmatter

```bash
# Get current HEAD SHA
HEAD_SHA=$(git rev-parse HEAD)

# Get merge base with origin/main (fallback to HEAD if not available)
MERGE_BASE_SHA=$(git merge-base HEAD origin/main 2>/dev/null || git rev-parse HEAD)
```

Store as `HEAD_SHA` and `MERGE_BASE_SHA` for frontmatter.

### Step 4: Generate Thin Project Index

**Purpose:** Create a fast, lightweight index immediately so other skills can load it without waiting for full analysis.

```bash
# Get current date
DATE=$(date +%F)

# Quick directory tree (2 levels, exclude common noise)
TREE=$(find . -maxdepth 2 -mindepth 1 \
  -not -path '*/.git/*' \
  -not -path '*/node_modules/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  -not -path '*/.next/*' \
  -not -path '*/.turbo/*' \
  -not -path '*/coverage/*' \
  -print | sed 's#^\./##' | sort | head -200)

# Detect package manager
PKG_MANAGER="unknown"
[ -f pnpm-lock.yaml ] && PKG_MANAGER="pnpm"
[ -f yarn.lock ] && PKG_MANAGER="yarn"
[ -f package-lock.json ] && PKG_MANAGER="npm"
[ -f Pipfile.lock ] && PKG_MANAGER="pipenv"
[ -f poetry.lock ] && PKG_MANAGER="poetry"
[ -f Cargo.lock ] && PKG_MANAGER="cargo"
[ -f go.mod ] && PKG_MANAGER="go"

# Extract scripts from package.json if Node project
SCRIPTS=""
if [ -f package.json ]; then
  SCRIPTS=$(node -pe "try{Object.keys(require('./package.json').scripts||{}).join(', ')}catch(e){''}" 2>/dev/null)
fi

# Find entry points (cheap heuristics)
ENTRYPOINTS=$(find . -maxdepth 4 -type f \
  \( -name 'index.*' -o -name 'main.*' -o -name 'app.*' -o -name 'server.*' -o -name 'cli.*' \) \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  -print | sed 's#^\./##' | sort | head -50)

# Detect key config files
CONFIGS=$(ls -1 2>/dev/null \
  package.json pnpm-lock.yaml yarn.lock package-lock.json \
  tsconfig.json biome.json eslint.config.* .eslintrc* \
  vitest.config.* jest.config.* pytest.ini pyproject.toml \
  go.mod Cargo.toml Makefile \
  | tr '\n' ' ')
```

Write thin `.oat/knowledge/repo/project-index.md`:

```markdown
---
oat_generated: true
oat_generated_at: ${DATE}
oat_source_head_sha: ${HEAD_SHA}
oat_source_main_merge_base_sha: ${MERGE_BASE_SHA}
oat_index_type: thin
oat_warning: "GENERATED FILE - Thin index, will be enriched after mapper completion"
---

# {Repo Name from directory or package.json}

## Overview

{1-2 sentence placeholder - will be enriched}

## Quick Orientation

**Package Manager:** ${PKG_MANAGER}
**Entry Points:** {List from ENTRYPOINTS}
**Key Scripts:** ${SCRIPTS}

## Project Structure (Top-Level)

{Format TREE as markdown tree}

## Configuration Files

{List from CONFIGS}

## Testing

{Extract test command from SCRIPTS if available}

## Next Steps

This is a thin index generated for quick orientation. Full details will be available after codebase analysis completes in:

- [stack.md](stack.md) - Technologies and dependencies (pending)
- [architecture.md](architecture.md) - System design and patterns (pending)
- [structure.md](structure.md) - Directory layout (pending)
- [integrations.md](integrations.md) - External services (pending)
- [testing.md](testing.md) - Test structure and practices (pending)
- [conventions.md](conventions.md) - Code style and patterns (pending)
- [concerns.md](concerns.md) - Technical debt and issues (pending)
```

**Why thin first:**
- Other skills can immediately load project-index.md for orientation
- Mappers can run in parallel without blocking on index generation
- Index gets enriched with full details after mappers complete

### Step 5: Spawn Parallel Mapper Agents

Use Task tool with `subagent_type="oat-codebase-mapper"` and `run_in_background=true`.

**Agent 1: Tech Focus**

```
subagent_type: "oat-codebase-mapper"
model: "haiku"
run_in_background: true
description: "Map codebase tech stack"
```

Prompt:
```
Focus: tech

Analyze this codebase for technology stack and external integrations.

Write these documents to .oat/knowledge/repo/:
- stack.md - Languages, runtime, frameworks, dependencies, configuration
- integrations.md - External APIs, databases, auth providers, webhooks

Use templates from .agent/skills/oat-index/references/templates/

Include frontmatter:
---
oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

Explore thoroughly. Write documents directly. Return confirmation only.
```

**Agent 2: Architecture Focus**

```
subagent_type: "oat-codebase-mapper"
model: "haiku"
run_in_background: true
description: "Map codebase architecture"
```

Prompt:
```
Focus: arch

Analyze this codebase architecture and directory structure.

Write these documents to .oat/knowledge/repo/:
- architecture.md - Pattern, layers, data flow, abstractions, entry points
- structure.md - Directory layout, key locations, naming conventions

Use templates from .agent/skills/oat-index/references/templates/

Include frontmatter:
---
oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

Explore thoroughly. Write documents directly. Return confirmation only.
```

**Agent 3: Quality Focus**

```
subagent_type: "oat-codebase-mapper"
model: "haiku"
run_in_background: true
description: "Map codebase conventions"
```

Prompt:
```
Focus: quality

Analyze this codebase for coding conventions and testing patterns.

Write these documents to .oat/knowledge/repo/:
- conventions.md - Code style, naming, patterns, error handling
- testing.md - Framework, structure, mocking, coverage

Use templates from .agent/skills/oat-index/references/templates/

Include frontmatter:
---
oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

Explore thoroughly. Write documents directly. Return confirmation only.
```

**Agent 4: Concerns Focus**

```
subagent_type: "oat-codebase-mapper"
model: "haiku"
run_in_background: true
description: "Map codebase concerns"
```

Prompt:
```
Focus: concerns

Analyze this codebase for technical debt, known issues, and areas of concern.

Write this document to .oat/knowledge/repo/:
- concerns.md - Tech debt, bugs, security, performance, fragile areas

Use template from .agent/skills/oat-index/references/templates/

Include frontmatter:
---
oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"
---

Explore thoroughly. Write document directly. Return confirmation only.
```

### Step 6: Wait for Agent Completion

Read each agent's output file to collect confirmations.

Expected format:
```
## Mapping Complete

**Focus:** {focus}
**Documents written:**
- `.oat/knowledge/{DOC1}.md` ({N} lines)
- `.oat/knowledge/{DOC2}.md` ({N} lines)
```

### Step 7: Verify All Documents Created

```bash
ls -la .oat/knowledge/repo/
wc -l .oat/knowledge/repo/*.md
```

**Checklist:**
- All 7 documents exist
- No empty documents (each >20 lines)
- All have frontmatter with oat_generated: true

### Step 8: Enrich Project Index

Now that all 7 detailed knowledge files exist, enrich the thin project-index.md with full details.

Read all 7 knowledge files to extract key information:
- `stack.md` - Technologies, runtime, key dependencies
- `architecture.md` - Overall pattern, key abstractions
- `structure.md` - Directory layout, file organization
- `integrations.md` - External services, APIs
- `testing.md` - Test framework, approach
- `conventions.md` - Code style, patterns
- `concerns.md` - Technical debt, issues

**Enrichment approach:**

Read existing `.oat/knowledge/repo/project-index.md` (thin version from Step 4).

Replace placeholder sections with full details:

1. **Overview**: 2-3 sentences capturing what this codebase does (from architecture.md + stack.md)
2. **Purpose**: Why it exists, problems it solves (from architecture.md intro)
3. **Technology Stack**: High-level summary (primary language, framework, key tools from stack.md)
4. **Architecture**: Brief pattern description (from architecture.md "Pattern Overview")
5. **Key Features**: 3-5 main capabilities (from architecture.md layers + integrations.md)
6. **Project Structure**: Brief directory overview (from structure.md top-level dirs)
7. **Getting Started**: Quick start from stack.md (runtime, package manager, build commands)
8. **Development Workflow**: Common commands (from stack.md + conventions.md)
9. **Testing**: Testing approach summary (from testing.md framework + run commands)
10. **Known Issues**: Link to concerns.md with 1-2 line summary

Update frontmatter:
- Change `oat_index_type: thin` → `oat_index_type: full`
- Keep same SHAs (already set in Step 4)
- Update warning: "GENERATED FILE - Do not edit manually. Regenerate with /oat:index"

Update links at bottom to show files are available (not "pending"):
```markdown
**Generated Knowledge Base Files:**
- [stack.md](stack.md) - Technologies and dependencies
- [architecture.md](architecture.md) - System design and patterns
- [structure.md](structure.md) - Directory layout
- [integrations.md](integrations.md) - External services
- [testing.md](testing.md) - Test structure and practices
- [conventions.md](conventions.md) - Code style and patterns
- [concerns.md](concerns.md) - Technical debt and issues
```

### Step 9: Verify Project Index

```bash
cat .oat/knowledge/repo/project-index.md | head -50
```

Expected: Complete overview with frontmatter and links

### Step 10: Commit Knowledge Base

```bash
git add .oat/knowledge/repo/
git commit -m "docs: generate knowledge base

- project-index.md - High-level codebase overview
- stack.md - Technologies and dependencies
- architecture.md - System design and patterns
- structure.md - Directory layout
- conventions.md - Code style and patterns
- testing.md - Test structure and practices
- integrations.md - External services and APIs
- concerns.md - Technical debt and issues

Generated from commit: {MERGE_BASE_SHA}"
```

### Step 11: Output Summary

```
Knowledge base generated in .oat/knowledge/repo/

Files created:
- project-index.md ({N} lines) - High-level overview
- stack.md ({N} lines) - Technologies and dependencies
- architecture.md ({N} lines) - System design and patterns
- structure.md ({N} lines) - Directory layout
- conventions.md ({N} lines) - Code style and patterns
- testing.md ({N} lines) - Test structure and practices
- integrations.md ({N} lines) - External services and APIs
- concerns.md ({N} lines) - Technical debt and issues

---

Next: Start a project with /new-agent-project or explore knowledge files
```

## Success Criteria

- .oat/knowledge/repo/ directory with 8 files (7 analysis + 1 index)
- All files have frontmatter with both head_sha and merge_base_sha
- Commit created with conventional format
- User presented with clear summary and next steps
