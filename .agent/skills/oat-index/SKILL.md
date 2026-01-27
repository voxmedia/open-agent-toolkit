---
name: oat-index
description: Generate or regenerate comprehensive knowledge base of the codebase using parallel mapper agents.
---

# Knowledge Base Generation

Generate a comprehensive analysis of the codebase using parallel mapper agents.

## Process

### Step 1: Check Existing Knowledge

```bash
ls -la .oat/knowledge/ 2>/dev/null
```

**If exists:**
- List current files with timestamps
- Ask: "Refresh (delete + regenerate) or Skip?"
- If Refresh: `rm -rf .oat/knowledge/*.md && mkdir -p .oat/knowledge`
- If Skip: Exit

**If doesn't exist:**
- Continue to Step 2

### Step 2: Create Knowledge Directory

```bash
mkdir -p .oat/knowledge
```

### Step 3: Get Git SHAs for Frontmatter

```bash
# Get current HEAD SHA
HEAD_SHA=$(git rev-parse HEAD)

# Get merge base with origin/main (fallback to HEAD if not available)
MERGE_BASE_SHA=$(git merge-base HEAD origin/main 2>/dev/null || git rev-parse HEAD)
```

Store as `HEAD_SHA` and `MERGE_BASE_SHA` for frontmatter.

### Step 4: Spawn Parallel Mapper Agents

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

Write these documents to .oat/knowledge/:
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

Write these documents to .oat/knowledge/:
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

Write these documents to .oat/knowledge/:
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

Write this document to .oat/knowledge/:
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

### Step 5: Wait for Agent Completion

Read each agent's output file to collect confirmations.

Expected format:
```
## Mapping Complete

**Focus:** {focus}
**Documents written:**
- `.oat/knowledge/{DOC1}.md` ({N} lines)
- `.oat/knowledge/{DOC2}.md` ({N} lines)
```

### Step 6: Verify All Documents Created

```bash
ls -la .oat/knowledge/
wc -l .oat/knowledge/*.md
```

**Checklist:**
- All 7 documents exist
- No empty documents (each >20 lines)
- All have frontmatter with oat_generated: true

### Step 7: Generate project-index.md

Read all 7 knowledge files to extract key information.

Use template: `.oat/templates/project-index.md`

Write `.oat/knowledge/project-index.md` with:
- Frontmatter with same SHAs as other files
- High-level overview synthesized from detailed files
- Links to all 7 knowledge files

### Step 8: Verify project-index

```bash
cat .oat/knowledge/project-index.md | head -50
```

Expected: Complete overview with frontmatter and links

### Step 9: Commit Knowledge Base

```bash
git add .oat/knowledge/
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

### Step 10: Output Summary

```
Knowledge base generated in .oat/knowledge/

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

- .oat/knowledge/ directory with 8 files (7 analysis + 1 index)
- All files have frontmatter with both head_sha and merge_base_sha
- Commit created with conventional format
- User presented with clear summary and next steps
