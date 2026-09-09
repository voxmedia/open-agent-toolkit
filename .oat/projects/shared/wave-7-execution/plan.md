---
oat_status: complete
oat_ready_for: oat-project-implement
oat_blockers: []
oat_last_updated: 2026-09-08
oat_phase: plan
oat_phase_status: complete
oat_plan_hill_phases: ['p20']
oat_auto_review_at_hill_checkpoints: true
oat_plan_parallel_groups:
  [
    ['p01', 'p02', 'p03'],
    ['p04', 'p05', 'p06'],
    ['p07', 'p08', 'p09'],
    ['p10', 'p11', 'p12'],
    ['p13', 'p14', 'p15'],
    ['p16', 'p17', 'p18'],
  ]
oat_plan_source: quick
oat_import_reference: null
oat_import_source_path: null
oat_import_provider: null
oat_generated: false
oat_template: false
---

# Implementation Plan: wave-7-execution (Wave 7 external-plan wrapper)

> Execute this plan using `oat-project-implement` — groups per
> `oat_plan_parallel_groups`. Concurrency ceiling: 3 worktrees (operator
> decision, carried from W1–W6). Six groups of three lanes plus two ungrouped
> finale lanes (p19, then p20); every group holds exactly one writer of
> `packages/cli/src/validation/skills.test.ts`, and every group starts after the
> previous group's fan-in.

**Goal:** Execute the 20 Wave 7 external plans (the post-program corrective lanes the 2026-09-08 triage approved: the stdin fix in the archive finalizer; `oat config unset` and `adopt`; the bare-`__proto__` Markdown guard; the idempotent completion seal that unparks wave-5 p09; hardened normalized config maps; the packed-asset directory guard; the oat-doctor example; the wrong-typed `documentation.root` warning; the symlink-target name; the stray-fence repair; the docs-index follow-ups; persisted native-skill adoption in `oat status`; the skill version validators; the sync apply failure summary; converged copy-strategy projections; dispatch baselines after journaling; the readiness contract and ledger vocabulary; skill and script tests inside the CI gates; the skill-authoring facts; plan writes on the caller's model) through the wave→project wrapper pattern (DR-260713-wave-project-wrapper-over), per the 2026-08-31 execution program (`.oat/repo/reference/external-plans/2026-08-31-execution-program.md`, Wave 7) and its index (`2026-09-08-backlog-review-wave-7-plan-index.md`).

**Architecture:** Thin wrapper. Each task's **entire and only implementation contract** is its external plan under `.oat/repo/reference/external-plans/`. Tasks below carry wrapper-owned metadata exclusively: the source-plan path, ordering/dependencies, wrapper-level verification gates, the commit convention, and review mapping. Nothing in this file restates, narrows, or overrides a source plan; the Parallelism observations and the Drift Refresh Record are evidence, not contract text.

**Commit Convention:** `{type}(p{NN}-t{NN}): {description}` — the external plan
governs commit content and granularity; the wrapper adds the `pNN-tNN` scope.

**Wrapper execution contract (applies to every task):**

1. **Drift check first.** Run the source plan's `## Drift check` against current HEAD. A material mismatch (per that plan's own definition) is a STOP. The wave-boundary drift refresh (see record below) does not replace the in-worktree re-check — the integration tip advances as groups merge, and from group 2 on every lane's re-check runs against a tip that carries earlier groups' merges.
2. **Execute the source plan's `## Implementation steps`** in order with each step's embedded Verify gate; honor its `## STOP conditions` verbatim. A load-bearing current-state claim the lane cannot reproduce on the built CLI is a STOP candidate: reproduce first, report, never improvise (the wave-5 p09 rule).
3. **Confirm the source plan's `## Done criteria`**, then run the lane-mode DoD gates: the plan's focused tests, then `pnpm check`, `pnpm type-check`, `pnpm run check:skill-bumps`, `pnpm lint`, `pnpm format`, and `pnpm oat:validate-skills` (uniform across lanes), each with captured exit codes; a lane that bumps a skill also sweeps the old version literal repo-wide (plain and regex-escaped forms, `packages/cli/src`, `tools/smoke`, and `.agents/skills/*/tests`) and runs `pnpm test:smoke` and `pnpm test:skills`. Lanes never edit the lockstep release files (five public package manifests, `packages/cli/assets/public-package-versions.json`, `pnpm-lock.yaml`) and never run `pnpm release:check-versions` or `pnpm release:validate`; the wave fan-in owns the single lockstep bump (0.2.66 → 0.2.67, above freshly fetched `origin/main` at that time) and runs the full eight-gate sequence at every fan-in boundary — after each group's merges and after p19 and p20 — always before that fan-in's bookkeeping edit.
4. **STOP → BLOCKED at phase level (bundle exception).** A source-plan STOP parks the phase (record in `state.md` `oat_blockers` + `implementation.md`); sibling phases continue. **Bundle phases:** a STOP parks only the stopped task; the implementer records the blocker and continues remaining independent tasks; the phase is terminal when every task is completed or parked (DR-260713-bundle-stop-semantics-park).
5. **Group-dependency rule:** a group starts when every phase of the previous group is terminal — merged, or parked with completed commits merged. A park never blocks the next group. The two ungrouped finale phases run in plan order after the group-6 fan-in (p19, then p20), each with its own fan-in.
6. **Merge serialization:** within a group, merge phase branches one at a time in plan order, rebasing each on the updated tip first. Deliberately sequenced shared files (from the index dependency notes and the mechanical write-surface intersection below): `packages/cli/src/validation/skills.test.ts` (written by p01, p04, p07, p10, p13, p16, p19, p20 — one per group, each re-anchoring its pins by the old version literal on the merged tip); the config chain `packages/cli/src/commands/config/index.ts`, `config/resolve.ts`, `config/oat-config.ts` (p02 → p05 → p08 → p11); `.agents/skills/oat-project-complete/SKILL.md` and `scripts/finalize-synced-archive.mjs` (p01 → p04); `commands/init/tools/shared/review-skill-contracts.test.ts` (p01 → p04 → p16, one writer per group); `apps/oat-docs/docs/cli-utilities/configuration.md` (p06 → p09); `.agents/skills/create-agnostic-skill/SKILL.md` and `references/skill-template.md` (p10 → p19); `.agents/skills/oat-repo-improve/SKILL.md` (p10 → p20); `commands/init/tools/shared/skills-bundled-docs-contract.test.ts` and `apps/oat-docs/docs/workflows/wave-workflows.md` (p17 → p20); root `AGENTS.md` (p13 → p18); `.oat/repo/pjm/backlog/items/BL-260908-guard-normalized-config-maps.md` (p03 repairs its title before p05 runs). One `metadata.version` bump per skill per PR: `oat-project-complete` (p01, inherited by p04), `create-agnostic-skill` (p10, inherited by p19), `oat-repo-improve` (p10, inherited by p20); every other bumped skill has one writer (`oat-project-summary` p04; `oat-doctor` p07; `oat-project-review-provide`, `oat-repo-knowledge-index`, `oat-agent-instructions-apply` p10; `oat-project-implement`, `oat-dispatch-subagents` p16; `oat-wave-program` p17; `create-oat-skill` p19; `oat-wave-execute` p20). Each lane that edits a canonical skill runs `pnpm run cli -- sync --scope project` after its edits and commits any manifest restamp; `--scope all` is operator-only. The fan-in bump commit also runs the project-scope sync so `.oat/sync/manifest.json` restamps with the lockstep. Every fan-in that follows a lane that edits, closes, or renames a backlog item regenerates `.oat/repo/pjm/backlog/index.md` (`oat backlog regenerate-index`, then `oxfmt --write`).
7. **Backlog archival is NOT part of any task** — once, serialized on the integration branch after all merges (DR-260713-shared-tracked-surfaces).
8. **Phase review checklist = the source plan's `## Review focus`.**
9. **Artifact hygiene:** every agent runs `pnpm exec oxfmt <file>` (or `pnpm format:fix`) on markdown it writes and reports observations for `orchestration-log.md` (workers report; the root appends). Never format `state.md`.
10. **Commit verification after ambiguous results:** inspect `git log`/HEAD before retrying; record SHAs pasted from `git rev-parse` in `implementation.md`.
11. **Repo-local CLI:** the global `oat` trails the branch; every `oat` invocation that reads or writes repository state (`sync`, `docs generate-index`, validators, `status`, `config`, `tools info`) uses `pnpm run cli -- <command>` or `node packages/cli/dist/index.js` after `pnpm build`.
12. **Verification evidence:** `pnpm check` and `pnpm type-check` replay Turbo caches; evidence runs use `HOME=$(mktemp -d) pnpm exec turbo run <gate> --force` (`Cached: 0`). Disposition-verification rounds execute prose shell snippets verbatim in a fresh shell and walk every failure sequence of a contract; reviewers of command-surface lanes probe the built CLI in a scratch project; `oat gate review` writes its own Reviews row, which the receive step moves forward in place. Probe edits are restored from a `mktemp -d` backup copy, never with `git checkout --` on uncommitted work. Pins are located by grepping the version literal, never the skill name. A test that simulates filesystem case-insensitivity runs under a mocked directory probe (or a case-sensitive image), never only on APFS. Every fix ships with a negative control that is red before and green after, and every P0 test is proven able to fail once per clause.
13. **Root final-review brief:** enumerates every sibling-plan dependency row (p01→p04, p02→p05→p08→p11, p03→p05, p06→p09, p10→p19, p10→p20, p17→p20, p13/p18 on `AGENTS.md`, the eight `skills.test.ts` writers) and every plan premise about another package, and probes each; the configured exit gate then runs in the foreground with no other agents active.

## Parallelism

Six groups of three write-disjoint lanes plus two ungrouped finale lanes. The
program's Wave 7 section composed eight groups (seven, five, two, two, one,
one, one, one lanes) around the single dominant seam — eight lanes write
`packages/cli/src/validation/skills.test.ts` — and the config chain. The
operator's concurrency ceiling of 3 (carried from W1–W6) batches those eight
groups as six triples plus two singletons without changing any ordering the
index or the program states: every group still holds exactly one
`skills.test.ts` writer, the config chain still runs p02 → p05 → p08 → p11
across groups 1–4, the skill-bump pairs (p01 → p04, p10 → p19, p10 → p20) and
the docs/contract seams (p06 → p09, p17 → p20, p13/p18 on `AGENTS.md`)
stay in distinct groups, and `oat project validate-plan` rejects singleton
groups, so p19 and p20 run ungrouped in plan order after group 6. The
mechanical pairwise intersection of every lane's `### In scope` write surface
(below) is empty inside every group.

> The recon observations below are **non-authoritative grouping evidence only** —
> they justify group composition but never constrain a source plan: each source
> plan's own live location/condition checks govern at execution time. Paths are
> repository-relative; `writes` are the files a plan's `### In scope` names plus every test file its
> `## Test plan` and `## Implementation steps` add cases to or create, and the
> pin file a skill bump implies (lockstep release files excluded — every plan
> lists them as "never edit"; files a plan only runs as a pattern or a control
> are reads).

- p01 (group 1) — writes: `.agents/skills/oat-project-complete/SKILL.md`, `.agents/skills/oat-project-complete/scripts/finalize-synced-archive.mjs`, `.agents/skills/oat-project-complete/tests/finalize-synced-archive-cli.test.mjs`, `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`, `packages/cli/src/validation/skills.test.ts`.
- p02 (group 1) — writes: `packages/cli/src/commands/config/index.test.ts`, `packages/cli/src/commands/config/index.ts`, `packages/cli/src/config/resolve.ts`.
- p03 (group 1) — writes: `.oat/repo/pjm/backlog/archived/BL-260903-preserve-proto-named-config.md`, `.oat/repo/pjm/backlog/completed.md`, `.oat/repo/pjm/backlog/index.md`, `.oat/repo/pjm/backlog/items/BL-260908-guard-normalized-config-maps.md`, `.oat/repo/pjm/backlog/items/BL-260908-keep-a-bare-proto-in-markdown.md`, `.oat/repo/reference/decisions/DR-260908-a-stop-whose-remedy-lies.md`, `packages/cli/src/validation/markdown-proto-literal-contract.test.ts`.
- p04 (group 2) — writes: `.agents/skills/oat-project-complete/SKILL.md`, `.agents/skills/oat-project-complete/scripts/validate-durable-archive-receipt.mjs`, `.agents/skills/oat-project-complete/tests/validate-durable-archive-receipt.test.mjs`, `.agents/skills/oat-project-summary/SKILL.md`, `.oat/repo/reference/external-plans/2026-09-02-defer-activeproject-clearing-on-archive-completions.md`, `apps/oat-docs/docs/cli-utilities/project-log.md`, `apps/oat-docs/docs/workflows/projects/lifecycle.md`, `apps/oat-docs/docs/workflows/projects/picking-up-projects.md`, `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`, `packages/cli/src/commands/project/log/append.test.ts`, `packages/cli/src/commands/project/log/append.ts`, `packages/cli/src/commands/project/log/check.test.ts`, `packages/cli/src/commands/project/log/check.ts`, `packages/cli/src/commands/project/log/lifecycle.integration.test.ts`, `packages/cli/src/validation/named-skill-load-contract.test.ts`, `packages/cli/src/validation/skills.test.ts`.
- p05 (group 2) — writes (as executed, per the plan's 2026-09-09 post-STOP refresh and the review-justified deviations): `.oat/repo/reference/decisions/DR-260907-oat-config-reads-materialize.md`, `packages/cli/src/commands/config/index.test.ts`, `packages/cli/src/commands/config/index.ts`, `packages/cli/src/commands/gate/index.test.ts`, `packages/cli/src/commands/gate/index.ts`, `packages/cli/src/commands/project/dispatch-ceiling/index.test.ts`, `packages/cli/src/commands/project/dispatch-ceiling/index.ts`, `packages/cli/src/config/dispatch-matrix.test.ts`, `packages/cli/src/config/dispatch-matrix.ts`, `packages/cli/src/config/oat-config.test.ts`, `packages/cli/src/config/oat-config.ts`, `packages/cli/src/config/own-keys.test.ts`, `packages/cli/src/config/own-keys.ts`, `packages/cli/src/config/resolve.test.ts`, `packages/cli/src/config/resolve.ts`, `packages/cli/src/config/sync-config.test.ts`, `packages/cli/src/config/sync-config.ts`, `packages/cli/src/providers/ceiling/registry.test.ts`, `packages/cli/src/providers/ceiling/registry.ts`, `packages/cli/src/providers/identity/dispatch-report.test.ts`, `packages/cli/src/providers/identity/dispatch-report.ts` (the decision index was regenerated and is unchanged).
- p06 (group 2) — writes: `apps/oat-docs/docs/cli-utilities/configuration.md`, `packages/cli/src/fs/assets.ts`, `packages/cli/src/release/public-package-contract.test.ts`, `packages/cli/src/release/public-package-contract.ts`.
- p07 (group 3) — writes: `.agents/skills/oat-doctor/SKILL.md`, `packages/cli/src/validation/skills.test.ts`.
- p08 (group 3) — writes: `packages/cli/src/commands/config/index.test.ts`, `packages/cli/src/commands/config/index.ts`, `packages/cli/src/config/oat-config.test.ts`, `packages/cli/src/config/oat-config.ts`.
- p09 (group 3) — writes: `apps/oat-docs/docs/cli-utilities/configuration.md`, `packages/cli/src/commands/instructions/instructions.utils.test.ts`, `packages/cli/src/commands/instructions/instructions.utils.ts`.
- p10 (group 4) — writes: `.agents/skills/create-agnostic-skill/SKILL.md`, `.agents/skills/create-agnostic-skill/references/skill-template.md`, `.agents/skills/oat-agent-instructions-apply/SKILL.md`, `.agents/skills/oat-agent-instructions-apply/references/instruction-file-templates/glob-scoped-rule.md`, `.agents/skills/oat-project-review-provide/SKILL.md`, `.agents/skills/oat-repo-improve/SKILL.md`, `.agents/skills/oat-repo-improve/references/plan-template.md`, `.agents/skills/oat-repo-knowledge-index/SKILL.md`, `packages/cli/src/validation/named-skill-load-contract.test.ts`, `packages/cli/src/validation/skills.test.ts`.
- p11 (group 4) — writes: `apps/oat-docs/docs/docs-tooling/commands.md`, `packages/cli/src/commands/docs/index-generate/index.test.ts`, `packages/cli/src/commands/docs/index-generate/index.ts`, `packages/cli/src/commands/docs/init/index.test.ts`, `packages/cli/src/commands/docs/init/index.ts`, `packages/cli/src/config/resolve.test.ts`, `packages/cli/src/config/resolve.ts`.
- p12 (group 4) — writes: `packages/cli/src/commands/shared/adopt-stray.test.ts`, `packages/cli/src/commands/status/index.test.ts`, `packages/cli/src/commands/status/index.ts`.
- p13 (group 5) — writes: `AGENTS.md`, `apps/oat-docs/docs/contributing/skills.md`, `packages/cli/src/commands/internal/validate-skill-version-bumps.test.ts`, `packages/cli/src/commands/internal/validate-skill-version-bumps.ts`, `packages/cli/src/validation/skills.test.ts`, `packages/cli/src/validation/skills.ts`.
- p14 (group 5) — writes: `packages/cli/src/commands/sync/apply.ts`, `packages/cli/src/commands/sync/index.test.ts`.
- p15 (group 5) — writes: `apps/oat-docs/docs/provider-sync/manifest-and-drift.md`, `packages/cli/src/commands/tools/info/skill-view-convergence.integration.test.ts`, `packages/cli/src/drift/detector.test.ts`, `packages/cli/src/drift/detector.ts`, `packages/cli/src/drift/skill-view-diagnostic.test.ts`, `packages/cli/src/drift/skill-view-diagnostic.ts`, `packages/cli/src/engine/compute-plan.test.ts`, `packages/cli/src/engine/compute-plan.ts`, `packages/cli/src/engine/index.ts`, `packages/cli/src/engine/managed-copy-hash.test.ts`, `packages/cli/src/engine/managed-copy-hash.ts`.
- p16 (group 6) — writes: `.agents/skills/oat-dispatch-subagents/SKILL.md`, `.agents/skills/oat-dispatch-subagents/references/record-schema.md`, `.agents/skills/oat-project-implement/SKILL.md`, `.agents/skills/oat-project-implement/references/phase-execution.md`, `.oat/repo/pjm/backlog/items/BL-260906-harden-dispatch-launch.md`, `packages/cli/src/commands/init/tools/shared/review-skill-contracts.test.ts`, `packages/cli/src/commands/project/dispatch/baseline-ordering.test.ts`, `packages/cli/src/commands/project/dispatch/record.test.ts`, `packages/cli/src/commands/project/dispatch/record.ts`, `packages/cli/src/providers/identity/oat-dispatch-record.test.ts`, `packages/cli/src/providers/identity/oat-dispatch-record.ts`, `packages/cli/src/validation/skills.test.ts`.
- p17 (group 6) — writes: `.agents/skills/oat-wave-program/SKILL.md`, `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`.
- p18 (group 6) — writes: `.lintstagedrc.mjs`, `AGENTS.md`, `package.json`.
- p19 (group none — sequential) — writes: `.agents/docs/skills-guide.md`, `.agents/skills/create-agnostic-skill/SKILL.md`, `.agents/skills/create-agnostic-skill/references/skill-template.md`, `.agents/skills/create-oat-skill/SKILL.md`, `packages/cli/src/validation/skills.test.ts` (it edits references to `AGENTS.md` inside two skills, not the root file).
- p20 (group none — sequential) — writes: `.agents/skills/oat-repo-improve/SKILL.md`, `.agents/skills/oat-wave-execute/SKILL.md`, `apps/oat-docs/docs/workflows/skills/repo-improve.md`, `packages/cli/src/commands/init/tools/shared/skills-bundled-docs-contract.test.ts`, `packages/cli/src/validation/skills.test.ts`.
- Within-group write intersections, recomputed mechanically from these lists
  (`writes.py` over the twenty `### In scope` sections, glob-aware, extended after the plan gate's second attempt with each plan's Test plan and Implementation-step test files and its pin implications): group 1
  p01 × p02 = ∅, p01 × p03 = ∅, p02 × p03 = ∅; group 2 p04 × p05 = ∅ (p04 names
  `commands/gate/index.ts` only as an enumerated append site it does not change;
  p05 edits its `:1220` and `:1865` lookups; p04's test writes are under `commands/project/log/`,
  p05's under `config/`, `commands/config/`, and `commands/gate/`), p04 × p06 = ∅,
  p05 × p06 = ∅; group 3 p08's test writes (`commands/config/index.test.ts`,
  `config/oat-config.test.ts`) meet nothing p07 or p09 writes; group 3 all ∅;
  group 4 p10 × p11 = ∅, p10 × p12 = ∅, p11 × p12 = ∅; group 5 all ∅ (p14 reads
  the engine files p15 writes); group 6 p16 × p17 = ∅ (p16's `review-skill-contracts.test.ts` and new
  `baseline-ordering.test.ts` meet nothing p17 writes; `oat-wave-program` has no
  pin in `skills.test.ts`), p16 × p18 = ∅, p17 × p18 = ∅.
  Cross-group ordered seams are listed in contract item 6.
- **Smoke and skills tiers:** the lanes that bump skills sweep `tools/smoke` and
  `.agents/skills/*/tests` for old version literals (contract item 3); no
  `tools/smoke` pin names a wave-7 skill today (`wrapper-compatibility.test.mjs`
  pins explainer-kit only).

## Dispatch Profile

_No per-phase overrides. Runtime selection applies, capped by the project's named
dispatch policy in `state.md` (managed / `high`); provider-specific model/effort
selection is owned by runtime resolution, not this plan. Cross-model review
requirements are embedded in every lane: config lanes (p02, p05, p08, p11)
change `oat config` and resolver behavior on a preserved `__proto__` key
(weaker-anywhere on every normalizer); lifecycle-skill lanes (p01, p04, p10,
p16, p17, p19, p20) change prose contracts with verbatim snippet execution;
validator and gate lanes (p13, p18) change what CI rejects (any input
previously rejected that is now accepted is Critical); p03, p06, p12, p14, p15
change command output or release contracts, reviewed with built-CLI probes._

## Drift Refresh Record (2026-09-08, vs `684bd3be32e65fc8db0646f336ab4335c317ba2c`)

**20 PASS / 0 MINOR-DRIFT / 0 STOP.** Run mechanically by the root against
`684bd3be3` (origin/main after the wave-7 composition PR #284): every plan's
`## Drift check` command returns an empty stat on its code surfaces. The only
commits since the plans' inspected head `a59461402` are PR #284's own squash —
the twenty plans, the wave-7 index, the program artifact, and two backlog items
(24 files, all under `.oat/repo/`) — so no plan premise moved. Draft PR #190
(`ReviewPlan Stage A`) is still open, so every "#190 merges first" landing-event
row is un-triggered; PR #273 is the baseline every plan was verified against.
The lockstep on the base is 0.2.66 and `.oat/sync/manifest.json` is at 0.2.66
(`sync --scope project --dry-run`: no changes), so the group-1 fan-in bump is
0.2.66 → 0.2.67 with the manifest restamped in the same commit. The parked
wave-5 p09 work p04 depends on was gone (worktree removed at the wave-5 close,
scratchpad copy lost, no commit on `wave-5/p09`); the root recovered its exact
bytes into `.oat/projects/shared/wave-7-execution/parked/wave-5-p09/` and verified them against
the plan's own step-1 figures (117/17, 218 lines, 165 and 249 lines) — see the
p04 ordering note and `parked/wave-5-p09/README.md`. This record is non-authoritative recon evidence; no recon subagent
was dispatched because the drift set is empty (logged in
`orchestration-log.md` as a skill deviation).

---

## Phase 01: read-stdin-in-finalize-synced-archive (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p01-t01: Execute external plan — Read stdin with an fd-capable API in finalize-synced-archive.mjs

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-read-stdin-in-finalize-synced-archive.md`

**Ordering:** group 1; runs at the wave base in parallel with p02 and p03 and merges first within the group. First writer of `oat-project-complete/SKILL.md`, `finalize-synced-archive.mjs`, `review-skill-contracts.test.ts`, and the `validation/skills.test.ts` pins; p04 (group 2) inherits this lane's `oat-project-complete` bump and does not bump again. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p01-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p01-t01): read stdin in finalize-synced-archive"
```

---

## Phase 02: fix-oat-config-unset-and-adopt (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p02-t01: Execute external plan — Let `oat config unset` remove a malformed value, and fold `adopt` onto the shared surface-flag resolver

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-fix-oat-config-unset-and-adopt.md`

**Ordering:** group 1; runs at the wave base in parallel with p01 and p03 and merges second within the group. First lane of the config chain (`commands/config/index.ts`, `config/resolve.ts`): p05 (group 2), p08 (group 3), and p11 (group 4) re-anchor on the merged tip. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p02-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p02-t01): fix oat config unset and adopt"
```

---

## Phase 03: guard-bare-proto-in-markdown-records (group 1)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p03-t01: Execute external plan — Guard repository Markdown against the formatter rewriting a bare prototype-key literal into bold

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-guard-bare-proto-in-markdown-records.md`

**Ordering:** group 1; runs at the wave base in parallel with p01 and p02 and merges third within the group. Lands before p05 (it repairs the YAML title of p05's source item); it regenerates `.oat/repo/pjm/backlog/index.md`, which every later fan-in regenerates again after item edits. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p03-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "chore(p03-t01): guard bare proto in Markdown records"
```

---

## Phase 04: make-the-completion-seal-idempotent (group 2)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p04-t01: Execute external plan — Make the completion seal idempotent and unpark wave-5 p09

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-make-the-completion-seal-idempotent.md`

**Ordering:** group 2; starts after the group-1 fan-in (p01 has released `oat-project-complete`, `finalize-synced-archive.mjs`, `review-skill-contracts.test.ts`, and the pins) in parallel with p05 and p06 and merges first within the group. No second `oat-project-complete` bump: adopt the value p01 landed (the plan's own instruction). The parked wave-5 p09 work no longer exists as a dirty worktree (removed at the wave-5 close; its scratchpad copy was lost to a session restart) and the branch `wave-5/p09` carries no p09 commit; its exact bytes were recovered by the root and committed at `.oat/projects/shared/wave-7-execution/parked/wave-5-p09/` — `p09-parked-tracked.patch` (218 lines; `git apply --stat` = 3 files, 117 insertions, 17 deletions; `git apply --check` exit 0 at the wave base), `validate-durable-archive-receipt.mjs` (165 lines), and `validate-durable-archive-receipt.test.mjs` (249 lines) — exactly the figures the plan's step 1 Verify records, so step 1 runs against that directory instead of the worktree (`git apply --check` on the patch; `cp` of the two files). This is a recovery of the same bytes, not a re-derivation; the recovery record is `parked/wave-5-p09/README.md`. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p04-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p04-t01): make the completion seal idempotent"
```

---

## Phase 05: harden-normalized-config-maps (group 2)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p05-t01: Execute external plan — Harden normalized config maps against a preserved `__proto__` key

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-harden-normalized-config-maps.md`

**Ordering:** group 2; starts after the group-1 fan-in (p02 has released `commands/config/index.ts` and `config/resolve.ts`; p03 has repaired its source item) in parallel with p04 and p06 and merges second within the group. Sole wave-7 writer of `commands/gate/index.ts` (the `:1220` and, per the plan's 2026-09-09 refresh, `:1865` lookups) and of the decision-record update; as executed it also guarded `providers/ceiling/registry.ts`, `providers/identity/dispatch-report.ts`, and the dispatch-ceiling sites the refresh and its correction name. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p05-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p05-t01): harden normalized config maps"
```

---

## Phase 06: guard-every-packed-asset-directory (group 2)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p06-t01: Execute external plan — Guard a packed path under every required asset directory

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-guard-every-packed-asset-directory.md`

**Ordering:** group 2; starts after the group-1 fan-in in parallel with p04 and p05 and merges third within the group. Never in one group with p09 (both write `apps/oat-docs/docs/cli-utilities/configuration.md`); p09 re-anchors on the merged tip. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p06-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p06-t01): guard every packed asset directory"
```

---

## Phase 07: reconcile-the-oat-doctor-example (group 3)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p07-t01: Execute external plan — Make the oat-doctor dashboard example describe a state the doctor can report

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-reconcile-the-oat-doctor-example.md`

**Ordering:** group 3; starts after the group-2 fan-in in parallel with p08 and p09 and merges first within the group. Third writer of the `validation/skills.test.ts` chain; sole writer of `oat-doctor/SKILL.md` (1.2.3 → 1.2.4). Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p07-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "docs(p07-t01): reconcile the oat-doctor example"
```

---

## Phase 08: warn-on-wrong-typed-documentation-root (group 3)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p08-t01: Execute external plan — Warn on a wrong-typed `documentation.root` instead of dropping it in silence

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-warn-on-wrong-typed-documentation-root.md`

**Ordering:** group 3; starts after the group-2 fan-in (p05 has released `config/oat-config.ts` and `commands/config/index.ts`) in parallel with p07 and p09 and merges second within the group. Third lane of the config chain; p11 (group 4) re-anchors `DEFAULT_SHARED_CONFIG.documentation` once on the merged tip. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p08-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p08-t01): warn on a wrong-typed documentation.root"
```

---

## Phase 09: name-the-resolved-symlink-target (group 3)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p09-t01: Execute external plan — Name the resolved target in the symlink inert-exclusion warning

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-name-the-resolved-symlink-target.md`

**Ordering:** group 3; starts after the group-2 fan-in (p06 has released `configuration.md`) in parallel with p07 and p08 and merges third within the group. Sole writer of `commands/instructions/**`. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p09-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p09-t01): name the resolved symlink target"
```

---

## Phase 10: repair-stray-fences-in-lifecycle-skills (group 4)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p10-t01: Execute external plan — Repair the stray fences that hide normative skill prose and widen the fence scanner across `.agents/skills`

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-repair-stray-fences-in-lifecycle-skills.md`

**Ordering:** group 4; starts after the group-3 fan-in in parallel with p11 and p12 and merges first within the group. Fourth writer of the `validation/skills.test.ts` chain; takes the `create-agnostic-skill` and `oat-repo-improve` bumps that p19 and p20 inherit (they adopt the landed value and do not bump again). Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p10-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "docs(p10-t01): repair stray fences in lifecycle skills"
```

---

## Phase 11: close-the-docs-index-follow-ups (group 4)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p11-t01: Execute external plan — Close the docs-index follow-ups from the wave-1 reviews

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-close-the-docs-index-follow-ups.md`

**Ordering:** group 4; starts after the group-3 fan-in (the config chain p02 → p05 → p08 has settled `config/resolve.ts` and `DEFAULT_SHARED_CONFIG.documentation`) in parallel with p10 and p12 and merges second within the group. Last wave-7 writer of `config/resolve.ts`. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p11-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p11-t01): close the docs-index follow-ups"
```

---

## Phase 12: persist-native-skill-adoption-in-status (group 4)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p12-t01: Execute external plan — Make `oat status` persist and pin its native-skill adoption outcome

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-persist-native-skill-adoption-in-status.md`

**Ordering:** group 4; starts after the group-3 fan-in in parallel with p10 and p11 and merges third within the group. Sole writer of `commands/status/**` and `commands/shared/adopt-stray.test.ts`. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p12-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p12-t01): persist native-skill adoption in status"
```

---

## Phase 13: tighten-the-skill-version-validators (group 5)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p13-t01: Execute external plan — Close the version-validator gaps: agent roles, unresolvable versions, the alias promotion, and scripts-only skill changes

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-tighten-the-skill-version-validators.md`

**Ordering:** group 5; starts after the group-4 fan-in in parallel with p14 and p15 and merges first within the group. Fifth writer of the `validation/skills.test.ts` chain; never in one group with p18 (both write root `AGENTS.md`) or p10 (`.agents/agents/*.md`). Its alias-retirement step 2 (`BL-260908-remove-the-top-level-skill`) lands one release later, outside this wave. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p13-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p13-t01): tighten the skill version validators"
```

---

## Phase 14: fix-sync-apply-failure-summary (group 5)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p14-t01: Execute external plan — Make `oat sync` report a failure summary instead of "No changes required." when a rejected collection leaves zero planned operations

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-fix-sync-apply-failure-summary.md`

**Ordering:** group 5; starts after the group-4 fan-in in parallel with p13 and p15 and merges second within the group. Sole writer of `commands/sync/apply.ts` and `commands/sync/index.test.ts`; reads the engine files p15 writes as evidence only. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p14-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p14-t01): fix the sync apply failure summary"
```

---

## Phase 15: converge-copy-strategy-skill-projections (group 5)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p15-t01: Execute external plan — Converge copy-strategy skill projections so a synced copy reads in sync

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-converge-copy-strategy-skill-projections.md`

**Ordering:** group 5; starts after the group-4 fan-in in parallel with p13 and p14 and merges third within the group. Sole writer of `engine/compute-plan.ts`, `engine/managed-copy-hash.ts`, and the `drift/` diagnostic files. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p15-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p15-t01): converge copy-strategy skill projections"
```

---

## Phase 16: calculate-dispatch-baselines-after-journaling (group 6)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p16-t01: Execute external plan — Resolve the accepted execution baseline after mandatory launch journaling, and make the ordering auditable

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-calculate-dispatch-baselines-after-journaling.md`

**Ordering:** group 6; starts after the group-5 fan-in in parallel with p17 and p18 and merges first within the group. Sixth writer of the `validation/skills.test.ts` chain (bumps `oat-project-implement` and `oat-dispatch-subagents`). Issue #266 (the other half of its backlog item) stays outside the wave; the item closes only when both halves land. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p16-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p16-t01): calculate dispatch baselines after journaling"
```

---

## Phase 17: harden-the-external-plan-readiness-contract (group 6)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p17-t01: Execute external plan — Harden the external-plan readiness contract and settle the wave-program ledger vocabulary

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-harden-the-external-plan-readiness-contract.md`

**Ordering:** group 6; starts after the group-5 fan-in in parallel with p16 and p18 and merges second within the group. Sole writer of `oat-wave-program/SKILL.md` (no pin exists for it in `validation/skills.test.ts`); p20 follows it on `skills-bundled-docs-contract.test.ts` and `wave-workflows.md`. Its corpus sweep runs against every wave-7 plan already on the branch. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p17-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "fix(p17-t01): harden the external-plan readiness contract"
```

---

## Phase 18: cover-skill-and-script-tests-in-repo-gates (group 6)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p18-t01: Execute external plan — Put skill-asset formatting and the worktree-init test inside the gates CI actually runs

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-cover-skill-and-script-tests-in-repo-gates.md`

**Ordering:** group 6; starts after the group-5 fan-in in parallel with p16 and p17 and merges third within the group. Sole writer of root `package.json`, `.lintstagedrc.mjs`, and root `AGENTS.md` in its group; never in one group with p13 (both write root `AGENTS.md`). Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p18-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "chore(p18-t01): cover skill and script tests in the repo gates"
```

---

## Phase 19: correct-skill-authoring-facts (ungrouped, sequential)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p19-t01: Execute external plan — Correct the factual skill-authoring claims and give each one a named backstop

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-correct-skill-authoring-facts.md`

**Ordering:** ungrouped; runs alone after the group-6 fan-in (p10 has released `create-agnostic-skill/SKILL.md` and `skill-template.md`). Seventh writer of the `validation/skills.test.ts` chain; adopts p10's `create-agnostic-skill` bump (no second bump) and bumps `create-oat-skill` itself. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p19-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "docs(p19-t01): correct the skill-authoring facts"
```

---

## Phase 20: keep-plan-writes-on-the-callers-model (ungrouped, sequential)

**Milestone:** the source plan's `## Done criteria` fully satisfied.

### Task p20-t01: Execute external plan — Keep external-plan writes on the caller's model class in oat-repo-improve

**Source plan (the contract):**
`.oat/repo/reference/external-plans/2026-09-08-keep-plan-writes-on-the-callers-model.md`

**Ordering:** ungrouped; runs alone after p19 (p17 has released `skills-bundled-docs-contract.test.ts` and `wave-workflows.md`; p10 has released `oat-repo-improve/SKILL.md`). Last writer of the `validation/skills.test.ts` chain; adopts p10's `oat-repo-improve` bump (no second bump) and bumps `oat-wave-execute` itself. Execution, commit, and review boundaries are the source plan's own; the wrapper adds only the `p20-t01` prefix.

**Step 1: Drift check** — per the source plan's `## Drift check`.

**Step 2: Execute** the source plan in full.

**Step 3: Verify (wrapper gate)**

Run: the source plan's `## Done criteria` checks, then the lane-mode DoD gates from the wrapper execution contract
Expected: all green.

**Step 4: Cross-model review** — before committing, obtain an independent cross-model review of the uncommitted diff via the runtime-configured reviewer (at most two rounds; format before dispatching); disposition every finding in the phase report.

**Step 5: Commit**

```bash
git commit -m "docs(p20-t01): keep plan writes on the caller's model"
```

---

## Reviews

| Scope  | Type     | Status      | Date       | Artifact                                                    | Reviewed Head                            | Invocation | Gate Target         |
| ------ | -------- | ----------- | ---------- | ----------------------------------------------------------- | ---------------------------------------- | ---------- | ------------------- |
| p01    | code     | passed      | 2026-09-08 | reviews/archived/p01-review-2026-09-08T235901Z.md           | dd6658e0b0a545645cccfd23630305301b19fd28 | manual     | -                   |
| p02    | code     | fixes_added | 2026-09-09 | reviews/archived/p02-review-2026-09-09T001158Z.md           | 1913a950ff996849df02ef98b58fe02f437315ea | manual     | -                   |
| p02    | code     | passed      | 2026-09-09 | reviews/archived/p02-review-2026-09-09T002423Z.md           | 7dfaa6bc159748190f6c17337919391359f8fe7e | manual     | -                   |
| p03    | code     | fixes_added | 2026-09-09 | reviews/archived/p03-review-2026-09-09T002419Z.md           | c4053df739bb1fa8b92f206eef3f165e955a6110 | manual     | -                   |
| p03    | code     | passed      | 2026-09-09 | reviews/archived/p03-review-2026-09-09T004719Z.md           | b108f2dbf1ada4f97a68c616bd65f08559ec99d9 | manual     | -                   |
| p04    | code     | fixes_added | 2026-09-09 | reviews/archived/p04-review-2026-09-09T020125Z.md           | 247f06b65cd9f517742d8924ceeacd16fdd944a0 | manual     | -                   |
| p04    | code     | passed      | 2026-09-09 | reviews/archived/p04-review-2026-09-09T022119Z.md           | 6403c6ced75f4322720b0d51e548186ec8f0c9df | manual     | -                   |
| p05    | code     | fixes_added | 2026-09-09 | reviews/archived/p05-review-2026-09-09T015920Z.md           | 412abf81d8b42515d0bbf06cadbb94d103502258 | manual     | -                   |
| p05    | code     | passed      | 2026-09-09 | reviews/archived/p05-review-2026-09-09T021127Z.md           | 054de3cf3b167ee993b33c9015211934f1d83e03 | manual     | -                   |
| p06    | code     | fixes_added | 2026-09-09 | reviews/archived/p06-review-2026-09-09T013145Z.md           | 8cf75b11b4693bae70b59eb3f2cce32176ad009f | manual     | -                   |
| p06    | code     | passed      | 2026-09-09 | reviews/archived/p06-review-2026-09-09T014928Z.md           | 0f81fd8fad4b92c7dba163b802bb44519d962c37 | manual     | -                   |
| p07    | code     | fixes_added | 2026-09-09 | reviews/archived/p07-review-2026-09-09T030201Z.md           | 07e6438401db5368a3a89ecb0e7ebbf263e525af | manual     | -                   |
| p08    | code     | pending     | -          | -                                                           | -                                        | -          | -                   |
| p09    | code     | pending     | -          | -                                                           | -                                        | -          | -                   |
| p10    | code     | pending     | -          | -                                                           | -                                        | -          | -                   |
| p11    | code     | pending     | -          | -                                                           | -                                        | -          | -                   |
| p12    | code     | pending     | -          | -                                                           | -                                        | -          | -                   |
| p13    | code     | pending     | -          | -                                                           | -                                        | -          | -                   |
| p14    | code     | pending     | -          | -                                                           | -                                        | -          | -                   |
| p15    | code     | pending     | -          | -                                                           | -                                        | -          | -                   |
| p16    | code     | pending     | -          | -                                                           | -                                        | -          | -                   |
| p17    | code     | pending     | -          | -                                                           | -                                        | -          | -                   |
| p18    | code     | pending     | -          | -                                                           | -                                        | -          | -                   |
| p19    | code     | pending     | -          | -                                                           | -                                        | -          | -                   |
| p20    | code     | pending     | -          | -                                                           | -                                        | -          | -                   |
| final  | code     | pending     | -          | -                                                           | -                                        | -          | -                   |
| plan   | artifact | fixes_added | 2026-09-08 | reviews/archived/artifact-plan-review-2026-09-08T224620Z.md | -                                        | gate       | codex-5-6-sol-xhigh |
| spec   | artifact | pending     | -          | -                                                           | -                                        | -          | -                   |
| design | artifact | pending     | -          | -                                                           | -                                        | -          | -                   |
| plan   | artifact | passed      | 2026-09-08 | reviews/archived/artifact-plan-review-2026-09-08T231038Z.md | -                                        | gate       | codex-5-6-sol-xhigh |

**Status values:** `pending` → `received` → `fixes_added` → `fixes_completed` → `passed`

> Reviews are recorded newest-last (append-only); superseded events keep their own rows, and `oat gate review` writes its own row per gate artifact which the receive step moves forward in place. Reviewed heads are the pre-rebase lane commits the reviewers examined; the fan-in entries in `implementation.md` map each to its integration commit.

## Implementation Complete

- [ ] 20/20 phases, 20/20 tasks complete
- [ ] Every source plan's `## Done criteria` confirmed (recorded in `implementation.md`)
- [ ] **Serialized backlog bookkeeping** (integration branch, after all merges): `oat backlog archive` with real outcome summaries for exactly these twenty-three items — `BL-260906-cover-skill-test-files-under`, `BL-260906-docs-index-follow-ups-from`, `BL-260906-extend-check-skill-bumps`, `BL-260906-fix-sync-apply-branch`, `BL-260906-guard-packed-asset-directories`, `BL-260906-persist-status-native-skill`, `BL-260906-reconcile-the-oat-doctor`, `BL-260906-repair-the-stray-fence-in-oat`, `BL-260906-run-scripts-worktree-init-test`, `BL-260907-finalize-synced-archive-mjs`, `BL-260907-fold-oat-config-adopt-onto`, `BL-260907-harden-the-external-plan`, `BL-260907-let-oat-config-unset-remove`, `BL-260907-make-the-completion-seal`, `BL-260907-name-the-resolved-target`, `BL-260907-settle-the-oat-wave-program`, `BL-260907-warn-when-documentation-root`, `BL-260908-correct-the-factual-skill`, `BL-260908-guard-normalized-config-maps`, `BL-260908-keep-a-bare-proto-in-markdown`, `BL-260908-keep-external-plan-writes`, `BL-260908-make-copy-strategy-skill`, `BL-260908-report-a-changed-skill-with-no` — one commit. **Update-only, never archived by this wave:** `BL-260906-harden-dispatch-launch` (p16 lands its baseline half; the item stays `status: open` with the issue #266 half as its remaining acceptance criterion, per the p16 plan) and `BL-260908-retire-the-top-level-skill` (p13 lands step 1; the item stays `status: open` with step 2 unticked and its one-release-later criterion, per the p13 plan).
- [ ] Orchestration-log end-of-run synthesis written; roll-up into `summary.md` before any archive step
- [ ] Full DoD gates green on the integration branch (fan-in lockstep bump above freshly fetched `origin/main`)

## References

- Source plans: the 20 `.oat/repo/reference/external-plans/2026-09-08-*.md` files named above
- Program: `.oat/repo/reference/external-plans/2026-08-31-execution-program.md` (Wave 7)
- Program index: `.oat/repo/reference/external-plans/2026-09-08-backlog-review-wave-7-plan-index.md`
- Pattern: `DR-260713-wave-project-wrapper-over`, `DR-260713-bundle-stop-semantics-park`, `DR-260713-shared-tracked-surfaces` — program-level decision slugs from the 2026-08 wave program carried by `oat-wave-execute`, not records in this repository's decision index; `DR-260907-pre-dispatch-refreshes-live` (this repository); prior wave summaries in `.oat/projects/shared/wave-{1,2,3,4,5,6}-execution/summary.md`
