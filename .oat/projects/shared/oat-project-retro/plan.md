---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-08-07
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p05']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups: [['p01', 'p02', 'p03']] # config, assets, and lifecycle-skill edits are file-disjoint
oat_plan_source: quick # spec-driven | quick | imported
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: oat-project-retro

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Ship an evidence-grounded project retrospective for the OAT lifecycle tail: an `oat-project-retro` skill (generate + apply modes), a companion `oat-project-retro-file` filing skill, a `project-retro.md` template, `retro` as a post-implement sequence step with a `workflow.retro` config namespace, a completion-path safety-net offer, and full docs.

**Architecture:** The retro artifact is a machine-scannable contract — two registers (promotions, upstream feedback) with per-item status plus frontmatter rollups — consumed by three decoupled consumers: the completion offer, the retro skill's apply mode, and the filing skill. Consent flows through configuration; nothing runs unsolicited. See `design.md`.

**Tech Stack:** TypeScript ESM (`packages/cli` config surface, vitest), OAT skill markdown (`.agents/skills`), lifecycle templates (`.oat/templates`), Fumadocs (`apps/oat-docs`).

**Commit Convention:** `{type}({scope}): {description}` - e.g., `feat(p01-t01): accept retro post-implement sequence step`

## Planning Checklist

- [x] Confirmed HiLL checkpoints at `oat-project-implement` start — final phase
      `p05`, with automatic checkpoint review enabled
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

`oat_plan_parallel_groups: [['p01', 'p02', 'p03']]`

- **p01 (CLI config)** writes only `packages/cli/src/config/*` plus the sequence-contracts test under `packages/cli/src/commands/init/tools/shared/`. Verification is scoped vitest runs.
- **p02 (template + skills + registration)** writes new directories `.agents/skills/oat-project-retro*/`, the new `.oat/templates/project-retro.md`, and registration lists in `packages/cli/src/commands/init/tools/shared/skill-manifest.ts` and `packages/cli/scripts/bundle-inputs.mjs` — none of which p01 or p03 touch. Verification is manifest-scoped vitest plus a CLI build.
- **p03 (lifecycle skill edits)** writes only three existing skill files (`oat-project-implement/references/completion-and-closeout.md`, `oat-project-implement/SKILL.md` for the version bump, `oat-project-complete/SKILL.md`). Verification is repo format/lint. Provider views under `.claude/`/`.cursor/`/`.codex/` are symlinks to canonical skills, so p02's sync output does not overlap these edits.

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

Add cases: structured sequences accept `'retro'` in `postApproval`; structured sequences containing `'retro'` in `preApproval` are **rejected** (normalization returns `undefined` for the whole structured value, same handling as other invalid shapes — a pre-approval retro would run before the approval/feedback tail exists, violating the discovery Question 3 evidence boundary); duplicate-step rejection still applies across arrays; legacy strings (`wait`/`summary`/`pr`/`docs-pr`) normalize exactly as before with no retro; sequence-contracts test covers the widened vocabulary including the rejected pre-approval shape.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/commands/init/tools/shared/post-implement-sequence-contracts.test.ts`
Expected: New cases fail (RED)

**Step 2: Implement (GREEN)**

```typescript
// packages/cli/src/config/oat-config.ts
export type WorkflowPostImplementStep = 'summary' | 'document' | 'pr' | 'retro';
// VALID_POST_IMPLEMENT_STEPS gains 'retro'; legacy map unchanged.
// normalizeWorkflowPostImplementSequence additionally rejects structured
// values whose preApproval array contains 'retro' (postApproval-only step).
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
git commit -m "feat(p01-t01): accept retro as postApproval-only sequence step"
```

---

### Task p01-t02: Add the `workflow.retro` config namespace

**Files:**

- Modify: `packages/cli/src/config/oat-config.ts`
- Modify: `packages/cli/src/config/oat-config.test.ts`
- Modify: `packages/cli/src/config/resolve.ts`
- Modify: `packages/cli/src/config/resolve.test.ts`
- Modify: `packages/cli/src/commands/config/index.ts`
- Modify: `packages/cli/src/commands/config/index.test.ts`

**Step 1: Write test (RED)**

Normalization/resolve cases: valid `filing.repo` (`issues|backlog|none`), `filing.upstream` (`issues|none`), `apply` (`auto|ask`), `upstreamRepo` (`owner/name` shape); invalid enum values and malformed `upstreamRepo` dropped to `undefined`; unknown keys dropped; layered resolve merges `workflow.retro` with the same precedence as sibling workflow keys.

Config-command cases (`commands/config/index.test.ts`): register `workflow.retro.filing.repo`, `workflow.retro.filing.upstream`, `workflow.retro.apply`, and `workflow.retro.upstreamRepo` as supported keys (`ConfigKey`, `KEY_ORDER`, catalog/describe metadata, workflow parser, nested writeback); `oat config get/set/list/describe` round-trips each key; `set` writes the nested object without dropping sibling `workflow.retro` values at local/shared/user scope; invalid values rejected with actionable errors.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/config/oat-config.test.ts src/config/resolve.test.ts src/commands/config/index.test.ts`
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
// commands/config/index.ts: the four workflow.retro.* leaves join ConfigKey,
// KEY_ORDER, the describe catalog, the workflow value parser, and nested
// writeback so get/set/list/describe expose them at every scope.
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
git add packages/cli/src/config/oat-config.ts packages/cli/src/config/oat-config.test.ts packages/cli/src/config/resolve.ts packages/cli/src/config/resolve.test.ts packages/cli/src/commands/config/index.ts packages/cli/src/commands/config/index.test.ts
git commit -m "feat(p01-t02): add workflow.retro config namespace"
```

---

## Phase 2: Retro Template, Skills, and Registration

### Task p02-t01: Author the `project-retro.md` template

**Files:**

- Create: `.oat/templates/project-retro.md`

**Step 1: Author**

Follow design.md Data Models exactly: frontmatter (`oat_retro_project`, `oat_retro_generated`, `oat_retro_evidence_sources` with per-source `status`, `oat_retro_promotions` / `oat_retro_filing` rollups, `oat_generated`, plus `oat_template: true` / `oat_template_name: project-retro` scaffold markers); core sections (Executive Summary; Evidence and Review Method; Outcome Snapshot; What Went Well; Challenges and Struggles; Where We Changed Course; Repo Improvements promotion register; OAT Upstream Feedback upstream register with explicit empty-state line; Reflections); conditional sections with include-when guidance (Decision Register + Rejected/Superseded Alternatives; New Architecture Patterns; Domain Learnings; Gotchas for Humans; Gotchas for Autonomous Agents; Remaining Boundaries and Follow-Ups); register item format with stable `RP-NN` / `UP-NN` IDs, the **`Disposition: apply | file`** routing field on RP items (per-disposition status vocabularies and fields: apply → `proposed|approved|applied|rejected` + `Target`/`Applied-ref`; file → `proposed|filed|rejected|no-destination` + `Destination`; `code-follow-up` type defaults to `file`), the mutable-field contract (`Status`, `Applied-ref` / `Destination`, `Sanitized`), and the rollup derivation rule (`oat_retro_promotions` ← RP apply-items; `oat_retro_filing` ← UP items ∪ RP file-items).

**Step 2: Format**

Run: `pnpm exec oxfmt --write .oat/templates/project-retro.md`

**Step 3: Verify**

Run: `pnpm exec oxfmt --check .oat/templates/project-retro.md`
Expected: No formatting diffs; template sections match design.md's core/conditional list one-for-one

**Step 4: Commit**

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
- SKILL.md: mode resolution (generate vs apply; explicit flag/wording beats inference), OAT progress banner, active-project resolution, evidence inventory with availability honesty, generate flow (template scaffold, dual registers `proposed`, frontmatter rollups, complete-or-delete on interruption, and render-time retirement of scaffold metadata — the rendered artifact sets `oat_template: false` and drops `oat_template_name` so a complete retro never carries still-a-template markers), consent enforcement (interactive offers; `workflow.retro.apply` and `workflow.retro.filing` gating for non-interactive; chain to filing only when filing config exists), project-log entry + artifact hygiene + commit.
- `apply-procedure.md`: promotion classification (docs | agents-instruction | rule | decision | code-follow-up), the `Disposition` routing rule (apply mode processes only `Disposition: apply` items; `code-follow-up` defaults to `Disposition: file` and belongs to the filing skill — apply mode never mutates file-items), application steps per type (decision records via `oat decision new`), per-item status writeback, idempotent resume, batch-vs-per-item commit guidance.
- `evidence-and-lanes.md`: evidence reading order from the handoff, environment detection (cloud tooling / local transcripts / none), recon lane guidance with scaling, transcript caveats (committed ledgers authoritative when transcript bodies are missing).
- `retro-quality-bar.md`: handoff quality bar (evidence-first, confirmed vs hypothesis vs inconclusive, rejected alternatives, run-specific reflections) plus core/conditional section scaling.

**Step 2: Format**

Run: `pnpm exec oxfmt --write '.agents/skills/oat-project-retro/**/*.md'`

**Step 3: Verify**

Run: `pnpm format && pnpm lint`
Expected: `.agents/skills` formatting and lint pass; SKILL.md cross-references to the three reference files resolve (paths exist)

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-retro
git commit -m "feat(p02-t02): add oat-project-retro skill"
```

---

### Task p02-t03: Author the `oat-project-retro-file` skill

**Files:**

- Create: `.agents/skills/oat-project-retro-file/SKILL.md`

**Step 1: Author**

Per design.md filing flow: frontmatter `version: 1.0.0`; artifact resolution (active project default, explicit path override); item extraction (all `UP-NN` items plus `RP-NN` items with `Disposition: file`, selecting on the filing status vocabulary — re-runs skip `filed`/`rejected`, retry `no-destination` when a destination became available); capability preflight matrix (lane × destination: issues enabled? credentials? backlog initialized?) reported before items; destination resolution (`workflow.retro.filing` default + interactive confirmation/override; non-interactive uses config as-is, files nothing without config); upstream-repo resolution (`workflow.retro.upstreamRepo`, default `voxmedia/open-agent-toolkit` in guidance; upstream lane collapses into repo lane when the host repo is the upstream repo); duplicate check per destination type (issues via `gh search issues`; backlog via `items/*.md` + `archived/` + `completed.md`) with four dispositions (strengthen — default when applicable, file as new, skip, link existing); sanitization verification for public destinations from private sources (applies to strengthen comments too); filing execution (`gh issue create`; backlog per `oat-pjm-add-backlog-item` conventions + `oat backlog regenerate-index`); per-item status + destination writeback and `oat_retro_filing` rollup update (never touching `Disposition: apply` items or `oat_retro_promotions`); loud undeliverable-lane reporting.

**Step 2: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-retro-file/SKILL.md`

**Step 3: Verify**

Run: `pnpm format && pnpm lint`
Expected: Pass; every register mutation named in the skill maps to a field defined in the p02-t01 template

**Step 4: Commit**

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

### p02 review-fix boundary

The root-owned p02 review found two Important and three Medium contract defects.
A bounded continuation may modify only:

- `.agents/skills/oat-project-retro/references/apply-procedure.md`
- `.agents/skills/oat-project-retro/SKILL.md`
- `.agents/skills/oat-project-retro-file/SKILL.md`
- `.oat/templates/project-retro.md`
- `packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts` (create)

The continuation must:

1. add exact-slug preflight and post-side-effect recovery for decision application,
   and state the equivalent recovery requirement for every apply type;
2. define deterministic non-interactive duplicate handling without external
   strengthening or refiling, and safe no-action behavior when backlog metadata is
   incomplete;
3. add one mutable disposition-note field for rejection reasons and align both
   consumers with the immutable-body contract;
4. define exact promotion aggregation for empty, wholly unsettled, mixed, and wholly
   settled registers, treating `approved` as unsettled and `rejected` as settled;
5. reject null project/timestamp provenance and unreplaced scaffold placeholders
   before render completion; and
6. cover interrupted decision recovery, configured duplicate filing, incomplete
   backlog metadata, rollup aggregation, mutable rejection notes, and render
   provenance with focused content-contract tests.

No generated provider-view or sync-manifest change is expected because the registered
views are canonical symlinks.

---

## Phase 3: Lifecycle Integration

### Task p03-t01: Dispatch `retro` from the closeout sequence

**Files:**

- Modify: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
- Modify: `.agents/skills/oat-project-implement/SKILL.md` (frontmatter `version:` bump only)

**Step 1: Author**

Per design.md Closeout sequencing integration: extend the step dispatch sentence — for every pending `retro`, dispatch `oat-project-retro` (generate mode; apply/filing behavior stays config-gated inside the skill); note `retro` as a valid additive vocabulary member wherever `summary`/`document`/`pr` step values are enumerated (snapshot examples included); leave the autonomous lifecycle-tail default `{ preApproval: [summary, document, pr], postApproval: [] }` unchanged and state explicitly that retro runs autonomously only when configured. Bump the `oat-project-implement` skill `version:` (PR-scoped bump; a later edit in this PR does not bump again).

**Step 2: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-implement/references/completion-and-closeout.md .agents/skills/oat-project-implement/SKILL.md`

**Step 3: Verify**

Run: `pnpm format && pnpm lint`
Expected: Pass; every step-vocabulary enumeration in the file includes `retro`; autonomous default unchanged

**Step 4: Commit**

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

**Step 2: Format**

Run: `pnpm exec oxfmt --write .agents/skills/oat-project-complete/SKILL.md`

**Step 3: Verify**

Run: `pnpm format && pnpm lint`
Expected: Pass; offer wording and gating match design.md; version bumped once

**Step 4: Commit**

```bash
git add .agents/skills/oat-project-complete
git commit -m "feat(p03-t02): offer retro at interactive completion when missing"
```

### p03 Review-Fix Boundary

The first root-owned p03 review found mechanically required contract maintenance
outside the original task file lists. The bounded fix may modify only:

- `packages/cli/src/validation/skills.test.ts`
- `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`
- `.agents/skills/oat-project-implement/references/docs/autonomy-contract.md`

It must update only the version expectations for the two p03-bumped skills,
add focused completion safety-net assertions, and classify the two reported
non-gate autonomy inventory sites. Verify with the review artifact's focused
Vitest command, then `pnpm format && pnpm lint && pnpm test`.

---

## Phase 4: Documentation

### Task p04-t01: Update lifecycle and configuration reference docs

**Files:**

- Modify: `apps/oat-docs/docs/workflows/projects/lifecycle.md`
- Modify: `apps/oat-docs/docs/cli-utilities/configuration.md`

**Step 1: Author**

Lifecycle page: widen the post-implement step vocabulary to include `retro`, document the post-approval placement rationale (feedback tail exists; before completion freezes artifacts), and the completion safety-net offer. Configuration reference — two edits: (1) update the **existing** `workflow.postImplementSequence` entry, which currently states structured arrays contain only `summary`, `document`, and `pr` (`apps/oat-docs/docs/cli-utilities/configuration.md:571`), to document `retro` as a post-approval-only step (rejected in `preApproval`) with legacy mappings unchanged; (2) add the new `workflow.retro.filing.repo`, `workflow.retro.filing.upstream`, `workflow.retro.apply`, `workflow.retro.upstreamRepo` keys with defaults and consent semantics (config counts as non-interactive consent; absent config = propose-only).

**Step 2: Format**

Run: `pnpm exec oxfmt --write apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/cli-utilities/configuration.md`

**Step 3: Verify**

Run: `pnpm check`
Expected: markdownlint over docs passes

**Step 4: Commit**

```bash
git add apps/oat-docs/docs/workflows/projects/lifecycle.md apps/oat-docs/docs/cli-utilities/configuration.md
git commit -m "docs(p04-t01): document retro sequence step and workflow.retro config"
```

---

### Task p04-t02: Add the retro workflow docs page, AGENTS mention, and regenerate the index

**Files:**

- Create: `apps/oat-docs/docs/workflows/projects/retro.md` (final path per docs-app nav conventions — check `apps/oat-docs/AGENTS.md` before placing)
- Modify: `apps/oat-docs/docs/workflows/projects/index.md` (authored `## Contents` map — add the `.md`-suffixed link to the new page)
- Modify: `apps/oat-docs/index.md` (generated — via `oat docs generate-index` only)
- Modify: `AGENTS.md` (repo root — one-line lifecycle mention)

**Step 1: Author**

New page covering the retro skill pair: generate mode (evidence sources, honesty contract, registers), apply mode (natural-language entry, idempotent register processing), filing skill (preflight matrix, destinations, dedupe dispositions incl. strengthen), and the summary-vs-retro distinction table from the handoff. Link the page from the authored `## Contents` section of `apps/oat-docs/docs/workflows/projects/index.md` using the `.md`-suffixed relative link (the generated `apps/oat-docs/index.md` does not replace the authored source map); regenerate the generated docs index with `pnpm run cli -- docs generate-index` (never hand-edit). Add a one-line mention of the retro post-approval step and skill pair to root `AGENTS.md` lifecycle prose (near the Agent Workflow section); do NOT add a skill inventory entry — the skills_system section prohibits duplicating inventories.

**Step 2: Format**

Run: `pnpm exec oxfmt --write apps/oat-docs/docs/workflows/projects/retro.md apps/oat-docs/docs/workflows/projects/index.md AGENTS.md`

**Step 3: Verify**

Run: `pnpm check && pnpm build:docs`
Expected: markdownlint and docs build pass; new page reachable in nav

**Step 4: Commit**

```bash
git add apps/oat-docs AGENTS.md
git commit -m "docs(p04-t02): add retro workflow documentation page and AGENTS mention"
```

---

## Phase 5: Acceptance and Release

### Task p05-t01: Dogfood acceptance run

**Files:**

- Create: `{completed-project}/references/project-retro.md` (target project chosen at execution; prefer a completed project in this repo with a rich project log)
- Modify: fixes to any p02/p03 artifacts where the dogfood run surfaces defects

**Consent boundary:** The apply-mode exercise mutates real repo files, so it requires per-item human approval in-session (discovery Question 6 / Key Decision 8 — plan approval is not item approval). Interactive execution: present the selected promotion item and get explicit approval before applying. Non-interactive execution: do not apply to arbitrary targets; use a pre-approved reversible target (a scratch/fixture promotion item added to the dogfood retro for this purpose), and record the cleanup in the same commit.

**Step 1: Execute**

Run `oat-project-retro` generate mode against a completed OAT project in this repo. Then exercise apply mode on at least one promotion register item (within the consent boundary above), and run `oat-project-retro-file` through its preflight matrix (filing execution may stop at the approval step or target a scratch destination — no unsanctioned public writes).

**Step 2: Evaluate**

Judge the artifact against `references/retro-quality-bar.md` and the reference retro's guiding principles: evidence-first with honest unavailability, dual lanes explicit (upstream present even if "none identified"), registers machine-scannable with every RP item carrying a valid `Disposition` and disposition-consistent status/fields, both frontmatter rollups derivable from register fields alone (promotions ← apply-items; filing ← UP ∪ RP file-items) and consistent after the apply exercise, and no scaffold-only template metadata remaining on the rendered artifact (`oat_template: false`, no `oat_template_name`).

**Step 3: Fix, format, and verify**

Apply fixes for any defects found (skill wording, template gaps, register-format mismatches). Re-run the failing portion until clean. Format every touched path with a file-scoped write command (e.g. `pnpm exec oxfmt --write <touched .md paths>`).

Run: `pnpm lint && pnpm format && pnpm check && pnpm type-check && pnpm test && pnpm build`
Expected: Skills-covering lint/format plus the full CI gate order pass

**Step 4: Record commits (conditional)**

The invoked retro workflow commits its own outputs (generate mode commits the retro artifact + project-log entry; apply mode commits applied promotions) — those child-workflow commits ARE this task's primary commits. Record their SHAs in `implementation.md` for this task. Run a follow-up commit only when residual changes exist (defect fixes to skills/template, acceptance notes); on a clean run with nothing left in the working tree, do not commit again.

```bash
# Only when residual defect fixes or acceptance notes exist:
git add <exact fixed paths, e.g. .agents/skills/oat-project-retro/... .agents/skills/oat-project-retro-file/SKILL.md .oat/templates/project-retro.md>
git commit -m "test(p05-t01): dogfood acceptance fixes"
# Never use `git add -A`.
```

---

### Task p05-t02: Lockstep version bump and final release validation

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json`
- Regenerated: `packages/cli/assets/public-package-versions.json` (bundled version asset — regenerated by the build, the sixth release file in the commit)

**Step 1: Implement**

Runs after the dogfood task so final validation covers the final shipped state, including any dogfood fixes. Bump all five public package versions together (shipped CLI functionality + bundled assets changed). Confirm each canonical skill changed in this PR (`oat-project-retro`, `oat-project-retro-file` at `1.0.0`; bumped `oat-project-implement`, `oat-project-complete`) carries exactly one version bump in the final PR diff.

**Step 2: Verify**

Run: `pnpm check && pnpm type-check && pnpm test && pnpm build && pnpm release:validate`
Expected: The repository's four CI gates pass against the final post-bump tree (this is the required final-tree gate run — p05-t01's run predates the version bump), then the release dry-run passes against the final shipped state. If any later fix touches publishable packages or bundled assets after this task, re-run this full sequence before the PR.

**Step 3: Commit**

```bash
git add packages
git commit -m "chore(p05-t02): lockstep public package version bump for retro feature"
```

---

### Final review fix boundary

The first whole-project final review found one Important executable-contract gap.
A bounded continuation may modify only:

- `.agents/skills/oat-project-retro/SKILL.md`
- `.agents/skills/oat-project-retro-file/SKILL.md`
- `packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts`

The continuation must grant both skills the repository's established
`Bash(pnpm:*)` capability so their mandatory formatter, lint, and check steps are
executable under enforced `allowed-tools`, and must add focused contract coverage
for both skills. This is the same PR, so the existing PR-scoped `1.0.1` skill
version bumps remain unchanged. Because bundled skill assets change after p05-t02,
rerun skill lint/format, focused tests, all four CI gates, and
`pnpm release:validate`; the already-correct `0.2.29` lockstep package versions do
not receive another bump.

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status          | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target              |
| ------ | -------- | --------------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------------ |
| p01    | code     | passed          | 2026-08-06 | reviews/archived/p01-review-2026-08-06T020751Z.md           | 057b0ae189d81ee9f5aef8e7c4c506d312dc5b7f | manual     | -                        |
| p02    | code     | passed          | 2026-08-06 | reviews/archived/p02-review-2026-08-06T023410Z.md           | d141d58308f4ec607b5ae0d82330ac46bbd0f771 | manual     | -                        |
| p03    | code     | passed          | 2026-08-06 | reviews/archived/p03-review-2026-08-06T022404Z.md           | b5c91169ea3155c7b606c196a7f2efbf9602b369 | manual     | -                        |
| p04    | code     | passed          | 2026-08-06 | reviews/archived/p04-review-2026-08-06T025204Z.md           | 21d6aa65d0342cef7e8fad402305b6c49777fadd | manual     | -                        |
| p05    | code     | passed          | 2026-08-06 | reviews/archived/p05-review-2026-08-06T042130Z.md           | 83f3d6a2134898e0234ee4fe40cb428386fee070 | manual     | -                        |
| p06    | code     | fixes_completed | 2026-08-06 | reviews/archived/p06-review-2026-08-06T233605Z.md           | 4b40ea7fa1ea85866627a079af283c10b6ceb057 | manual     | -                        |
| p06    | code     | passed          | 2026-08-06 | reviews/archived/p06-review-2026-08-06T234340Z.md           | e9c30d26b256bd43851e3ad951cb1a17fe335692 | manual     | -                        |
| p-rev1 | code     | fixes_completed | 2026-08-07 | reviews/archived/p-rev1-review-2026-08-07T001216Z.md        | c95a6f616f4fca237bfbcca79d660207d8980cef | manual     | -                        |
| p-rev1 | code     | passed          | 2026-08-07 | reviews/archived/p-rev1-review-2026-08-07T003046Z.md        | c1229f7381162e607dfcc5b08a9b1a13f0b3ce3a | manual     | -                        |
| p-rev2 | code     | fixes_completed | 2026-08-07 | reviews/archived/p-rev2-review-2026-08-07T131055Z.md        | 474320f4b09de16aa23fc92a55eebde49c323b7a | manual     | -                        |
| p-rev2 | code     | fixes_completed | 2026-08-07 | reviews/archived/p-rev2-review-2026-08-07T133551Z.md        | 0c77d4384df741288191470866532ece8dedf8da | manual     | -                        |
| p-rev2 | code     | passed          | 2026-08-07 | reviews/archived/p-rev2-review-2026-08-07T134845Z.md        | 3698f2fd1b8784f0d4a8bebcfe098e5f3918a91f | manual     | -                        |
| final  | code     | passed          | 2026-08-06 | reviews/archived/final-review-2026-08-06T044429Z.md         | 598fb8f0cc2ac00721abb6072f38508b808895e8 | manual     | -                        |
| final  | code     | fixes_completed | 2026-08-07 | reviews/archived/final-review-2026-08-07T004237Z.md         | cd22b7f0af87c59169e9fd57c31b057f9216b6dd | manual     | -                        |
| final  | code     | passed          | 2026-08-07 | reviews/archived/final-review-2026-08-07T021157Z.md         | a6b5ea4f2b6c40bb55e1120155f9ce122eb5dffb | manual     | -                        |
| final  | code     | fixes_completed | 2026-08-07 | reviews/archived/final-review-2026-08-07T145010Z.md         | c51d2a2ca841f4165e4f7d4d3a18ae766b188495 | manual     | -                        |
| final  | code     | passed          | 2026-08-07 | reviews/archived/final-review-2026-08-07T145518Z.md         | a969ea0638d57ffafdf60522272175fdd65c2583 | manual     | -                        |
| spec   | artifact | pending         | -          | -                                                           | -                                        | -          | -                        |
| design | artifact | pending         | -          | -                                                           | -                                        | -          | -                        |
| plan   | artifact | passed          | 2026-08-05 | structured (in-memory)                                      | -                                        | auto       | -                        |
| plan   | artifact | passed          | 2026-08-06 | reviews/archived/artifact-plan-review-2026-08-06T012151Z.md | -                                        | gate       | cursor-gpt-5-6-sol-xhigh |
| plan   | artifact | fixes_completed | 2026-08-05 | reviews/archived/artifact-plan-review-2026-08-06T004058Z.md | -                                        | -          | -                        |
| plan   | artifact | fixes_completed | 2026-08-05 | reviews/archived/artifact-plan-review-2026-08-06T005234Z.md | -                                        | -          | -                        |
| plan   | artifact | fixes_completed | 2026-08-05 | reviews/archived/artifact-plan-review-2026-08-06T005256Z.md | -                                        | -          | -                        |
| plan   | artifact | fixes_completed | 2026-08-05 | reviews/archived/artifact-plan-review-2026-08-06T012151Z.md | -                                        | -          | -                        |

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

## Phase 6: Revision Workflow Compatibility

### Task p06-t01: Parse canonical revision phases and task IDs

**Files:**

- Modify: `packages/control-plane/src/state/tasks.ts`
- Modify: `packages/control-plane/src/state/tasks.test.ts`
- Modify: `packages/control-plane/src/recommender/router.test.ts`

**Step 1: Write regression tests (RED)**

Add coverage proving the control-plane project-state parser recognizes the
canonical shape emitted by `oat-project-revise`:

- heading `## Phase p-rev1: Revision 1`;
- task IDs `prev1-t01`, `prev1-t02`;
- reported phase ID `p-rev1` with `isRevision: true`;
- completed/current-task accounting and recommender routing.

Preserve the existing legacy `## Revision Phase 1` / `p-rev1-tNN` form for
backward compatibility.

Run:

```bash
pnpm --filter @open-agent-toolkit/control-plane exec vitest run src/state/tasks.test.ts src/recommender/router.test.ts
```

Expected: canonical-shape assertions fail before the parser change.

**Step 2: Implement compatible parsing (GREEN)**

Recognize both revision heading/task conventions, normalize both to phase ID
`p-revN`, and keep completion/current-task parsing exact. Do not weaken ordinary
`pNN` phase parsing or accept malformed near-matches.

**Step 3: Verify and commit**

Run the focused tests above, package type-check, file-scoped formatting, and
`git diff --check`.

```bash
git add packages/control-plane/src/state/tasks.ts packages/control-plane/src/state/tasks.test.ts packages/control-plane/src/recommender/router.test.ts
git commit -m "fix(p06-t01): parse canonical revision phases"
```

---

## Phase p-rev1: Revision 1

Source: inline dogfood feedback (2026-08-06)

Execute sequentially. The tasks intentionally share the retro contracts and
dogfood artifact, so later tasks build on earlier commits.

### Task prev1-t01: (revision) Keep mutable retro state coherent

**Files:**

- Modify: `.agents/skills/oat-project-retro/SKILL.md`
- Modify: `.agents/skills/oat-project-retro/references/apply-procedure.md`
- Modify: `.agents/skills/oat-project-retro/references/retro-quality-bar.md`
- Modify: `.agents/skills/oat-project-retro-file/SKILL.md`
- Modify: `.oat/templates/project-retro.md`
- Modify: `packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts`
- Modify: `.oat/projects/shared/oat-project-retro/references/project-retro.md`

**Step 1: Add failing contract coverage**

Add focused assertions for a narrow mutable current-state summary or equivalent
derived-status surface. Proposal bodies remain immutable, but apply/file
writeback must not leave freeform claims that contradict register fields or
frontmatter rollups. Generation must avoid unqualified mutable status claims
outside the registers.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/retro-skill-contracts.test.ts`

Expected: the new coherence assertions fail before the contract changes.

**Step 2: Implement the coherence contract**

Define the exact bounded surface that apply and filing modes may refresh, keep
proposal bodies immutable, and make generation phrase any historical status as
generation-time evidence rather than live state. Reconcile this project's stale
“UP-01 remains proposed” follow-up without changing the UP-01 proposal body.

**Step 3: Verify and commit**

Run the focused test above, file-scoped formatting, and `git diff --check`.

```bash
git add .agents/skills/oat-project-retro .agents/skills/oat-project-retro-file/SKILL.md .oat/templates/project-retro.md packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts .oat/projects/shared/oat-project-retro/references/project-retro.md
git commit -m "fix(prev1-t01): keep retro writeback coherent"
```

### Task prev1-t02: (revision) Distinguish related duplicate candidates

**Files:**

- Modify: `.agents/skills/oat-project-retro-file/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts`
- Modify: `.oat/repo/pjm/backlog/items/BL-260718-mandatory-skill-load-clause.md`
- Create via CLI: dedicated fail-closed closeout-snapshot backlog item
- Modify: `.oat/repo/pjm/backlog/index.md` through CLI regeneration
- Modify: `.oat/projects/shared/oat-project-retro/references/project-retro.md`

**Step 1: Tighten duplicate review**

Require duplicate review to distinguish exact duplicates from merely related
items. Recommend strengthening only when the existing title, mechanism, and
acceptance scope already cover the proposal. When strengthening would broaden
the tracked mechanism, recommend a new item or an explicitly approved umbrella
retitle instead.

Add focused contract coverage, then verify it fails before editing the skill.

**Step 2: Repair the dogfood filing**

Restore `BL-260718-mandatory-skill-load-clause` to its original skill-loading
scope. Create a separate high-priority, task-scoped backlog item for the
configured-plus-absent snapshot invariant using `oat backlog new`, with labels
`lifecycle-skills`, `workflow-integrity`, and `dx`, and confirmed scope estimate
`M`. Its acceptance criteria must require fail-closed terminal routing and
transition-level coverage for snapshot persistence and ordered child dispatch.
Update UP-01 to the generated destination and regenerate the managed index.

**Step 3: Verify and commit**

Run the focused retro contracts, `pnpm run cli -- backlog regenerate-index
--json`, file-scoped formatting, and `git diff --check`.

```bash
git add .agents/skills/oat-project-retro-file/SKILL.md packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts .oat/repo/pjm/backlog .oat/projects/shared/oat-project-retro/references/project-retro.md
git commit -m "fix(prev1-t02): separate related retro filings"
```

### Task prev1-t03: (revision) Make local filing receipts durable

**Files:**

- Modify: `.agents/skills/oat-project-retro-file/SKILL.md`
- Modify: `.oat/templates/project-retro.md`
- Modify: `packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts`
- Modify: `.oat/projects/shared/oat-project-retro/references/project-retro.md`

**Step 1: Add failing durability coverage**

Require local backlog filing to commit the destination side effect before
marking the retro item filed. The subsequent writeback must record the
destination path plus its confirmed commit receipt and report whether the
branch is pushed, without equating local commit durability with remote
visibility.

**Step 2: Implement two-stage local writeback**

Document the destination-first commit and receipt-bearing retro writeback.
Preserve Git safety: pushing remains separately authorized. Update this
project's UP-01 destination to reference the dedicated backlog item's confirmed
commit.

**Step 3: Verify and commit**

Run the focused retro contracts, file-scoped formatting, and `git diff --check`.

```bash
git add .agents/skills/oat-project-retro-file/SKILL.md .oat/templates/project-retro.md packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts .oat/projects/shared/oat-project-retro/references/project-retro.md
git commit -m "fix(prev1-t03): record durable local filing receipts"
```

### Task prev1-t04: (revision) Calibrate retro depth and ship revision assets

**Files:**

- Modify: `.agents/skills/oat-project-retro/SKILL.md`
- Modify: `.agents/skills/oat-project-retro/references/retro-quality-bar.md`
- Modify: `.oat/templates/project-retro.md`
- Modify: `apps/oat-docs/docs/workflows/projects/retro.md`
- Modify: `packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts`
- Regenerate: `packages/cli/assets/skills/oat-project-retro*/**`
- Regenerate: `packages/cli/assets/templates/project-retro.md`
- Modify only if freshness requires: the five lockstep public package versions

**Step 1: Define evidence-scaled depth**

Make concise output the default without adding a new consent-bearing config
surface. Require each section to add distinct information, prefer references
over repeated chronology, keep small-project core sections brief, and reserve
subsections/tables for evidence-rich projects where they improve decisions.
Add focused contract coverage and align the workflow documentation.

**Step 2: Refresh shipped assets**

Regenerate bundled skill/template assets. Confirm each changed canonical skill
has exactly one PR-scoped version increase in the final branch diff; do not
double-bump for multiple revision edits. Recheck public-package versions
against current `origin/main` and advance all five together only if `0.2.30`
no longer satisfies release freshness.

**Step 3: Verify and commit**

Run, in order:

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm lint
pnpm format
pnpm build:docs
pnpm release:validate
```

Commit all revision-owned source, docs, generated assets, and any required
lockstep version updates:

```bash
git add .agents/skills/oat-project-retro .agents/skills/oat-project-retro-file packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts .oat/templates/project-retro.md apps/oat-docs/docs/workflows/projects/retro.md packages/cli/assets packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
git commit -m "feat(prev1-t04): refine retrospective dogfood workflow"
```

---

## Phase p-rev2: Revision 2

Source: inline second-dogfood feedback (2026-08-07)

Execute sequentially. All four tasks refine the same retrospective generation
and apply contracts; later tasks build on the exact terminology and tests
established by earlier tasks.

### Task prev2-t01: (revision) Define an unambiguous retro run receipt

**Files:**

- Modify: `.agents/skills/oat-project-retro/SKILL.md`
- Modify: `packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts`

**Step 1: Add failing receipt-schema coverage**

Add focused assertions requiring the structural project-log receipt to use each
canonical key exactly once:

- `artifact=<path>`;
- `evidence_used=<csv>`;
- `evidence_unavailable=<csv>`;
- `promotions=<number>`;
- `upstream=<number>`;
- `apply=<performed|declined|skipped|deferred>`;
- `filing=<performed|declined|skipped|deferred>`.

The contract must keep register counts distinct from action outcomes and reject
the ambiguous second-dogfood shape where `filing` represented both.

Run:
`pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/init/tools/shared/retro-skill-contracts.test.ts`

Expected: the new canonical-key assertions fail before the skill change.

**Step 2: Implement the canonical receipt**

Update Step 5 of `oat-project-retro` with the exact one-line receipt shape,
field semantics, and outcome vocabulary. Add final verification that required
keys are present once, counts are numeric, and count keys are never reused for
outcomes.

**Step 3: Verify and commit**

Run the focused retro contracts, file-scoped formatting, and
`git diff --check`.

```bash
git add .agents/skills/oat-project-retro/SKILL.md packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts
git commit -m "fix(prev2-t01): define retro receipt schema"
```

### Task prev2-t02: (revision) Keep retros standalone without repeated chronology

**Files:**

- Modify: `.agents/skills/oat-project-retro/SKILL.md`
- Modify: `.agents/skills/oat-project-retro/references/evidence-and-lanes.md`
- Modify: `.agents/skills/oat-project-retro/references/retro-quality-bar.md`
- Modify: `.oat/templates/project-retro.md`
- Modify: `apps/oat-docs/docs/workflows/projects/retro.md`
- Modify: `packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts`

**Step 1: Add failing narrative-contract coverage**

Require a reader to understand each material incident without opening another
artifact while still being able to audit load-bearing claims through
unobtrusive evidence anchors. Prefer stable project-log event IDs, artifact
headings, review paths, decision IDs, and commit IDs over line numbers.

Add section-ownership assertions:

- `Challenges and Struggles` owns the complete incident narrative: what
  happened, impact, response, and result;
- `Where We Changed Course` records only trigger, changed direction, and
  outcome;
- `Domain Learnings` abstracts reusable lessons without replaying chronology;
- `Gotchas` contains future-facing instructions rather than incident summaries.

Expected: focused contracts fail until the skill, quality bar, template, and
docs encode the standalone-plus-anchor and non-duplication rules.

**Step 2: Implement the standalone narrative contract**

Update generation guidance and the template so evidence anchors supplement
rather than replace explanation. Preserve evidence-scaled depth and avoid an
arbitrary word-count target; concision comes from explaining each incident once
and giving later sections only their distinct implication.

**Step 3: Verify and commit**

Run the focused retro contracts, file-scoped formatting, docs Markdown checks
for the edited page, and `git diff --check`.

```bash
git add .agents/skills/oat-project-retro .oat/templates/project-retro.md apps/oat-docs/docs/workflows/projects/retro.md packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts
git commit -m "docs(prev2-t02): anchor standalone retro narratives"
```

### Task prev2-t03: (revision) Inventory evidence at source-level precision

**Files:**

- Modify: `.agents/skills/oat-project-retro/SKILL.md`
- Modify: `.agents/skills/oat-project-retro/references/evidence-and-lanes.md`
- Modify: `.agents/skills/oat-project-retro/references/retro-quality-bar.md`
- Modify: `.oat/templates/project-retro.md`
- Modify: `apps/oat-docs/docs/workflows/projects/retro.md`
- Modify: `packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts`

**Step 1: Add failing source-granularity coverage**

Keep the existing `used | unavailable` status vocabulary, but require source
identifiers to be specific enough that a partial evidence family is split into
truthful entries. For example, record `archived-review-markdown: unavailable`
and `gate-receipts: used` instead of the misleading blanket
`review-artifacts: unavailable`.

Require reconnaissance lanes to return stable anchors and root synthesis to
verify and preserve anchors for load-bearing claims. Do not mark derivative
current-run reconnaissance transcripts as original project-run evidence.

Expected: focused contracts fail before the inventory and rendering guidance is
tightened.

**Step 2: Implement precise inventory guidance**

Align the skill, evidence reference, quality bar, template comments, and docs
with granular source naming. Do not add a `partial` enum or a new consent/config
surface.

**Step 3: Verify and commit**

Run the focused retro contracts, file-scoped formatting, docs Markdown checks,
and `git diff --check`.

```bash
git add .agents/skills/oat-project-retro .oat/templates/project-retro.md apps/oat-docs/docs/workflows/projects/retro.md packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts
git commit -m "fix(prev2-t03): inventory retro evidence precisely"
```

### Task prev2-t04: (revision) Route append-only project-log corrections and ship

**Files:**

- Modify: `.agents/skills/oat-project-retro/SKILL.md`
- Modify: `.agents/skills/oat-project-retro/references/apply-procedure.md`
- Modify: `apps/oat-docs/docs/workflows/projects/retro.md`
- Modify: `packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts`
- Regenerate: `packages/cli/assets/skills/oat-project-retro/**`
- Regenerate: `packages/cli/assets/templates/project-retro.md`
- Modify only if freshness requires: the five lockstep public package versions

**Step 1: Add failing correction-routing coverage**

Keep the public RP type vocabulary unchanged. Add a bounded `docs` apply
special case for a target whose canonical path is `project-log.md`:

- use `oat project log append`, never direct file editing;
- require the proposal to identify the prior heading or event being corrected;
- preserve the original entry;
- perform semantic post-side-effect recovery before appending again;
- record an `Applied-ref` only after the correction and retro writeback are
  durably committed.

Expected: focused contracts fail until the append-only route and recovery
behavior are explicit.

**Step 2: Implement and document the correction route**

Update the apply procedure and workflow documentation. The special case is
limited to project-log targets and does not introduce a new RP type, mutate
immutable proposal bodies, or weaken the existing docs apply contract.

**Step 3: Refresh shipped assets**

Regenerate bundled skills and templates. Confirm every changed canonical skill
has exactly one PR-scoped version increase in the final branch diff; do not
double-bump for revision edits. Recheck public-package versions against current
`origin/main` and advance all five together only if `0.2.30` no longer
satisfies release freshness.

**Step 4: Verify and commit**

Run, in order:

```bash
pnpm check
pnpm type-check
pnpm test
pnpm build
pnpm lint
pnpm format
pnpm build:docs
pnpm release:validate
```

Commit revision-owned source, docs, generated assets, and any required lockstep
version updates:

```bash
git add .agents/skills/oat-project-retro packages/cli/src/commands/init/tools/shared/retro-skill-contracts.test.ts apps/oat-docs/docs/workflows/projects/retro.md packages/cli/assets packages/cli/package.json packages/control-plane/package.json packages/docs-config/package.json packages/docs-theme/package.json packages/docs-transforms/package.json
git commit -m "feat(prev2-t04): ship second retro dogfood refinements"
```

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - CLI config surface (`retro` step, `workflow.retro` namespace)
- Phase 2: 4 tasks - Template, retro skill, filing skill, pack registration
- Phase 3: 2 tasks - Closeout dispatch and completion offer
- Phase 4: 2 tasks - Lifecycle/config docs and workflow page
- Phase 5: 2 tasks - Dogfood acceptance, then lockstep release bump + final validation
- Phase 6: 1 task - Canonical revision phase compatibility in project state
- Revision 1: 4 tasks - Writeback coherence, duplicate scope, durable filing receipts, and concise output
- Revision 2: 4 tasks - Receipt schema, standalone evidence anchors, precise evidence inventory, and append-only correction routing

**Total: 21 tasks**

Revision 2 is implemented, independently reviewed, and ready for lifecycle
closeout.

---

## References

- Design: `design.md` (quick-mode lightweight design; register contract, config schema, flows)
- Discovery: `discovery.md` (Questions 1–9 record all scope decisions)
- Handoff: `references/oat-project-retro-skill-handoff.md`
- Reference retro: `references/project-retro.example.md`
- Sequencing contract: `.agents/skills/oat-project-implement/references/completion-and-closeout.md`
