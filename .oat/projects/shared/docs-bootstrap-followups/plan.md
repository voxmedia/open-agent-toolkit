---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-04-17
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: [] # phases to pause AFTER completing (empty = every phase)
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
---

# Implementation Plan: docs-bootstrap-followups

> Execute this plan using `oat-project-implement` (sequential) or `oat-project-subagent-implement` (parallel), with phase checkpoints and review gates.

**Goal:** Make docs-app scaffolds safe in consumer Turbo monorepos and prevent silent loss of manual edits to generated `index.md`, while updating the bootstrap walkthrough and release metadata accordingly.

**Architecture:** Extend `oat docs init` with a narrow root-package patching step that updates consumer Turbo build scripts only when the existing script is compatible, surface the patch outcome to users, and add a shared generated-file warning to both the scaffold template and the generate-index command.

**Tech Stack:** TypeScript CLI commands, bundled docs-app scaffold templates, markdown skill instructions, pnpm/Turbo consumer fixtures, and CLI package tests.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `fix(p01-t01): patch turbo root build scripts`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter

---

## Phase 1: Root build-script patching

### Task p01-t01: Patch compatible Turbo root build scripts during docs init

**Files:**

- Modify: `packages/cli/src/commands/docs/init/*`
- Modify: CLI docs-init tests and/or fixtures covering scaffold side effects

**Step 1: Write test (RED)**

Add coverage for:

- an existing Turbo `build` script that should gain `--filter='!{appName}'`
- creation of `build:docs`
- a repo with no `build` script
- a repo whose `build` script is not Turbo-based
- `--dry-run` output without mutation

Run: `pnpm --filter @open-agent-toolkit/cli test -- docs init`
Expected: New assertions fail until the root patching step exists.

**Step 2: Implement (GREEN)**

Implement a narrow root-package patching path that:

- runs after scaffold unless an opt-out flag disables it
- only mutates when the existing `scripts.build` is Turbo-based
- preserves any existing build flags while appending the exclusion filter
- adds `scripts["build:docs"] = "turbo run build --filter={appName}..."`
- prints a unified diff before write
- respects `--dry-run`
- records applied or skipped status for the caller/skill

Run: `pnpm --filter @open-agent-toolkit/cli test -- docs init`
Expected: The new docs-init tests pass.

**Step 3: Refactor**

Keep parsing and mutation logic local to the docs-init command path, tighten logger output, and make skip reasons explicit without widening the command surface beyond the documented flag/result changes.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No lint or type-check failures from the new option handling, script mutation logic, or logger/result types.

**Step 5: Commit**

```bash
git add packages/cli
git commit -m "fix(p01-t01): patch turbo root build scripts"
```

---

### Task p01-t02: Surface the patch outcome in the bootstrap walkthrough contract

**Files:**

- Modify: `packages/cli/src/commands/docs/init/*` result/warning plumbing as needed
- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md`

**Step 1: Write test (RED)**

Add or extend assertions for the structured command result or warning output that the skill consumes, including the manual-action case when the root patch is skipped.

**Step 2: Implement (GREEN)**

Update the CLI/skill contract so the bootstrap walkthrough can:

- explain why the root build filter exists
- show what changed when the patch applied
- provide a recommended manual snippet when the patch was skipped
- tell users how to revert or adjust the generated script changes

**Step 3: Refactor**

Keep the walkthrough guidance specific to the two downstream issues and bump the skill frontmatter version once in the final diff.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- docs init`
Expected: The CLI-side assertions still pass and the skill text matches the new output contract.

**Step 5: Commit**

```bash
git add packages/cli .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "fix(p01-t02): explain root build patch behavior"
```

---

## Phase 2: Generated index guardrails and release completion

### Task p02-t01: Add the generated-file warning to generate-index and the scaffold template

**Files:**

- Modify: `packages/cli/src/commands/docs/generate-index*`
- Modify: `packages/cli/assets/templates/docs-app-fuma/docs/index.md`
- Modify: generate-index tests/fixtures

**Step 1: Write test (RED)**

Add assertions that generated output starts with the exact warning header and that rerunning the command keeps a single correct header.

Run: `pnpm --filter @open-agent-toolkit/cli test -- generate-index`
Expected: The new header assertions fail until the command and template are updated.

**Step 2: Implement (GREEN)**

Emit the warning header at the top of generated `index.md` output and add the same header to the Fumadocs template used before the first generate-index run.

Run: `pnpm --filter @open-agent-toolkit/cli test -- generate-index`
Expected: Header coverage passes, including idempotent reruns.

**Step 3: Refactor**

Share or centralize the header string if that reduces drift without expanding the change beyond the docs command/template boundary.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No lint or type-check regressions from the generate-index changes.

**Step 5: Commit**

```bash
git add packages/cli
git commit -m "fix(p02-t01): warn on generated docs index files"
```

---

### Task p02-t02: Complete release/version updates and final verification

**Files:**

- Modify: `packages/cli/package.json`
- Modify: `packages/control-plane/package.json`
- Modify: `packages/docs-config/package.json`
- Modify: `packages/docs-theme/package.json`
- Modify: `packages/docs-transforms/package.json`
- Modify: `.agents/skills/oat-docs-bootstrap/SKILL.md` (version already bumped in final diff)

**Step 1: Write test (RED)**

Record the required verification commands and ensure any release validation failures are addressed before finalizing.

Run: `pnpm release:validate`
Expected: Any missing lockstep package version bumps or release metadata issues are surfaced.

**Step 2: Implement (GREEN)**

Bump all five public package versions together, keep the skill version bump in the final diff, and make any small release-metadata fixes required by validation.

Run: `pnpm --filter @open-agent-toolkit/cli test lint type-check && pnpm release:validate`
Expected: All required verification passes.

**Step 3: Refactor**

Limit any follow-up edits to release metadata or narrowly related test expectations discovered during verification.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check && pnpm release:validate`
Expected: Full required verification passes with no remaining release-policy violations.

**Step 5: Commit**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json .agents/skills/oat-docs-bootstrap/SKILL.md
git commit -m "chore(p02-t02): bump release metadata for docs bootstrap fixes"
```

---

## Phase 3: Review fixes and workflow hardening

### Task p03-t01: (review) Fix ambiguous Turbo filter handling in root build patching

**Files:**

- Modify: `packages/cli/src/commands/docs/init/root-package.ts`
- Modify: `packages/cli/src/commands/docs/init/root-package.test.ts`
- Modify: `packages/cli/src/commands/docs/init/index.ts` (if messaging/result semantics need adjustment)

**Step 1: Understand the issue**

Review finding: the current derivation for `build:docs` strips pre-existing `--filter` flags from a Turbo root build script and appends a docs exclusion to `scripts.build` even when the existing filter semantics may be ambiguous.
Location: `packages/cli/src/commands/docs/init/root-package.ts`

**Step 2: Implement fix**

Make the root patch safe when a consumer already uses Turbo filters. Preferred direction: treat existing `--filter` usage as ambiguous, skip the automatic patch with a dedicated reason/manual snippet, and preserve user intent rather than silently rewriting it.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- root-package`
Expected: coverage includes the existing-filter case and no longer rewrites filtered Turbo build scripts unsafely.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/docs/init/root-package.ts packages/cli/src/commands/docs/init/root-package.test.ts packages/cli/src/commands/docs/init/index.ts
git commit -m "fix(p03-t01): handle existing turbo filters safely"
```

---

### Task p03-t02: (review) Reconcile implementation artifacts for PR-ready project state

**Files:**

- Modify: `implementation.md`
- Modify: `state.md`
- Modify: `plan.md` (if rollups or review statuses need follow-up updates)

**Step 1: Understand the issue**

Review finding: `implementation.md` is still largely scaffold content and does not accurately reflect completed work, current status, or PR-ready summary expectations.
Location: `.oat/projects/shared/docs-bootstrap-followups/implementation.md`

**Step 2: Implement fix**

Backfill the implementation artifact so it accurately records phases 1-2, verification performed, current review-fix work, and the PR/docs summary expected by the OAT lifecycle. Ensure project state remains restart-safe.

**Step 3: Verify**

Run: `rg -n "{Phase Name}|{Task Name}|{time}|{N}" .oat/projects/shared/docs-bootstrap-followups/implementation.md`
Expected: no unresolved scaffold placeholders remain in the implementation artifact.

**Step 4: Commit**

```bash
git add .oat/projects/shared/docs-bootstrap-followups/implementation.md .oat/projects/shared/docs-bootstrap-followups/state.md .oat/projects/shared/docs-bootstrap-followups/plan.md
git commit -m "chore(p03-t02): reconcile project implementation artifacts"
```

---

### Task p03-t03: (review) Broaden Turbo detection and tighten review-driven edge-case coverage

**Files:**

- Modify: `packages/cli/src/commands/docs/init/root-package.ts`
- Modify: `packages/cli/src/commands/docs/init/root-package.test.ts`
- Modify: `packages/cli/src/commands/docs/index-generate/index.test.ts`

**Step 1: Understand the issue**

Review findings: `runsTurboBuild` misses the valid `turbo build` form, and the surrounding edge-case coverage should be tightened for partial-warning paths and generated-index overwrite resilience.
Location: `packages/cli/src/commands/docs/init/root-package.ts`, `packages/cli/src/commands/docs/index-generate/index.test.ts`

**Step 2: Implement fix**

Accept both `turbo run build` and `turbo build`, add tests for the warning/reason branches around existing `build:docs` behavior, and strengthen the generated-index rerun test so it proves stale on-disk output is overwritten cleanly.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- root-package index-generate`
Expected: new Turbo shorthand coverage and stronger rerun assertions pass.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/docs/init/root-package.ts packages/cli/src/commands/docs/init/root-package.test.ts packages/cli/src/commands/docs/index-generate/index.test.ts
git commit -m "test(p03-t03): tighten docs bootstrap edge-case coverage"
```

---

### Task p03-t04: (review) Harden workflow artifact-commit guidance before review transitions

**Files:**

- Modify: `.agents/skills/oat-project-quick-start/SKILL.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md`
- Modify: `.agents/skills/oat-project-review-receive/SKILL.md`
- Modify: additional lifecycle skill instructions if the evaluation shows another boundary needs the same guard

**Step 1: Understand the issue**

Follow-up workflow finding: project artifacts were still untracked when review ran, which made later bookkeeping ambiguous. The guidance should make artifact commits an explicit prerequisite before review and similar lifecycle transitions.

**Step 2: Implement fix**

Evaluate the relevant workflow skills and harden their instructions so core project artifacts are committed before entering review/revise/PR-final style boundaries, with clear behavior when untracked core artifacts are detected.

**Step 3: Verify**

Run: `rg -n "artifact|commit|review" .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-review-receive/SKILL.md`
Expected: the workflow contract is explicit about pre-review artifact commit requirements and no longer leaves the bookkeeping shape implicit.

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-quick-start/SKILL.md .agents/skills/oat-project-implement/SKILL.md .agents/skills/oat-project-review-receive/SKILL.md
git commit -m "docs(p03-t04): harden workflow artifact commit guidance"
```

---

## Reviews

Track review artifacts here if a review pass is requested after implementation.

{Keep both code + artifact rows below. Add additional code rows (p03, p04, etc.) as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status  | Date       | Artifact                                       |
| ------ | -------- | ------- | ---------- | ---------------------------------------------- |
| p01    | code     | pending | -          | -                                              |
| p02    | code     | pending | -          | -                                              |
| p03    | code     | pending | -          | -                                              |
| final  | code     | passed  | 2026-04-17 | reviews/archived/final-review-2026-04-17-v2.md |
| spec   | artifact | pending | -          | -                                              |
| design | artifact | pending | -          | -                                              |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Phase 4: Final re-review follow-ups

### Task p04-t01: (review) Skip ambiguous composite Turbo shell build scripts during root patching

**Files:**

- Modify: `packages/cli/src/commands/docs/init/root-package.ts`
- Modify: `packages/cli/src/commands/docs/init/root-package.test.ts`

**Step 1: Understand the issue**

Review finding: the root-package patcher still treats composite shell scripts such as `turbo run build && pnpm lint` as if they were a single safe Turbo build command, then appends the docs exclusion filter to the end of the whole shell expression.
Location: `packages/cli/src/commands/docs/init/root-package.ts`

**Step 2: Implement fix**

Restrict automatic root build patching to clear single-command Turbo build scripts. Detect shell composition operators or other ambiguous shell wrappers and skip automatic mutation with a dedicated warning/manual snippet instead of rewriting the command.

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test -- root-package`
Expected: composite shell build scripts are skipped with the correct warning path, and simple Turbo build scripts still patch successfully.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/docs/init/root-package.ts packages/cli/src/commands/docs/init/root-package.test.ts
git commit -m "fix(p04-t01): skip composite turbo build scripts"
```

---

### Task p04-t02: (review) Refresh the repo dashboard after review bookkeeping

**Files:**

- Modify: `.oat/state.md`
- Modify: `.oat/projects/shared/docs-bootstrap-followups/state.md`

**Step 1: Understand the issue**

Review finding: the repo dashboard still reports this project as plan-complete and recommends the wrong lifecycle state because `.oat/state.md` was not refreshed after the latest project bookkeeping updates.
Location: `.oat/state.md`

**Step 2: Implement fix**

Refresh the repo dashboard from the current project state after review bookkeeping so the active project summary, current task, and recommended next step match the live project artifacts.

**Step 3: Verify**

Run: `sed -n '1,80p' .oat/state.md`
Expected: the active project summary shows implementation in progress for `docs-bootstrap-followups` and the next step remains `oat-project-implement`.

**Step 4: Commit**

```bash
git add .oat/state.md .oat/projects/shared/docs-bootstrap-followups/state.md
git commit -m "chore(p04-t02): refresh repo dashboard state"
```

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - add safe Turbo root patching and explain the result through the bootstrap flow
- Phase 2: 2 tasks - add generated-index warnings and finish release/version verification
- Phase 3: 4 tasks - address review findings and harden workflow artifact commit guidance
- Phase 4: 2 tasks - close the final re-review gaps around composite shell build scripts and repo dashboard drift

**Total: 10 tasks**

Additional review-fix work is queued before the next final re-review.

---

## References

- Design: `design.md` (optional in quick mode; not used here)
- Spec: `spec.md` (required in spec-driven mode; optional in quick/import mode)
- Discovery: `discovery.md`
- Imported Source: `references/imported-plan.md` (when `oat_plan_source: imported`)
