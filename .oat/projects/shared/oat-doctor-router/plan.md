---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-09-14
oat_phase: plan
oat_phase_status: in_progress
oat_plan_parallel_groups: [] # sequential: p02's live verification and its contract test read the describe field p01 adds
oat_plan_source: quick # spec-driven | quick | imported | lite
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: true
---

# Implementation Plan: oat-doctor-router

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** `oat-doctor` becomes a read-only router over config, PJM, agent instructions, docs, and tools: one sweep, one grouped report, then dives that teach from the bundled docs and offer fixes without applying them. One CLI change makes config deprecations machine-readable (`BL-260911-make-oat-doctor`).

**Architecture:** Design § Architecture and § Component Design. Sweep = seven existing `--json` commands plus three file checks; report = findings grouped by area and severity; dive = prose per area citing docs pages. CLI: `ConfigCatalogEntry.deprecated` on `oat config describe`.

**Tech Stack:** TypeScript CLI (`packages/cli`, vitest), markdown skill with a `node --test` contract test, oxfmt/oxlint, docs pages under `apps/oat-docs`.

**Commit Convention:** `{type}({scope}): {description}` — e.g. `feat(p01-t01): add the deprecated field to config describe entries`.

## Planning Checklist

- [x] Defer HiLL checkpoint confirmation to oat-project-implement
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter (`[]`, reasoning under Parallelism)
- [x] Phase gate review: disabled (user declined); Phase gate review remains disabled. (Operator's standing preference: plan gate and final review only.)
- [x] Lifecycle gate posture: every configured gate kept; `oat_skill_gate_overrides` absent.

---

## Parallelism

Sequential. p01 (CLI) and p02 (skill, test, docs) have disjoint write sets, but p02's config dive reads the `deprecated` field p01 adds and p02-t04's live verification exercises it against the built CLI, so p02 cannot be verified until p01 has landed in the same tree. Two small phases in one worktree is cheaper than a worktree merge.

---

## Conventions for every task

- Read-only doctor: no task adds a mutating capability to the skill.
- Capture every gate's exit code explicitly; the evidence-grade test run is `HOME=$(mktemp -d) pnpm exec turbo run test --force` from the repository root with `Cached: 0`, plus `pnpm test:skills` after `pnpm build`. Run `pnpm lint` and `pnpm format` for every task touching `.agents/skills`.
- Scratch under `mktemp -d`; never `rm -rf` a variable path. Never oxfmt `state.md`.
- Locate test pins by their old literal, not by line number.
- Skill bumps are PR-scoped: `oat-doctor` 1.2.4 → 2.0.0 once (p02-t01); lockstep public-package bump once (p01-t02), strictly above `origin/main` at merge time.

---

## Phase 1: Config describe carries deprecations

Deliverable: `oat config describe` emits a structured `deprecated` field for every deprecated key, tied to the config module's legacy tables by tests; lockstep bumped.

### Task p01-t01: Add `deprecated` to `ConfigCatalogEntry` and the six entries

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts` (`ConfigCatalogEntry` `:194` gains `deprecated?: { supersededBy: string; note?: string; legacyValues?: readonly string[] }`; the entries at `:436` `autoReviewAtCheckpoints` → `workflow.autoReviewAtHillCheckpoints`, `:694` `explainers.defaults.palette` → `explainers.defaults.style`, `:707` `explainers.defaults.visualProfile` → `explainers.defaults.style`, `:853` `workflow.postImplementSequence` → `workflow.postImplementSequence` structured form with `legacyValues` from the exported table and `note: 'legacy string values only'`, `:1017` `workflow.dispatchCeiling.preset` → `workflow.dispatchCeiling` policy keys; `formatCatalogDetails` `:3401` prints `Deprecated: prefer <supersededBy>` (+ note) after `Description`; `runDescribe` `:3679` needs no change, entries pass through to JSON), `packages/cli/src/config/oat-config.ts` (export `VALID_POST_IMPLEMENT_LEGACY_SEQUENCES` `:243` as `POST_IMPLEMENT_LEGACY_SEQUENCES`), `packages/cli/src/commands/config/index.test.ts`
- Note: `workflow.autoReviewAtHillCheckpoints` (`:928`) mentions the legacy alias in its description but is the successor, not deprecated; it gets no field, and the description-sweep test below must account for it by matching only descriptions that begin with `Deprecated` or contain `Legacy compatibility alias` / `Deprecated compatibility` / `Deprecated nullable` / `Legacy strings remain` (the four phrasings in the catalog today), listing the exact phrases in the test.

**Step 1: Write test (RED)** — in `index.test.ts`: `describe --json` for each of the five deprecated keys shows `deprecated.supersededBy` as above and `workflow.postImplementSequence` shows `legacyValues` equal to the exported table; `describe autoReviewAtCheckpoints` plain output contains `Deprecated: prefer workflow.autoReviewAtHillCheckpoints`; a catalog sweep asserts every entry whose description matches the listed phrases carries `deprecated`, and every entry carrying `deprecated` names a `supersededBy` that is itself a catalog key or the same key with a note. Run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts` → red.

**Step 2: Implement (GREEN)** → green. **Prove it can fail:** remove `deprecated` from the `explainers.defaults.palette` entry → the sweep test goes red; restore.

**Step 3: Verify** — `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config src/config` green; `pnpm type-check` exit 0.

**Step 4: Commit** — `git commit -m "feat(p01-t01): add the deprecated field to config describe entries"`

---

### Task p01-t02: Docs line and lockstep bump

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/config-and-local-state.md` (the `oat config describe` paragraph under § `oat config ...`: one sentence that deprecated keys carry a `Deprecated: prefer …` line and a `deprecated` object in `--json`), the five lockstep `package.json` files + `packages/cli/assets/public-package-versions.json` (0.2.74 → 0.2.75, or one above whatever `origin/main` carries at the time), `.oat/sync/manifest.json` via `pnpm build && pnpm run --silent cli -- sync --scope project`

**Step 1: Verify (phase boundary)** — `git fetch origin main && pnpm release:check-versions` exit 0; the full gate list with captured exit codes; `pnpm build:docs` exit 0.

**Step 2: Commit** — `git commit -m "chore(p01-t02): document describe deprecations and bump lockstep"`

---

## Phase 2: The doctor router

Deliverable: the rewritten skill, its contract test, the two docs pages, live verification on three repositories.

### Task p02-t01: Rewrite `oat-doctor` as the sweep-report-dive router

**Files:**

- Modify: `.agents/skills/oat-doctor/SKILL.md` (frontmatter: description reworded to the router, `argument-hint: '[--summary]'` kept, `metadata.version: 2.0.0`, `allowed-tools` unchanged; body per design § Component Design: Mode Assertion (read-only, self-correction); Progress Indicators for sweep and summary; Step 0 Mode incl. the `OAT_NON_INTERACTIVE` / no-response-channel report-only rule; Step 1 Sweep naming the seven commands (`oat doctor --json --scope all`, `oat pjm doctor --json`, `oat config dump --json`, `oat config describe --json`, `oat instructions validate --json`, `oat tools list --json --scope all`, `oat tools outdated --json --scope all`) and the three file checks (root `AGENTS.md` headings; docs surface presence as `oat-docs-bootstrap` preflight 1b defines it; `documentation.root` existence), with the failed-command-becomes-a-warning rule; Step 2 Report in the design's format with the severity rules and the info fold; Step 3 one dive subsection per area (config incl. the key-group walk over the `describe` groups with the cited docs sections; PJM with every `pjm:*` id the CLI emits today and its fix path; instructions with the four headings and the two routes; docs routing to `oat-docs-bootstrap`; tools); the teaching rule; Step 4 `--summary` dashboard kept with the pack table built from `oat tools list --json` grouped by `pack`; Success Criteria). Remove the fallback description list, the pack manifest, and "Config Key Explanations".

**Step 1: Verify** — `pnpm oat:validate-skills` exit 0; `grep -c "activeProject:\*\*\|oat-project-capture, oat-project-clear-active" .agents/skills/oat-doctor/SKILL.md` → 0 (the old list and manifest are gone); `grep -c "pjm:legacy_monoliths\|pjm:backlog_duplicate_id\|OAT_NON_INTERACTIVE\|oat config describe --json" .agents/skills/oat-doctor/SKILL.md` → 4; `pnpm lint && pnpm format` exit 0.

**Step 2: Commit** — `git commit -m "feat(p02-t01): rewrite oat-doctor as a sweep, report, and dive router"`

---

### Task p02-t02: Skill contract test

**Files:**

- Create: `.agents/skills/oat-doctor/tests/doctor-contract.test.mjs` (`node --test`; reads `SKILL.md` and asserts: the seven sweep commands are named verbatim; the five area names and the three severities appear; the report-only rule names `OAT_NON_INTERACTIVE`; none of the eleven old key-description lines and no pack-manifest skill list remain; every `pjm:*` check id listed in the test's pinned array (the twelve the CLI emits today, copied from `oat pjm doctor --json`) appears in the PJM dive; every docs citation of the form `cli-utilities/<page>.md § <heading>` resolves to a real `## ` heading in `apps/oat-docs/docs/cli-utilities/<page>.md`)

**Step 1: Write test** — run `node --test .agents/skills/oat-doctor/tests/doctor-contract.test.mjs` → green against p02-t01's skill. **Prove it can fail:** delete `pjm:second_roadmap` from the PJM dive → red; restore.

**Step 2: Verify** — `pnpm build && pnpm test:skills > /tmp/x.log 2>&1; echo exit=$?` → 0; `pnpm lint && pnpm format`.

**Step 3: Commit** — `git commit -m "test(p02-t02): add the oat-doctor contract test"`

---

### Task p02-t03: Docs pages

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/config-and-local-state.md` (the `/oat-doctor` paragraph, ~`:286`: sweep, report, dives, report-only unattended), `apps/oat-docs/docs/cli-utilities/tool-packs.md` (the `oat-doctor` bullet, ~`:853`: the same, and `--summary` kept)

**Step 1: Verify** — `pnpm build:docs > /tmp/x.log 2>&1; echo exit=$?` → 0; `pnpm check` (markdownlint) exit 0; `grep -n "check mode\|brew doctor" apps/oat-docs/docs/cli-utilities/tool-packs.md apps/oat-docs/docs/cli-utilities/config-and-local-state.md` → empty.

**Step 2: Commit** — `git commit -m "docs(p02-t03): describe the oat-doctor router"`

---

### Task p02-t04: Live verification and phase gates

**Files:**

- Modify: `.oat/projects/shared/oat-doctor-router/implementation.md` (a "Live verification" note with the three transcripts' first screens)

**Step 1: Run the skill** (as the implementing agent, following `SKILL.md` verbatim) in three places, with the CLI built from this branch on `PATH`: this repository (expect: tools current, adoption declared, at most info counts); `~/code/vox/pntr` (expect a docs warning: a docs surface with no `documentation` config, fix path `oat-docs-bootstrap`; read-only, commit nothing there); a scratch repository under `mktemp -d` with `git init` and no `.oat/` (expect every area to offer its bootstrap: `oat init`, `oat tools install`, `oat pjm init`, `oat-docs-bootstrap`). Run the scratch case once more with `OAT_NON_INTERACTIVE=1` and confirm the output ends at the report with no prompt. Record the first screen of each run and any finding whose fix path was wrong in the implementation log; fix the skill in the same task if a dive misnamed a command.

**Step 2: Gates (phase boundary)** — the full list with captured exit codes; `HOME=$(mktemp -d) pnpm exec turbo run test --force` with `Cached: 0`; `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts`; `pnpm run check:skill-bumps`; `pnpm lint`, `pnpm format`.

**Step 3: Commit** — `git commit -m "docs(p02-t04): record oat-doctor live verification"`

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows as needed, but do not delete existing rows.}

| Scope  | Type     | Status  | Date | Artifact | Reviewed Head | Invocation | Gate Target |
| ------ | -------- | ------- | ---- | -------- | ------------- | ---------- | ----------- |
| p01    | code     | pending | -    | -        | -             | -          | -           |
| p02    | code     | pending | -    | -        | -             | -          | -           |
| final  | code     | pending | -    | -        | -             | -          | -           |
| design | artifact | pending | -    | -        | -             | -          | -           |
| plan   | artifact | pending | -    | -        | -             | -          | -           |

For code-review events, `Reviewed Head` is the full 40-character SHA at the
head of the reviewed range. `Invocation` records `manual`, `auto`, or `gate`;
`Gate Target` is populated only for gate events.

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

---

## Implementation Complete

**Summary:**

- Phase 1: 2 tasks - Config describe carries deprecations
- Phase 2: 4 tasks - The doctor router

**Total:** 6 tasks

## References

- Design: `design.md`; Discovery: `discovery.md`
- Backlog: `.oat/repo/pjm/backlog/items/BL-260911-make-oat-doctor.md`
- Related: `BL-260911-make-docs-bootstrap-a-front` (docs dive target), `BL-260911-support-per-tool-scope`
