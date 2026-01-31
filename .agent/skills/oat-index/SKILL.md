---
name: oat-index
description: Generate or regenerate comprehensive knowledge base of the codebase using parallel mapper agents.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion, Task
---

# Knowledge Base Generation

Generate a comprehensive analysis of the codebase using parallel mapper agents.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   OAT ▸ INDEX
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Before multi-step work (thin index generation, spawning mappers, writing outputs), print 2–5 short step indicators, e.g.:
  - `[1/4] Checking existing knowledge…`
  - `[2/4] Generating thin index…`
  - `[3/4] Spawning mappers…`
  - `[4/4] Writing knowledge files…`
- For long-running operations (subagent runs, synthesis, large repo scans), print a start line and a completion line (duration optional).
- Keep it concise; don’t print a line for every shell command.

## Process

### Step 1: Check Existing Knowledge

```bash
# Check for actual knowledge files (not just .gitkeep)
EXISTING_MD=$(find .oat/knowledge/repo -name "*.md" -type f 2>/dev/null | head -1)
```

**If `$EXISTING_MD` is non-empty (actual content exists):**
- List current files: `ls -la .oat/knowledge/repo/*.md 2>/dev/null`
- Ask: "Refresh (delete + regenerate) or Skip?"
- If Refresh: `rm -rf .oat/knowledge/repo/*.md && mkdir -p .oat/knowledge/repo`
- If Skip: Exit

**If `$EXISTING_MD` is empty (no content or only .gitkeep):**
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
bash .oat/scripts/generate-thin-index.sh "$HEAD_SHA" "$MERGE_BASE_SHA"
```

This script:
- Detects repo name from package.json or directory
- Extracts package manager, scripts, entry points, and config files
- Generates `.oat/knowledge/repo/project-index.md` with thin metadata

**Why thin first:**
- Other skills can immediately load project-index.md for orientation
- Mappers can run in parallel without blocking on index generation
- Index gets enriched with full details after mappers complete

### Step 5: Spawn Parallel Mapper Agents

Use Task tool with `subagent_type="oat-codebase-mapper"` and `run_in_background=true`.

**Important (tool permissions / background mode):**
Some agent runtimes do not allow background subagents to use tool calls that require user permission prompts (commonly `Write` and sometimes `Bash`). When that happens, the thin `project-index.md` will be generated, but enrichment files will not.

**Default approach (most compatible):**
- Background mapper agents must be **read-only**: they should **NOT** write files or run shell commands.
- Each mapper returns the full markdown contents for its documents in its response.
- The main agent then writes those contents to `.oat/knowledge/repo/`.

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

Produce these documents:
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

Constraints:
- Do NOT use Write or Bash tools.
- Return the complete markdown contents for `stack.md` and `integrations.md` in your final response.
- Format as:
  - `--- stack.md ---` then a fenced markdown block
  - `--- integrations.md ---` then a fenced markdown block
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

Produce these documents:
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

Constraints:
- Do NOT use Write or Bash tools.
- Return the complete markdown contents for `architecture.md` and `structure.md` in your final response.
- Format as:
  - `--- architecture.md ---` then a fenced markdown block
  - `--- structure.md ---` then a fenced markdown block
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

Produce these documents:
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

Constraints:
- Do NOT use Write or Bash tools.
- Return the complete markdown contents for `conventions.md` and `testing.md` in your final response.
- Format as:
  - `--- conventions.md ---` then a fenced markdown block
  - `--- testing.md ---` then a fenced markdown block
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

Produce this document:
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

Constraints:
- Do NOT use Write or Bash tools.
- Return the complete markdown contents for `concerns.md` in your final response as:
  - `--- concerns.md ---` then a fenced markdown block
```

### Step 6: Wait for Agent Completion

Collect mapper responses.

If your environment supports background agents writing files, you may instead instruct them to write directly and skip to Step 7.

**If mappers returned markdown (recommended):**
Write the returned markdown blocks to these files:
- `.oat/knowledge/repo/stack.md`
- `.oat/knowledge/repo/integrations.md`
- `.oat/knowledge/repo/architecture.md`
- `.oat/knowledge/repo/structure.md`
- `.oat/knowledge/repo/conventions.md`
- `.oat/knowledge/repo/testing.md`
- `.oat/knowledge/repo/concerns.md`

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

### Step 12: Regenerate Dashboard

After knowledge base generation, regenerate the repo state dashboard:

```bash
if [[ -f ".oat/scripts/generate-oat-state.sh" ]]; then
  .oat/scripts/generate-oat-state.sh
fi
```

This ensures the dashboard reflects fresh knowledge status immediately.

## Success Criteria

- .oat/knowledge/repo/ directory with 8 files (7 analysis + 1 index)
- All files have frontmatter with both head_sha and merge_base_sha
- Commit created with conventional format
- User presented with clear summary and next steps
