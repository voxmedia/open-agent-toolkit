---
name: oat-repo-knowledge-index
description: Use when onboarding OAT to a repository or when knowledge artifacts are stale. Generates or refreshes the codebase knowledge index using parallel mapper agents.
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Bash(git:*), Glob, Grep, AskUserQuestion, Task
metadata:
  version: 1.3.3
---

# Knowledge Base Generation

Generate a comprehensive analysis of the codebase using parallel mapper agents.

## Progress Indicators (User-Facing)

When executing this skill, provide lightweight progress feedback so the user can tell what’s happening after they confirm.

- Print a phase banner once at start using horizontal separators, e.g.:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ CREATE REPO KNOWLEDGE INDEX
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
EXISTING_MD=$(find .oat/repo/knowledge -name "*.md" -type f 2>/dev/null | head -1)
```

**If `$EXISTING_MD` is non-empty (actual content exists):**

- List current files: `ls -la .oat/repo/knowledge/*.md 2>/dev/null`
- Ask: "Refresh generated knowledge or Skip? Hand-written files will be kept; unmarked output-name collisions stop refresh."
- If Refresh: Continue to the dispatch-route preflight, then Step 2's
  owned-output preflight; do not delete files by a wildcard.
- If Skip: Exit

**If `$EXISTING_MD` is empty (no content or only .gitkeep):**

- Continue to the dispatch-route preflight

### Dispatch-Route Preflight: Resolve Before Mutation

Resolve and authorize a usable mapper route before Step 2 deletes or writes
anything. Set `SKILL_DIR` to the absolute directory containing this loaded
`SKILL.md`. Independently probe each required `<name>/SKILL.md` in order:
`${SKILL_DIR}/..`, `${HOME}/.agents/skills`, then
`<repo-root>/.agents/skills`. Bind each first match to its own root:
`${DISPATCH_SKILLS_ROOT}` for `oat-dispatch-subagents` and
`${ORCHESTRATION_SKILLS_ROOT}` for `subagent-orchestration`; never use ambient
discovery.

On a miss, name the missing skill and stop before Step 2. Leave generated and
manual knowledge unchanged and give both intended-scope recovery commands:

```text
oat tools install utility --scope <user|project>
oat tools update --pack utility --scope <user|project>
```

Read `${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/SKILL.md`, then
`${ORCHESTRATION_SKILLS_ROOT}/subagent-orchestration/references/model-selection-principles.md`.
Resolve the active provider and read exactly one matching selection reference
from `${ORCHESTRATION_SKILLS_ROOT}/subagent-orchestration/references/`, followed
by the matching mechanics reference from
`${DISPATCH_SKILLS_ROOT}/oat-dispatch-subagents/references/`.

Verify that the active provider exposes the installed
`oat-codebase-mapper` projection. If the projection is missing, stop before
Step 2 and name that missing role. Recover the workflows pack with
`oat tools install workflows --scope <user|project>` or
`oat tools update --pack workflows --scope <user|project>`, or refresh
provider projections with `oat sync --scope all`. Do not prescribe the utility
pack for a missing mapper projection.

Classify mapper dispatch capability as `available`,
`authorization-required`, or `unresolved-or-unsupported`. If authorization is
required, ask once for all five mapper launches in this run (one write probe
and four mapper lanes), then re-probe and lock that decision. Continue only
with an available, authorized route. Declined authorization stops before Step
2 and reports the declined scope without install advice. An unresolved or
unsupported host stops before Step 2 with the provider and missing capability,
also without install advice. Do not delete generated output, create the thin
index, or launch a write probe.

Every request names role `oat-codebase-mapper`, a bounded focus and output
list, exact authority, verification evidence, deadline, retry limit, and no
post-acceptance fallback. The write probe and direct-write mapper lanes use
class `generator`; read-only response lanes use class `recon`. Launch the
installed provider projection; portable role text is instructions, not a
registered native role. Build the complete dispatch record before launch,
launch once, and retain every accepted handle through collection. A launch
surface that did not launch a child is a route failure: record the pre-start
rejection and stop before Step 2. Do not reinterpret it as read-only mode.

#### Claude route

Launch the installed Claude provider projection of `oat-codebase-mapper`
through the native Task surface. The exact Claude controls are:

```yaml
subagent_type: 'oat-codebase-mapper'
model: 'haiku'
run_in_background: true
```

Do not substitute the native `Explore` role for the installed mapper
projection in read-only mode. Preserve the accepted handle; background is
awaited, never fire-and-forget.

#### Codex route

Launch the installed Codex provider projection of `oat-codebase-mapper` as the
exact registered `agent_type` shown by the live native catalog. Preserve
model, reasoning effort, reasoning mode, service tier, fork behavior, sandbox,
and writable roots as independent controls. The direct-write probe and lanes
must have only `.oat/repo/knowledge/` writable, including `.preflight/` for the
probe; the rest of the repository remains read-only. Read-only response lanes
use a read-only sandbox. When the native surface exposes no per-spawn sandbox
override, use the prompt constraint for a read-only lane only when the dispatch
engine accepts that boundary; otherwise classify the route
`unresolved-or-unsupported`. When per-spawn writable roots cannot be narrowed,
run the probe and direct-write lanes under the projection's `workspace-write`
sandbox, constrained by the prompt to their declared outputs. A native
role-selection rejection before child start is a route failure.

#### Cursor route

Launch the installed Cursor provider projection of `oat-codebase-mapper` as
the exact agent type advertised by the current native Task/Subagent schema.
Treat that catalog as specific to this dispatcher invocation. Preserve the
exact agent type, model selector when exposed, service tier, authority, and
accepted handle. A CLI or SDK catalog does not establish native role
availability, and no alternate route may be improvised after acceptance.

#### Write-Permission Probe (all providers)

With the route resolved, run a non-mutating `lstat` check of `.oat`,
`.oat/repo`, `.oat/repo/knowledge`, and
`.oat/repo/knowledge/.preflight` before creating anything. Stop and name the
path if any existing component is a symlink or a non-directory. If
`.preflight` already exists as any file type, stop and name it; do not let
stale bytes satisfy the probe. Only after proving `.preflight` is absent,
create it fresh, then launch the bounded
write-permission
probe with class `generator` before Step 2. Its only write authority is
`.oat/repo/knowledge/.preflight/test.txt`, with content `test`; it returns
`WRITE_OK` or `WRITE_BLOCKED`. Before removing `.preflight`, require
`WRITE_OK` to coincide with `.preflight/test.txt` existing with exact content
`test`, and require `WRITE_BLOCKED` to coincide with that file being absent.
Any disagreement is a malformed result and route failure; stop before Step 2.
A verified `WRITE_OK` selects direct-write mode. The read-only fallback is
allowed only when the launched probe has a verified `WRITE_BLOCKED` and the
same resolved route can launch independently usable read-only response lanes.
Remove the exact `.preflight` directory on every probe exit path—success,
blocked write, malformed result, launch failure, or stop—before continuing or
reporting. Refuse cleanup if that exact path was replaced by a symlink. Any
missing handle, malformed result, or launch failure stops before Step 2 and
leaves existing knowledge unchanged. Retain the resolved route, authorization,
mode, and accepted probe result for the four mapper requests.

### Step 2: Prepare Only Owned Generated Outputs

Run this step only with the accepted, file-verified probe result and
`WRITE_MODE` retained by the dispatch-route preflight. Otherwise stop before
deleting anything.

Set `SKILL_DIR` to the absolute directory containing this loaded `SKILL.md`.
Resolve the repository root, then run the deterministic ownership preflight
before thin-index generation or mapper writes. It checks every expected
output name before deleting anything: an unmarked file, symlink or directory
collision stops the run and remains intact. Only regular Markdown files with
frontmatter `oat_generated: true` are removed; other files and manual notes
survive. Symlinked directories in `.oat/repo/knowledge` are refused.

```bash
REPO_ROOT=$(git rev-parse --show-toplevel) || exit 1
node "$SKILL_DIR/scripts/refresh-owned.mjs" --prepare "$REPO_ROOT" || exit 1
```

Retain the printed JSON report's exact `affectedPaths` (removed generated paths
plus the eight expected outputs) through generation and commit, including
across separate shell calls. The report is operation evidence, not a persistent
ownership manifest; no temporary report file is created. Do not broaden
ownership to the whole directory. Expected outputs are `project-index.md`,
`stack.md`, `architecture.md`, `structure.md`, `integrations.md`, `testing.md`,
`conventions.md` and `concerns.md`; mappers must write only their declared
outputs, retaining the generated frontmatter. Relocate an authored collision
only with the operator's direction, then rerun the preflight.

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
oat index init --head-sha "$HEAD_SHA" --merge-base-sha "$MERGE_BASE_SHA"
```

This script:

- Detects repo name from package.json or directory
- Extracts package manager, scripts, entry points, and config files
- Generates `.oat/repo/knowledge/project-index.md` with thin metadata

**Why thin first:**

- Other skills can immediately load project-index.md for orientation
- Mappers can run in parallel without blocking on index generation
- Index gets enriched with full details after mappers complete

### Step 4b: Reuse the Accepted Preflight Result

Do not launch another permission probe here. Reuse the resolved route,
authorization, and `WRITE_OK` or `WRITE_BLOCKED` result retained by the
dispatch-route preflight. Store the corresponding `WRITE_MODE` (`direct` or
`readonly`) for Step 5. A missing accepted probe handle or result is a route
failure, not evidence for read-only mode; stop without launching mapper lanes.

### Step 5: Spawn Parallel Mapper Agents

Use the approach determined by Step 4b pre-flight check.

**If `$WRITE_MODE="direct"` (Write works in background):**

- Use Step 5a - Direct Write Approach (recommended)

**If `$WRITE_MODE="readonly"` (Write blocked in background):**

- Use Step 5b - Read-Only Fallback Approach

---

### Step 5a: Direct Write Approach

Dispatch each provider-neutral mapper request through the resolved route and
launch the installed provider projection of `oat-codebase-mapper`.

**Approach:**

- Mapper agents write only their declared outputs with the host's file-write capability
- Each agent returns only a brief confirmation (not document contents)
- This reduces context transfer and improves performance

**Agent 1: Tech Focus**

```yaml
role: oat-codebase-mapper
class: generator
focus: tech
outputs: [stack.md, integrations.md]
authority: write-declared-outputs
```

Prompt:

```
Focus: tech

Analyze this codebase for technology stack and external integrations.

Produce these documents:
- stack.md - Languages, runtime, frameworks, dependencies, configuration
- integrations.md - External APIs, databases, auth providers, webhooks

Use templates from .agents/skills/oat-repo-knowledge-index/references/templates/

Include frontmatter:
---
oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index"
---

Instructions:
- Write only the declared documents under `.oat/repo/knowledge/` with your
  host's file-write capability
- Follow the oat-codebase-mapper agent instructions for exploration and writing
- Use templates from .agents/skills/oat-repo-knowledge-index/references/templates/
- Include frontmatter with both SHA fields in every document
- Return only a brief confirmation when done (do NOT return document contents)
```

**Agent 2: Architecture Focus**

```yaml
role: oat-codebase-mapper
class: generator
focus: arch
outputs: [architecture.md, structure.md]
authority: write-declared-outputs
```

Prompt:

```
Focus: arch

Analyze this codebase architecture and directory structure.

Produce these documents:
- architecture.md - Pattern, layers, data flow, abstractions, entry points
- structure.md - Directory layout, key locations, naming conventions

Use templates from .agents/skills/oat-repo-knowledge-index/references/templates/

Include frontmatter:
---
oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index"
---

Instructions:
- Write only the declared documents under `.oat/repo/knowledge/` with your
  host's file-write capability
- Follow the oat-codebase-mapper agent instructions for exploration and writing
- Use templates from .agents/skills/oat-repo-knowledge-index/references/templates/
- Include frontmatter with both SHA fields in every document
- Return only a brief confirmation when done (do NOT return document contents)
```

**Agent 3: Quality Focus**

```yaml
role: oat-codebase-mapper
class: generator
focus: quality
outputs: [conventions.md, testing.md]
authority: write-declared-outputs
```

Prompt:

```
Focus: quality

Analyze this codebase for coding conventions and testing patterns.

Produce these documents:
- conventions.md - Code style, naming, patterns, error handling
- testing.md - Framework, structure, mocking, coverage

Use templates from .agents/skills/oat-repo-knowledge-index/references/templates/

Include frontmatter:
---
oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index"
---

Instructions:
- Write only the declared documents under `.oat/repo/knowledge/` with your
  host's file-write capability
- Follow the oat-codebase-mapper agent instructions for exploration and writing
- Use templates from .agents/skills/oat-repo-knowledge-index/references/templates/
- Include frontmatter with both SHA fields in every document
- Return only a brief confirmation when done (do NOT return document contents)
```

**Agent 4: Concerns Focus**

```yaml
role: oat-codebase-mapper
class: generator
focus: concerns
outputs: [concerns.md]
authority: write-declared-outputs
```

Prompt:

```
Focus: concerns

Analyze this codebase for technical debt, known issues, and areas of concern.

Produce this document:
- concerns.md - Tech debt, bugs, security, performance, fragile areas

Use template from .agents/skills/oat-repo-knowledge-index/references/templates/

Include frontmatter:
---
oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index"
---

Instructions:
- Write only the declared documents under `.oat/repo/knowledge/` with your
  host's file-write capability
- Follow the oat-codebase-mapper agent instructions for exploration and writing
- Use templates from .agents/skills/oat-repo-knowledge-index/references/templates/
- Include frontmatter with both SHA fields in every document
- Return only a brief confirmation when done (do NOT return document contents)
```

---

### Step 5b: Read-Only Fallback Approach

Dispatch the same four provider-neutral mapper requests through the resolved
route with read-only authority. Each request still launches the installed
provider projection of `oat-codebase-mapper`; the provider route decides its
native controls.

**Approach:**

- Agents do not modify files or run mutating commands
- Agents return complete markdown contents in their response
- Orchestrator extracts markdown and writes files
- More compatible but larger context transfer

**Agent 1: Tech Focus**

````
role: oat-codebase-mapper
class: recon
focus: tech
outputs: [stack.md, integrations.md]
authority: read-only-response

Prompt:
Focus: tech

Analyze this codebase for technology stack and external integrations.

Produce these documents:
- stack.md - Languages, runtime, frameworks, dependencies, configuration
- integrations.md - External APIs, databases, auth providers, webhooks

Use templates from .agents/skills/oat-repo-knowledge-index/references/templates/

Include frontmatter:
---
oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index"
---

Constraints:
- Do not modify files or run mutating commands.
- Return the complete markdown contents in your final response.
- Format as:

--- stack.md ---
```markdown
<content here>
```

--- integrations.md ---

```markdown
<content here>
```

````

**Agent 2: Architecture Focus**

````

role: oat-codebase-mapper
class: recon
focus: arch
outputs: [architecture.md, structure.md]
authority: read-only-response

Prompt:
Focus: arch

Analyze this codebase architecture and directory structure.

Produce these documents:

- architecture.md - Pattern, layers, data flow, abstractions, entry points
- structure.md - Directory layout, key locations, naming conventions

Use templates from .agents/skills/oat-repo-knowledge-index/references/templates/

## Include frontmatter:

oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index"

---

Constraints:

- Do not modify files or run mutating commands.
- Return the complete markdown contents in your final response.
- Format as:

--- architecture.md ---

```markdown
<content here>
```

--- structure.md ---

```markdown
<content here>
```

````

**Agent 3: Quality Focus**

````

role: oat-codebase-mapper
class: recon
focus: quality
outputs: [conventions.md, testing.md]
authority: read-only-response

Prompt:
Focus: quality

Analyze this codebase for coding conventions and testing patterns.

Produce these documents:

- conventions.md - Code style, naming, patterns, error handling
- testing.md - Framework, structure, mocking, coverage

Use templates from .agents/skills/oat-repo-knowledge-index/references/templates/

## Include frontmatter:

oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index"

---

Constraints:

- Do not modify files or run mutating commands.
- Return the complete markdown contents in your final response.
- Format as:

--- conventions.md ---

```markdown
<content here>
```

--- testing.md ---

```markdown
<content here>
```

````

**Agent 4: Concerns Focus**

````

role: oat-codebase-mapper
class: recon
focus: concerns
outputs: [concerns.md]
authority: read-only-response

Prompt:
Focus: concerns

Analyze this codebase for technical debt, known issues, and areas of concern.

Produce this document:

- concerns.md - Tech debt, bugs, security, performance, fragile areas

Use template from .agents/skills/oat-repo-knowledge-index/references/templates/

## Include frontmatter:

oat_generated: true
oat_generated_at: {today}
oat_source_head_sha: {HEAD_SHA}
oat_source_main_merge_base_sha: {MERGE_BASE_SHA}
oat_warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index"

---

Constraints:

- Do not modify files or run mutating commands.
- Return the complete markdown contents in your final response.
- Format as:

--- concerns.md ---

```markdown
<content here>
```

````

---

### Step 6: Wait for Agent Completion

**If using Step 5a (direct write):**

- Wait for all 4 mapper agents to complete
- Each agent writes documents directly to `.oat/repo/knowledge/` and returns a brief confirmation
- Expected confirmations should indicate which documents were written
- Proceed to Step 7

**If using Step 5b (read-only):**

- Wait for all 4 mapper agents to complete
- Each agent returns markdown content in their response
- Proceed to Step 6b to extract and write files

### Step 6b: Extract and Write Files (Read-Only Mode Only)

If using read-only mode, collect each accepted handle through the dispatch
engine. Save each accepted handle's returned output text verbatim to a
distinct scratch file outside the repository, retaining the handle-to-path
mapping. Never guess a provider transcript path and never splice returned text
into source code.

Pass the four exact scratch paths as arguments, in lane order, to Python:

````python
import re
import sys
from pathlib import Path

if len(sys.argv) != 5:
    raise RuntimeError('expected four accepted-handle scratch paths')

outputs = [
    ['stack.md', 'integrations.md'],
    ['architecture.md', 'structure.md'],
    ['conventions.md', 'testing.md'],
    ['concerns.md'],
]

for output_path, files in zip(sys.argv[1:], outputs, strict=True):
    text = Path(output_path).read_text(encoding='utf8')
    pattern = r'---\s+(\w+\.md)\s+---\s*\n\s*```markdown\n(.*?)\n```'
    matches = re.findall(pattern, text, re.DOTALL)
    if not matches:
        alt_pattern = r'##\s+(\w+\.md)\s*\n\s*```markdown\n(.*?)\n```'
        matches = re.findall(alt_pattern, text, re.DOTALL)

    expected = set(files)
    actual = {filename for filename, _ in matches}
    if actual != expected:
        raise RuntimeError(f'accepted handle returned {actual}, expected {expected}')

    for filename, markdown in matches:
        with open(f'.oat/repo/knowledge/{filename}', 'w') as out:
            out.write(markdown)
        print(f"✓ Wrote {filename}")
````

This extracts markdown and writes all 7 knowledge files. Remove the four
scratch files after successful extraction or on any failure.

### Step 7: Verify All Documents Created

```bash
ls -la .oat/repo/knowledge/
wc -l .oat/repo/knowledge/*.md
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

Read existing `.oat/repo/knowledge/project-index.md` (thin version from Step 4).

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
- Update warning: "GENERATED FILE - Do not edit manually. Regenerate with oat-repo-knowledge-index"

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
cat .oat/repo/knowledge/project-index.md | head -50
```

Expected: Complete overview with frontmatter and links

Immediately before Step 10, run
`git status --porcelain --untracked-files=all`. If it reports any path outside
`.oat/repo/knowledge/`, stop and name every such path; do not commit. This
stray-change check is mandatory when Codex probe or direct-write lanes used
the projection's `workspace-write` sandbox.

### Step 10: Commit Only Generated Knowledge Paths

Verify all eight generated outputs, then format their existing supported text
using the repository's documented write command. Retain removed tracked
generated paths from the preparation report, including filenames outside the
current eight-output set. Resolve the repository root again with
`git rev-parse --show-toplevel`, then convert the report's absolute paths to
literal repository-relative files using that root, deduplicate them, and populate
the next shell call's positional arguments; the snippet below initializes
`KNOWLEDGE_OWNED_FILES` from that retained exact array. Resolve `SKILL_DIR` again
in each shell call rather than relying on prior shell variables. Omit a removed
path only if Git proves it was never tracked; never omit a tracked generated
deletion. Do not add manual files,
collisions or the tracking/dashboard files below to this commit.

```bash
REPO_ROOT=$(git rev-parse --show-toplevel) || exit 1
KNOWLEDGE_OWNED_FILES=("$@")
[ "${#KNOWLEDGE_OWNED_FILES[@]}" -gt 0 ] || { echo "Missing retained knowledge affectedPaths; refusing to commit" >&2; exit 1; }
node "$SKILL_DIR/scripts/refresh-owned.mjs" --verify "$REPO_ROOT" || exit 1
oat internal commit-paths --help || exit 1
# KNOWLEDGE_OWNED_FILES is the exact retained affectedPaths list after verification.
# Format existing generated text members using the repository write command.
oat internal commit-paths --identity "${COMMIT_IDENTITY:?set once and retain for retries}:knowledge-index" --message "docs: generate knowledge base from $MERGE_BASE_SHA" -- "${KNOWLEDGE_OWNED_FILES[@]}" || exit 1
```

Set a unique `COMMIT_IDENTITY` before the first commit attempt and retain the
identity, message and literal file list for retries. If the shared command is
unavailable, stop and update the CLI; a blocked/failed result stops this run
and retains its receipt for the reported recovery. Hooks stay enabled;
unrelated staged entries and unstaged bytes remain preserved. Verify the
owned paths match the committed hook-final content before proceeding.

### Step 10b: Update Tracking Manifest

Record the knowledge index run in the shared tracking manifest:

```bash
# Set SKILL_DIR to the absolute directory containing this loaded SKILL.md.
SCOPE_ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"
TRACKING_SCRIPT="$SCOPE_ROOT/.oat/scripts/resolve-tracking.sh"
ROOT_TARGET=$(bash "$TRACKING_SCRIPT" root)
ROOT_HASH=$(echo "$ROOT_TARGET" | jq -r '.commitHash')
ROOT_BRANCH=$(echo "$ROOT_TARGET" | jq -r '.baseBranch')

bash "$TRACKING_SCRIPT" \
  write knowledgeIndex "$ROOT_HASH" "$ROOT_BRANCH" full \
  --artifact-path ".oat/repo/knowledge/"
```

This enables delta mode for future runs — other OAT operations can check when the knowledge index was last generated.

### Step 11: Output Summary

```
Knowledge base generated in .oat/repo/knowledge/

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

Next: Start a project with oat-project-new or explore knowledge files
```

### Step 12: Regenerate Dashboard

After knowledge base generation, regenerate the repo state dashboard:

```bash
oat state refresh
```

This ensures the dashboard reflects fresh knowledge status immediately.

## Success Criteria

- .oat/repo/knowledge/ directory with 8 files (7 analysis + 1 index)
- All files have frontmatter with both head_sha and merge_base_sha
- Commit created with conventional format
- User presented with clear summary and next steps
