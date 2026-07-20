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

## Phase 6: §4 explainer integration (FR10) — RC GATE OPEN (f212d630)

**Goal:** program-recap recipe + close-callers + personal-wrapper migration support against the frozen RC.

> **GATE STATUS (2026-07-18): OPEN.** RC `sha256:f212d630…50b854` @ frozen commit `534a408e` verified (record self-consistency; 4/5 tarballs byte-match a pristine rebuild; all 11 schemas+recipes and both skill hashes match; CLI whole-tarball divergence reported upstream, confined outside explainer surfaces). Frozen build inputs are vendored at `references/explainer-rc-f212d630/` — build ONLY against those copies, never the explainer-kit source tree. Operator sequencing: p06 → operator acceptance → RC promotes → publish 0.2.1 (HOLD until then).
>
> Task bodies below were refined at gate-open (2026-07-18) per the mandatory checkpoint; phase-scoped plan re-review required before execution.

### Task p06-t01: program-recap recipe

**Files:**

- Create: `.agents/skills/oat-wave-execute/assets/program-recap.recipe.json` (the task's ONLY output — pure `explainer-kit.recipe/v1` JSON, no comment fields). Context: the final home `.agents/skills/explainer-kit/recipes/` arrives with explainer-kit's Phase-3 merge; record the interim-home deviation and the re-home follow-up in `implementation.md`'s Deviations table + the follow-up ledger, never inside the JSON.

**Step 1: Author** in `explainer-kit.recipe/v1` format matching the frozen schema (`references/explainer-rc-f212d630/schemas/recipe.schema.json` if present, else validate structurally against the three vendored recipe examples): `schemaVersion: "explainer-kit.recipe/v1"`, `id: "program-recap"`, `version: "1"`, `sourceRoles`: one required `program` role (accepts file/directory/git; `minBindings: 1`, `maxBindings: 1` — one program source set containing the program artifact + wave records), `requiredNarrative`: program-shape sections (program-overview, wave-map, per-wave-outcomes, convention-evolution, aggregate-numbers, follow-up-ledger), `artifacts`: one required hub (`id: "program-recap"`, `type: "hub"`, `template: "house-style"`, `required: true`), `discoveryLimits` mirroring project-recap (2 consecutive no-new-findings rounds, max 8). Reference implementation: the stoa program deck (packet §4); the vendored `project-recap.json` is the structural template.

**Step 2: Verify** — run exactly:

```bash
python3 - <<'PY'
import json
new = json.load(open('.agents/skills/oat-wave-execute/assets/program-recap.recipe.json'))
ref = json.load(open('.oat/projects/shared/wave-skills-promotion/references/explainer-rc-f212d630/recipes/project-recap.json'))
assert new['schemaVersion'] == 'explainer-kit.recipe/v1', new['schemaVersion']
assert set(new) == set(ref), (set(new) ^ set(ref))
assert set(new['sourceRoles'][0]) == set(ref['sourceRoles'][0])
assert set(new['artifacts'][0]) == set(ref['artifacts'][0])
assert set(new['discoveryLimits']) == set(ref['discoveryLimits'])
print('recipe shape OK: key sets match vendored explainer-kit.recipe/v1')
PY
```

Expected: `recipe shape OK`.

**Step 3: Commit** — `feat(p06-t01): add program-recap explainer recipe (explainer-kit.recipe/v1)`

---

### Task p06-t02: wave-close / program-close explainer callers

**Files:**

- Modify: `.agents/skills/oat-wave-execute/SKILL.md` (closeout step 8 gains the optional explainer caller)
- Modify: `.agents/skills/oat-wave-program/SKILL.md` (wave-close mode + a new program-close note gain the caller)

**Step 1: Author caller sections (mechanical-layer only — judgment stays with the orchestrator):**

- The ORCHESTRATOR synthesizes the fact base (judgment); the skill text specifies the mechanical contract: fact base conforms to `explainer-kit.fact-base/v1` (required keys exactly: `schemaVersion, generatedAt, mode, freshnessPolicy, sources, claims, unresolvedClaims, overrides`), sourced from the reconciled program artifact + wave summaries + completion records.
- Invocation: construct an `explainer-kit.run-request/v1` document (required keys exactly: `schemaVersion, recipe, slug, outputRoot, factBase, mode`) with `recipe: { "id": "program-recap", "version": "1" }` (the schema requires an OBJECT with exactly id+version), `factBase` as a supplied binding per the schema's factBaseBinding def — required keys `mode, freshnessPolicy` with `mode: "supplied"` plus `path` pointing at the synthesized fact-base file — and `outputRoot: .oat/repo/explainers/<slug>/`.
- Consumption: the skill reads back `explainer-kit.manifest/v1` (required keys: `schemaVersion, runId, slug, recipe, createdAt, source, theme, artifacts, immutableHashes, outcome, buildRecord, warnings`) and records `runId` + `outcome` in the wave/program ledger row.
- Publishing stays HUMAN-GATED (destination-contract.md); the caller never invokes publish.
- Frontmatter versions: execute → 1.6.0, program → 1.2.0 (separate minor; §4 delta independently revertible).

**Step 2: Verify** — run exactly:

```bash
python3 - <<'PY'
import json, re
base = '.oat/projects/shared/wave-skills-promotion/references/explainer-rc-f212d630/schemas/'
expect = {
  'explainer-kit.fact-base/v1': json.load(open(base+'fact-base.schema.json'))['required'],
  'explainer-kit.run-request/v1': json.load(open(base+'run-request.schema.json'))['required'],
  'explainer-kit.manifest/v1': json.load(open(base+'manifest.schema.json'))['required'],
}
text = open('.agents/skills/oat-wave-execute/SKILL.md').read() + open('.agents/skills/oat-wave-program/SKILL.md').read()
for sid, req in expect.items():
    assert sid in text, f'missing schema id {sid}'
    joined = ', '.join(req)
    assert joined in text.replace('`',''), f'required-key list drift for {sid}: expected "{joined}"'
print('schema ids + required-key lists match vendored schemas')
PY
rg -n "\[JUDGMENT\]" .agents/skills/oat-wave-program/SKILL.md | wc -l
```

Expected: match message printed; `[JUDGMENT]` count unchanged from pre-edit (2). Then `pnpm exec oxfmt --write` both files; `pnpm lint`.

**Step 3: Re-sync** — `oat sync --scope all`; verify no unrelated changes.

**Step 4: Commit** — `feat(p06-t02): explainer close-callers in wave skills (1.6.0/1.2.0)`

---

### Task p06-t03: Personal-wrapper migration support

**Scope extension (operator-confirmed via stoa Flag 2, 2026-07-18):** p06 ships the migration CODE as installable artifacts, not runbook-only — the wrapper source and personal credentials live on the operator's laptop, so the repo authors a complete scaffold with clearly-marked personal-config seams the operator fills at install.

**Files:**

- Create: `.oat/projects/shared/wave-skills-promotion/references/personal-explainer-kit/` — the INSTALLABLE wrapper skill tree: `SKILL.md` (thin personal wrapper over the packaged `oat-explainer-kit`: constructs `explainer-kit.run-request/v1`, consumes `explainer-kit.manifest/v1`, personal destinations behind config seams) + `scripts/acceptance.mjs` (full test matrix: vault, Google Docs, presets, personal destinations, manifest consumption, rollback; emits sanitized `private-wrapper-result.json`; final-RC identifier placeholders pinned at freeze) + `config.seams.example.json` (every personal value the operator supplies, with provenance comments pointing at the 0.4.1 backup).
- Create: `.oat/projects/shared/wave-skills-promotion/references/personal-wrapper-migration.md` — the install/run companion runbook the OPERATOR executes against `~/.agents/skills/personal-explainer-kit` (copy tree → fill seams → run acceptance).

**Step 1: Author the runbook** from the vendored contracts: (a) backup exists (`~/.agents/skills-backup/oat-explainer-kit-0.4.1` — confirmed stoa-side); (b) replace with RC 1.0.0 skill content — ACCEPTANCE PINS THE SKILL SUBTREE, not the whole CLI tarball: install `package/assets/skills/oat-explainer-kit` whose content hash must equal rc.json's recorded `sha256:2cf98952c03a60eaf1853fcb9968c0258c2349e35c8f679d16003bbceec5b654` (verify with the RC tool's own hashing via a rebuild record, or byte-compare against a rebuild). Artifact locator: deterministic rebuild procedure = temp worktree at `534a408e` → `pnpm install --frozen-lockfile && pnpm build` → `node tools/release/build-explainer-rc.mjs --output <tmp> --record <tmp>`; the rebuilt CLI tarball's whole-file hash is `sha256:296cfa27d678f269ff649b92ebd7…` (differs from rc.json's recorded whole-tarball hash — upstream provenance question msg_02337b3a27f4 — but the skill-subtree and all schema/recipe hashes match the record, which is what acceptance consumes); (c) wrapper invocation migrates to constructing `explainer-kit.run-request/v1` (exact required keys) and consuming `explainer-kit.manifest/v1` (runId/outcome/artifacts/immutableHashes) instead of pre-1.0 interfaces; (d) acceptance: SEQUENCING (explainer decision_gate 2026-07-18): acceptance runs against the POST-p06 FINAL RC (frozen by explainer-kit after merging our p06 delta), not f212d630 — the runbook carries placeholder fields for the final RC's rcId/commit/subtree-hash to be pinned at freeze; the f212d schemas remain the valid contract basis (p06 does not alter explainer schemas). Run `~/.agents/skills/personal-explainer-kit/scripts/acceptance.mjs` against that exact final RC covering vault, Google Docs, presets, personal destinations, manifest consumption, rollback; emit sanitized `private-wrapper-result.json`; (e) rollback: restore the 0.4.1 backup. Result feeds BOTH the explainer-kit RC acceptance and this project's p06-t03 verification record (stored-verification-record discipline, B5).

**Step 2: Verify** — run the same schema-fidelity Python check as p06-t02 Step 2 pointed at the runbook file (assert the three schema ids + joined required-key lists appear); `rg -n "2cf98952c03a60" <runbook>` shows the pinned subtree hash; `pnpm exec oxfmt --write`.

**Step 3: Commit** — `feat(p06-t03): personal-wrapper migration runbook for RC acceptance`

**Completion semantics:** task completes when the installable tree + runbook ship; the OPERATOR-run E2E result is recorded in implementation.md when it arrives (project completion may await it per the plan's acceptance criteria).

---

### Task p06-t04: Phase 6 release readiness (lockstep bumps for the separately merged delta)

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`, `packages/cli/assets/public-package-versions.json`

**Step 1:** Bump all five 0.2.1 → 0.2.2 (p06-t01/t02 change shipped `.agents/skills` assets; lockstep policy applies per separately-merged PR). Regenerate bundle (`bash packages/cli/scripts/bundle-assets.sh`).

**Step 2: Verify** — `pnpm release:validate && pnpm lint && pnpm type-check && pnpm test`; version asset matches manifests.

**Step 3: Commit** — `chore(p06-t04): lockstep public package bumps for explainer-integration release`

**Publish-hold note:** 0.2.1 npm publish is HELD until the RC promotes post-acceptance (operator sequencing 2026-07-18); 0.2.2 publishes after this delta merges and the same acceptance sequencing completes.

---

## Phase p-rev3: Revision 3 — first-consumer feedback (1.7.0)

Source: Orc-repo 4-wave program handoff (`references/2026-07-20-wave-skills-first-run-handoff.md`, log-verified Q&A 2026-07-20) + operator recap-disposition observation. Signal 9 routed to the explainer project (not ours).

### Task prev3-t01: (revision) Gate-row status flow — passed is the only terminal state (S8)

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1:** Fix the wave-0/1 precedent wording (Step 4 plan gate + closeout final gate + step 6.5): plan gates MAY PROCEED at `fixes_completed`; every gate row MUST flip to `passed` once its fix dispositions carry verification records (B5) — `passed` is the only terminal state for gate rows; step 6.5's restore-watch presumes it.

**Step 2: Verify** — `rg -U -n "only\s+terminal\s+state" .agents/skills/oat-wave-execute/SKILL.md` (wrap-tolerant); commit `fix(prev3-t01): gate rows terminate at passed - proceed-point vs terminal state (S8)`.

### Task prev3-t02: (revision) Merge + fix-round discipline (S5, S7)

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1:** Sharpen the pre-merge guard (B2 text) to the prescribed one-invocation compound shape: `cd /abs/repo/root && [ "$(git branch --show-current)" = "wave-N-execution" ] || exit 1 && git merge --no-ff …` with the rationale (cwd is healable via explicit cd; branch drift hard-aborts; advisory prints in separate invocations proved worthless — W2 incident + 2 saves).

**Step 2:** New standing rule: fix rounds are APPEND-ONLY — never amend a reviewed SHA (amending invalidates stored review verdicts citing it); fix-round briefs MUST state append-only; a worker refusal of an amend instruction is correct role behavior (p10 precedent).

**Step 3:** Step 3.1 `--no-commit`: add a preflight `oat project new --help` probe with both branches (flag present → use it; absent (version skew) → expect auto-commit and land wrapper artifacts in a follow-up commit), styled like rule 8's ≥0.1.65 check.

**Verify** — rg for the compound guard + "append-only" + the probe; commit `fix(prev3-t02): same-shell merge guard, append-only fix rounds, --no-commit probe (S5,S7)`.

### Task prev3-t03: (revision) Gate execution mechanics (S1, S2, S3, S4)

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1 (S1):** Condition rule 3's "gate reviewers commit their own artifacts" on primary-checkout execution; from linked worktrees (git metadata outside the sandbox) the ORCHESTRATOR commits gate artifacts on the reviewer's behalf — environment-conditional refinement, both consumers' evidence cited (stoa waves 2–3; Orc W1–W4).

**Step 2 (S2):** New dispatch-posture rule alongside 6/8: gates dispatch in BACKGROUND by default with a completion watcher (orchestrator-host foreground tool ceilings — e.g. 600s — are shorter than legitimate wave-scoped reviews); foreground only for short scopes; rule 8 remains the recovery path (used once in Orc W2, worked).

**Step 3 (S3):** Standing rule: piped DoD/gate verification chains run under `set -o pipefail` or capture the raw exit code pre-filter (Orc W4: `pnpm test | grep` masked a 1-failed-test run).

**Step 4 (S4):** Single-writer-until-committed rule for review artifacts: an uncommitted review artifact is exclusively owned by whichever agent is live on it; orchestrator dispositions land as immediate commits or wait for agent termination; lock/suffix conventions rejected (fragment the audited review chain).

**Verify** — rg each; commit `fix(prev3-t03): gate posture, artifact ownership, pipefail, worktree commit fallback (S1-S4)`.

### Task prev3-t04: (revision) Bootstrap CI waiver + rule-9 citation + program-skill optional-step disposition (S6 + Q5 + recap)

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`, `.agents/skills/oat-wave-program/SKILL.md`

**Step 1:** Closeout/merge-wait guidance: a wave merging into a repo with NO CI records a one-line explicit waiver in the wave plan ("merge gate = local DoD only"); the CI-introducing wave's first green run certifies the cumulative merged tree and is recorded as waiver closure; no retroactive gate re-runs.

**Step 2:** Rule 9 gains the second-consumer citation (Orc: regex vs oxfmt padding at wave-close; line-based transform required) — text otherwise verbatim.

**Step 3 (program skill):** Optional-step disposition rule in wave-close: an autonomous orchestrator NEVER silently drops an optional step — wave-close bookkeeping records either the recap manifest runId/outcome or an explicit "recap: not run — {reason}" ledger entry (silent discretion is indistinguishable from oversight).

**Step 4:** Versions: execute frontmatter → 1.7.0, program → 1.3.0. Re-sync provider views. (Lockstep 0.2.7 already present on this branch/PR.)

**Verify** — version greps; `oat sync --scope all` clean; `pnpm lint`; commit `feat(prev3-t04): CI waiver rule, optional-step disposition, versions 1.7.0/1.3.0`.

### Task prev3-t05: (revision) Closeout step 7 names the full completion tail (S10)

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`

**Step 1:** Rewrite closeout step 7: the requirement is the full `oat-project-complete` PROCESS, not its nearest CLI command — name the tail explicitly (complete-state → `oat project archive` [CLI-owned local move + summary export + S3 sync when `s3SyncOnComplete`] → active-pointer clear → bookkeeping commit), state that `oat project complete-state` ALONE does not satisfy it (Orc first-run evidence: 4 wrapper projects left unarchived until operator audit), and note that under autonomous execution the interactive skill is model-invisible (`disable-model-invocation: true`) — execute its SKILL.md as a document, resolving gates from config, until an `oat-project-complete-auto` companion exists (see backlog).

**Step 2: Verify** — `rg -U -n "complete-state.*alone|full.*tail|archive" .agents/skills/oat-wave-execute/SKILL.md | head`; commit `fix(prev3-t05): closeout step 7 names the full completion tail (S10)`.

## Phase p-rev4: Revision 4 — program-boundary closeout semantics (operator design feedback 2026-07-20)

Source: operator direction after the Orc program: (1) recap belongs at PROGRAM scope, not per-wave; (2) under autonomous execution, per-wave completion may defer the archive tail — merge and move on — with ONE operator checkpoint at program end: "all waves merged — run the completion tail across all wave wrappers now?"

### Task prev4-t01: (revision) Program-scope recap; per-wave recap default-off

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`, `.agents/skills/oat-wave-program/SKILL.md`

**Step 1 (program skill):** The recap caller's DEFAULT scope is the program: at the wave-close that completes the FINAL pending wave (program close), offer/run the program-recap caller. Per-wave recaps are default-OFF; a wave-close that skips one records the explicit disposition "recap: deferred to program close" (satisfies the optional-step disposition rule — no silent omission).

**Step 2 (execute skill):** Closeout step 8's recap pointer aligns: per-wave recap only on explicit operator request; the program recap is the deliverable, generated at program close from the reconciled program artifact + ALL wave records.

**Verify:** `rg -U -n "program close|deferred to program close" both files`; commit `feat(prev4-t01): recap defaults to program scope with explicit per-wave deferral`.

### Task prev4-t02: (revision) Autonomous archive deferral + program-end completion checkpoint

**Files:** `.agents/skills/oat-wave-execute/SKILL.md`, `.agents/skills/oat-wave-program/SKILL.md`

**Step 1 (execute skill, step 7):** Add the autonomous-mode branch: per-wave, `complete-state` + bookkeeping run as today, but the ARCHIVE TAIL (archive → S3 → pointer clear) MAY be deferred program-scoped; each deferral is recorded in the wave ledger row ("completion tail: deferred to program close") — explicit disposition, never silent. Interactive runs unchanged (full tail per wave remains valid).

**Step 2 (program skill):** Program close gains the OPERATOR CHECKPOINT: when the final wave's ledger row flips done and all merges are recorded, ask exactly one question — "All waves are merged and the program is complete. Run the completion tail (oat-project-complete: archive + S3 + pointer clear) across all N wave wrapper projects now?" On yes: run the tail per wrapper (via oat-project-complete-auto when it ships; as-document until then), flip each ledger deferral note to done. On no/defer: record the standing deferral with owner. This checkpoint is HUMAN-GATED even in autonomous runs — it is the program's completion gate, mirroring the recap publish gate.

**Verify:** rg evidence both files; versions: execute → 1.7.1, program → 1.3.1 (patch: semantics additions, no rule removals); commit `feat(prev4-t02): program-end completion checkpoint + autonomous archive deferral`.

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

| Scope  | Type     | Status          | Date       | Artifact                                                             |
| ------ | -------- | --------------- | ---------- | -------------------------------------------------------------------- |
| p01    | code     | fixes_completed | 2026-07-18 | reviews/archived/code-p01-review-2026-07-18T164109Z.md               |
| p01    | code     | passed          | 2026-07-18 | reviews/archived/code-p01-review-round2-2026-07-18T165109Z.md        |
| p02    | code     | fixes_completed | 2026-07-18 | reviews/archived/code-p02-review-2026-07-18T171810Z.md               |
| p02    | code     | passed          | 2026-07-18 | reviews/archived/code-p02-review-round2-2026-07-18T172343Z.md        |
| p03    | code     | fixes_completed | 2026-07-18 | reviews/archived/code-p03-review-2026-07-18T174325Z.md               |
| p03    | code     | passed          | 2026-07-18 | reviews/archived/code-p03-review-round2-2026-07-18T174858Z.md        |
| p04    | code     | fixes_completed | 2026-07-18 | reviews/archived/code-p04-review-2026-07-18T175753Z.md               |
| p04    | code     | passed          | 2026-07-18 | reviews/archived/code-p04-review-round2-2026-07-18T180320Z.md        |
| p05    | code     | fixes_completed | 2026-07-18 | reviews/archived/code-p05-review-2026-07-18T183116Z.md               |
| p05    | code     | passed          | 2026-07-18 | reviews/archived/code-p05-review-round2-2026-07-18T183353Z.md        |
| p05    | code     | fixes_completed | 2026-07-18 | reviews/archived/p05-review-2026-07-18T184321Z.md                    |
| p05    | code     | passed          | 2026-07-18 | reviews/archived/p05-review-2026-07-18T185045Z.md                    |
| p06    | code     | fixes_completed | 2026-07-19 | reviews/code-p06-review-round2-2026-07-19T010226Z.md                 |
| p06    | code     | passed          | 2026-07-19 | reviews/code-p06-review-round3-2026-07-19T010826Z.md                 |
| p06    | code     | passed          | 2026-07-19 | reviews/code-p06-review-2026-07-19T004731Z.md                        |
| final  | code     | fixes_completed | 2026-07-18 | reviews/archived/final-review-2026-07-18T191920Z.md                  |
| final  | code     | passed          | 2026-07-18 | reviews/archived/final-review-round2-2026-07-18T193844Z.md           |
| p-rev1 | code     | passed          | 2026-07-18 | reviews/code-prev1-review-2026-07-18T221306Z.md                      |
| p-rev2 | code     | passed          | 2026-07-18 | reviews/code-prev2-review-2026-07-18T234907Z.md                      |
| p-rev3 | code     | passed          | 2026-07-20 | reviews/code-prev3-review-2026-07-20T143119Z.md (+ addendum 143712Z) |
| p-rev4 | code     | fixes_completed | 2026-07-20 | reviews/code-prev4-review-2026-07-20T154506Z.md                      |
| p-rev4 | code     | passed          | 2026-07-20 | reviews/code-prev4-review-round2-2026-07-20T154934Z.md               |
| plan   | artifact | passed          | 2026-07-18 | -                                                                    |
| spec   | artifact | pending         | -          | -                                                                    |
| design | artifact | passed          | 2026-07-18 | -                                                                    |
| plan   | artifact | passed          | 2026-07-18 | -                                                                    |
| plan   | artifact | passed          | 2026-07-18 | reviews/archived/artifact-plan-review-2026-07-18T141952Z.md          |
| plan   | artifact | passed          | 2026-07-18 | reviews/archived/artifact-plan-review-2026-07-18T142403Z.md          |
| plan   | artifact | passed          | 2026-07-18 | reviews/archived/artifact-plan-review-2026-07-18T150023Z.md          |

_Design-row provenance: operator-relayed external review by the stoa-side packet author (2026-07-18); no artifact file was produced — verdict and amendments recorded in the design revision commit `5237cd57`._

_Gate-open p06 plan re-review (last plan row): in-session structured review, 2 rounds (1 Critical + 4 Important applied → clean), phase-scoped per the p06 gate contract; no artifact file — findings applied in the gate-open revision commits._

_First plan-row provenance: in-session structured review (`oat-reviewer` subagent, inherited parent model, 3 attempts → clean, 2026-07-18); no artifact file — findings F1–F7 applied in the plan draft commits. The next two rows are the cross-family gate reviews (codex gpt-5.6-sol/max); all 18 findings were remediated in commit `a634db1c`. The final row is the delta-scoped gate re-run that verified every remediation and returned 0 findings (verdict ok, run 87f67c9f) — advancing all three gate events to `passed`._

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no unresolved Critical/Important/Medium)

---

## Phase p-rev1: Revision 1

Source: GitHub PR #158 Bugbot review comments (2026-07-18; 4 Medium findings)

### Task prev1-t01: (revision) Fix fixture program-row coverage grep

**Files:**

- Modify: `.agents/skills/oat-wave-execute/tests/mini-wave-fixture/README.md`

**Step 1:** Both PROGRAM_COUNT sites (~L53-57, ~L214-216): match template-correct link-style rows AND plain rows, e.g. `grep -cE '^\| \[?mini-p0[123]'`. Bugbot comment 3609070068.

**Step 2: Verify**
Run: `printf '| [mini-p01](./x.md) |\n| mini-p02 |\n' | grep -cE '^\| \[?mini-p0[123]'`
Expected: 2

**Step 3: Commit**

```bash
git add .agents/skills/oat-wave-execute/tests/mini-wave-fixture/README.md
git commit -m "fix(prev1-t01): fixture coverage grep matches link-style program rows"
```

### Task prev1-t02: (revision) Honest sync-commit failure in bootstrap script

**Files:**

- Modify: `.agents/skills/oat-wave-execute/scripts/bootstrap-group.sh`

**Step 1:** Drop the unquoted `$FILES` args from the sync commit (the set is already staged; commit the staged set). Bugbot 3609072482.

**Step 2:** On sync-commit failure, mark the phase failed: STATUS line emits `status=failed reason=sync-commit` (not success) and the script's exit code reflects the failure, per the bootstrap-auto contract. Keep bash-3.2 (`/bin/bash -n`, no bash-4 constructs). Bugbot 3609072481.

**Step 3: Verify**
Run: `/bin/bash -n .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh && rg -n 'FILES=' .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh | wc -l`
Expected: syntax OK; 0 (variable removed). Re-run the fixture happy leg to confirm STATUS unchanged on success.

**Step 4: Commit**

```bash
git add .agents/skills/oat-wave-execute/scripts/bootstrap-group.sh
git commit -m "fix(prev1-t02): sync-commit failure fails bootstrap status honestly"
```

### Task prev1-t03: (revision) Align state.md p06 gate frontmatter + prose

**Files:**

- Modify: `.oat/projects/shared/wave-skills-promotion/state.md`

**Step 1:** Frontmatter `oat_blockers` (now a multi-line YAML list after oxfmt) → `[]` with the RC-opened comment; Progress line "⧗ p06 ... BLOCKED on explainer-kit v1 RC" → "⧗ p06 ... RC gate OPEN; executes after PR #158 merges"; Next Milestone drops "when the RC ships" phrasing. Bugbot 3609163349. Use anchored regex + substitution-count assert (rule-9 discipline — the prior edit no-opped on oxfmt re-formatting).

**Step 2: Verify**
Run: `rg -n "BLOCKED on explainer" .oat/projects/shared/wave-skills-promotion/state.md | wc -l`
Expected: 0; `oat project status --project-path .oat/projects/shared/wave-skills-promotion --json` shows no p06-RC blocker.

**Step 3: Commit**

```bash
git add .oat/projects/shared/wave-skills-promotion/state.md
git commit -m "fix(prev1-t03): align p06 RC-gate state frontmatter with prose"
```

## Phase p-rev2: Revision 2

Source: stoa W6-migration report (references/w6-migration-report-2026-07-18.md) + superseded explainer RC (2026-07-18)

### Task prev2-t01: (revision) Installed skill scripts get execute bits regardless of source mode

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/copy-helpers.ts` (or the shared install seam both paths use)
- Modify: `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts`, `packages/cli/src/commands/tools/update/update-tools.test.ts`

**Step 1: Write test (RED)** — simulate npm's mode normalization: seed a bundled skill fixture whose `scripts/*.sh` is 0644 (no exec bit), install via BOTH paths (workflows install AND tools update skill path), assert the installed script is executable. Root cause: npm strips exec bits at pack time (verified: 0.2.0 tarball ships bootstrap-group.sh as rw-r--r--), so mode-preserving copy is insufficient from a published package.

**Step 2: Implement (GREEN)** — after copying a skill directory, chmod 0755 files under its `scripts/` subdirectory (mirror the existing `.oat/scripts` pack-asset chmod at update-tools.ts ~L272). Put the chmod in the shared seam (copyDirWithStatus/copyDirWithVersionCheck callers or a helper) so init, install, and update paths all get it. Keep the copyDirectory mode preservation (still correct for repo-checkout installs).

**Step 3: Verify** — targeted tests, then `pnpm --filter @open-agent-toolkit/cli test && pnpm lint && pnpm type-check`.

**Step 4: Commit** — `fix(prev2-t01): chmod installed skill scripts executable (npm strips modes)`

### Task prev2-t02: (revision) Runbook hardening from stoa migration findings

**Files:**

- Modify: `.oat/projects/shared/wave-skills-promotion/references/w6-handoff-runbook.md`

**Step 1:** §2 gains a cleanup step: repos migrating FROM repo-local copies must remove pre-packaged provider-view entries (e.g. stale `.cursor/skills/oat-wave-*` symlinks) and confirm `oat status --scope all` ends clean. §1's version-verify upgraded to CONTENT verification: `npm pack @open-agent-toolkit/cli@<ver>` + inspect for the six skill files (0.1.76 shipped same-day WITHOUT them — existence of a version is not evidence). Note the §2 chmod workaround as retired once prev2-t01 ships in a patch release.

**Step 2: Verify** — `rg -n "npm pack|status --scope all|chmod" <runbook>` shows all three; oxfmt clean.

**Step 3: Commit** — `docs(prev2-t02): harden W6 runbook - view cleanup + content verify`

### Task prev2-t03: (revision) Lockstep patch bumps for the installer fix

**Files:**

- Modify: five public package manifests + `packages/cli/assets/public-package-versions.json`

**Step 1:** Bump all five 0.2.0 → 0.2.1; regenerate bundle; `pnpm release:validate && pnpm test && pnpm lint && pnpm type-check`.

**Step 2: Commit** — `chore(prev2-t03): lockstep 0.2.1 for installer exec-bit fix`

## Implementation Complete

**Summary:**

- Phase 1: 4 tasks - Port + toolkit integration (p01-t03 merged into p01-t02 at plan review)
- Phase 2: 9 tasks - §2 queue + genericization
- Phase 3: 3 tasks - Dispositions (validate-plan, backlog)
- Phase 4: 2 tasks - Docs
- Phase 5: 5 tasks - Validation + release readiness
- Phase 6: 4 tasks - §4 explainer integration + its own release choreography (RC-gated)
- Phase p-rev1: 3 tasks - PR #158 Bugbot revision
- Phase p-rev2: 3 tasks - stoa migration findings (installer exec-bit, runbook, 0.2.1)
- Phase p-rev3: 5 tasks - Orc first-consumer feedback (1.7.0/1.3.0)
- Phase p-rev4: 2 tasks - program-boundary closeout semantics (operator)

**Total: 40 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md`
- Spec: `spec.md`
- Discovery: `discovery.md`
- Authoritative scope: `references/2026-07-17-wave-skills-promotion-packet.md`
- Evidence ledger: `references/2026-07-17-wave-signal-ledger.md`
- Frozen skill sources: `references/skill-sources/`
