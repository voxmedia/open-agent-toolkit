---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-05
oat_phase: plan
oat_phase_status: in_progress
oat_plan_hill_phases: [] # phases to pause AFTER completing (empty = every phase)
oat_plan_parallel_groups: [['p01', 'p02', 'p03']] # config, assets, and lifecycle-skill edits are file-disjoint
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: oat-project-retro

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Ship an evidence-grounded project retrospective for the OAT lifecycle tail: an `oat-project-retro` skill (generate + apply modes), a companion `oat-project-retro-file` filing skill, a `project-retro.md` template, `retro` as a post-implement sequence step with a `workflow.retro` config namespace, a completion-path safety-net offer, and full docs.

**Architecture:** The retro artifact is a machine-scannable contract — two registers (promotions, upstream feedback) with per-item status plus frontmatter rollups — consumed by three decoupled consumers: the completion offer, the retro skill's apply mode, and the filing skill. Consent flows through configuration; nothing runs unsolicited. See `design.md`.

**Tech Stack:** TypeScript ESM (`packages/cli` config surface, vitest), OAT skill markdown (`.agents/skills`), lifecycle templates (`.oat/templates`), Fumadocs (`apps/oat-docs`).

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): accept retro post-implement sequence step`

## Planning Checklist

- [ ] Confirmed HiLL checkpoints with user (default: pause after every phase; adjust `oat_plan_hill_phases` if desired)
- [x] Set `oat_plan_hill_phases` in frontmatter (default `[]` = every phase)
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

`oat_plan_parallel_groups: [['p01', 'p02', 'p03']]`

- **p01 (CLI config)** writes only `packages/cli/src/config/*` plus the sequence-contracts test under `packages/cli/src/commands/init/tools/shared/`. Verification is scoped vitest runs.
- **p02 (template + skills + registration)** writes new directories `.agents/skills/oat-project-retro*/`, the new `.oat/templates/project-retro.md`, and registration lists in `packages/cli/src/commands/init/tools/shared/skill-manifest.ts` and `packages/cli/scripts/bundle-inputs.mjs` — none of which p01 or p03 touch. Verification is manifest-scoped vitest plus a CLI build.
- **p03 (lifecycle skill edits)** writes only two existing skill files (`oat-project-implement/references/completion-and-closeout.md`, `oat-project-complete/SKILL.md`). Verification is repo format/lint.

Write sets are file-disjoint (p01 and p02 touch different files in the same `shared/` directory), and each phase verifies independently, so the three run as one parallel group. **p04 (docs)** stays sequential after the group: it documents the exact config keys from p01 and skills from p02/p03. **p05 (release + acceptance)** is last: the lockstep bump must cover all shipped changes, and the dogfood run needs the complete feature.

---

RED/GREEN/Refactor is used where work is testable (p01, p02-t04); skill/template/docs authoring tasks use author → verify → commit shapes.

## Phase 1: CLI Config Surface

### Task p01-t01: Accept `retro` in the post-implement step vocabulary

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`

**Step 1: Write test (RED)**

Add cases: structured sequences accept `'retro'` in `preApproval` and in `postApproval`; duplicate-step rejection still applies across arrays; legacy strings (`wait`/`summary`/`pr`/`docs-pr`) normalize exactly as before with no retro; sequence-contracts test covers the widened vocabulary.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
Expected: New cases fail (RED)

**Step 2: Implement (GREEN)**

```typescript
// packages/cli/src/config/oat-config.ts
export type WorkflowPostImplementStep = 'summary' | 'document' | 'pr' | 'retro';
// VALID_POST_IMPLEMENT_STEPS gains 'retro'; legacy map unchanged
```

Run: same vitest command
Expected: Tests pass (GREEN)

**Step 3: Refactor**

None expected; keep the additive change minimal.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts
git commit -m "feat(p01-t01): accept retro post-implement sequence step"
```

---

### Task p01-t02: Add the `workflow.retro` config namespace

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`

**Step 1: Write test (RED)**

Cases: valid `filing.repo` (`issues|backlog|none`), `filing.upstream` (`issues|none`), `apply` (`auto|ask`), `upstreamRepo` (`owner/name` shape); invalid enum values and malformed `upstreamRepo` dropped to `undefined`; unknown keys dropped; layered resolve merges `workflow.retro` with the same precedence as sibling workflow keys.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts`
Expected: New cases fail (RED)

**Step 2: Implement (GREEN)**

```typescript
// packages/cli/src/config/oat-config.ts (design.md Data Models)
export type WorkflowRetroFilingDestination = 'issues' | 'backlog' | 'none';
export type WorkflowRetroApply = 'auto' | 'ask';
export interface WorkflowRetroConfig {
  filing?: {
    repo?: WorkflowRetroFilingDestination;
    upstream?: 'issues' | 'none';
  };
  apply?: WorkflowRetroApply;
  upstreamRepo?: string; // owner/name; default lives in skill guidance
}
// normalizeWorkflowRetroConfig(...) following existing normalization patterns;
// OatWorkflowConfig gains retro?: WorkflowRetroConfig; resolve merge wired.
```

Run: same vitest command
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Align helper naming/ordering with neighboring normalizers.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check && pnpm --filter @open-agent-toolkit/cli test`
Expected: No errors; full package suite green

**Step 5: Commit**

```bash
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts
git commit -m "feat(p01-t02): add workflow.retro config namespace"
```

---

## Phase 2: Retro Template, Skills, and Registration

### Task p02-t01: Author the `project-retro.md` template

**Files:**

- Create: `.oat/templates/project-retro.md`

**Step 1: Author**

Follow design.md Data Models exactly: frontmatter (`oat_retro_project`, `oat_retro_generated`, `oat_retro_evidence_sources` with per-source `status`, `oat_retro_promotions` / `oat_retro_filing` rollups, `oat_generated`, plus `oat_template: true` / `oat_template_name: project-retro` scaffold markers); core sections (Executive Summary; Evidence and Review Method; Outcome Snapshot; What Went Well; Challenges and Struggles; Where We Changed Course; Repo Improvements promotion register; OAT Upstream Feedback upstream register with explicit empty-state line; Reflections); conditional sections with include-when guidance (Decision Register + Rejected/Superseded Alternatives; New Architecture Patterns; Domain Learnings; Gotchas for Humans; Gotchas for Autonomous Agents; Remaining Boundaries and Follow-Ups); register item format with stable `RP-NN` / `UP-NN` IDs and the mutable-field contract (`Status`, `Applied-ref` / `Destination`, `Sanitized`).

**Step 2: Verify**

Run: `pnpm exec oxfmt --check .oat/templates/project-retro.md`
Expected: No formatting diffs; template sections match design.md's core/conditional list one-for-one

**Step 3: Commit**

```bash
git add .oat/templates/project-retro.md
git commit -m "feat(p02-t01): add project-retro artifact template"
```

---

### Task p02-t02: Author the `oat-project-retro` skill

**Files:**

- Create: `.agents/skills/oat-project-retro/SKILL.md`
- Create: `.agents/skills/oat-project-retro/references/apply-procedure.md`
- Create: `.agents/skills/oat-project-retro/references/evidence-and-lanes.md`
- Create: `.agents/skills/oat-project-retro/references/retro-quality-bar.md`

**Step 1: Author**

Per design.md Component Design and the handoff (`references/oat-project-retro-skill-handoff.md`):

- Frontmatter `version: 1.0.0`; description per the handoff's suggested identity ("Do NOT auto-invoke merely because implementation or summary completed").
- SKILL.md: mode resolution (generate vs apply; explicit flag/wording beats inference), OAT progress banner, active-project resolution, evidence inventory with availability honesty, generate flow (template scaffold, dual registers `proposed`, frontmatter rollups, complete-or-delete on interruption), consent enforcement (interactive offers; `workflow.retro.apply` and `workflow.retro.filing` gating for non-interactive; chain to filing only when filing config exists), project-log entry + artifact hygiene + commit.
- `apply-procedure.md`: promotion classification (docs | agents-instruction | rule | decision | code-follow-up), application steps per type (decision records via `oat decision new`), per-item status writeback, idempotent resume, batch-vs-per-item commit guidance.
- `evidence-and-lanes.md`: evidence reading order from the handoff, environment detection (cloud tooling / local transcripts / none), recon lane guidance with scaling, transcript caveats (committed ledgers authoritative when transcript bodies are missing).
- `retro-quality-bar.md`: handoff quality bar (evidence-first, confirmed vs hypothesis vs inconclusive, rejected alternatives, run-specific reflections) plus core/conditional section scaling.

**Step 2: Verify**

Run: `pnpm format && pnpm lint`
Expected: `.agents/skills` formatting and lint pass; SKILL.md cross-references to the three reference files resolve (paths exist)

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-retro
git commit -m "feat(p02-t02): add oat-project-retro skill"
```

---

### Task p02-t03: Author the `oat-project-retro-file` skill

**Files:**

- Create: `.agents/skills/oat-project-retro-file/SKILL.md`

**Step 1: Author**

Per design.md filing flow: frontmatter `version: 1.0.0`; artifact resolution (active project default, explicit path override); capability preflight matrix (lane × destination: issues enabled? credentials? backlog initialized?) reported before items; destination resolution (`workflow.retro.filing` default + interactive confirmation/override; non-interactive uses config as-is, files nothing without config); upstream-repo resolution (`workflow.retro.upstreamRepo`, default `voxmedia/open-agent-toolkit` in guidance; upstream lane collapses into repo lane when the host repo is the upstream repo); duplicate check per destination type (issues via `gh search issues`; backlog via `items/*.md` + `archived/` + `completed.md`) with four dispositions (strengthen — default when applicable, file as new, skip, link existing); sanitization verification for public destinations from private sources (applies to strengthen comments too); filing execution (`gh issue create`; backlog per `oat-pjm-add-backlog-item` conventions + `oat backlog regenerate-index`); per-item status + destination writeback and frontmatter rollup update; loud undeliverable-lane reporting.

**Step 2: Verify**

Run: `pnpm format && pnpm lint`
Expected: Pass; every register mutation named in the skill maps to a field defined in the p02-t01 template

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-retro-file
git commit -m "feat(p02-t03): add oat-project-retro-file filing skill"
```

---

### Task p02-t04: Register skill/template in manifest and bundle inventory

**Files:**

- Modify: `packages/cli/src/commands/init/tools/shared/skill-manifest.ts`
- Modify: `packages/cli/scripts/bundle-inputs.mjs`
- Modify: `packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts` (or the manifest test asserting the lists, as found)

**Step 1: Write test (RED)**

Assert `WORKFLOW_SKILLS` contains `oat-project-retro` and `oat-project-retro-file`, and `WORKFLOW_TEMPLATES` contains `project-retro.md` (extend existing list assertions where they exist).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/workflows/install-workflows.test.ts`
Expected: Fails (RED)

**Step 2: Implement (GREEN)**

Add both skills to `WORKFLOW_SKILLS` and to `BUNDLE_INPUTS.skills`; add `project-retro.md` to `WORKFLOW_TEMPLATES` and to the bundle inventory's template file list (keep list ordering conventions).

Run: same vitest command
Expected: Pass (GREEN)

**Step 3: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli build && pnpm --filter @open-agent-toolkit/cli test && pnpm run cli -- sync --scope all`
Expected: Bundle script copies the new skill directories and template into `packages/cli/assets/`; package suite green; provider views refreshed (commit any sync-manifest changes with this task)

**Step 4: Commit**

```bash
git add packages/cli/src/commands/init/tools/shared/skill-manifest.ts packages/cli/scripts/bundle-inputs.mjs packages/cli/src/commands/init/tools/workflows/install-workflows.test.ts .oat/sync/manifest.json .claude .cursor .codex
git commit -m "feat(p02-t04): register retro skill pair and template in workflows pack"
```

---

## Phase 3: Lifecycle Integration

### Task p03-t01: Dispatch `retro` from the closeout sequence

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md` (frontmatter `version:` bump only)

**Step 1: Author**

Per design.md Closeout sequencing integration: extend the step dispatch sentence — for every pending `retro`, dispatch `oat-project-retro` (generate mode; apply/filing behavior stays config-gated inside the skill); note `retro` as a valid additive vocabulary member wherever `summary`/`document`/`pr` step values are enumerated (snapshot examples included); leave the autonomous lifecycle-tail default `{ preApproval: [summary, document, pr], postApproval: [] }` unchanged and state explicitly that retro runs autonomously only when configured. Bump the `oat-project-implement` skill `version:` (PR-scoped bump; a later edit in this PR does not bump again).

**Step 2: Verify**

Run: `pnpm format && pnpm lint`
Expected: Pass; every step-vocabulary enumeration in the file includes `retro`; autonomous default unchanged

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-implement
git commit -m "feat(p03-t01): dispatch retro step from closeout sequence"
```

---

### Task p03-t02: Add the retro safety-net offer to `oat-project-complete`

**Files:**

- Modify: `.agents/skills/oat-project-complete/SKILL.md`

**Step 1: Author**

Per design.md offer section: preflight `{PROJECT_PATH}/references/project-retro.md` alongside the existing summary preflight; when missing in an interactive completion run, one offer ("No project retro exists. Generate one before completing?") that dispatches `oat-project-retro` on confirmation; when present, no offer — at most a one-line note when frontmatter rollups show `proposed`/`partial` registers; gate on the completion run's own interactivity (autonomously-implemented projects completed interactively DO get the offer; a non-interactive completion run skips it — the sequence step is the consented path). Bump the skill `version:`.

**Step 2: Verify**

Run: `pnpm format && pnpm lint`
Expected: Pass; offer wording and gating match design.md; version bumped once

**Step 3: Commit**

```bash
git add .agents/skills/oat-project-complete
git commit -m "feat(p03-t02): offer retro at interactive completion when missing"
```

---

## Phase 4: Documentation

### Task p04-t01: Update lifecycle and configuration reference docs

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`

**Step 1: Author**

Lifecycle page: widen the post-implement step vocabulary to include `retro`, document the post-approval placement rationale (feedback tail exists; before completion freezes artifacts), and the completion safety-net offer. Configuration reference: `workflow.retro.filing.repo`, `workflow.retro.filing.upstream`, `workflow.retro.apply`, `workflow.retro.upstreamRepo` with defaults and consent semantics (config counts as non-interactive consent; absent config = propose-only).

**Step 2: Verify**

Run: `pnpm check`
Expected: markdownlint over docs passes

**Step 3: Commit**

```bash
git add apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/cli-utilities/configuration.md
git commit -m "docs(p04-t01): document retro sequence step and workflow.retro config"
```

---

### Task p04-t02: Add the retro workflow docs page and regenerate the index

**Files:**

- Create: `apps/oat-docs/docs/workflows/projects/retro.md` (final path per docs-app nav conventions — check `apps/oat-docs/AGENTS.md` before placing)
- Modify: `apps/oat-docs/index.md` (generated — via `oat docs generate-index` only)

**Step 1: Author**

New page covering the retro skill pair: generate mode (evidence sources, honesty contract, registers), apply mode (natural-language entry, idempotent register processing), filing skill (preflight matrix, destinations, dedupe dispositions incl. strengthen), and the summary-vs-retro distinction table from the handoff. Wire nav per docs-app conventions; regenerate the docs index with `pnpm run cli -- docs generate-index` (never hand-edit).

**Step 2: Verify**

Run: `pnpm check && pnpm build:docs`
Expected: markdownlint and docs build pass; new page reachable in nav

**Step 3: Commit**

```bash
git add apps/oat-docs
git commit -m "docs(p04-t02): add retro workflow documentation page"
```

---

## Phase 5: Release and Acceptance

### Task p05-t01: Lockstep version bump and release validation

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json` (and the repo's version manifest, e.g. `packages/cli/assets/public-package-versions.json` source, per release conventions)

**Step 1: Implement**

Bump all five public package versions together (shipped CLI functionality + bundled assets changed). Confirm each canonical skill changed in this PR (`oat-project-retro`, `oat-project-retro-file` at `1.0.0`; bumped `oat-project-implement`, `oat-project-complete`) carries exactly one version bump in the final diff.

**Step 2: Verify**

Run: `pnpm release:validate`
Expected: Release dry-run passes

**Step 3: Commit**

```bash
git add packages
git commit -m "chore(p05-t01): lockstep public package version bump for retro feature"
```

---

### Task p05-t02: Dogfood acceptance run

**Files:**

- Create: `{completed-project}/references/project-retro.md` (target project chosen at execution; prefer a completed project in this repo with a rich project log)
- Modify: fixes to any p02/p03 artifacts where the dogfood run surfaces defects

**Step 1: Execute**

Run `oat-project-retro` generate mode against a completed OAT project in this repo. Then exercise apply mode on at least one promotion register item, and run `oat-project-retro-file` through its preflight matrix (filing execution may stop at the approval step or target a scratch destination — no unsanctioned public writes).

**Step 2: Evaluate**

Judge the artifact against `references/retro-quality-bar.md` and the reference retro's guiding principles: evidence-first with honest unavailability, dual lanes explicit (upstream present even if "none identified"), registers machine-scannable, statuses/rollups consistent after apply.

**Step 3: Fix and verify**

Apply fixes for any defects found (skill wording, template gaps, register-format mismatches). Re-run the failing portion until clean.

Run: `pnpm check && pnpm type-check && pnpm test && pnpm build`
Expected: Full CI gate order passes

**Step 4: Commit**

```bash
git add -A
git commit -m "test(p05-t02): dogfood retro acceptance run and fixes"
```

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| p01    | code     | pending | -    | -        | -             | -          | -           |
| p02    | code     | pending | -    | -        | -             | -          | -           |
| p03    | code     | pending | -    | -        | -             | -          | -           |
| p04    | code     | pending | -    | -        | -             | -          | -           |
| p05    | code     | pending | -    | -        | -             | -          | -           |
| final  | code     | pending | -    | -        | -             | -          | -           |
| spec   | artifact | pending | -    | -        | -             | -          | -           |
| design | artifact | pending | -    | -        | -             | -          | -           |
| plan   | artifact | pending | -    | -        | -             | -          | -           |

For code-review events, `Reviewed Head` is the full 40-character SHA at the
head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`;
`Gate Target` is populated only for gate events. Legacy five-column rows remain
valid. Writers must preserve every existing row and every unknown trailing
cell; never truncate a widened row back to five columns.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - CLI config surface (`retro` step, `workflow.retro` namespace)
- Phase 2: 4 tasks - Template, retro skill, filing skill, pack registration
- Phase 3: 2 tasks - Closeout dispatch and completion offer
- Phase 4: 2 tasks - Lifecycle/config docs and workflow page
- Phase 5: 2 tasks - Lockstep release bump and dogfood acceptance

**Total: 12 tasks**

Ready for code review and merge.

---

## References

- Design: `design.md` (quick-mode lightweight design; register contract, config schema, flows)
- Discovery: `discovery.md` (Questions 1–9 record all scope decisions)
- Handoff: `references/oat-project-retro-skill-handoff.md`
- Reference retro: `references/project-retro.example.md`
- Sequencing contract: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
