---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-18
oat_phase: plan
oat_phase_status: complete
oat_plan_parallel_groups: [] # confirmed sequential (operator declined p03/p04 parallel group)
oat_plan_hill_phases: ['p05', 'p06'] # from workflow.hillCheckpointDefault=final: p05 ends this run's mergeable delta; p06 is a separately merged RC-gated delta
oat_auto_review_at_hill_checkpoints: true # from workflow.autoReviewAtHillCheckpoints
oat_phase_review_gate:
  enabled: true
  phases: ['p05'] # operator choice: cross-runtime gate at end of implementation only (p06 is RC-gated, merges separately)
  review_type: code
  exit_nonzero_on: important
oat_plan_source: spec-driven # spec-driven | quick | imported
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
---

# Implementation Plan: wave-skills-promotion

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Upstream `oat-wave-execute` (→1.5.0) and `oat-wave-program` (→1.1.0) from stoa into the workflow pack with the §2 queue applied, stoa-isms genericized, every §3 row dispositioned, docs + fixture validation, and an RC-gated explainer-integration phase.

**Architecture:** Prose skills ported via a four-pass commit choreography (verbatim A → queue B1–B6 → genericization C → conventions D) with a behavioral-equivalence checklist as the zero-regression enforcement artifact. Toolkit touchpoints: pack manifest, bundle script, validate-plan help, docs app, pjm backlog.

**Tech Stack:** Markdown skills + bash 3.2 script; TypeScript (manifest/validate-plan edits); Fumadocs; pnpm/Turborepo.

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): add user auth endpoint`

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to oat-project-implement
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter (sequential — operator confirmed)
- [x] Phase gate review configured (selected: p05 — end-of-implementation cross-runtime gate)

---

## Parallelism

Candidate: `p03` (CLI help + backlog files) and `p04` (docs app) are file-disjoint. Declared only on user confirmation; default sequential.

---

RED/GREEN/Refactor is the recommended default where work is testable, not a validator requirement. Prose/skill-text tasks use edit → verify → commit shape with concrete verification commands.

## Phase 1: Port + toolkit integration (FR1, FR4, NFR4)

**Goal:** both skills installable from the workflow pack, verbatim vs the frozen sources.

### Task p01-t01: Verbatim copy of both skill sources (commit A)

**Files:**

- Create: `.agents/skills/oat-wave-execute/SKILL.md`, `.agents/skills/oat-wave-execute/scripts/bootstrap-group.sh`, `.agents/skills/oat-wave-execute/assets/wrapper-plan-template.md`, `.agents/skills/oat-wave-execute/assets/orchestration-log-template.md`
- Create: `.agents/skills/oat-wave-program/SKILL.md`, `.agents/skills/oat-wave-program/assets/execution-program-template.md`

**Step 1: Copy**

Copy the six files byte-for-byte from `.oat/projects/shared/wave-skills-promotion/references/skill-sources/`. Preserve the execute bit on `bootstrap-group.sh` (`chmod +x`).

**Step 2: Verify**

Run: `diff -r .oat/projects/shared/wave-skills-promotion/references/skill-sources/oat-wave-execute .agents/skills/oat-wave-execute && diff -r .oat/projects/shared/wave-skills-promotion/references/skill-sources/oat-wave-program .agents/skills/oat-wave-program && test -x .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh`
Expected: no diff output; exit 0.

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute .agents/skills/oat-wave-program
git commit -m "feat(p01-t01): port oat-wave-execute + oat-wave-program verbatim from stoa"
```

---

### Task p01-t02: Register skills in pack manifest + bundle script (RED→GREEN)

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Modify: `packages/cli/scripts/bundle-assets.sh`

**Step 1: Manifest edit (RED)**

Add `'oat-wave-execute'` and `'oat-wave-program'` to `WORKFLOW_SKILLS` (alphabetical position: after `oat-worktree-bootstrap-auto`, before `oat-wrap-up`).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts`
Expected: FAIL — manifest lists skills absent from `bundle-assets.sh` (proves the consistency guard sees the change). If the test file lives elsewhere, locate via `rg -l "bundle-consistency" packages/cli/src`.

**Step 2: Bundle-script edit (GREEN)**

Add `oat-wave-execute` and `oat-wave-program` to the `SKILLS=(...)` array (keep the existing grouping order).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/bundle-consistency.test.ts && pnpm --filter @open-agent-toolkit/cli test`
Expected: consistency test passes; full CLI suite green.

**Step 3: Commit (one atomic manifest+bundle change)**

```bash
git add packages/cli/src/commands/init/tools/shared/skill-manifest.ts packages/cli/scripts/bundle-assets.sh
git commit -m "feat(p01-t02): register wave skills in workflow pack manifest + bundle"
```

_(Task ID p01-t03 intentionally unused — merged into p01-t02 during plan review; IDs stay stable, monotonicity preserved.)_

---

### Task p01-t04: Generate provider views

**Files:**

- Create: provider views under `.claude/skills/`, `.codex/`, `.cursor/` (tool-managed)
- Modify: `.oat/sync/manifest.json` (tool-managed)

**Step 1: Sync**

Run: `oat sync --scope all` (fallback: `pnpm run cli -- sync --scope all`).

**Step 2: Verify (all configured providers, manifest-derived)**

Run: `rg -n "oat-wave-execute|oat-wave-program" .oat/sync/manifest.json && ls .claude/skills/oat-wave-execute/SKILL.md .claude/skills/oat-wave-program/SKILL.md`
Then assert every provider view path the manifest records for both skills exists (check `.codex` and `.cursor` entries explicitly — do not stop at Claude). Fail on any absent path.
Also run: `git status --short` and inspect for unrelated deletions (B3's own failure class) before staging.

**Step 3: Commit (stage only verified sync-managed paths; no error suppression)**

```bash
git add .oat/sync/manifest.json
git add <the exact provider-view paths verified in Step 2>
git commit -m "chore(p01-t04): sync provider views for wave skills"
```

---

### Task p01-t05: Fresh-install verification (real install, not bundle inspection)

**Files:** none in-repo (verification only; temp dir); result recorded in `implementation.md`

**Step 1: Build + bundle (prerequisite check)**

Run: `pnpm build && bash packages/cli/scripts/bundle-assets.sh && test -x packages/cli/assets/skills/oat-wave-execute/scripts/bootstrap-group.sh && test ! -d packages/cli/assets/skills/oat-wave-execute/tests`
Expected: bundle contains both skills; script executable; tests dir stripped.

**Step 2: Fresh install into an isolated temp repo (FR1 acceptance path)**

Materialize an empty temp repo (`mktemp -d`, `git init`), then run the BRANCH-LOCAL CLI's non-interactive workflow-pack install against it (e.g. `pnpm run cli -- tools install workflows --scope project` with cwd in the temp repo, or the current `init tools` equivalent — verify exact command via `pnpm run cli -- help` first).

**Step 3: Assert installed materialization**

In the temp repo, assert: both skill trees present with SKILL.md, all asset templates (2 execute + 1 program), `bootstrap-group.sh` present WITH execute bit, and provider views generated for every provider enabled in the temp repo's config after `oat sync`.
Expected: all assertions pass; cleanup temp dir.

**Step 4: Record**

No repo commit (verification-only). Record the install evidence (commands, assertions, result) in `implementation.md` phase notes.

---

## Phase 2: §2 queue + genericization (FR2, FR3, FR4, NFR3)

**Goal:** promoted text = 1.4.0 + queue, repo-neutral; one commit per queue item for traceability.

### Task p02-t01: Queue item 1 — Step 3.2 becomes verify-only (B1)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1: Edit**

Rewrite Process Step 3.2: scaffold-placeholder handling becomes a verification guard on oat ≥ 0.1.65 (check placeholders are already substituted; fix only on unexpected survivors), keeping the lifecycle-advance and wave-specific values as orchestrator-owned edits.

**Step 2: Format + Verify**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md && git diff .agents/skills/oat-wave-execute/SKILL.md`
Expected: full diff shows changes confined to the Step 3.2 region (visual confirm).

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md
git commit -m "feat(p02-t01): queue item 1 - scaffold placeholder check verify-only on oat >= 0.1.65"
```

---

### Task p02-t02: Queue item 2 — pre-merge cwd/branch assert (B2)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1: Edit**

In merge choreography (Step 5) add: mandatory `pwd` + `git branch --show-current` assertion immediately before EVERY `git merge`, with the wave-5 wrong-branch-via-cwd-persistence evidence note.

**Step 2: Format + Verify**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md && git diff .agents/skills/oat-wave-execute/SKILL.md`
Expected: full diff shows changes confined to the merge-choreography region (visual confirm).

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md
git commit -m "feat(p02-t02): queue item 2 - mandatory pwd+branch assert before every merge"
```

---

### Task p02-t03: Queue item 3 — view-parity guard + sync-commit inspection (B3)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/scripts/bootstrap-group.sh`
- Modify: `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1: Script edit (bash-3.2 only — no mapfile/declare -A)**

Add a `verify_view_parity()` function to `bootstrap-group.sh`: compare provider-view file lists between the new worktree and the root checkout after the worktree's sync; emit a structured `STATUS view-parity=<ok|MISMATCH>` line; on mismatch print the diagnostic comparing `node_modules/.bin/oat --version` (if present) vs `oat --version`.

**Step 2: Skill-text edit**

Merge choreography: add sync-commit content inspection before dispatch. Frame per the design amendment — a regression guard for the named stale-local-binary failure class (stale locally-resolved CLI shadowing the global thrashes managed files), with the version-compare diagnostic. Do not imply an unexplained toolkit corruption bug.

**Step 3: Format + Verify**

Run: `/bin/bash --version | head -1 && /bin/bash -n .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh && pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md && rg -n "mapfile|declare -A" .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh | wc -l`
Expected: interpreter reports 3.2.x (macOS system bash — log the version as evidence); syntax OK under it; zero bash-4 constructs. Runtime execution under `/bin/bash` is exercised by the p05 dry-run.

**Step 4: Commit**

```bash
git add .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh .agents/skills/oat-wave-execute/SKILL.md
git commit -m "feat(p02-t03): queue item 3 - provider-view parity guard + sync-commit inspection"
```

---

### Task p02-t04: Queue item 4 — named fan-in gate rule (B4)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1: Edit**

Promote "integration gates after every fan-in" from practice to a numbered standing rule (rule 10): the only detector for cumulative-timing defect classes; never skip on an all-lanes-passed wave; cite the W5 embed-teardown catch.

**Step 2: Format + Verify**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md && rg -n "fan-in" .agents/skills/oat-wave-execute/SKILL.md`
Expected: rule present in the Standing Rules list.

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md
git commit -m "feat(p02-t04): queue item 4 - fan-in integration gates as named standing rule"
```

---

### Task p02-t05: Queue item 5 — stored verification record for every fix disposition (B5)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1: Edit**

Fix-loop guidance: every fix disposition — including root-verified bounded fixes — produces a minimal stored verification record (what was verified, how, where recorded); cite the W5 final-gate audit-gap evidence.

**Step 2: Format + Verify**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md && rg -n "verification record" .agents/skills/oat-wave-execute/SKILL.md`
Expected: requirement present.

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md
git commit -m "feat(p02-t05): queue item 5 - stored verification record for fix dispositions"
```

---

### Task p02-t06: Queue item 6 — resumed-handle continuation note (B6)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1: Edit**

Docs note in the fix-loop/dispatch guidance: prefer resuming the original implementer handle for fix continuations while it is alive (cheaper, retains design context); fresh same-target agent only when the handle is gone.

**Step 2: Format + Verify**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md`
Expected: clean.

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md
git commit -m "docs(p02-t06): queue item 6 - prefer resumed implementer handle for fix continuations"
```

---

### Task p02-t07: Genericization pass + equivalence checklist (commit C)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`, `.agents/skills/oat-wave-program/SKILL.md`
- Create: `.oat/projects/shared/wave-skills-promotion/references/equivalence-checklist.md`

**Step 1: Build the checklist skeleton FIRST**

One row per standing rule / process step / inherited invariant across both skills, columns: `source text (cite) | promoted text | intent preserved? | divergence rationale`. Seed from the frozen sources before editing.

**Step 2: Genericize (design component 2 inventory)**

Neutral phrasing per the design: pnpm/nvm/better-sqlite3/oxfmt/lint-staged/`.codex`-trust/DoctorJsonResponse/lane-addenda items → "the repo's DoD gates / formatter / env setup / provider-conditional guidance", stoa specifics kept as parenthetical evidence examples; stoa DR/BL slugs kept as citations noted as living in the source program's repo. Never delete a rule; fill each checklist row as edited.

**Step 3: Format + Verify**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md .agents/skills/oat-wave-program/SKILL.md .oat/projects/shared/wave-skills-promotion/references/equivalence-checklist.md && rg -c "intent preserved" .oat/projects/shared/wave-skills-promotion/references/equivalence-checklist.md`
Expected: checklist has a row for every rule (spot-check count vs the 9+ standing rules + inherited invariants + program contract items).

**Step 4: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md .agents/skills/oat-wave-program/SKILL.md .oat/projects/shared/wave-skills-promotion/references/equivalence-checklist.md
git commit -m "feat(p02-t07): genericize stoa-isms with behavioral-equivalence checklist"
```

---

### Task p02-t08: Convention alignment + versions (commit D)

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`, `.agents/skills/oat-wave-program/SKILL.md`
- Modify: `.oat/projects/shared/wave-skills-promotion/implementation.md` (traceability table — FR2's verification artifact)

**Step 1: Edit**

Remove "repo-local dogfood draft" status prose and the stoa decision-record slug from the frontmatter `description:` (keep body citations); set `version: 1.5.0` (execute) and `version: 1.1.0` (program); align frontmatter fields with toolkit skill conventions (compare against `oat-project-implement`'s frontmatter). Commit body records the release-collapse: ledger items tagged 1.4.1 (items 1–2) and 1.5.0 (items 3–5) land together as 1.5.0.

**Step 1b: Record queue-item traceability table**

Append the six-row queue-item ↔ commit traceability table (item # + one-line description + commit SHA from p02-t01..t06, or written rejection rationale) to `implementation.md` phase notes — this is FR2's verification artifact.

**Step 2: Format + Verify**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/SKILL.md .agents/skills/oat-wave-program/SKILL.md .oat/projects/shared/wave-skills-promotion/implementation.md && head -8 .agents/skills/oat-wave-execute/SKILL.md && head -8 .agents/skills/oat-wave-program/SKILL.md && pnpm lint`
Expected: versions 1.5.0 / 1.1.0; no "dogfood draft" strings remain (`rg -n "dogfood" .agents/skills/oat-wave-*` → empty); `implementation.md` contains six distinct queue rows, each with a resolvable SHA or a written rejection rationale (no placeholder cells).

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute/SKILL.md .agents/skills/oat-wave-program/SKILL.md .oat/projects/shared/wave-skills-promotion/implementation.md
git commit -m "feat(p02-t08): toolkit conventions + versions 1.5.0/1.1.0

Release-collapse note: stoa ledger items queued as 1.4.1 (scaffold
verify-only, pre-merge assert) and 1.5.0 (view-parity, fan-in rule,
verification records) land together as 1.5.0 so ledger citations resolve."
```

---

### Task p02-t09: Re-sync provider views after text passes

**Files:**

- Modify: provider views (tool-managed)

**Step 1: Sync + Verify**

Run: `oat sync --scope all && git status --short`
Expected: only wave-skill views changed; no unrelated deletions.

**Step 2: Commit**

```bash
git add -- .claude .codex .cursor .oat/sync/manifest.json 2>/dev/null || true
git commit -m "chore(p02-t09): re-sync provider views after queue + genericization passes"
```

---

## Phase 3: Dispositions (FR5, FR6, FR7)

**Goal:** every §3 row dispositioned durably; 10 backlog items accounted for.

### Task p03-t01: validate-plan singleton-group guidance (TDD)

**Files:**

- Modify: `packages/cli/src/commands/project/validate-plan/validate-plan.test.ts`
- Modify: `packages/cli/src/commands/project/validate-plan/validate-plan.ts`
- Modify: `packages/cli/src/commands/project/validate-plan/index.ts` (help text, if description lives there)

**Step 1: Write test (RED)**

Extend the singleton-rejection test: error message must include the alternative, e.g. match `/run a solo lane as an ungrouped phase/`. Add/extend a help-output test asserting the rule is stated.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/project/validate-plan/validate-plan.test.ts`
Expected: FAIL (RED).

**Step 2: Implement (GREEN)**

Extend the existing rejection string (validate-plan.ts ~line 75): `singleton groups are not allowed — run a solo lane as an ungrouped phase (ungrouped phases execute sequentially in plan order)`. Add the same rule to the command help description.

Run: same test command.
Expected: PASS (GREEN).

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli test && pnpm lint && pnpm type-check`
Expected: green.

**Step 4: Commit**

```bash
git add packages/cli/src/commands/project/validate-plan/
git commit -m "feat(p03-t01): document singleton-group rule + ungrouped alternative in validate-plan"
```

---

### Task p03-t02: File deferred-work backlog items (5 items)

**Files:**

- Create: 5 items under `.oat/repo/pjm/backlog/` (+ regenerate index per backlog conventions)

**Step 1: Create items via `oat backlog new`** (follow `oat-pjm-add-backlog-item` conventions)

1. `oat wave new/refresh/close` CLI family — grouped with item 2; trigger: operator prioritization after W6.
2. Execution-program artifact format as stable OAT contract — grouped with item 1; trigger: second consumer (wave CLI or recap recipe).
3. `oat worktree bootstrap-group` TS command — rationale from design (proven bash ports as-is; rewrite later).
4. Post-W6 reviews-row restore-watch removal — trigger: W6 clean final-gate observation reported back via the mini-runbook.
5. Tracked-config guard — rejected: root-caused to stale local binary in consuming repo; cure is dependency hygiene there; CLI guard unnecessary.

**Step 2: Archive the rejected item per the PJM terminal lifecycle**

Active `backlog/items/` is for active work only. Immediately archive item 5:
Run: `oat backlog archive <item-5-id> --wont-do --summary "root-caused to stale locally-resolved CLI in consuming repo; dependency hygiene there is the cure; CLI-level guard unnecessary"`
Expected: item 5 moved to `backlog/archived/` with terminal `wont_do`; index + completed ledger regenerated by the command.

**Step 3: Verify**

Run: `oat pjm doctor && git status --short .oat/repo/pjm/`
Expected: doctor clean; items 1–4 in active backlog, item 5 archived; only produced files modified. Resolve the exact created paths from the git status output.

**Step 4: Commit (stage only the produced files)**

```bash
git add <exact item files, archived item path, regenerated index/ledger files from Step 3>
git commit -m "docs(p03-t02): file deferred-work backlog items for wave-skills promotion"
```

---

### Task p03-t03: Triage upstream feedback (4 items) + sync version-stamp candidate (1 item)

**Files:**

- Create/modify: items under `.oat/repo/pjm/backlog/`

**Step 1: Triage each against current main before filing**

1. Configurable per-target gate timeout — check gate config surface (`rg -n "timeout" packages/cli/src/commands/gate/ | head`); file or close-with-rationale.
2. Runbook verify-commands pass (doc drift) — file with ledger evidence.
3. `--scope all` flag-placement drift — check current arg parsing; file or close.
4. Resolver `--candidate-model`/`--preferred` conflict — check resolver flags; file or close (untracked since wave-0).
5. NEW: `oat sync` warns when invoking binary version ≠ version that produced the last sync (stamp CLI version in sync manifest) — evidence: root-caused stale-binary thrash class.

**Step 2: Verify**

Run: `git status --short .oat/repo/pjm/backlog/ | wc -l && pnpm exec oxfmt --write .oat/repo/pjm/`
Expected: ~5 new-or-modified records for this task (p03-t02's 5 items are already committed); 10 total dispositions across p03-t02/t03 verifiable via `git log --oneline -- .oat/repo/pjm/backlog/` or the backlog index.

**Step 3: Commit (stage only the produced files)**

```bash
git add <exact item files + regenerated index files from Step 2's git status>
git commit -m "docs(p03-t03): triage upstream feedback + file sync version-stamp candidate"
```

---

## Phase 4: Docs (FR8)

**Goal:** wave workflow documented; docs build green.

### Task p04-t01: Wave-workflow docs page + authored navigation

**Files:**

- Create: docs leaf page under `apps/oat-docs/docs/` (exact location per `apps/oat-docs/AGENTS.md` conventions — read it first)
- Modify: the nearest authored `index.md` (`## Contents` link — the docs contract makes unlisted pages invisible to navigation)

**Step 1: Author the leaf page**

Required frontmatter: `title` + `description`. Sections: what waves are (program layer over per-project lifecycle); the two skills and their split; mechanical/judgment ownership boundary; composition with `oat-project-implement` (wrapper projects, worktree groups); descriptive execution-program artifact format section with the explicit "documented, NOT a stable contract" note and pointer to the contract+CLI backlog grouping.

**Step 2: Wire authored navigation**

Add a `.md`-suffixed link for the new page to the nearest authored `index.md` `## Contents` map, then run `oat docs nav sync`.

**Step 3: Format + Verify**

Run: `pnpm exec oxfmt --write <leaf page path> <authored index path> && rg -n "not a stable contract" apps/oat-docs/docs/ -i && rg -n "<leaf-page-filename>" <authored index path>`
Expected: note present; Contents link present.

**Step 4: Commit (exact files, not the whole app)**

```bash
git add <leaf page path> <authored index path> <nav-sync outputs if any>
git commit -m "docs(p04-t01): add wave-workflow documentation"
```

---

### Task p04-t02: Regenerate docs index + build

**Files:**

- Modify: `apps/oat-docs/index.md` (generated — never hand-edit)

**Step 1: Regenerate + build**

Run: `oat docs generate-index && pnpm build:docs`
Expected: index includes the new page; build green.

**Step 2: Commit**

```bash
git add apps/oat-docs/index.md
git commit -m "docs(p04-t02): regenerate docs index for wave workflow page"
```

---

## Phase 5: Validation + release readiness (FR9, NFR1, NFR2, NFR3)

**Goal:** pre-W6 confidence + shippable release.

### Task p05-t01: Fixture tree + setup script

**Files:**

- Create: `.agents/skills/oat-wave-execute/tests/mini-wave-fixture/setup-fixture.sh`
- Create: `.agents/skills/oat-wave-execute/tests/mini-wave-fixture/fixture/` (tiny source tree, 3 toy plans, plan index, minimal `.oat/` scaffolding, no-op DoD gate script)

**Step 1: Author `setup-fixture.sh` (bash-3.2; `set -euo pipefail`)**

Functions: `materialize()` (copy fixture tree to `$TMPDIR/mini-wave-<ts>`, `git init` + initial commit), `main()` (arg parse, print fixture path). DoD gate script honors `FIXTURE_GATE_FAIL=1` → exit 1 (the toggleable unhappy path). Plans: p01+p02 write-disjoint (group candidates), p03 ungrouped solo finale.

**Step 2: Verify**

Run: `/bin/bash --version | head -1 && /bin/bash -n .agents/skills/oat-wave-execute/tests/mini-wave-fixture/setup-fixture.sh && /bin/bash .agents/skills/oat-wave-execute/tests/mini-wave-fixture/setup-fixture.sh && rg -n "mapfile|declare -A" .agents/skills/oat-wave-execute/tests/mini-wave-fixture/setup-fixture.sh | wc -l`
Expected: interpreter reports 3.2.x (log as evidence); syntax + full execution succeed under `/bin/bash`; materializes under `$TMPDIR`; zero bash-4 constructs.

**Step 3: Verify bundle exclusion**

Run: `bash packages/cli/scripts/bundle-assets.sh && test ! -d packages/cli/assets/skills/oat-wave-execute/tests`
Expected: exit 0 (tests dir stripped).

**Step 4: Commit**

```bash
git add .agents/skills/oat-wave-execute/tests/
git commit -m "feat(p05-t01): add mini-wave validation fixture with toggleable DoD gate"
```

---

### Task p05-t02: Dry-run procedure README

**Files:**

- Create: `.agents/skills/oat-wave-execute/tests/mini-wave-fixture/README.md`

**Step 1: Author the agent-executed procedure**

Steps: setup → `oat-wave-program new` (assert coverage invariant: 3 plans ↔ 3 rows) → compose wave (p01+p02 group, p03 ungrouped) → `oat-wave-execute` happy path (bootstrap script STATUS lines incl. view-parity, briefs, merges with pre-merge asserts, fan-in gate) → unhappy leg (`FIXTURE_GATE_FAIL=1` → verify fix-loop bookkeeping/park semantics + stored verification record) → `wave-close` (ledger row flips, PR/SHA recorded). Each step lists its pass criteria.

**Step 2: Format + Commit**

Run: `pnpm exec oxfmt --write .agents/skills/oat-wave-execute/tests/mini-wave-fixture/README.md`

```bash
git add .agents/skills/oat-wave-execute/tests/mini-wave-fixture/README.md
git commit -m "docs(p05-t02): document mini-wave dry-run procedure with unhappy-path leg"
```

---

### Task p05-t03: Execute the dry-run + record results

**Files:**

- Modify: `.oat/projects/shared/wave-skills-promotion/references/equivalence-checklist.md` (dry-run outcome column/section)
- Create: dry-run record in `implementation.md` phase notes

**Step 1: Execute** the README procedure end-to-end (happy + unhappy legs) against the PROMOTED skills.

**Step 2: Disposition findings**

Fix skill-text/script defects found (amend via normal task-fix flow); record each finding + fix in the dry-run record.

**Step 3: Verify**

Both legs pass on re-run. Run: `pnpm exec oxfmt --write .oat/projects/shared/wave-skills-promotion/`

**Step 4: Commit**

```bash
git add .oat/projects/shared/wave-skills-promotion/ .agents/skills/oat-wave-execute .agents/skills/oat-wave-program
git commit -m "test(p05-t03): mini-wave dry-run executed - findings dispositioned"
```

---

### Task p05-t04: Lockstep version bumps + release validation

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`
- Modify: `packages/cli/assets/public-package-versions.json` (generated by `bundle-assets.sh` from the bumped manifests; published in the CLI's assets dir)

**Step 1: Bump** all five public packages together (bundled assets = shipped CLI functionality), then regenerate the bundle: `bash packages/cli/scripts/bundle-assets.sh`.

**Step 2: Verify**

Run: `pnpm release:validate && pnpm lint && pnpm type-check && pnpm test && git status --short packages/`
Expected: all green; `public-package-versions.json` records the bumped versions (spot-check vs the five manifests); no expected release artifact left unstaged after Step 3.

**Step 3: Commit (exact declared files)**

```bash
git add packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json packages/cli/assets/public-package-versions.json
git commit -m "chore(p05-t04): lockstep public package bumps for wave skills release"
```

---

### Task p05-t05: W6 handoff mini-runbook

**Files:**

- Create: `.oat/projects/shared/wave-skills-promotion/references/w6-handoff-runbook.md`

**Step 1: Author** (design amendment — runbook, not note)

1. Exact released package version placeholder + instruction to pin it in stoa's W6 program artifact for provenance.
2. Migration sequence: delete repo-local skill copies → `oat tools update` → `oat sync`.
3. Row-stomp observation task: W6 operator logs the final-gate Reviews-row observation and reports back → closes the deferred watch-removal backlog item.
4. Regression protocol: on any W6 behavioral divergence, diff the equivalence-checklist row, restore source phrasing, patch release.

**Step 2: Format + Commit**

Run: `pnpm exec oxfmt --write .oat/projects/shared/wave-skills-promotion/references/w6-handoff-runbook.md`

```bash
git add .oat/projects/shared/wave-skills-promotion/references/w6-handoff-runbook.md
git commit -m "docs(p05-t05): W6 handoff mini-runbook"
```

---

## Phase 6: §4 explainer integration (FR10) — GATED on explainer-kit v1 RC

**Goal:** program-recap recipe + close-callers + personal-wrapper migration against the frozen RC.

> **GATE:** Do not start until the packaged explainer-kit v1 RC exists (project on this repo's `explainer-kit` branch). Build against the RC only — never its source tree. Coordinate merge order with explainer-kit Phase 3 (touches the same lifecycle skills). Detailed task bodies are intentionally thin placeholders and are NOT implementation-ready as written.
>
> **Gate-open checkpoint (mandatory before any p06 execution):** refine every p06 task body against the frozen RC schemas — concrete file paths, runnable verification commands, atomic staging sets — via a plan revision that preserves the existing task IDs, then re-run the plan artifact review scoped to Phase 6 before implementation proceeds.

### Task p06-t01: program-recap recipe

**Files:**

- Create: recipe file in `explainer-kit.recipe/v1` format (location per RC packaging conventions)

Reference implementation: the shipped stoa program deck. Verify: recipe validates against the RC's recipe schema.

Commit: `feat(p06-t01): add program-recap explainer recipe`

---

### Task p06-t02: wave-close / program-close explainer callers

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md`, `.agents/skills/oat-wave-program/SKILL.md`

Add caller sections: synthesize fact base from reconciled program records → invoke via `FactBaseBindingV1 {mode:'supplied'}` → output root `.oat/repo/explainers/<slug>/`; publishing human-gated. Bump versions as a separate minor (execute → 1.6.0, program → 1.2.0) so the §4 delta is independently revertible. Re-sync provider views.

Commit: `feat(p06-t02): explainer close-callers in wave skills (1.6.0/1.2.0)`

---

### Task p06-t03: Personal-wrapper migration support

**Files:** per RC migration runbook (operator-owned E2E)

Migrate the personal wrapper to `ExplainerRunRequestV1` + manifest consumption; this doubles as the RC acceptance gate. Verification: operator-run E2E green. Record outcome in `implementation.md`.

Commit: `feat(p06-t03): personal-wrapper migration to ExplainerRunRequestV1`

---

### Task p06-t04: Phase 6 release readiness (lockstep bumps for the separately merged delta)

**Files:**

- Modify: the five public package manifests (`packages/cli`, `packages/control-plane`, `packages/docs-config`, `packages/docs-theme`, `packages/docs-transforms`) + `packages/cli/assets/public-package-versions.json`

p06-t02 changes canonical `.agents/skills` assets, and repo policy requires the lockstep five-package bump + release validation in the SAME PR as any shipped-asset change. Since Phase 6 merges separately from the p05 release, it needs its own release choreography: bump all five packages, regenerate the bundle (`bash packages/cli/scripts/bundle-assets.sh`), run `pnpm release:validate && pnpm lint && pnpm type-check && pnpm test`, stage the six exact files.

Commit: `chore(p06-t04): lockstep public package bumps for explainer-integration release`

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

| Scope  | Type     | Status          | Date       | Artifact                                             |
| ------ | -------- | --------------- | ---------- | ---------------------------------------------------- |
| p01    | code     | fixes_completed | 2026-07-18 | reviews/code-p01-review-2026-07-18T164109Z.md        |
| p01    | code     | passed          | 2026-07-18 | reviews/code-p01-review-round2-2026-07-18T165109Z.md |
| p02    | code     | pending         | -          | -                                                    |
| p03    | code     | pending         | -          | -                                                    |
| p04    | code     | pending         | -          | -                                                    |
| p05    | code     | pending         | -          | -                                                    |
| p06    | code     | pending         | -          | -                                                    |
| final  | code     | pending         | -          | -                                                    |
| spec   | artifact | pending         | -          | -                                                    |
| design | artifact | passed          | 2026-07-18 | -                                                    |
| plan   | artifact | passed          | 2026-07-18 | -                                                    |
| plan   | artifact | passed          | 2026-07-18 | reviews/artifact-plan-review-2026-07-18T141952Z.md   |
| plan   | artifact | passed          | 2026-07-18 | reviews/artifact-plan-review-2026-07-18T142403Z.md   |
| plan   | artifact | passed          | 2026-07-18 | reviews/artifact-plan-review-2026-07-18T150023Z.md   |

_Design-row provenance: operator-relayed external review by the stoa-side packet author (2026-07-18); no artifact file was produced — verdict and amendments recorded in the design revision commit `5237cd57`._

_First plan-row provenance: in-session structured review (`oat-reviewer` subagent, inherited parent model, 3 attempts → clean, 2026-07-18); no artifact file — findings F1–F7 applied in the plan draft commits. The next two rows are the cross-family gate reviews (codex gpt-5.6-sol/max); all 18 findings were remediated in commit `a634db1c`. The final row is the delta-scoped gate re-run that verified every remediation and returned 0 findings (verdict ok, run 87f67c9f) — advancing all three gate events to `passed`._

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no unresolved Critical/Important/Medium)

---

## Implementation Complete

**Summary:**

- Phase 1: 4 tasks - Port + toolkit integration (p01-t03 merged into p01-t02 at plan review)
- Phase 2: 9 tasks - §2 queue + genericization
- Phase 3: 3 tasks - Dispositions (validate-plan, backlog)
- Phase 4: 2 tasks - Docs
- Phase 5: 5 tasks - Validation + release readiness
- Phase 6: 4 tasks - §4 explainer integration + its own release choreography (RC-gated)

**Total: 27 tasks** (23 unblocked; 4 gated on explainer-kit RC)

Ready for code review and merge.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- Authoritative scope: `references/2026-07-17-wave-skills-promotion-packet.md`
- Evidence ledger: `references/2026-07-17-wave-signal-ledger.md`
- Frozen skill sources: `references/skill-sources/`
