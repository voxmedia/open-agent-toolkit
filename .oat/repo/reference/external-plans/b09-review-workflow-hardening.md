# Review Workflow Hardening (B09 + Review Gates)

## Context

The OAT review workflow has a gap: reviews can be *provided* (via `oat-project-review-provide` and `oat-review-provide`) but the *receive* side is incomplete. `oat-project-review-receive` handles project-scoped local review artifacts, but there's no ad-hoc local receive, no GitHub PR comment intake, and the autonomous review gate in `oat-project-subagent-implement` wasn't enforced during real usage (Copilot/Gemini providers project — subagents were merged without the review gate running).

This plan addresses both gaps in one project:
- **B09**: Add review receive skills for ad-hoc local, ad-hoc remote (GitHub PR), and project-scoped remote contexts
- **Review gates**: Harden the autonomous review gate in `oat-project-subagent-implement` with enforcement mechanics

## Design Decisions

- **Naming**: `-remote` suffix for GitHub PR intake skills (`oat-review-receive-remote`, `oat-project-review-receive-remote`)
- **Architecture**: Shared findings model — all receive skills normalize to a common findings format before triage
- **GitHub PR intake**: Via `npx agent-reviews` (no dependency installation needed)
- **Review gate**: Full `oat-reviewer` dispatch as peer subagent (not lightweight inline check)
- **Gate structure**: Update existing `oat-project-subagent-implement` skill (not extract to separate skill)
- **Skill conventions**: Follow `create-oat-skill` template (mode assertion, progress banners, project resolution, success criteria)

## Common Findings Format

Convention followed by all receive skills (not a shared script — each skill implements its own parser):

```yaml
finding:
  id: "C1" | "I1" | "M1" | "m1"      # Severity prefix + sequence
  severity: critical | important | medium | minor
  title: string
  file: string | null
  line: number | null
  body: string
  fix_guidance: string | null
  source: local_artifact | github_pr
  source_ref: string                    # Artifact path or PR comment URL
```

4-tier severity (standardized from the inconsistent 3/4-tier usage across existing skills):
- **Critical**: Missing P0 requirements, security vulnerabilities, broken functionality
- **Important**: Missing P1 requirements, missing error handling, significant maintainability issues
- **Medium**: P2 requirements with meaningful impact, moderate maintainability issues
- **Minor**: Cosmetic polish, style issues, documentation gaps

## Files

### New Files

| File | Purpose |
|------|---------|
| `.agents/skills/oat-review-receive/SKILL.md` | Ad-hoc local review receive |
| `.agents/skills/oat-review-receive-remote/SKILL.md` | Ad-hoc remote (GitHub PR) review receive |
| `.agents/skills/oat-project-review-receive-remote/SKILL.md` | Project-scoped remote review receive |

### Modified Files

| File | Change |
|------|--------|
| `.agents/skills/oat-project-subagent-implement/SKILL.md` | Harden Step 4 (reviewer dispatch), add merge prerequisite check to Step 5 |
| `packages/cli/scripts/bundle-assets.sh` | Add 3 new skills to SKILLS array |
| `packages/cli/src/commands/init/tools/utility/install-utility.ts` | Add `oat-review-receive`, `oat-review-receive-remote` to UTILITY_SKILLS |
| `packages/cli/src/commands/init/tools/workflows/install-workflows.ts` | Add `oat-project-review-receive-remote` to WORKFLOW_SKILLS |
| `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts` | Update WORKFLOW_SKILLS array + all hardcoded `toHaveLength` count assertions |
| `packages/cli/src/commands/init/tools/utility/index.test.ts` | Update expected utility skills array in non-interactive install assertions |

### Key Reference Files (read, not modified)

| File | Reuse Pattern |
|------|---------------|
| `.agents/skills/oat-project-review-receive/SKILL.md` | Findings parsing, task conversion template, plan.md updates, implementation.md updates, 3-cycle limit |
| `.agents/skills/oat-review-provide/SKILL.md` | Scope resolution without project context, artifact destination policy |
| `.agents/skills/oat-project-review-provide/SKILL.md` | 3-tier dispatch model, scope determination |
| `.agents/agents/oat-reviewer.md` | Severity definitions, findings format |
| `.agents/skills/create-oat-skill/references/oat-skill-template.md` | OAT skill template (mode assertion, progress, project resolution) |

---

## Phase 1: `oat-review-receive` — Ad-hoc Local Review Receive
**Effort**: Medium | **HiLL**: Yes (review before building remote skills on this foundation)

Foundation skill that establishes the common findings format and triage pattern.

### P1-T1: Read reference skills and template
- Read `oat-project-review-receive/SKILL.md` (findings parsing pattern, Steps 2-2.5)
- Read `oat-review-provide/SKILL.md` (artifact destination policy, scope resolution)
- Read `create-oat-skill/references/oat-skill-template.md` (template structure)

### P1-T2: Create `oat-review-receive/SKILL.md`
- **Frontmatter**: `name: oat-review-receive`, `description: Use when processing review findings outside project context. Converts local review artifacts into actionable task lists.`, `allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion`, `user-invocable: true`, `disable-model-invocation: true`
- **Mode Assertion**: Review Receive mode — ALLOWED: reading artifacts, classifying findings, writing task lists. BLOCKED: code changes, project artifact updates.
- **Progress**: `OAT ▸ REVIEW RECEIVE` banner, `[1/4] Locating review artifact…`, `[2/4] Parsing findings…`, `[3/4] Triaging findings…`, `[4/4] Generating task list…`
- **No Step 0 project resolution** (ad-hoc = no project context)
- **Step 1: Locate Review Artifact** — User provides path, or scan `.oat/repo/reviews/` and `.oat/projects/local/orphan-reviews/` for most recent. If multiple found, present list and ask user to pick.
- **Step 2: Parse Findings** — Parse markdown severity sections (Critical/Important/Medium/Minor headings) into common findings format. Use stable IDs (C1, I1, M1, m1). Handle both 3-tier artifacts (no Medium section) and 4-tier. Source: `local_artifact`.
- **Step 3: Present Findings Overview** — Display severity counts and per-finding summary (ID, title, file:line) before asking for disposition. Follow `oat-project-review-receive` Step 2.5 pattern.
- **Step 4: Interactive Triage** — For each finding: convert-to-task / defer / dismiss. Default: Critical/Important → convert, Medium → convert (propose defer only with concrete reason), Minor → defer.
- **Step 5: Output Task List** — Write task list as markdown (inline or to file at user's choice). Task format: `- [ ] [{severity}] {title} ({file}:{line}) — {fix_guidance}`. No plan.md task IDs — these are standalone tasks.
- **Success Criteria**: Findings parsed with correct severity, triage completed, task list output produced.

### P1-T3: Validate skill conventions
- Verify: mode assertion, progress indicators, success criteria sections present
- Verify: follows OAT skill template structure
- Verify: under 500 lines / ~5,000 tokens

---

## Phase 2: `oat-review-receive-remote` — Ad-hoc Remote Review Receive
**Effort**: Medium-High | **HiLL**: Yes (review before building project variant)

Adds `agent-reviews` integration for GitHub PR comment intake.

### P2-T1: Create `oat-review-receive-remote/SKILL.md`
- **Frontmatter**: `name: oat-review-receive-remote`, `description: Use when processing GitHub PR review comments outside project context. Fetches PR comments via agent-reviews and converts them into actionable task lists.`, `allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion`, `user-invocable: true`, `disable-model-invocation: true`
- **Prerequisites**: `npx agent-reviews` must be available (Node.js + network). GitHub authentication configured (GITHUB_TOKEN, .env.local, or gh CLI).
- **Mode Assertion**: Review Receive mode (same as P1 pattern)
- **Progress**: `OAT ▸ REMOTE REVIEW RECEIVE` banner, `[1/5] Resolving PR…`, `[2/5] Fetching comments…`, `[3/5] Classifying findings…`, `[4/5] Triaging findings…`, `[5/5] Generating task list…`
- **Step 1: Resolve PR Number** — User provides `--pr <N>`, or auto-detect from current branch (agent-reviews auto-detects). Confirm PR number with user.
- **Step 2: Fetch PR Comments** — Run `npx agent-reviews --json --unresolved --pr <N>`. Parse JSON output. If no unresolved comments, report clean and exit.
- **Step 3: Classify & Normalize** — For each comment from agent-reviews JSON:
  - Map `type` (review_comment → CODE, issue_comment → COMMENT, review → REVIEW)
  - Extract `path`/`line` for CODE comments (maps to findings `file`/`line`)
  - Agent classifies severity based on comment `body` content (Critical/Important/Medium/Minor)
  - Use `state: CHANGES_REQUESTED` as a hint toward Important+ (but agent decides final severity)
  - Normalize to common findings format. Source: `github_pr`. Source_ref: comment `url`.
- **Step 4: Present & Triage** — Same pattern as P1 Step 3-4. Display grouped by severity. Interactive disposition per finding.
- **Step 5: Output Task List** — Same format as P1 Step 5. Standalone task list.
- **Step 6: Reply to Comments (Optional)** — Ask user: "Reply to processed comments on GitHub?" If yes, for each finding with disposition:
  - Convert-to-task: `npx agent-reviews --reply <id> "Acknowledged — tracking as task"`
  - Dismiss: `npx agent-reviews --reply <id> "Won't fix: {reason}"`
  - Defer: `npx agent-reviews --reply <id> "Deferred: {reason}"`
- **Troubleshooting**: Include section for common agent-reviews issues (auth failure, no comments found, network errors).
- **Success Criteria**: PR comments fetched, classified with correct severity, triage completed, task list produced, optional replies posted.

---

## Phase 3: `oat-project-review-receive-remote` — Project-Scoped Remote Review Receive
**Effort**: High | **HiLL**: Yes (review before modifying subagent orchestration)

Combines remote PR intake (P2) with project artifact updates (from existing `oat-project-review-receive` patterns).

### P3-T1: Create `oat-project-review-receive-remote/SKILL.md`
- **Frontmatter**: `name: oat-project-review-receive-remote`, `description: Use when processing GitHub PR review comments within project context. Fetches PR comments, creates plan tasks, and updates project artifacts.`, `allowed-tools: Read, Write, Bash, Glob, Grep, AskUserQuestion`, `user-invocable: true`, `disable-model-invocation: true`
- **Prerequisites**: Active OAT project with `plan.md` and `implementation.md`. `npx agent-reviews` available. GitHub auth configured.
- **Mode Assertion**: Review Receive mode (same as P1 but ALLOWED also includes project artifact updates)
- **Progress**: `OAT ▸ PROJECT REMOTE REVIEW RECEIVE` banner, `[1/7] Resolving project…`, `[2/7] Resolving PR…`, `[3/7] Fetching comments…`, `[4/7] Classifying findings…`, `[5/7] Triaging findings…`, `[6/7] Updating project artifacts…`, `[7/7] Summary…`
- **Step 0: Resolve Active Project** — Standard project resolution (PROJECTS_ROOT + .oat/active-project). Same pattern as `oat-project-review-receive`.
- **Step 1: Resolve PR Number** — Same as P2 Step 1, plus optionally check project PR artifacts for associated PR number.
- **Step 2: Fetch PR Comments** — Same as P2 Step 2.
- **Step 3: Classify & Normalize** — Same as P2 Step 3.
- **Step 4: Present Findings Overview** — Follow `oat-project-review-receive` Step 2.5 pattern (structured register with per-finding analysis before disposition).
- **Step 5: Convert Findings to Plan Tasks** — Follow `oat-project-review-receive` Step 5 pattern:
  - Determine next task IDs from plan.md
  - Task format: `### Task {id}: (review) {title}` with 4-step structure
  - Commit message template: `fix({task_id}): {description}`
- **Step 6: Update Plan.md** — Follow `oat-project-review-receive` Step 6:
  - Add/update Reviews table row (scope: `github-pr`, status: `fixes_added` or `passed`)
  - Update Implementation Complete totals
  - Source column: `github-pr #{PR_NUMBER}`
- **Step 7: Update Implementation.md** — Follow `oat-project-review-receive` Step 7:
  - Add "Remote Review Received" section with date, PR number, finding counts, new task IDs
  - Update `oat_current_task_id` to first fix task
- **Step 8: Check Review Cycle Count** — Follow `oat-project-review-receive` Step 8 (3-cycle limit).
- **Step 9: Reply to Comments (Optional)** — Same as P2 Step 6, but include task ID in reply: `"Tracking as task {id}"`
- **Step 10: Route to Next Action** — Follow `oat-project-review-receive` Step 10 pattern.
- **Success Criteria**: PR comments fetched, plan tasks created with correct IDs, plan.md Reviews table updated, implementation.md updated, cycle limit enforced.

---

## Phase 4: Harden `oat-project-subagent-implement` Review Gate
**Effort**: Medium-High | **HiLL**: Yes (review before verification)

Modify the existing skill to enforce the autonomous review gate.

### P4-T1: Read current skill in detail
- Read `.agents/skills/oat-project-subagent-implement/SKILL.md` fully
- Identify exact line ranges for Step 4 and Step 5

### P4-T2: Harden Step 4 — Explicit Reviewer Dispatch
Add to Step 4 after current review gate description:

**Dispatch mechanism:**
- After each implementer subagent completes, orchestrator dispatches `oat-reviewer` as a **peer subagent** (Task tool, `subagent_type: "oat-reviewer"`) targeting the **same worktree**
- Reviewer receives: unit scope (files changed in worktree branch), project artifacts (spec/design/plan from main branch), review type: `code`
- Reviewer writes review artifact to unit worktree: `reviews/{unit-id}-gate-review.md`
- Orchestrator reads artifact and extracts verdict: pass if no Critical/Important findings

**Fix-loop dispatch:**
- On fail: orchestrator dispatches a **fix subagent** (implementer, same worktree) with the review findings
- Fix subagent receives: review artifact path, list of Critical/Important findings, original task spec
- After fix subagent completes: re-dispatch reviewer (same gate)
- Loop up to `oat_orchestration_retry_limit` (default: 2)
- If limit exhausted: mark unit `disposition: excluded`, record findings in orchestration log

**Verdict map:**
- Orchestrator maintains in-memory `unit_id → { verdict, retry_count, findings_summary }` during the run
- This map is the source of truth for Step 5's merge prerequisite check

### P4-T3: Harden Step 5 — Merge Prerequisite Check
Add to Step 5 before the merge loop:

**Pre-merge validation (HARD GATE):**
```
Before merging any unit:
1. Check verdict map for unit_id
2. If no verdict entry exists → refuse merge, set disposition: skipped, reason: review_gate_missing
3. If verdict != pass → refuse merge, set disposition: excluded, reason: review_gate_failed
4. Only units with verdict == pass proceed to merge
```

This ensures even if Step 4 is somehow bypassed (e.g., orchestrator error, manual intervention), Step 5 catches it.

### P4-T4: Enhance orchestration run log
Update the Review Interaction Log template to include:
- Reviewer dispatch method (peer subagent)
- Review artifact path per unit
- Fix-loop iteration details (which findings fixed, which persisted)
- Explicit `review_gate_executed: true|false` field per unit in the Unit Outcomes table

### P4-T5: Update hard constraints section
Add to the existing hard constraints:
- **Never merge a unit without an explicit pass verdict from the reviewer subagent**
- **Always dispatch reviewer as a peer subagent (not nested, not inline)** — the reviewer must run in its own context to ensure fresh-eyes evaluation

---

## Phase 5: Registration, Sync & Verification
**Effort**: Low-Medium | **HiLL**: No

### P5-T1: Register skills for CLI distribution

**bundle-assets.sh** — Add to SKILLS array (alphabetical):
- `oat-project-review-receive-remote` (after `oat-project-review-receive`)
- `oat-review-receive` (after `oat-review-provide`)
- `oat-review-receive-remote` (after `oat-review-receive`)

**install-utility.ts** — Add to UTILITY_SKILLS:
- `'oat-review-receive'`
- `'oat-review-receive-remote'`

**install-workflows.ts** — Add to WORKFLOW_SKILLS:
- `'oat-project-review-receive-remote'`

**install-workflows.test.ts** — Update test WORKFLOW_SKILLS array to include `'oat-project-review-receive-remote'`. Also update all hardcoded `toHaveLength(20)` assertions to reflect the new count (21). Search for all count assertions: `rg -n "toHaveLength" packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts`

**utility/index.test.ts** — Update expected `skills` array in non-interactive install test assertions to include the 2 new utility skills. Search: `rg -n "skills:" packages/cli/src/commands/init/tools/utility/index.test.ts`

### P5-T2: Sync and validate
```bash
oat sync --apply
pnpm oat:validate-skills
```
Fix any validation findings.

### P5-T3: Build and test
```bash
pnpm build
pnpm test
```
Fix any test failures (especially if install tests assert exact skill lists).

### P5-T4: Manual verification
- Verify each new skill appears in `.claude/skills/` (or equivalent provider views) after sync
- Verify `oat-project-subagent-implement` changes don't break existing skill validation
- Read through each new SKILL.md to confirm: mode assertion present, progress indicators present, success criteria present, under 500 lines

---

## Verification

After all phases complete:

1. **Skill validation**: `pnpm oat:validate-skills` passes for all 3 new skills + modified skill
2. **Provider sync**: `oat sync --apply` succeeds, skills appear in provider views
3. **Build + tests**: `pnpm build && pnpm test` passes
4. **Convention check**: Each new skill has: frontmatter, mode assertion, progress indicators (OAT ▸ banner + [N/N] steps), success criteria
5. **Content budget**: Each new skill is under 500 lines / ~5,000 tokens
6. **Findings format**: All 3 receive skills use consistent 4-tier severity model and common findings format convention
7. **Gate enforcement**: `oat-project-subagent-implement` Step 5 has explicit merge prerequisite check that refuses units without pass verdict
