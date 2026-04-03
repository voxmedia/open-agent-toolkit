---
name: oat-project-document
version: 1.0.1
description: Run when implementation is complete and documentation needs updating. Analyzes project artifacts to produce documentation update recommendations, then applies approved changes before project completion.
argument-hint: '[project-path] [--auto]'
disable-model-invocation: true
user-invocable: true
allowed-tools: Read, Write, Edit, Bash(git:*), Glob, Grep, AskUserQuestion
---

# Project Documentation Sync

Read project artifacts and implementation code to identify documentation surfaces that need updating, present a delta plan for approval, and apply changes — all in a single invocation.

## Prerequisites

**Required:**

- Active OAT project (or explicit project path) with at least `plan.md` or `implementation.md`
- Project should have completed some implementation work (artifacts describe what was built)

## Mode Assertion

**OAT MODE: Project Document**

**Purpose:** Analyze what a project built, identify documentation gaps, and apply approved documentation updates.

## Progress Indicators (User-Facing)

- Print a phase banner once at start:

  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  OAT ▸ PROJECT DOCUMENT
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- For each step, announce a compact header:
  - `OAT ▸ DOCUMENT — Step N: {step_name}`
- Before multi-step work:
  - `[1/N] {action}…`
- Keep it concise; don't print a line for every shell command.

**BLOCKED Activities:**

- No modifying implementation source code
- No modifying project phase state (except `oat_docs_updated` in state.md)
- No deleting or restructuring existing documentation without user approval
- No creating documentation content that contradicts source code

**ALLOWED Activities:**

- Reading all project artifacts (discovery.md, spec.md, design.md, plan.md, implementation.md)
- Reading source code referenced in artifacts
- Scanning all documentation and instruction surfaces
- Writing/editing documentation files (after approval or with --auto)
- Creating new documentation files and directories
- Editing docs tooling config (e.g., mkdocs.yml nav) for new files
- Updating `oat_docs_updated` in state.md

**Self-Correction Protocol:**
If you catch yourself:

- Modifying source code → STOP (this skill only writes documentation)
- Inventing documentation without evidence → STOP (every recommendation needs artifact/code evidence)
- Changing project phase or task state → STOP (only `oat_docs_updated` is allowed)

**Recovery:**

1. Acknowledge the deviation
2. Return to current step
3. Ask user for guidance

## Argument Parsing

Parse `$ARGUMENTS` for:

1. **`--auto` flag:** If present, skip user approval and apply all recommendations directly.

   ```
   AUTO_MODE=false
   if echo "$ARGUMENTS" | grep -q '\-\-auto'; then
     AUTO_MODE=true
   fi
   ```

2. **`project-path`:** Any non-flag argument is treated as an explicit project path.
   ```
   PROJECT_ARG=$(echo "$ARGUMENTS" | sed 's/--auto//g' | xargs)
   ```

## Process

### Step 0: Resolve Project Context

OAT stores active project context in `.oat/config.local.json` (`activeProject`, local-only).

```bash
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
```

**Resolution order:**

1. If `$PROJECT_ARG` is provided, use it as `$PROJECT_PATH`
2. Else if `activeProject` is set in config, use that
3. If neither available, use `AskUserQuestion` to ask: "No active project found. Please provide the path to the project directory (e.g., `.oat/projects/shared/my-project`)."

**Validation:**

- Verify `$PROJECT_PATH/state.md` exists
- Verify at least one of `plan.md` or `implementation.md` exists (need to know what was built)
- If validation fails, report the error and STOP

Derive `{project-name}` as the directory name: `basename "$PROJECT_PATH"`.

**Documentation config resolution:**

Read documentation config from `.oat/config.json`:

```bash
DOCS_ROOT=$(oat config get documentation.root 2>/dev/null || true)
DOCS_TOOLING=$(oat config get documentation.tooling 2>/dev/null || true)
DOCS_CONFIG=$(oat config get documentation.config 2>/dev/null || true)
```

If `$DOCS_ROOT` is empty, attempt auto-detection:

1. Look for `mkdocs.yml` — if found, set `DOCS_TOOLING=mkdocs` and infer `DOCS_ROOT` from the `docs_dir` field (or default to `docs/` relative to the mkdocs.yml location), set `DOCS_CONFIG` to the mkdocs.yml path
2. Look for `docusaurus.config.js` or `docusaurus.config.ts` — if found, set `DOCS_TOOLING=docusaurus`, infer `DOCS_ROOT` from config
3. Look for `conf.py` (Sphinx) — if found, set `DOCS_TOOLING=sphinx`
4. Look for a top-level `docs/` directory — if found, set `DOCS_ROOT=docs`
5. If nothing found, `DOCS_ROOT` remains empty (docs directory scanning will be skipped)

For auto-detection, use Glob to scan from repo root:

```
Glob: **/mkdocs.yml (exclude node_modules, .oat, dist)
Glob: **/docusaurus.config.{js,ts}
```

Store resolved values for use in later steps. Do not write auto-detected values to config.

### Step 1: Read Project Artifacts

Read all available project artifacts to build an understanding of what was built.

**Read in order:**

1. `$PROJECT_PATH/discovery.md` — initial requirements, key decisions, constraints
2. `$PROJECT_PATH/spec.md` (if exists) — formal requirements, acceptance criteria
3. `$PROJECT_PATH/design.md` (if exists) — architecture, components, data models, integration points
4. `$PROJECT_PATH/plan.md` — phases, tasks, file lists, commit messages
5. `$PROJECT_PATH/implementation.md` — execution log, outcomes, files changed, decisions

**Synthesize a "what was built" model:**

From the artifacts, extract and organize:

- **Features and capabilities added** — what can users/developers now do that they couldn't before?
- **Architectural decisions** — new patterns, component boundaries, data flow changes
- **New frameworks, tooling, or libraries** — dependencies added, build tool changes, test frameworks
- **New CLI commands or config schema changes** — new user-facing commands, config keys, options
- **New directories or structural changes** — new packages, apps, or significant directory reorganization
- **API changes** — new endpoints, modified interfaces, changed contracts

**Note source file references:**

While reading artifacts, collect all source file paths mentioned in:

- Plan task `**Files:**` sections (Create/Modify entries)
- Implementation.md `**Files changed:**` entries
- Design component interfaces and data models

These will be verified against actual code in Step 2.

**Handle missing artifacts gracefully:**

- Quick-mode projects may lack spec.md and design.md — extract what's available
- If only plan.md exists (no implementation.md), the project may not have started implementation yet — still proceed, but note that documentation recommendations will be based on planned work rather than verified implementation

### Step 2: Verify Against Code

Read source files referenced in artifacts to confirm what actually shipped.

**For each referenced source file:**

1. Check if the file exists (it may have been renamed or deleted since the plan was written)
2. Read the file to verify artifact claims:
   - Do described APIs/commands/config schemas actually exist?
   - Were architectural patterns from design.md followed?
   - Are there implementation details not captured in artifacts?

**Augment the model:**

- Add code-verified details that artifacts didn't capture
- Note any discrepancies between artifacts and code (informational — include in delta plan as context, not as blocking issues)

**Scope control:**

- Focus on files directly referenced in artifacts — don't scan the entire codebase
- If artifacts reference many files (>20), prioritize: new files first, then modified files with the most changes
- Read file contents, not just check existence — the skill needs to understand what the code does to make good documentation recommendations

### Step 3: Discover Documentation Surfaces

Scan the repository for all documentation and instruction surfaces.

**3a. Documentation surfaces (primary — thorough analysis):**

1. **Docs directory** (if `$DOCS_ROOT` is set):
   - Read the docs tooling config (e.g., `$DOCS_CONFIG`) to understand nav structure
   - List all files in `$DOCS_ROOT` recursively
   - Read existing docs files that could be affected by the project

2. **Root README.md:**
   - Always check — read current content

3. **Subdirectory README.md files:**
   - Glob `**/README.md` (exclude `node_modules`, `.oat`, `dist`, `.worktrees`)
   - Read existing ones that are in directories affected by the project
   - Note directories for new apps/packages that lack a README

4. **Reference files:**
   - Check `.oat/repo/reference/` directory
   - Read: `current-state.md`, `backlog/index.md`, `backlog/completed.md`, `roadmap.md`, `decision-record.md`, and relevant `backlog/items/*.md` files as needed (whichever exist)

**3b. Instruction surfaces (secondary — strong signals only):**

1. **Root AGENTS.md / CLAUDE.md:**
   - Always check — read current content

2. **Subdirectory AGENTS.md files:**
   - Glob `**/AGENTS.md` (exclude `node_modules`, `.oat`, `dist`, `.worktrees`)
   - Read ones in directories affected by the project

3. **Provider rules files:**
   - Check `.oat/sync/config.json` for enabled providers
   - For each enabled provider, check its rules directory:
     - Claude: `.claude/rules/`
     - Cursor: `.cursor/rules/`
     - Copilot: `.github/copilot-instructions.md`
     - Gemini: `.gemini/rules/`
   - Read existing rules files that may need updating

**Store surface inventory** for use in Step 4. For each surface, record:

- File path (existing or potential)
- Surface type (docs | readme | reference | agents | provider-rules)
- Current content summary (for existing files)
- Whether it's in a directory affected by the project

### Step 4: Assess Documentation Delta

Compare "what was built" (from Steps 1-2) against "what's documented" (from Step 3) to produce recommendations.

**4a. Documentation surface assessment:**

For each documentation surface relevant to the project, determine one of:

- **UPDATE:** Existing doc needs content changes. Specify:
  - What content to add/modify
  - Where in the file it should go
  - Why (evidence from artifacts/code)

- **CREATE:** No existing doc covers this area. Specify:
  - Proposed file path
  - Proposed content outline (section headings, key points)
  - Why this warrants a new file (evidence)

- **SPLIT:** Existing doc would become too large with additions. Specify:
  - Current file path and approximate size
  - Proposed split structure (which content moves where)
  - Why splitting is recommended (file would exceed ~300 lines, or logical separation warrants it)

- **No change:** Surface is already accurate — skip from delta plan.

**4b. Instruction surface assessment (strong signals only):**

Only recommend instruction changes when there is a clear trigger:

| Signal                              | Example                             | Recommendation                             |
| ----------------------------------- | ----------------------------------- | ------------------------------------------ |
| New test framework                  | vitest added to devDependencies     | Create test rules for enabled providers    |
| New styling/component library       | tailwind, storybook added           | Create styling rules for enabled providers |
| New build tooling                   | different bundler, new build step   | Update AGENTS.md development commands      |
| New directory with complex patterns | new package with unique conventions | Create subdirectory AGENTS.md              |
| New dev commands                    | new CLI commands, scripts           | Update root AGENTS.md                      |

If no strong signal is present for an instruction surface, skip it.

**4c. Per recommendation, capture:**

```
- Target: {file path — existing or proposed}
- Action: {UPDATE | CREATE | SPLIT}
- Summary: {1-2 sentences on what changes and why}
- Evidence: {artifact reference — e.g., "spec.md §3", "plan.md p02-t03", "implementation.md p01-t01 outcome"}
- Content guidance: {specific content to add or outline for new files}
```

### Step 5: Present Delta Plan

Format and present the recommendations for user approval.

**5a. Format output:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 OAT ▸ PROJECT DOCUMENT — Delta Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Documentation Updates ({N} recommendations)

1. {ACTION}  {target file path}
   {Summary of what changes and why}
   Evidence: {artifact/code reference}

2. {ACTION}  {target file path}
   {Summary}
   Evidence: {reference}

## Instruction Updates ({N} recommendations)

3. {ACTION}  {target file path}
   {Summary}
   Evidence: {reference}
```

**5b. Handle edge cases:**

- If `$AUTO_MODE` is true: skip to Step 6 (apply all recommendations)
- If no recommendations found: report "No documentation updates identified for this project.", set `oat_docs_updated: complete` in state.md, and exit
- If only instruction recommendations (no docs): still present, but note the documentation-first priority

**5c. Interactive approval:**

```
Approve recommendations?
  [Y]es — apply all
  [I]ndividual — approve/reject each one
  [S]kip — skip documentation updates
```

- **Yes:** mark all recommendations as approved
- **Individual:** present each recommendation one at a time with approve/reject
- **Skip:** set `oat_docs_updated: skipped` and `oat_project_state_updated: "{ISO 8601 UTC timestamp}"` in `$PROJECT_PATH/state.md` frontmatter, commit the state change, and exit without applying documentation changes

Track which recommendations were approved for Step 6.

### Step 6: Apply Approved Changes

Execute the approved documentation updates.

**For each approved recommendation:**

1. **UPDATE:**
   - Read the target file
   - Edit the file to add/modify content as specified in the recommendation
   - Preserve existing content structure — insert new sections or update existing ones

2. **CREATE:**
   - Create parent directories if needed (`mkdir -p`)
   - Write the new file with the content outlined in the recommendation
   - For docs directory files: follow the existing docs conventions (e.g., index.md structure for MkDocs)

3. **SPLIT:**
   - Create the new file with the content being moved
   - Edit the original file to remove the moved content
   - Add a cross-reference in the original file pointing to the new location
   - If the original had sections that logically separate, use section headings as split boundaries

**Nav structure updates:**

If `$DOCS_CONFIG` exists and new files were created in the docs directory:

- Read the tooling config (e.g., mkdocs.yml)
- Add new entries to the nav structure in the appropriate location
- Preserve existing nav order

**Error handling:**

- Track a `$ALL_SUCCEEDED` flag (default: true). If any file write fails, set `$ALL_SUCCEEDED` to false, log the error, and continue with remaining recommendations
- At the end, report any failures with the specific files that could not be written

### Step 7: Commit and Update State

**7a. Stage and commit documentation changes:**

```bash
git add {list of changed/created documentation files}
git diff --cached --quiet || git commit -m "docs({project-name}): update documentation from project artifacts"
```

Only stage files that were actually changed or created in Step 6. Do not use `git add -A`.

**7b. Update project state:**

Update `$PROJECT_PATH/state.md` frontmatter based on apply outcome:

- If `$ALL_SUCCEEDED` is true: set `oat_docs_updated: complete` and `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`
- If `$ALL_SUCCEEDED` is false: do **not** set `oat_docs_updated: complete` — leave the field as `null` so the skill can be re-run. Still set `oat_project_state_updated: "{ISO 8601 UTC timestamp}"`. Surface the failures clearly in the summary report (Step 7d) so the user knows which updates failed and why.

```bash
git add "$PROJECT_PATH/state.md"
git diff --cached --quiet || git commit -m "chore({project-name}): mark docs updated"
```

**7c. Handle edge cases:**

- If user explicitly skipped (chose [S]kip in Step 5): `oat_docs_updated` was already set to `skipped` in Step 5. No further state update needed here.
- If no recommendations were found: set `oat_docs_updated: complete` (nothing to do is still "done").
- If `--auto` mode: apply all, commit, set state — no user interaction.

**7d. Report summary:**

If `$ALL_SUCCEEDED` is true:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 OAT ▸ PROJECT DOCUMENT — Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Documentation sync complete for {project-name}.

  Updated: {N} files
  Created: {N} files
  Split:   {N} files

Commit: {sha}
State:  oat_docs_updated = complete

Next steps:
  - oat-project-complete → close out the project
  - Review changes before pushing
```

If `$ALL_SUCCEEDED` is false:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 OAT ▸ PROJECT DOCUMENT — Partial Failure
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Documentation sync partially failed for {project-name}.

  Succeeded: {N} files
  Failed:    {N} files
    - {path}: {error reason}

Commit: {sha} (successful changes only)
State:  oat_docs_updated NOT set (re-run to retry)

Next steps:
  - Investigate and fix the failed writes
  - Re-run oat-project-document to complete the sync
```

## Success Criteria

- All documentation surfaces relevant to the project are scanned
- Recommendations are evidence-based (every recommendation cites artifact/code sources)
- Interactive approval flow works correctly (all/individual/skip)
- `--auto` mode applies all changes without user interaction
- New files and splits are handled correctly
- Docs tooling nav is updated when applicable
- `oat_docs_updated` state is set correctly in all paths
- Skill works on both active and completed/archived projects
- Skill does not modify source code or project phase state (except `oat_docs_updated`)
