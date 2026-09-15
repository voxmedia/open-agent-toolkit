---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-14
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p02'] # confirmed at implementation start: pause only after the final phase
oat_plan_parallel_groups: [] # sequential: p02's live verification and its contract test read the describe field p01 adds
oat_plan_source: quick # spec-driven | quick | imported | lite
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
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

- Read-only doctor with one carve-out: the sweep and the dives never write; the only mutation the skill may perform is to run one fix command it has just named (`oat config set|unset|adopt`, `oat pjm init`, `oat instructions sync`, `oat tools update|install`), one at a time, after the person's explicit approval of that exact command, and it reports the result. Skill hand-offs (`oat-docs-bootstrap`, `oat-agent-instructions-analyze`, `oat-pjm-*`) are separate invocations the person starts. The Mode Assertion's BLOCKED list is rewritten to say exactly this and p02-t02 pins it.
- Capture every gate's exit code explicitly; the evidence-grade test run is `HOME=$(mktemp -d) pnpm exec turbo run test --force` from the repository root with `Cached: 0`, plus `pnpm test:skills` after `pnpm build`. Run `pnpm lint` and `pnpm format` for every task touching `.agents/skills`.
- Scratch under `mktemp -d`; never `rm -rf` a variable path. Never oxfmt `state.md`.
- Locate test pins by their old literal, not by line number.
- Skill bumps are PR-scoped: `oat-doctor` 1.2.4 → 2.0.0 once (p02-t01); lockstep public-package bump once (p01-t02), strictly above `origin/main` at merge time.

---

## Phase 1: Config describe carries deprecations

Deliverable: `oat config describe` emits a structured `deprecated` field for every deprecated key, tied to the config module's legacy tables by tests; lockstep bumped.

### Task p01-t01: Add `deprecated` to `ConfigCatalogEntry` and the five deprecated entries

**Files:**

- Modify: `packages/cli/src/commands/config/index.ts` (`ConfigCatalogEntry` `:194` gains `deprecated?: { supersededBy: string; note?: string; legacyValues?: readonly string[] }`; the entries at `:436` `autoReviewAtCheckpoints` → `workflow.autoReviewAtHillCheckpoints`, `:694` `explainers.defaults.palette` → `explainers.defaults.style`, `:707` `explainers.defaults.visualProfile` → `explainers.defaults.style`, `:853` `workflow.postImplementSequence` → `workflow.postImplementSequence` structured form with `legacyValues: VALID_POST_IMPLEMENT_LEGACY_SEQUENCES` (a reference to the exported table, not a copy, so the equality cannot drift and needs no assertion) and `note: 'legacy string values only'`, `:1017` `workflow.dispatchCeiling.preset` → `workflow.dispatchCeiling` policy keys; `formatCatalogDetails` `:3401` prints `Deprecated: prefer <supersededBy>` (+ note) after `Description` — this repeats guidance some descriptions already carry in prose, deliberately, as the rendering of the machine-readable field; `runDescribe` `:3679` needs no change, entries pass through to JSON), `packages/cli/src/config/oat-config.ts` (export `VALID_POST_IMPLEMENT_LEGACY_SEQUENCES` `:243` under its own name; `LEGACY_POST_IMPLEMENT_SEQUENCES` `:257` is the differently shaped mapping table and stays private), `packages/cli/src/commands/config/index.test.ts`
- Note: `workflow.autoReviewAtHillCheckpoints` (`:928`) mentions the legacy alias in its description but is the successor, not deprecated; it gets no field, and the description-sweep test below must account for it by matching only descriptions that begin with `Deprecated` or contain `Legacy compatibility alias` / `Deprecated compatibility` / `Deprecated nullable` / `Legacy strings remain` (the four phrasings in the catalog today), listing the exact phrases in the test.

**Step 1: Write test (RED)** — in `index.test.ts`: `describe --json` for each of the five deprecated keys shows `deprecated.supersededBy` as above and `workflow.postImplementSequence` shows `legacyValues` with the four legacy strings; `describe autoReviewAtCheckpoints` plain output contains `Deprecated: prefer workflow.autoReviewAtHillCheckpoints`; a catalog sweep asserts every entry whose description matches the listed phrases carries `deprecated`, and every entry carrying `deprecated` names a `supersededBy` that is itself a catalog key or the same key with a note. Run `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config/index.test.ts` → red.

**Step 2: Implement (GREEN)** → green. **Prove it can fail:** remove `deprecated` from the `explainers.defaults.palette` entry → the sweep test goes red; restore.

**Step 3: Verify** — `pnpm --filter @open-agent-toolkit/cli exec vitest run src/commands/config src/config` green; `pnpm type-check` exit 0.

**Step 4: Commit** — `git commit -m "feat(p01-t01): add the deprecated field to config describe entries"`

---

### Task p01-t02: Docs line and lockstep bump

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/config-and-local-state.md` (the `oat config describe` bullets at `~:126-127`: one sentence that deprecated keys carry a `Deprecated: prefer …` line and a `deprecated` object in `--json`), the five lockstep `package.json` files + `packages/cli/assets/public-package-versions.json` (0.2.74 → 0.2.75, or one above whatever `origin/main` carries at the time), `.oat/sync/manifest.json` via `pnpm build && pnpm run --silent cli -- sync --scope project`

**Step 1: Verify (phase boundary)** — `git fetch origin main && pnpm release:check-versions` exit 0; the full gate list with captured exit codes; `pnpm build:docs` exit 0.

**Step 2: Commit** — `git commit -m "chore(p01-t02): document describe deprecations and bump lockstep"`

---

## Phase 2: The doctor router

Deliverable: the rewritten skill, its contract test, the two docs pages, live verification on three repositories.

### Task p02-t01: Rewrite `oat-doctor` as the sweep-report-dive router

**Files:**

- Modify: `.agents/skills/oat-doctor/SKILL.md` (frontmatter: description reworded to the router, `argument-hint: '[--summary]'` kept, `metadata.version: 2.0.0`, `allowed-tools` unchanged; body per design § Component Design: Mode Assertion (read-only, self-correction); Progress Indicators for sweep and summary; Step 0 Mode incl. the `OAT_NON_INTERACTIVE` / no-response-channel report-only rule; Step 1 Sweep naming the seven commands (`oat doctor --json --scope all`, `oat pjm doctor --json`, `oat config dump --json`, `oat config describe --json`, `oat instructions validate --json`, `oat tools list --json --scope all`, `oat tools outdated --json --scope all`) and the four file checks (root `AGENTS.md` headings; the two sync config files; docs surface presence as `oat-docs-bootstrap` preflight 1b defines it; `documentation.root` existence), each call projected with `node -e` to the fields the area reads, never emitted raw (measured on this repository: `oat doctor --json` is ~410 KB, `tools list --json` ~626 KB): `doctor` → `.checks[] | {name,status,message}` only (drop `packEvidence`, `providerRefreshAdvice`); `pjm doctor` → `.adoption` + `.checks[] | {name,status,message}`; `config dump` → the three surface objects; `config describe` → `.entries[] | {key,group,file,scope,defaultValue,owningCommand,deprecated}`; `instructions validate` → `.summary` + `.entries[] | select(.status != 'ok')`; `tools list` → `.tools[] | {name,pack,scope,status}`; `tools outdated` → `.tools[] | {name,version,bundledVersion,scope}`. A command counts as failed only when stdout does not parse as JSON or the process is killed or times out; a non-zero exit with parseable JSON is a findings result (`oat doctor` and `oat pjm doctor` both exit 1 on this healthy repository), and a failed command becomes one warning finding for its area with the stderr excerpt. Per-area finding rules and severities per design § Architecture (the sweep table and the three severity levels), enumerated in the task body: config → stale `activeProject` / `activeIdea` / `lastPausedProject` (error), a set key whose entry carries `deprecated` (warning, fix = `supersededBy`), a key set on a surface other than its entry's `file` (warning), unadopted `oat config adopt` templates (info), unset documented key groups (info); PJM → adoption `absent`/`partial` (error), any `pjm:*` check with status `fail` (error) or `warn` (warning), any check id the dive does not know (info, with its message, design § Error Handling rule 4); instructions → entry `status` `missing` or `content_mismatch` (error; the summary counter is spelled `contentMismatch`, the entry literal is `content_mismatch`), `stray` (warning), a missing CLI-written heading for an installed capability (warning); docs → surface with no `documentation` config (warning), `documentation.root` absent on disk (error); tools → outdated (warning), a pack at both scopes (warning), declared-but-not-installed (warning). `oat doctor --json` checks: any check with status `fail` or `warn` becomes a finding in its mapped area by a semantic map, not a prefix rule — `project:dispatch_matrix` and `project:synced_*` → config; `project:manifest`, `project:providers`, `project:symlink_support`, `project:canonical_directories`, `project:codex_*`, `project:skill_versions`, `*:pack_state`, `packs:*` (and their `user:` twins) → tools; `project:stale_invocations` → docs (it cites doc and script file:line); any other check name → info with its message — severity from status, evidence = the check name; its `pjm:*` checks are suppressed because `oat pjm doctor` reports the same ids (verified identical sets), so nothing is doubled; an unknown check name is info with its message. The two sync groups (`Sync/Provider`, `User Sync`) are not in `config dump`, so a fourth file check reads `.oat/sync/config.json` and `~/.oat/sync/config.json` (present keys only) for the set-state and the group walk. "Unadopted templates" means the one adoption template that exists, `dispatch-matrix`: adopted when `workflow.dispatchCeiling.recommendationVersion` is present in the dump (`configuration.md:394`), otherwise info. A finding with no fix path is `info` with the reason; missing bundled docs (`~/.oat/docs` absent) is stated in the dive with `oat tools install core` offered (design § Error Handling rule 2); Step 2 Report in the design's format with the severity rules and the info fold; Step 3 one dive subsection per area (config incl. the key-group walk over every distinct `group` value in `describe --json` (nine today, incl. `PJM Remote Shared Policy`, `Explainer Defaults (local > shared)`, `User Sync`; no hard-coded list) with the cited docs sections (`configuration.md` § The five config surfaces, § Shared repo config you will touch most often, § Repo-local and user state, § Dispatch policy resolution, § Workflow preferences, § Provider sync config is different; `workflow-gates.md` § Gate config for the gate keys; `backlog-lifecycle.md` § Adoption comes first for the PJM keys; `remote-project-management.md` for the PJM remote group; a citation must be a prefix of the real heading, never an expansion of it); PJM with every `pjm:*` id the CLI defines (21: the twelve core checks in `packages/cli/src/commands/pjm/doctor.ts` and the nine `pjm:remote_*` checks in `pjm/remote/doctor.ts`, emitted only when a remote binding is adopted) and its fix path, plus the generic rule for an unknown id (info with the message), structural drift (`legacy_monoliths`, `loose_reference_files`, `second_roadmap`, `top_level_layout`) routed to `backlog-lifecycle.md` § Catching lifecycle drift; instructions with the four headings and the two routes; docs routing to `oat-docs-bootstrap`; tools); the teaching rule; Step 4 `--summary` dashboard kept with the pack table built from `oat tools list --json` grouped by `pack`; Success Criteria). Mode Assertion rewritten to the one-fix carve-out under Conventions. Remove the fallback description list, the pack manifest, and "Config Key Explanations".

**Step 1: Verify** — `pnpm oat:validate-skills` exit 0; `grep -c "activeProject:\*\*\|oat-project-capture, oat-project-clear-active" .agents/skills/oat-doctor/SKILL.md` → 0 (the old list and manifest are gone); `for s in 'pjm:legacy_monoliths' 'pjm:remote_host_capability' 'OAT_NON_INTERACTIVE' 'oat config describe --json' 'packEvidence'; do grep -q "$s" .agents/skills/oat-doctor/SKILL.md || echo MISSING $s; done` prints nothing; `pnpm lint && pnpm format` exit 0.

**Step 2: Commit** — `git commit -m "feat(p02-t01): rewrite oat-doctor as a sweep, report, and dive router"`

---

### Task p02-t02: Skill contract test

**Files:**

- Create: `.agents/skills/oat-doctor/tests/doctor-contract.test.mjs` (`node --test`; reads `SKILL.md` and asserts: the seven sweep commands are named verbatim; the report-only rule names `OAT_NON_INTERACTIVE`; the missing-docs rule names `~/.oat/docs` and `oat tools install core`; none of the eleven old key-description lines and no pack-manifest skill list remain; every `pjm:*` check id the CLI source defines — collected at test time with `/'pjm:[a-z_]+'/g` over `packages/cli/src/commands/pjm/doctor.ts` and `pjm/remote/doctor.ts`, so a new id fails the test until the dive covers it — appears in the PJM dive; each `oat …` command the skill names — the seven sweep commands and every fix command it may run (`config adopt|set|unset`, `pjm init`, `instructions sync`, `tools update|install`) — is probed against the built CLI: the first stdout line of `node packages/cli/dist/index.js <cmd> --help` must equal `Usage: oat <exact command path> [options]…` (Commander prints the parent's usage and exits 0 for an unknown subcommand, so exit code alone proves nothing) and each named flag must appear in that help text, so a renamed command or flag fails the test; the set of `oat …` command stems inside the Mode Assertion section equals exactly {`config set`, `config unset`, `config adopt`, `pjm init`, `instructions sync`, `tools update`, `tools install`}; every docs citation of the form `cli-utilities/<page>.md § <heading>` resolves to a real `## ` heading in `apps/oat-docs/docs/cli-utilities/<page>.md`. Area names and severity words are not asserted (they would only pin the skill to itself); the old-description absence is one assertion; docs-heading citations match by prefix on the heading text, since `configuration.md:659` is ``## Workflow preferences (`workflow.*`)``)

**Step 1: Write test** — run `node --test .agents/skills/oat-doctor/tests/doctor-contract.test.mjs` → green against p02-t01's skill. **Prove it can fail:** delete `pjm:second_roadmap` from the PJM dive → red; restore; rename one sweep command in the skill to `oat pjm doctr` → red (the usage line reads `Usage: oat pjm`); restore.

**Step 2: Verify** — `pnpm build && pnpm test:skills > /tmp/x.log 2>&1; echo exit=$?` → 0; `pnpm lint && pnpm format`.

**Step 3: Commit** — `git commit -m "test(p02-t02): add the oat-doctor contract test"`

---

### Task p02-t03: Docs pages

**Files:**

- Modify: `apps/oat-docs/docs/cli-utilities/config-and-local-state.md` (the `/oat-doctor` paragraph, ~`:286`: sweep, report, dives, report-only unattended; while there, fix the stale invocation two lines above at `:284`, `oat --scope all sync` → `oat sync --scope all`, which `project:stale_invocations` flags today), `apps/oat-docs/docs/cli-utilities/tool-packs.md` (the `oat-doctor` bullet, ~`:853`: the same, and `--summary` kept)

**Step 1: Verify** — `pnpm build:docs > /tmp/x.log 2>&1; echo exit=$?` → 0; `pnpm check` (markdownlint) exit 0; `grep -n "check mode\|brew doctor\|check and summary modes" apps/oat-docs/docs/cli-utilities/tool-packs.md apps/oat-docs/docs/cli-utilities/config-and-local-state.md` → empty.

**Step 2: Commit** — `git commit -m "docs(p02-t03): describe the oat-doctor router"`

---

### Task p02-t04: Live verification and phase gates

**Files:**

- Modify: `.oat/projects/shared/oat-doctor-router/implementation.md` (a "Live verification" note with the three transcripts' first screens)

**Step 1: Run the skill** (as the implementing agent, reading the branch file by absolute path `<worktree>/.agents/skills/oat-doctor/SKILL.md` and following it verbatim; never install or sync the skill at user scope from this branch, the `core` pack there is the operator's) in three places, with the CLI built from this branch on `PATH`: this repository (expect, at plan time: tools → four outdated warnings (whatever `oat tools outdated --scope all` reports at run time), `project:pack_state`, `user:pack_state`, and `packs:scope_duplication` as tools warnings; PJM → adoption declared with the one `pjm:backlog_completed_unarchived` warning; config → `project:dispatch_matrix` and `project:synced_gate-execution-contract-hardening_checkout` warnings; docs → `project:stale_invocations`; otherwise info counts — a `project:*` warning landing in config that is not one of those two is a routing bug; both `oat doctor` and `oat pjm doctor` exit 1 here and must still be parsed); `~/code/vox/pntr` (expect a docs warning: a docs surface with no `documentation` config, fix path `oat-docs-bootstrap`; read-only, commit nothing there); a scratch repository under `mktemp -d` with `git init` and no `.oat/` (expect every area to offer its bootstrap: `oat init`, `oat tools install`, `oat pjm init`, `oat-docs-bootstrap`). Run the scratch case once more with `OAT_NON_INTERACTIVE=1` and confirm the output ends at the report with no prompt. Record the first screen of each run and any finding whose fix path was wrong in the implementation log; fix the skill in the same task if a dive misnamed a command.

**Step 2: Gates (phase boundary)** — the full list with captured exit codes; `HOME=$(mktemp -d) pnpm exec turbo run test --force` with `Cached: 0`; `pnpm test:smoke`, `pnpm test:skills`, `pnpm test:scripts`; `pnpm run check:skill-bumps`; `pnpm lint`, `pnpm format`.

**Step 3: Commit** — `git commit -m "docs(p02-t04): record oat-doctor live verification"`

---

## Reviews

{Track reviews here after running the oat-project-review-provide and oat-project-review-receive skills.}

{Keep both code + artifact rows below. Add additional code rows as needed, but do not delete existing rows.}

| Scope  | Type     | Status          | Date       | Artifact                                                 | Reviewed Head                            | Invocation | Gate Target              |
| ------ | -------- | --------------- | ---------- | -------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------------ |
| p01    | code     | pending         | -          | -                                                        | -                                        | -          | -                        |
| p02    | code     | pending         | -          | -                                                        | -                                        | -          | -                        |
| final  | code     | fixes_completed | 2026-09-15 | reviews/archived/code-final-review-2026-09-15T034718Z.md | 6540d08f9fab48ca7fa642ffdc1df2da1cdf72c9 | manual     | -                        |
| final  | code     | fixes_completed | 2026-09-15 | reviews/archived/final-review-2026-09-15T041753Z.md      | 14e315152e0c86f1860eb72f2f87ac9b91dd97f6 | gate       | cursor-gpt-5-6-sol-xhigh |
| final  | code     | fixes_completed | 2026-09-15 | reviews/archived/final-review-2026-09-15T042941Z.md      | 971e9125812f50adaa4a18fd4479098dd8dd40d1 | gate       | cursor-gpt-5-6-sol-xhigh |
| final  | code     | fixes_completed | 2026-09-15 | reviews/archived/final-review-2026-09-15T043126Z.md      | 0d8d2cc93b7db3f140a1ef038185d724954c8739 | gate       | cursor-gpt-5-6-sol-xhigh |
| final  | code     | fixes_completed | 2026-09-15 | reviews/archived/final-review-2026-09-15T044211Z.md      | f3baaa951578ec2da1de1d0ac9c9ad2f56947b6f | gate       | cursor-gpt-5-6-sol-xhigh |
| final  | code     | passed          | 2026-09-15 | reviews/archived/final-review-2026-09-15T044732Z.md      | 2918473254a1889e3509a2523c67627eb3cf246b | gate       | cursor-gpt-5-6-sol-xhigh |
| design | artifact | pending         | -          | -                                                        | -                                        | -          | -                        |
| plan   | artifact | fixes_completed | 2026-09-14 | - (structured, in-memory, round 1)                       | -                                        | manual     | -                        |
| plan   | artifact | fixes_completed | 2026-09-14 | - (structured, in-memory, round 2)                       | -                                        | manual     | -                        |

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
