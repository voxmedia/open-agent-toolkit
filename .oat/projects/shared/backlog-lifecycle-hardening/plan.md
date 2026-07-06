---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-07-05
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p06'] # phases to pause AFTER completing (empty = every phase)
oat_plan_parallel_groups: [['p01', 'p02']] # groups of phases that run concurrently in worktrees; [] = fully sequential
oat_plan_source: quick # spec-driven | quick | imported
oat_auto_review_at_hill_checkpoints: true # from workflow.autoReviewAtHillCheckpoints
oat_import_reference: null # e.g., references/imported-plan.md
oat_import_source_path: null # original source path provided by user
oat_import_provider: null # codex | cursor | claude | null
oat_generated: false
oat_template: false
---

# Implementation Plan: backlog-lifecycle-hardening

> Execute this plan using `oat-project-implement` — sequential by default, parallel when `oat_plan_parallel_groups` is declared.

**Goal:** Make backlog close-out atomic (`oat backlog archive`), bake the lifecycle into the `oat pjm init` scaffold, surface drift in `oat pjm doctor`, and bring `.oat/repo/**` instruction files under `oat instructions sync`/`validate` — propagated through bundled skills, docs, and a lockstep release bump.

**Architecture:** One new command plus a shared status module under `commands/backlog/`, four new `pjm:*` doctor checks, a write-if-missing README emission in `pjm init`, and a surgical `.oat/repo` carve-in in the instructions scan BFS. See `design.md` for interfaces and the archive data flow.

**Tech Stack:** TypeScript ESM, commander, vitest, oxlint/oxfmt (existing CLI package conventions).

**Commit Convention:** `{type}({scope}): {description}` — e.g., `feat(p01-t01): add backlog item status module`

## Planning Checklist

- [x] Confirmed HiLL checkpoints with user
- [x] Set `oat_plan_hill_phases` in frontmatter
- [x] Evaluated phases for parallelism opportunities
- [x] Set `oat_plan_parallel_groups` in frontmatter

---

## Parallelism

`oat_plan_parallel_groups: [['p01', 'p02']]`

- **p01 (backlog core)** writes `packages/cli/src/commands/backlog/**` plus `packages/cli/src/commands/help-snapshots.test.ts` (a file p02 does not touch); **p02 (instructions carve-in)** writes only `packages/cli/src/commands/instructions/**`. Write sets are disjoint, tests are file-scoped, and neither imports the other — they run concurrently in isolated worktrees and merge in plan order.
- **p03 (doctor checks)** imports the p01 status module and must follow the group.
- **p04 (templates + init)** modifies `pjm/doctor.test.ts`, which p03 also modifies, and its doctor coverage depends on p03's checks landing — sequential after p03. (The canonical path list lives in `init.ts` and flows into doctor via import; doctor production code is untouched by p04.)
- **p05 (skills + docs)** documents the command and checks shipped in p01–p04 — sequential.
- **p06 (dogfood + release)** runs the new scaffold against this repo and bumps versions across everything — last.

---

## Phase 1: Backlog close-out core

### Task p01-t01: Backlog item status module

**Files:**

- Create: `packages/cli/src/commands/backlog/shared/item-status.ts`
- Create: `packages/cli/src/commands/backlog/shared/item-status.test.ts`

**Step 1: Write test (RED)**

Cover: status list is exactly `open | in_progress | closed | wont_do`; terminal subset is `closed | wont_do`; `isValidStatus`/`isTerminalStatus` guards; frontmatter status extraction (valid value, out-of-enum value like `done`, missing status).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/shared/item-status.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

```typescript
export const BACKLOG_ITEM_STATUSES = [
  'open',
  'in_progress',
  'closed',
  'wont_do',
] as const;
export type BacklogItemStatus = (typeof BACKLOG_ITEM_STATUSES)[number];
export const TERMINAL_BACKLOG_STATUSES: readonly BacklogItemStatus[];
export function isValidBacklogStatus(value: string): value is BacklogItemStatus;
export function isTerminalBacklogStatus(value: string): boolean;
export function extractBacklogStatus(frontmatterContent: string): string | null;
```

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/shared/item-status.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

None expected; keep the module dependency-free so `pjm doctor` can import it via alias.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/backlog/shared/item-status.ts packages/cli/src/commands/backlog/shared/item-status.test.ts
git commit -m "feat(p01-t01): add backlog item status module"
```

---

### Task p01-t02: Regeneration core export + invalid-status warnings

**Files:**

- Modify: `packages/cli/src/commands/backlog/regenerate-index.ts`
- Modify: `packages/cli/src/commands/backlog/regenerate-index.test.ts`

**Step 1: Write test (RED)**

Cover: an item with status `done` produces a warning naming the file and the valid values while the table still renders the row; items with valid statuses produce no warnings; the extracted regeneration core is callable directly and returns the warning list.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/regenerate-index.test.ts`
Expected: New tests fail (RED)

**Step 2: Implement (GREEN)**

Extract the scan/render/write body into an exported `regenerateBacklogIndex(backlogRoot)` returning `{ itemCount, warnings }`; the command action wraps it and routes warnings through the CLI logger. Use `item-status.ts` for enum validation. Exit code unchanged (doctor owns enforcement).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/regenerate-index.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Keep readdir-order determinism (existing `regenerate-index.readdir-order.test.ts` must stay green).

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/ && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: All backlog tests pass; no lint/type errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/backlog/regenerate-index.ts packages/cli/src/commands/backlog/regenerate-index.test.ts
git commit -m "feat(p01-t02): export regeneration core and warn on invalid backlog statuses"
```

---

### Task p01-t03: `oat backlog archive` command

**Files:**

- Create: `packages/cli/src/commands/backlog/archive.ts`
- Create: `packages/cli/src/commands/backlog/archive.test.ts`
- Modify: `packages/cli/src/commands/backlog/index.ts` (register subcommand)
- Modify: `packages/cli/src/commands/backlog/index.test.ts` (registration coverage)
- Modify: `packages/cli/src/commands/help-snapshots.test.ts` (update `backlog --help` inline snapshot for the new subcommand)

**Step 1: Write test (RED)**

Temp-dir fixtures per `init.test.ts` pattern. Cover the design's data-flow contract: fresh archive happy path (status flip, `updated` bump, canonical `completed.md` entry newest-first, file moved, index regenerated); `--wont-do` with `--summary` (entry) and without (no entry); closed without `--summary` gets `TODO: summarize outcome` scaffold; out-of-enum current status → exit 1 with file path + valid values + fix hint; unknown id → exit 1; already in `archived/` → exit 0 warning no-op with no writes; missing `completed.md` created from starter scaffold; missing `## Completed Items` heading → warn + scaffolded section appended; git repo path uses `git mv` (file tracked as rename); non-git temp dir falls back to `fs.rename`; `--json` payload shape for archived and no-op results; frontmatter enum comment preserved after rewrite.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/archive.test.ts`
Expected: Test fails (RED)

**Step 2: Implement (GREEN)**

`oat backlog archive <id> [--wont-do] [--summary <text>] [--json]` per `design.md` Component Design: minimal-diff frontmatter rewrite (only `status:`/`updated:` lines), completed-entry rules, `git mv` with rename fallback (a `git mv` failure degrades to rename + warning, never aborts after the frontmatter write), regeneration via the p01-t02 core, CLI logger output, exit semantics 0/1/2.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/archive.test.ts`
Expected: Test passes (GREEN)

**Step 3: Refactor**

Keep the handler thin — completed-entry and move helpers as local functions in `archive.ts` (domain-local first).

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/backlog/ src/commands/help-snapshots.test.ts && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: All pass, including the updated help snapshot

**Step 5: Commit**

```bash
git add packages/cli/src/commands/backlog/ packages/cli/src/commands/help-snapshots.test.ts
git commit -m "feat(p01-t03): add oat backlog archive close-out command"
```

---

## Phase 2: Instructions scan carve-in

### Task p02-t01: `.oat/repo` carve-in in the scan BFS

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.utils.ts`
- Modify: `packages/cli/src/commands/instructions/instructions.utils.test.ts`

**Step 1: Write test (RED)**

Cover: `.oat/repo/AGENTS.md` and nested `.oat/repo/pjm/AGENTS.md` appear in scan entries; `.oat/templates/`, `.oat/projects/`, and `.oat/sync/` contents never appear; scan behaves identically when `.oat/repo` does not exist; existing root-exclusion tests stay green.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/instructions/instructions.utils.test.ts`
Expected: New tests fail (RED)

**Step 2: Implement (GREEN)**

In `scanInstructionDirectories`, when the root-level `.oat` entry is skipped via `ROOT_EXCLUDED_DIRECTORIES`, enqueue `join(entryPath, 'repo')` if it exists. The exclusion set itself is unchanged.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/instructions/instructions.utils.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Name the carve-in as a constant so intent survives (`.oat/repo` is the only excluded-subtree re-entry point).

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: No errors

**Step 5: Commit**

```bash
git add packages/cli/src/commands/instructions/instructions.utils.ts packages/cli/src/commands/instructions/instructions.utils.test.ts
git commit -m "feat(p02-t01): include .oat/repo in the instructions scan"
```

---

### Task p02-t02: Sync/validate integration coverage

**Files:**

- Modify: `packages/cli/src/commands/instructions/instructions.integration.test.ts`

**Step 1: Write test (RED)**

Cover: `oat instructions sync --dry-run` lists `.oat/repo/**` AGENTS.md files with planned CLAUDE.md creations under each strategy; `validate` reports drift for a hand-edited `.oat/repo/pjm/CLAUDE.md`; a repo without `.oat/repo` produces unchanged output.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/instructions/instructions.integration.test.ts`
Expected: New tests fail (RED)

**Step 2: Implement (GREEN)**

No production code expected beyond p02-t01 — this task locks the end-to-end contract. Fix any gaps the integration surface exposes.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/instructions/instructions.integration.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/instructions/`
Expected: All instructions tests pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/instructions/instructions.integration.test.ts
git commit -m "test(p02-t02): lock sync/validate contract for .oat/repo instruction files"
```

---

## Phase 3: Doctor drift checks

### Task p03-t01: Four backlog drift checks in `pjm doctor`

**Files:**

- Modify: `packages/cli/src/commands/pjm/doctor.ts`
- Modify: `packages/cli/src/commands/pjm/doctor.test.ts`

**Step 1: Write test (RED)**

Fixture backlogs exercising each check (dirty and clean): `pjm:backlog_terminal_in_items` (closed/wont_do file in `items/`, fail, fix mentions `oat backlog archive <id>`); `pjm:backlog_invalid_status` (status `done` in either directory, fail, message lists file paths and valid values); `pjm:backlog_archived_open` (open/in_progress in `archived/`, warn); `pjm:backlog_completed_unarchived` (completed.md entry ID whose file sits in `items/`, warn; legacy lowercase `bl-` IDs matched case-insensitively; unparseable entries ignored).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/doctor.test.ts`
Expected: New tests fail (RED)

**Step 2: Implement (GREEN)**

Implement the four checks using `@commands/backlog/shared/item-status`; scan both backlog directories' frontmatter once and derive all statuses from that pass. Message format mirrors existing checks (offending paths joined in message, actionable `fix`).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/doctor.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

Share the frontmatter walk with the existing migrated-template scan if it falls out naturally; do not force it.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/ src/commands/doctor/ && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: pjm and top-level doctor suites pass (aggregation picks up new checks)

**Step 5: Commit**

```bash
git add packages/cli/src/commands/pjm/doctor.ts packages/cli/src/commands/pjm/doctor.test.ts
git commit -m "feat(p03-t01): detect backlog lifecycle drift in pjm doctor"
```

---

## Phase 4: Templates + pjm init

### Task p04-t01: Instruction template content + repo README + handoffs templates

**Files:**

- Modify: `.oat/templates/pjm-agents.md` (Backlog Lifecycle section — skills-repo exemplar variant incl. "never invent variants like `done`"; close-out steps rewritten around `oat backlog archive` as primary path with manual steps as documented fallback; wont_do entry convention per discovery Q3. Plus the **Project Kickoff Handoffs** section per discovery Q4: generate/refresh handoffs when a priority-alignment pass concludes, kickoff-stack items only with lane count/ordering as human decisions, required handoff content list — item reference with ID + title + path, recommended mode with artifact pre-population guidance, authoritative input pointers, repo conventions/verification gates the item file omits, close-out requiring the Backlog Lifecycle executed and the handoff deleted in the same shipping PR — delete stale handoffs on reprioritization, and pair every item ID with a human-readable title, no bare IDs)
- Modify: `.oat/templates/reference-agents.md` (source-of-truth map; update rule deferring close-out workflow to `../pjm/AGENTS.md`)
- Modify: `.oat/templates/repo-agents.md` (pointer bullets to lifecycle + README)
- Create: `.oat/templates/repo-readme.md` (generalized from downstream exemplar: canonical layout table — including the `pjm/handoffs/` row — generated-vs-curated conventions, ID conventions, close-out pointer)
- Create: `.oat/templates/pjm-handoffs-readme.md` (handoffs convention doc generalized from the orc exemplar: one-shot kickoff prompts, one file per item named `<BL-id>.md`, consumable-not-durable with `git rm` in the shipping PR, durable knowledge stays in item file/`reference/`, each handoff carries its own deletion instruction)
- Modify: `packages/cli/scripts/bundle-assets.sh` (append `repo-readme.md` and `pjm-handoffs-readme.md` to the explicit template copy list — without this the installed CLI cannot find the new templates)
- Modify: `packages/cli/src/commands/pjm/init.test.ts` (content assertions)

**Step 1: Write test (RED)**

Extend `packages/cli/src/commands/pjm/init.test.ts` with content assertions that read the repo template files directly (`.oat/templates/pjm-agents.md`, `reference-agents.md`, `repo-readme.md`, `pjm-handoffs-readme.md`) — the existing `seedTemplate` fixture writes synthetic stub bodies, so scaffold-output assertions can never see real template content. Assert: `pjm-agents.md` contains the `## Backlog Lifecycle` and `## Project Kickoff Handoffs` headings and references `oat backlog archive`; `reference-agents.md` defers to `../pjm/AGENTS.md`. (README/handoffs _emission_ assertions belong to p04-t02 and stay on the synthetic fixture — do not write them here.)

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/init.test.ts`
Expected: New content assertions fail (RED)

**Step 2: Implement (GREEN)**

Author the template content and append the two new templates to the `for template in ...` list in `packages/cli/scripts/bundle-assets.sh` (the bundle edit doesn't affect these tests — they read repo templates — but it is what makes installed CLIs ship them; Step 4's bundle run smoke-checks the copy list).

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/init.test.ts`
Expected: This task's content assertions pass (GREEN)

**Step 3: Refactor**

Prose pass: keep template additions provider-neutral and free of repo-specific paths.

**Step 4: Verify**

Run: `bash packages/cli/scripts/bundle-assets.sh && pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/init.test.ts`
Expected: Bundle build clean (new templates copied); assertions green

**Step 5: Commit**

```bash
git add .oat/templates/pjm-agents.md .oat/templates/reference-agents.md .oat/templates/repo-agents.md .oat/templates/repo-readme.md .oat/templates/pjm-handoffs-readme.md packages/cli/scripts/bundle-assets.sh packages/cli/src/commands/pjm/init.test.ts
git commit -m "feat(p04-t01): bake backlog lifecycle and kickoff-handoff guidance into pjm templates"
```

---

### Task p04-t02: README + handoffs emission, sync hint, canonical-path nudge

**Files:**

- Modify: `packages/cli/src/commands/pjm/init.ts` (add `repo-readme.md` → `README.md` and `pjm-handoffs-readme.md` → `pjm/handoffs/README.md` to `TEMPLATE_TARGETS`; print `oat instructions sync` next-step hint mentioning `--dry-run`. The new targets flow into `CANONICAL_REPO_REFERENCE_PATHS` — defined in `init.ts` and imported by `pjm doctor` — so no doctor production change is needed for the missing-scaffold nudge)
- Modify: `packages/cli/src/commands/pjm/init.test.ts`, `packages/cli/src/commands/pjm/doctor.test.ts`

**Step 1: Write test (RED)**

Cover (on the existing synthetic-template fixture — these are emission/structure assertions, not content assertions): fresh `oat pjm init` writes `README.md` and `pjm/handoffs/README.md`; re-run backfills a deleted `README.md`/handoffs README without touching existing files; init output contains the sync hint; `pjm doctor` on a scaffold missing `README.md` or `pjm/handoffs/README.md` fails the canonical-files check with the `oat pjm init` fix.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/init.test.ts src/commands/pjm/doctor.test.ts`
Expected: New tests fail (RED)

**Step 2: Implement (GREEN)**

Same write-if-missing semantics as the AGENTS.md scaffold entries; hint routed through the CLI logger. Init never writes CLAUDE.md.

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/init.test.ts src/commands/pjm/doctor.test.ts`
Expected: Tests pass (GREEN)

**Step 3: Refactor**

None expected.

**Step 4: Verify**

Run: `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/pjm/ && pnpm --filter @open-agent-toolkit/cli lint && pnpm --filter @open-agent-toolkit/cli type-check`
Expected: All pass

**Step 5: Commit**

```bash
git add packages/cli/src/commands/pjm/init.ts packages/cli/src/commands/pjm/init.test.ts packages/cli/src/commands/pjm/doctor.test.ts
git commit -m "feat(p04-t02): scaffold repo README and pjm handoffs from pjm init"
```

---

## Phase 5: Skills + docs propagation

### Task p05-t01: Bundled skills sweep

**Files:**

- Modify: `.agents/skills/*/SKILL.md` — every skill matched by the sweep grep (14 known at planning time) whose guidance narrates manual close-out steps; re-point at `oat backlog archive` and align terminal-status language; also sweep `oat pjm migrate` guidance and CLI prompts for stale close-out narration
- Frontmatter `version:` bump in every changed SKILL.md (PR-scoped rule)

**Step 1: Write test (RED)**

No unit tests own skill prose; the RED step is the sweep itself:
Run: `grep -rln "archived/\|completed\.md" .agents/skills/*/SKILL.md`
Expected: 14 files at planning time — every listed file is triaged (edited or documented as no-change-needed) before this task completes; a lower match count means the pattern regressed, not that the work shrank

**Step 2: Implement (GREEN)**

Edit matched skills: manual step sequences become "run `oat backlog archive <id>`", with the manual list retained only where a skill must explain the underlying invariant. Bump each changed skill's `version:`.

Run: `pnpm run cli -- sync --scope all && git diff --stat`
Expected: provider views regenerate cleanly; only intended skills changed

**Step 3: Refactor**

Consistency pass: identical lifecycle phrasing across skills (link, don't duplicate).

**Step 4: Verify**

Run: `pnpm test` (workspace suites guarding skill frontmatter/versions) and re-run `grep -rln "archived/\|completed\.md" .agents/skills/*/SKILL.md`
Expected: Suites pass; no skill still narrates the old manual-only flow

**Step 5: Commit**

```bash
git add .agents/skills/ .claude/ .codex/ .cursor/ .oat/sync/
git commit -m "docs(p05-t01): re-point bundled skills at oat backlog archive"
```

---

### Task p05-t02: Docs coverage

**Files:**

- Modify/Create: backlog lifecycle + `oat backlog archive` coverage under `apps/oat-docs/docs` (CLI reference + workflow guidance per `apps/oat-docs/AGENTS.md` conventions)
- Regenerate: `apps/oat-docs/index.md` via `oat docs generate-index` (never hand-edit)

**Step 1: Write test (RED)**

Run: `pnpm build:docs`
Expected: current docs build green (baseline) — new pages must not break it

**Step 2: Implement (GREEN)**

Author command reference (flags, exit codes, JSON payload) and lifecycle workflow docs; regenerate the docs index.

Run: `pnpm build:docs`
Expected: Build passes with new pages in nav

**Step 3: Refactor**

Follow `oat-docs-authoring` conventions (no nav drift, generated index untouched by hand).

**Step 4: Verify**

Run: `pnpm build:docs && git status --porcelain apps/oat-docs`
Expected: Build green; only intended docs files changed

**Step 5: Commit**

```bash
git add apps/oat-docs/
git commit -m "docs(p05-t02): document oat backlog archive and the backlog lifecycle"
```

---

### Task p05-t03: Encode kickoff-handoff workflow in `oat-pjm-review-backlog`

**Files:**

- Modify: `.agents/skills/oat-pjm-review-backlog/SKILL.md` (+ frontmatter `version:` bump)

**Step 1: Write test (RED)**

Run: `grep -c "handoff" .agents/skills/oat-pjm-review-backlog/SKILL.md`
Expected: 0 today — the skill has no handoff awareness; this task ends with the workflow encoded

**Step 2: Implement (GREEN)**

Add the Project Kickoff Handoffs workflow to the skill, mirroring the template section from p04-t01: when a priority-alignment pass concludes, generate/refresh one handoff per agreed kickoff-stack item under `pjm/handoffs/` (required content list: item reference with ID + title + path, recommended mode with artifact pre-population guidance, authoritative input pointers, repo conventions/verification gates, close-out requiring lifecycle execution and handoff deletion in the shipping PR); delete stale handoffs for items reprioritized out; pair every backlog item reference with its human-readable title (no bare IDs) across review output, alignment docs, and handoffs. Lane count and kickoff-stack selection are explicit human decisions — the skill must present, not choose. Bump the skill's `version:` only if p05-t01 did not already bump it in this PR (the rule is one PR-scoped bump per changed skill; this skill is in the p05-t01 sweep set).

Run: `pnpm run cli -- sync --scope all && git diff --stat`
Expected: provider views regenerate; only the intended skill (plus provider mirrors) changed

**Step 3: Refactor**

Link to the template's handoffs section semantics rather than duplicating divergent wording.

**Step 4: Verify**

Run: `pnpm test`
Expected: skill frontmatter/version guards pass

**Step 5: Commit**

```bash
git add .agents/skills/oat-pjm-review-backlog/ .claude/ .codex/ .cursor/ .oat/sync/
git commit -m "feat(p05-t03): encode kickoff-handoff workflow in oat-pjm-review-backlog"
```

---

## Phase 6: Dogfood + release

### Task p06-t01: Dogfood the pjm scaffold in this repository

**Files:**

- Create (via CLI): `.oat/repo/pjm/**` — backlog scaffold, `pjm/AGENTS.md`, `pjm/handoffs/README.md`; plus any backfilled instruction files (existing `.oat/repo/README.md` and reference content are preserved by write-if-missing semantics)

**Step 1: Write test (RED)**

Run: `ls .oat/repo/pjm`
Expected: fails today — this repo has no pjm directory

**Step 2: Implement (GREEN)**

Run: `pnpm run cli -- pjm init` from the repo root, then `pnpm run cli -- pjm doctor` and `pnpm run cli -- instructions sync --dry-run`.
Expected: scaffold created (including `pjm/handoffs/README.md` with the convention doc); doctor passes the canonical-files check, and `pjm:top_level_layout` passes cleanly too — `analysis/`, `knowledge/`, `reviews/`, and `README.md` are already in doctor's allowed top-level sets; sync dry-run lists the new `.oat/repo/**` instruction files. Apply `pnpm run cli -- instructions sync` to create the CLAUDE.md shims under the default pointer strategy.

**Step 3: Refactor**

None — this task validates shipped behavior end-to-end in a real repo.

**Step 4: Verify**

Run: `pnpm run cli -- pjm doctor && pnpm run cli -- instructions validate`
Expected: canonical checks pass; instruction files report `ok`

**Step 5: Commit**

```bash
git add .oat/repo/
git commit -m "chore(p06-t01): dogfood pjm scaffold with handoffs in this repo"
```

---

### Task p06-t02: Lockstep version bumps + release validation

**Files:**

- Modify: `packages/cli/package.json`, `packages/control-plane/package.json`, `packages/docs-config/package.json`, `packages/docs-theme/package.json`, `packages/docs-transforms/package.json` (lockstep bump — bundled assets count as shipped CLI functionality)
- Modify: `packages/cli/assets/public-package-versions.json` (git-tracked, shipped in the CLI's `assets`; regenerated by `bundle-assets.sh` from the bumped package versions during the build — not hand-edited)

**Step 1: Write test (RED)**

Run: `pnpm release:validate`
Expected: fails (or flags pending bumps) before versions are aligned

**Step 2: Implement (GREEN)**

Bump all five public package versions together (same level). The release validation/build regenerates `packages/cli/assets/public-package-versions.json` from the new versions — confirm it reflects the bump and stage it with the manifests.

Run: `pnpm release:validate`
Expected: Passes

**Step 3: Refactor**

None.

**Step 4: Verify**

Run: `pnpm build && pnpm lint && pnpm type-check && pnpm test && pnpm format`
Expected: Full workspace gates green; `git status` shows no unstaged changes beyond the files this task commits

**Step 5: Commit**

```bash
git add packages/*/package.json packages/cli/assets/public-package-versions.json
git commit -m "chore(p06-t02): lockstep public package bump for backlog lifecycle hardening"
```

---

## Reviews

{Keep both code + artifact rows below. Add additional code rows as needed, but do not delete `spec`/`design`.}

| Scope  | Type     | Status          | Date       | Artifact                                                                                                                                                                        |
| ------ | -------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| p01    | code     | passed          | 2026-07-05 | in-memory oat-reviewer (opus): PASS 0C/0I; 2 Minor fixed in c57f3efe                                                                                                            |
| p02    | code     | passed          | 2026-07-05 | in-memory oat-reviewer (opus): PASS 0C/0I; 1 Minor (symlinked-.oat edge, no fix needed)                                                                                         |
| p03    | code     | passed          | 2026-07-05 | in-memory oat-reviewer (opus): PASS 0C/0I; m1 (status-less items) fixed in 31e4643e, m2 accepted best-effort                                                                    |
| p04    | code     | passed          | 2026-07-05 | in-memory oat-reviewer (opus): PASS 0C/0I; 1 Minor (plan file-list under-specified index.ts/test fixtures) noted only                                                           |
| p05    | code     | passed          | 2026-07-05 | in-memory oat-reviewer (opus): PASS 0C/0I; sweep completeness independently verified; 1 cosmetic Minor left (avoid re-bump)                                                     |
| p06    | code     | passed          | 2026-07-05 | covered by final-scope review (opus): PASS 0C/0I                                                                                                                                |
| final  | code     | passed          | 2026-07-05 | opus final PASS 0C/0I; independent Codex review then caught 1 Important (duplicate-id false no-op) — fixed in 7fed0c16 w/ new duplicate-id doctor check + archived_open cleanup |
| spec   | artifact | pending         | -          | -                                                                                                                                                                               |
| design | artifact | pending         | -          | -                                                                                                                                                                               |
| plan   | artifact | fixes_completed | 2026-07-05 | reviews/archived/artifact-plan-review-2026-07-05-v2.md (v1 gate: passed clean; v2 manual: 1 Important resolved in-artifact)                                                     |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

**Meaning:**

- `received`: review artifact exists (not yet converted into fix tasks)
- `fixes_added`: fix tasks were added to the plan (work queued)
- `fixes_completed`: fix tasks implemented, awaiting re-review
- `passed`: re-review run and recorded as passing (no Critical/Important)

---

## Implementation Complete

**Summary:**

- Phase 1: 3 tasks — backlog status module, regeneration core + warnings, `oat backlog archive`
- Phase 2: 2 tasks — instructions scan carve-in + sync/validate integration contract
- Phase 3: 1 task — four `pjm:*` backlog drift checks
- Phase 4: 2 tasks — template content (lifecycle + kickoff handoffs) + README/handoffs emission, sync hint, canonical nudge
- Phase 5: 3 tasks — bundled skills sweep, docs coverage, kickoff-handoff encoding in `oat-pjm-review-backlog`
- Phase 6: 2 tasks — dogfood the scaffold in this repo, lockstep release bump + full gates

**Total: 13 tasks**

Ready for code review and merge.

---

## References

- `discovery.md` — verified codebase findings, user decisions (Q1 shim strategy, Q2 completed.md contract, Q3 wont_do entries), constraints, out-of-scope
- `design.md` — component interfaces, archive data flow, doctor check table, testing strategy
- Downstream exemplars: `~/Code/backlog-review-july-4/.oat/repo/` and `~/Code/pjm-guidance/.oat/repo/` (Backlog Lifecycle sections, README exemplar, `pjm/handoffs/README.md` convention doc from tkstang/orc PR #10)
- Repo policies: root `AGENTS.md` (lockstep release bump, skill version bumps), `packages/cli/AGENTS.md` (command conventions), `apps/oat-docs/AGENTS.md` (docs authoring)
