---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-03-08
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ["p06"]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: oat-project-document

> Execute this plan using `oat-project-implement` (sequential), with phase checkpoints and review gates.

**Goal:** Create a self-contained OAT skill that reads project artifacts and implementation code to identify documentation surfaces needing updates, presents a delta plan for approval, and applies changes — all in a single invocation.

**Architecture:** Single SKILL.md file following the standard OAT skill pattern. Reads project artifacts and code as inputs, scans documentation/instruction surfaces, produces recommendations, and applies approved changes. Integrates with oat-project-complete via `oat_docs_updated` state field.

**Tech Stack:** SKILL.md (agent instructions), Bash (git operations)

**Commit Convention:** `feat(pNN-tNN): {description}` — e.g., `feat(p01-t01): add oat-project-document skill skeleton`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter (none — quick mode)

---

## Phase 1: Skill Skeleton and Project Resolution

### Task p01-t01: Create skill directory and SKILL.md skeleton

**Files:**
- Create: `.agents/skills/oat-project-document/SKILL.md`

**Steps:**

1. Create the skill directory `.agents/skills/oat-project-document/`
2. Write `SKILL.md` with standard frontmatter:
   - `name: oat-project-document`
   - `version: 1.0.0`
   - `description: Analyze project artifacts and implementation to produce documentation update recommendations, then apply approved changes.`
   - `argument-hint: "[project-path] [--auto]"`
   - `disable-model-invocation: true`
   - `user-invocable: true`
   - `allowed-tools: Read, Write, Edit, Bash(git:*), Glob, Grep, AskUserQuestion`
3. Add mode assertion block (OAT MODE: Project Document), progress indicator guidance, and blocked/allowed activities:
   - Blocked: implementation code changes, project phase mutation (except `oat_docs_updated`)
   - Allowed: reading artifacts and code, scanning surfaces, writing documentation files, creating new doc files, editing existing docs
4. Add argument parsing section — extract `project-path` and `--auto` flag from `$ARGUMENTS`

**Verify:**
- File exists with valid frontmatter
- `pnpm lint` passes

**Commit:**
```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "feat(p01-t01): add oat-project-document skill skeleton"
```

---

### Task p01-t02: Implement project resolution (Step 0)

**Files:**
- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Steps:**

Write Step 0 (Resolve Project Context):

1. If `project-path` argument provided, use it directly as `$PROJECT_PATH`
2. Else read `activeProject` from `.oat/config.local.json` via `oat config get activeProject`
3. If neither available, use `AskUserQuestion` to prompt for a project path
4. Validate: `$PROJECT_PATH/state.md` exists
5. Validate: at least one of `plan.md` or `implementation.md` exists (need to know what was built)
6. Read `documentation` config from `.oat/config.json` if present (root, tooling, config fields)
7. If no documentation config, attempt auto-detection: scan for `mkdocs.yml`, `docusaurus.config.js`, `conf.py`, `docs/` directory
8. Store resolved docs config for use in later steps

**Verify:**
- Step handles all three resolution paths (argument, active project, user prompt)
- Validation gates prevent proceeding without required artifacts

**Commit:**
```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "feat(p01-t02): implement project resolution and docs config detection"
```

---

## Phase 2: Artifact Analysis and Code Verification

### Task p02-t01: Implement artifact reading (Step 1)

**Files:**
- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Steps:**

Write Step 1 (Read Project Artifacts):

1. Read all available project artifacts in order: `discovery.md`, `spec.md` (if exists), `design.md` (if exists), `plan.md`, `implementation.md`
2. Synthesize a "what was built" understanding covering:
   - Features and capabilities added
   - Architectural decisions made
   - New frameworks, tooling, or libraries introduced
   - New CLI commands or config schema changes
   - New directories or structural changes
   - API changes or additions
3. Note which source files are referenced in artifacts (plan task file lists, implementation.md file changes) for code verification in Step 2
4. Handle gracefully when artifacts are thin (quick-mode projects may lack spec/design) — extract what's available without failing

**Verify:**
- Step reads all available artifacts and handles missing ones
- Produces a clear synthesis of what the project accomplished

**Commit:**
```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "feat(p02-t01): implement artifact reading and synthesis"
```

---

### Task p02-t02: Implement code verification (Step 2)

**Files:**
- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Steps:**

Write Step 2 (Verify Against Code):

1. Read source files referenced in artifacts to confirm what actually shipped
2. Cross-reference artifact claims against implementation reality:
   - Do the described APIs/commands/config actually exist in code?
   - Were the architectural patterns described in design actually followed?
   - Are there notable implementation details not captured in artifacts?
3. Augment the "what was built" model with code-verified details
4. Flag any discrepancies between artifacts and code (informational, not blocking)

**Verify:**
- Step reads relevant source files and grounds understanding in code
- Handles cases where referenced files don't exist (deleted, renamed)

**Commit:**
```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "feat(p02-t02): implement code verification step"
```

---

## Phase 3: Surface Scanning and Delta Assessment

### Task p03-t01: Implement documentation surface scanning (Step 3)

**Files:**
- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Steps:**

Write Step 3 (Discover Documentation Surfaces):

1. **Documentation surfaces (primary — thorough analysis):**
   - Docs directory: use `documentation.root` from config or auto-detected path; read tooling config for nav structure if available
   - Root `README.md`: always check
   - Subdirectory `README.md` files: glob `**/README.md`, assess existing ones for relevance to project; flag missing ones for new apps/packages in monorepos
   - Reference files: check `.oat/repo/reference/` for `current-state.md`, `backlog.md`, `roadmap.md`, `decision-record.md`

2. **Instruction surfaces (secondary — strong signals only):**
   - Root `AGENTS.md` / `CLAUDE.md`: always check
   - Subdirectory `AGENTS.md` files: glob `**/AGENTS.md`
   - Provider rules: check enabled providers via `.oat/sync/config.json`; scan `.cursor/rules/`, `.claude/rules/`, `.github/copilot-instructions.md`, etc.

3. Read content of discovered surfaces (existing files only) to understand current documentation state

**Verify:**
- Step discovers all surface types
- Handles missing surfaces gracefully (no docs directory, no reference files, etc.)

**Commit:**
```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "feat(p03-t01): implement documentation surface scanning"
```

---

### Task p03-t02: Implement delta assessment (Step 4)

**Files:**
- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Steps:**

Write Step 4 (Assess Documentation Delta):

1. For each documentation surface relevant to what the project built, determine one of:
   - **UPDATE:** existing doc needs content changes to reflect new behavior/features
   - **CREATE:** no existing doc covers this area — recommend new file/directory with proposed path
   - **SPLIT:** existing doc would become too large with additions — recommend breaking it up with proposed file structure
   - **No change:** surface is already accurate (skip from delta plan)

2. For instruction surfaces, only recommend changes when strong signals are present:
   - New test framework → test rules files for enabled providers
   - New styling library or component framework → relevant rules
   - New directory that warrants agent instructions → AGENTS.md
   - New dev commands, build changes, architectural conventions → root AGENTS.md/CLAUDE.md

3. Per recommendation, capture:
   - Target file (existing path or proposed new path)
   - Action type (UPDATE / CREATE / SPLIT)
   - Summary of what changes and why
   - Evidence (which artifact or code drove the recommendation)

**Verify:**
- Step produces actionable recommendations with evidence
- Instruction surfaces only get recommendations on strong signals
- CREATE and SPLIT recommendations include proposed file paths

**Commit:**
```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "feat(p03-t02): implement delta assessment with update/create/split logic"
```

---

## Phase 4: Approval, Apply, and State Updates

### Task p04-t01: Implement approval gate and delta plan presentation (Step 5)

**Files:**
- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Steps:**

Write Step 5 (Present Delta Plan):

1. Format delta plan output grouped by type:
   - Documentation Updates section (numbered list)
   - Instruction Updates section (numbered list, if any)
   - Each entry shows: action type, target file, summary, evidence
2. Follow standard OAT progress banner format
3. If `--auto` flag is set, skip to Step 6 (apply all)
4. If no recommendations found, report "No documentation updates identified", set `oat_docs_updated: complete`, and exit
5. Interactive approval options:
   - **[Y]es** — approve all recommendations
   - **[I]ndividual** — approve/reject each recommendation one by one
   - **[S]kip** — skip documentation updates entirely (does not set state)
6. Track which recommendations were approved for Step 6

**Verify:**
- Output follows OAT progress indicator convention
- All three approval paths work (all, individual, skip)
- `--auto` correctly bypasses approval

**Commit:**
```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "feat(p04-t01): implement approval gate and delta plan presentation"
```

---

### Task p04-t02: Implement change application (Step 6)

**Files:**
- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Steps:**

Write Step 6 (Apply Approved Changes):

1. For each approved recommendation, execute the appropriate action:
   - **UPDATE:** edit existing file to add/modify content
   - **CREATE:** create new file (and parent directories if needed) with recommended content
   - **SPLIT:** create new file with split content, update original file to remove moved content and add cross-reference
2. If docs tooling config exists (e.g., mkdocs.yml), update nav structure for new files
3. Handle errors gracefully — if a file write fails, log and continue with remaining recommendations

**Verify:**
- All three action types (update, create, split) are handled
- Nav structure updates work when tooling config is present
- Errors don't halt the entire apply step

**Commit:**
```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "feat(p04-t02): implement change application for update/create/split"
```

---

### Task p04-t03: Implement commit and state update (Step 7)

**Files:**
- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Steps:**

Write Step 7 (Commit and Update State):

1. Stage all documentation changes via `git add`
2. Commit with message: `docs({project-name}): update documentation from project artifacts`
3. Update `$PROJECT_PATH/state.md` frontmatter: set `oat_docs_updated: complete`
4. Commit state update: `chore({project-name}): mark docs updated`
5. Report summary: number of files updated, created, split

If no changes were applied (all skipped or no recommendations):
- If user explicitly skipped → do not set `oat_docs_updated` (leave as null for future re-runs)
- If no recommendations found → set `oat_docs_updated: complete`

**Verify:**
- Commits are created with correct convention
- State update is persisted
- Summary report is accurate

**Commit:**
```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "feat(p04-t03): implement commit and state update step"
```

---

## Phase 5: Config Schema and Integration

### Task p05-t01: Add documentation config schema support

**Files:**
- Modify: `packages/cli/src/commands/config/` (relevant config files)
- Modify: `.oat/config.json` (add documentation section schema)

**Steps:**

1. Add `documentation` section to the OAT config schema:
   ```json
   "documentation": {
     "root": "",
     "tooling": "",
     "config": "",
     "requireForProjectCompletion": false
   }
   ```
2. Ensure `oat config get documentation.root` (and other subkeys) work via the CLI
3. All fields optional, all paths relative to repo root

**Verify:**
- `pnpm run cli -- config get documentation.root` returns the configured value (or empty)
- `pnpm run cli -- config get documentation.requireForProjectCompletion` returns false by default
- `pnpm type-check` passes

**Commit:**
```bash
git add packages/cli/src/commands/config/ .oat/config.json
git commit -m "feat(p05-t01): add documentation config schema support"
```

---

### Task p05-t02: Add oat_docs_updated to state.md template

**Files:**
- Modify: `.oat/templates/state.md`
- Modify: `packages/cli/assets/templates/state.md`

**Steps:**

1. Add `oat_docs_updated: null` to the default state.md frontmatter in both template locations
2. Add a comment explaining the field: `# null | skipped | complete — documentation sync status`

**Verify:**
- New projects created with `oat project new` include `oat_docs_updated: null` in state.md
- `pnpm lint` passes

**Commit:**
```bash
git add .oat/templates/state.md packages/cli/assets/templates/state.md
git commit -m "feat(p05-t02): add oat_docs_updated field to state.md template"
```

---

### Task p05-t03: Integrate documentation check into oat-project-complete

**Files:**
- Modify: `.agents/skills/oat-project-complete/SKILL.md`

**Steps:**

1. Add a documentation sync check early in the oat-project-complete flow (before archival steps)
2. Read `oat_docs_updated` from `state.md` frontmatter
3. Read `documentation.requireForProjectCompletion` from `.oat/config.json` (default: false)
4. If `oat_docs_updated` is `null`:
   - If `requireForProjectCompletion` is false: print soft suggestion recommending `oat-project-document`, allow user to proceed or skip
   - If `requireForProjectCompletion` is true: hard gate — instruct user to run `oat-project-document` first or explicitly skip
5. If user chooses to skip: set `oat_docs_updated: skipped` in state.md and proceed
6. If `oat_docs_updated` is `skipped` or `complete`: proceed normally

**Verify:**
- Soft suggestion path works (prints recommendation, allows proceeding)
- Hard gate path works (blocks until resolved)
- Skip sets the correct state value

**Commit:**
```bash
git add .agents/skills/oat-project-complete/SKILL.md
git commit -m "feat(p05-t03): integrate documentation sync check into oat-project-complete"
```

---

### Task p05-t04: Add oat_docs_updated to state dashboard generation

**Files:**
- Modify: `packages/cli/src/commands/state/generate.ts`

**Steps:**

1. Read `oat_docs_updated` from active project's `state.md` frontmatter
2. Include documentation sync status in the dashboard output:
   - Show `Docs Updated: ✓ complete` / `⚠ not yet run` / `⊘ skipped`
3. When `oat_docs_updated` is `null` and project is in implement phase with tasks complete, include `oat-project-document` in the recommended next step

**Verify:**
- `oat state refresh` shows docs updated status
- Recommended next step includes documentation when appropriate
- `pnpm type-check` passes

**Commit:**
```bash
git add packages/cli/src/commands/state/generate.ts
git commit -m "feat(p05-t04): add documentation sync status to state dashboard"
```

---

## Phase 6: Sync and Final Polish

### Task p06-t01: Run oat sync for new skill

**Files:**
- May create: provider view files (`.cursor/rules/`, `.claude/rules/`, etc.)

**Steps:**

1. Run `oat sync --scope all --apply` to propagate the new skill to all enabled providers
2. Verify provider views were created correctly

**Verify:**
- `pnpm run cli -- sync --scope all --apply` completes without errors
- Provider views exist for the new skill

**Commit:**
```bash
git add -A
git commit -m "chore(p06-t01): sync oat-project-document to provider views"
```

---

### Task p06-t02: Update repo reference docs

**Files:**
- Modify: `.oat/repo/reference/current-state.md`
- Modify: `.oat/repo/reference/backlog.md`
- Modify: `.oat/repo/reference/backlog-completed.md`

**Steps:**

1. Update `current-state.md` to list `oat-project-document` as an installed skill with its description
2. Move the `oat-project-document` backlog item from `backlog.md` to `backlog-completed.md`
3. Note the new `documentation` config schema section and `oat_docs_updated` state field

**Verify:**
- Reference docs accurately reflect the new skill and config additions
- `pnpm lint` passes

**Commit:**
```bash
git add .oat/repo/reference/
git commit -m "docs(p06-t02): update repo reference docs for oat-project-document"
```

---

## Phase 7: Review Fixes

### Task p07-t01: (review) Add oat-project-document to workflow bundle

**Files:**
- Modify: `packages/cli/src/commands/init/tools/workflows/install-workflows.ts`
- Create: `packages/cli/assets/skills/oat-project-document/SKILL.md` (bundled copy)

**Step 1: Understand the issue**

Review finding: The new skill is present under `.agents/skills/oat-project-document`, but `WORKFLOW_SKILLS` in `install-workflows.ts` does not list it and there is no bundled asset directory. Users who install/refresh workflow tools via the CLI bundle will not receive the skill.
Location: `packages/cli/src/commands/init/tools/workflows/install-workflows.ts:10`

**Step 2: Implement fix**

1. Add `'oat-project-document'` to the `WORKFLOW_SKILLS` array in alphabetical order (after `oat-project-discover`)
2. Copy `.agents/skills/oat-project-document/SKILL.md` to `packages/cli/assets/skills/oat-project-document/SKILL.md`
3. Update the workflow installer test counts to reflect 22 skills (was 21)

**Step 3: Verify**

Run: `pnpm type-check && pnpm --filter @oat/cli test`
Expected: all tests pass, including updated count assertions

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/workflows/install-workflows.ts packages/cli/assets/skills/oat-project-document/
git commit -m "fix(p07-t01): add oat-project-document to workflow bundle"
```

---

### Task p07-t02: (review) Fix skip path to set oat_docs_updated: skipped

**Files:**
- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Step 1: Understand the issue**

Review finding: The skill's skip path (Step 5, [S]kip option) leaves `oat_docs_updated` as `null`. This means `oat-project-complete` cannot distinguish "never run" from "user explicitly chose to skip". The design specifies `null | skipped | complete` semantics.
Location: `.agents/skills/oat-project-document/SKILL.md:335`

**Step 2: Implement fix**

1. In Step 5c, update the Skip bullet to: set `oat_docs_updated: skipped` in state.md before exiting
2. In Step 7c, update the "user explicitly skipped" edge case to match: set `oat_docs_updated: skipped` (not leave as null)

**Step 3: Verify**

Run: `pnpm lint`
Expected: pass (SKILL.md is a markdown file, no type-check needed)

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "fix(p07-t02): set oat_docs_updated to skipped on explicit skip"
```

---

### Task p07-t03: (review) Track partial apply failures in oat_docs_updated state

**Files:**
- Modify: `.agents/skills/oat-project-document/SKILL.md`

**Step 1: Understand the issue**

Review finding: Step 6 allows continuing after write failures, but Step 7 unconditionally sets `oat_docs_updated: complete`. This falsely certifies docs as synchronized when some approved updates failed.
Location: `.agents/skills/oat-project-document/SKILL.md:370`

**Step 2: Implement fix**

1. In Step 6 error handling section, add instruction to track a `$ALL_SUCCEEDED` flag (true by default, set to false on any write failure)
2. In Step 7b, add conditional: only set `oat_docs_updated: complete` if `$ALL_SUCCEEDED` is true; otherwise leave state unresolved and surface failures in the summary report
3. In Step 7d summary, add a failure section when `$ALL_SUCCEEDED` is false listing which files failed

**Step 3: Verify**

Run: `pnpm lint`
Expected: pass

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-document/SKILL.md
git commit -m "fix(p07-t03): track partial failures in oat_docs_updated state"
```

---

## Reviews

| Scope | Type | Status | Date | Artifact |
|-------|------|--------|------|----------|
| p01 | code | pending | - | - |
| p02 | code | pending | - | - |
| p03 | code | pending | - | - |
| p04 | code | pending | - | - |
| p05 | code | pending | - | - |
| p06 | code | pending | - | - |
| final | code | passed | 2026-03-08 | reviews/final-review-2026-03-08-v2.md |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**
- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**
- Phase 1: 2 tasks — Skill skeleton and project resolution
- Phase 2: 2 tasks — Artifact analysis and code verification
- Phase 3: 2 tasks — Surface scanning and delta assessment
- Phase 4: 3 tasks — Approval, apply, and state updates
- Phase 5: 4 tasks — Config schema and integration
- Phase 6: 2 tasks — Sync and final polish
- Phase 7: 3 tasks — Review fixes (final review)

**Total: 18 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Discovery: `discovery.md`
- Related skills: `oat-docs-analyze`, `oat-docs-apply`, `oat-project-complete`
- Plan-writing contract: `.agents/skills/oat-project-plan-writing/SKILL.md`
