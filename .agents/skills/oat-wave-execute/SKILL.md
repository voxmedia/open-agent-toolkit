---
name: oat-wave-execute
version: 1.6.2
description: Use when executing a wave of external implementation plans as a wrapper OAT project — scaffolding, drift refresh, parallel worktree groups, briefs, gates, merge choreography, and closeout.
argument-hint: '<wave-id> [plan-names...] (e.g. wave-2 http-listener-before-indexing ...)'
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task
---

# Execute a Wave of External Plans

Run one **wave** of the external-plan program as a wrapper OAT project. This skill
owns the **mechanical layer** — everything that waves 0–1 proved stable and that
hand-re-derivation repeatedly broke. It deliberately does NOT own judgment.

Provenance: extracted per `DR-260713-extract-oat-wave-execute` after the source
program's waves 0–1 and hardened across its waves 2–5.

Log every friction/deviation to the project's `orchestration-log.md` so later
waves inherit evidence, not anecdotes.

Historical `DR-*` and `BL-*` slugs in this skill (including the provenance
record above) are evidence citations in the source program's repository; they
are not required artifacts in the consuming repo.

## Progress Indicators (User-Facing)

Print this banner once when execution starts:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ WAVE EXECUTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Before each major boundary, report the current step: preflight, drift refresh,
  wrapper scaffold, group dispatch, integration gate, or closeout.
- For parallel groups, report accepted lane IDs once, then summarize outcomes
  after all lanes return; do not stream every worker action.
- Surface STOP conditions immediately with the blocked lane, durable evidence,
  and exact resume action.

## Ownership Boundary

**This skill owns (mechanical):** integration/phase branch naming, worktree
bootstrap, wave-boundary drift refresh, wrapper-project scaffold (from the bundled
templates), brief templates, gate-prompt template + scaling, merge choreography,
bookkeeping cadence, closeout sequence.

**The orchestrator owns (judgment — never delegate to this skill or to workers):**
parallel-group composition from live recon evidence, review-finding dispositions,
verification of load-bearing worker claims, merge-order decisions under live drift,
cross-lane synthesis, the end-of-run synthesis, and all user checkpoints.

## Standing Rules (violations caused every wave-1 incident)

1. **Branch naming:** integration branch `wave-N-execution`; phase branches
   `wave-N/pNN`. Phase branches MUST NOT nest under the integration branch name
   (git refs cannot be both leaf and directory).
2. **Merge commits use a conventional type:** `chore(pNN): merge wave-N/pNN — <lane> (review passed)`.
   Bare `merge(...)` fails commitlint. Keep headers ≤ 100 chars.
3. **Clean orchestrator tree before group merges** — a dirty unrelated file leaves
   `git merge --no-ff` uncommitted and drags the full hook chain into recovery.
   Gate reviewers now COMMIT their own artifacts (waves 2–3 evidence): keep the
   tree clean around gate runs and expect a gate-authored commit on return.
4. **Pre-declare CUMULATIVE churn in every brief:** declarations cover everything
   landed since each source plan's AUTHORED COMMIT (drift checks compare against
   that commit, not the group base), naming files + rough regions. Zero false
   drift-STOPs across 32 consecutive briefed lanes through wave 4
   (DR-260715-cumulative-churn-manifests).
5. **Resolve full SHAs with `git rev-parse`** — never hand-expand short SHAs.
6. **Gate scope must fit the timeout:** bound wrapper-plan gate reviewers to the
   wrapper artifacts + the drift-refresh record (not all N source plans), or raise
   the gate timeout. On a gate timeout, check the project `reviews/` directory for
   a completed artifact carrying the gate `runId` BEFORE re-running. For larger
   waves (~6+ lanes), prefer per-phase gates over one monolithic final gate; if a
   final gate must cover the whole wave, scope its prompt to the integration
   diff plus the review-chain artifacts, not a re-review of every lane.
7. **Guard every formatter-ignored-file × staged-glob interaction:** a
   single-glob staged-file task can fail when every matched file is ignored by
   the repo's formatter. Audit every glob task and pair canonical-file
   exclusions with the staged-task's matching ignore filter (source-program
   example: oxfmt exited non-zero for ignored `*.md`/`*.json`, requiring both
   `.oxfmtrc.json` `ignorePatterns` and `.lintstagedrc.mjs` filtering).
8. **Gate timeout diagnostics** (the upstream stdin-hang fix landed in oat
   0.1.65 — gate children now get `stdin: 'ignore'`; the historical
   `< /dev/null` workaround is retired and harmless if still present):
   timeout + ZERO output bytes = launch defect (do not spend remediation
   attempts re-running unchanged); timeout + a complete artifact = late
   completion (recover the artifact by `runId` per rule 6). Verify the CLI is
   ≥0.1.65 (`oat --version`) before dropping the workaround on a new host.
9. **Verified bookkeeping edits** (`DR-260713-bookkeeping-table-mutations`):
   never mutate plan/implementation status tables with exact-string replacement —
   oxfmt re-padding makes it silently no-op. Use anchored regex + a substitution
   count assertion + a post-state grep, every time. This discipline caught its
   own subsequent no-ops twice in wave 2; treat an assert failure as normal
   operation, not an incident.
10. **Integration gates after every fan-in:** they are the only detector for
    cumulative-timing defect classes. Never skip them because every lane passed
    independently; the wave-5 embed-teardown defect was caught only after fan-in.

Plus inherited invariants: commit-verification via `git log` before retrying after
any ambiguous hook outcome; every agent runs the repo's formatter on markdown it
writes; follow the repo's runtime/environment setup before package commands;
repair native-dependency ABI mismatches using the repo's documented rebuild
procedure; rebuild edited workspace-package output before running consumer tests
(stale output mimics real failures). Source-program examples were `pnpm
format:fix`, `nvm use`, and `pnpm rebuild -r better-sqlite3` on
`NODE_MODULE_VERSION` errors.

## Inputs

- `<wave-id>` — e.g. `wave-2`. Derives project `wave-N-execution`, branches per
  rule 1.
- Lane list: resolve from the live execution-program artifact
  (`.oat/repo/reference/external-plans/*-execution-program.md`, owned by
  `oat-wave-program`); fall back to the plan indexes' wave hints only when no
  program artifact exists. Verify every named plan file exists before
  scaffolding; a missing file is a STOP (report, don't guess).
- Concurrency ceiling: default **3** worktrees (operator-set; revisit per wave).

## Process

### Step 1: Preflight

1. From the repo root on up-to-date `main`: `git checkout -b wave-N-execution`.
2. Follow the repo's runtime/environment setup, install dependencies, and run
   its build/type baseline gates (source-program example: `nvm use && pnpm
install --frozen-lockfile`, rebuild `better-sqlite3` if Node changed, then
   `pnpm build && pnpm type-check`).
3. Record `BASE_SHA=$(git rev-parse HEAD)`.

### Step 2: Wave-boundary drift refresh (recon dispatch)

Dispatch ONE economical recon subagent (read-only) over all wave plans:

- Re-run each plan's `## Drift check` against `BASE_SHA`; classify
  PASS / MINOR-DRIFT (describe) / STOP (quote the plan's own condition + evidence).
- AUDIT each plan's drift-check FILE COVERAGE against its stated scope: a plan
  whose implementation surface includes files its drift-check command omits gets
  a wrapper rule-1 addendum (wave-2 p07 precedent — the gap became a mandatory
  in-worktree extension and the anticipated conflict never materialized).
- Extract each plan's COMPLETE write-surface list and mechanically intersect
  every pair — flag every file written by 2+ plans, however minor (this feeds
  group composition; include generated files like `apps/documentation/index.md`
  when plans run docs gates, and CLI/help/parity files that many lanes touch).
- Return a compact per-plan table + shared-surfaces section. Conclusions only.

A tripped STOP parks that lane at plan time (recorded in the wrapper plan; lane
excluded from groups) — never mid-run. **Reconciliation contract:** when recon
reveals a stale plan premise, the reconciliation must be NON-NARROWING (WHERE
the work happens may change; WHAT must be true may not), recorded exactly once
in the Drift Refresh Record with pointer-only references elsewhere — a
reconciliation that waives a source-plan requirement is a plan-gate Important
(wave-4 evidence).

### Step 3: Scaffold the wrapper project

1. `oat project new wave-N-execution --mode quick --no-commit`.
2. **Verify scaffold substitution AND advance the lifecycle** in `state.md`.
   On oat ≥0.1.65, verify that the basic scaffold placeholders
   (`{ OAT_HILL_CHECKPOINTS }`, `{ OAT_PHASE }`, `{ OAT_WORKFLOW_MODE }`) were
   already substituted; fix them only if unexpected survivors remain. The
   lifecycle advance and wave-specific values remain orchestrator-owned:
   `oat_dispatch_policy` (managed/high unless the operator says otherwise),
   `associated_issues` (the wave's backlog items),
   **`oat_parallel_execution: true`**, and — once plan.md is written —
   **`oat_phase: plan` + `oat_phase_status: complete`**. Also refresh the
   state.md BODY prose (Status/Current Phase/Artifacts/Progress/Next Milestone)
   — frontmatter alone is not enough; two waves hit body-drift findings.
3. Write `plan.md` from `assets/wrapper-plan-template.md` — pointer-only tasks,
   the wrapper execution contract verbatim, drift-refresh record marked
   **non-authoritative recon evidence**, HiLL at the final phase (confirm against
   `workflow.hillCheckpointDefault`). **Template directive hygiene:** the
   templates' `{ curly-brace }` placeholders AND their authoring directives
   (e.g. "Keep both code + artifact rows below") are instantiation instructions —
   substitute/apply them and REMOVE them from the instantiated artifact; a
   surviving directive is reviewer-visible noise (sol wave-2 finding class).
4. Write `discovery.md` (inherited contract + this wave's decisions) and
   `orchestration-log.md` from `assets/orchestration-log-template.md` (day one).
5. **[JUDGMENT] Compose parallel groups** from the recon write surfaces: groups of
   ≤ ceiling, write-disjoint within a group; shared-file plans in different groups.
   A lane that must run alone (merges-first, or a solo finale) stays UNGROUPED —
   ungrouped phases execute sequentially in plan order, and `validate-plan`
   REJECTS singleton groups. Cross-model review steps on
   locking/security/containment/dependency lanes. Recon must intersect ALL
   per-plan write surfaces mechanically, not just headline files (wave-3 g1
   missed a two-lane CLI-file overlap that merged conflict-free only by region
   luck).
6. `oat project validate-plan --project-path <path>`, run the repo's formatter
   over the project dir (source-program example: `pnpm format:fix`), and commit
   the scaffold.

### Step 4: Plan gate

Run the cross-runtime artifact gate with a **bounded** prompt (rule 6): review the
wrapper artifacts for plan invariants, contract consistency, frontmatter validity,
and whether any task restates/narrows its source plan — the external plans are
immutable inputs, NOT review targets. Disposition findings in-artifact
(gate-invoked artifact review), commit, and proceed at `fixes_completed` per
wave-0/1 precedent.

### Step 5: Execute via `oat-project-implement`

The lifecycle skill owns execution. This skill contributes the templates it uses:

- **Worktree bootstrap:** run
  `scripts/bootstrap-group.sh <wave-prefix> <BASE_SHA> pNN...` — e.g.
  `scripts/bootstrap-group.sh wave-2 $(git rev-parse HEAD) p01 p02 p03`
  (wraps the `oat-worktree-bootstrap-auto` contract: create at explicit base,
  propagate local config, verify base ancestry, repo bootstrap and
  proportionate baseline via the `OAT_WAVE_BOOTSTRAP_CMD` /
  `OAT_WAVE_BASELINE_CMD` env hooks — a pnpm-shaped repo defaults to
  `pnpm run worktree:init` / `pnpm type-check`, any other repo skips the step
  with a STATUS line — verify provider-view parity with the root checkout,
  structured STATUS lines; as of 1.3.0 the script relocates its
  `.bootstrap-*.log` files into `$TMPDIR` itself).
  When lanes carry provider review steps that require worktree trust, pre-trust
  the new paths using that provider's configuration (for Codex, the
  source-program example is `~/.codex/config.toml`).
- **Implementer briefs:** self-contained Phase Scope (resolver-stamped dispatch
  fields), the contract pointer ("your ENTIRE contract is <external plan>; nothing
  in the wrapper narrows it"), **region-level expected-churn pre-declaration**
  (rule 4: name the churned file AND the region vs the lane's target region —
  three-for-three effective in wave-2 group 2), env rules, DoD gates before
  commit, one commit per task with the plan's message, bundle STOP semantics
  where applicable (`DR-260713-bundle-stop-semantics-park`), the bookkeeping
  boundary (workers never touch `.oat/projects/`), and the structured PHASE
  REPORT format. Cross-model review steps in briefs name the RUNTIME-RESOLVED
  reviewer (the plan stays provider-neutral; dispatch resolves — currently
  Codex per the source repo's config). Adapt lane-type addenda to the consuming
  repo. Worked source-program examples: "background a previously-inline step"
  lanes budget a full direct-caller audit; new shell scripts honor the repo's
  oldest supported shell; disposal/wiring prefers the framework teardown seam
  (Fastify `onClose` in one lane) over a concurrently restructured file; a
  defaulted schema field (Zod in one lane) budgets type-surface consumer fixes;
  an MCP tool rename moves its expected-tool list, additive snapshot, tool-list
  tests, and version-pin tests together; and time-driven HTTP tests avoid a fake
  clock that freezes the request event loop. These are briefing patterns, not
  requirements for Fastify, vitest, Zod, or MCP.
- **Reviewer briefs:** read-only, per-phase; checklist = source plan
  `## Review focus`; implementer claims are inputs to VERIFY, not trust.
  Lanes with embedded cross-model reviews get DISPOSITION-VERIFICATION briefs:
  verify each fix and each rejection's parity claim against the cited siblings
  instead of re-reviewing (wave-3 caught a partially-false rejection claim this
  way). Every fix disposition, including a root-verified bounded fix, must
  produce a minimal stored verification record stating what was verified, how
  it was verified, and where the evidence is recorded; the wave-5 final gate
  blocked on exactly this audit gap. For a fix continuation, prefer resuming the
  original implementer handle while it is alive: this is cheaper and retains
  design context. Launch a fresh same-target agent only when that handle is
  gone. Rename/refactor-class revision reviews get a PURITY BAR: diff the
  changed handler bodies against the ORIGINAL at base — tests alone are silent
  on migrated-behavior drift (wave-3 p-rev1 Critical was caught only by this).
  LOGIC-BEARING lanes' reviewers must design ≥1 adversarial probe of their own
  beyond the implementer's pins (DR-260715-adversarial-probe-reviewer: the
  wave-4 overlap-corruption Critical was found ONLY by a reviewer probe —
  every gate and pinned test was green); runtime-
  probe ambiguous behavioral claims; on containment/security surfaces require a
  weaker-anywhere analysis (any input previously rejected that is now accepted is
  Critical). Adapt contract-propagation checks to the lane type; the
  source-program example required a new `DoctorJsonResponse` field to travel with
  diagnostics docs and exact-match doctor JSON tests. Write the artifact to the
  ROOT checkout `reviews/` and run the repo's formatter over it (source-program
  example: `pnpm format:fix`).
- **Merge choreography:** after all group verdicts — serialized `git merge
--no-ff` in plan order, rebasing each phase branch on the updated tip first
  (rules 2–3). Immediately before EVERY `git merge`, run `pwd` and
  `git branch --show-current` and assert that they identify the intended repo
  root and integration branch; stop on either mismatch. This closes the
  cwd-persistence wrong-branch failure observed in wave 5. Integration DoD gates
  after fan-in run TO COMPLETION BEFORE any group bookkeeping edits start
  (DR-260714-integration-gates-run-before);
  then the group bookkeeping commit. Before dispatch, inspect every worktree's
  sync commit content and stop on provider-view deletions or unrelated managed
  path churn. This is a **regression guard for the named stale-local-binary
  failure class**: a stale locally resolved `node_modules/.bin/oat` can shadow
  the global CLI and make two desired-state sync versions thrash managed files.
  On any parity mismatch, compare `node_modules/.bin/oat --version` with
  `oat --version`; do not treat it as unexplained toolkit corruption.
  **Conflict-resolution contract
  (DR-260715-conflict-resolution-contract):** on rebase/merge conflicts —
  keep-both where lanes appended to shared surfaces; then in-worktree BUILD +
  touched-package suites BEFORE amending (mechanical splices break seams:
  braces, stacked branches, duplicated keys — wave-4 evidence); then inspect
  the amended commit's file stat against the expected list; NEVER `git add -A`
  in a worktree (stale synced local state gets swept). At every
  merge/bookkeeping boundary, run a standing config-integrity check that tracked
  `.oat/config.json` keys remain present; this check originated with
  `BL-260715-investigate-oat-config-json` in the source program's repo. Update
  canonical sections in place, the run-entry table, review rows, and state;
  remove worktrees + branches after merge.

### Step 6: Closeout

Follow `oat-project-implement`'s completion route, plus the wave-specific order.
Run these steps strictly in this numbered sequence. The load-bearing constraint:
the end-of-run synthesis and its `summary.md` roll-up MUST come before backlog
archival and before the project-archive seal (`oat-project-complete`) — never
archive anything first.

1. **Final verification** — integration DoD gates green on the integration branch.
2. **End-of-run synthesis in `orchestration-log.md`, then roll it up into
   `summary.md`** (this is the "before any archive step" gate): convention
   verdicts with evidence, adjustments-as-rules for later waves, graduated-entries
   ledger, rolled into `summary.md` `## Workflow Observations`.
3. **Serialized backlog archival** — `oat backlog archive` with real summaries,
   one commit.
4. **Root final review.**
5. **Cross-runtime final gate** — judgment-sweep dispositions; watch for the known
   gate row-stomp on the final Reviews row (restore `passed` if regressed).
6. **Pre-approval sequence** per `workflow.postImplementSequence`, then a single
   HiLL. File follow-up-ledger backlog items at closeout (on main post-merge, or
   pre-gate if the operator prefers them in the PR).
7. **`oat-project-complete` BEFORE merge** (standing order: review → complete →
   merge; an open PR is expected, not a blocker — the archive-aware PR body sync
   handles it).
8. **After the operator merges:** reconcile (squash-merge means content-diff the
   branch vs main; cherry-pick stragglers), reset the working branch, clean stale
   phase branches, and run `oat-wave-program` `wave-close <wave-id>` so the
   program ledger records the merge (PR, SHA, completion-record link) and flips
   the wave's plan rows to `done`. Optionally generate the program recap using
   the mechanical explainer caller below.

#### Optional program-recap explainer caller

The orchestrator owns fact-base synthesis. It synthesizes an
`explainer-kit.fact-base/v1` document from the reconciled execution-program
artifact, wave summaries, and completion records. Its required keys are exactly:
`schemaVersion, generatedAt, mode, freshnessPolicy, sources, claims, unresolvedClaims, overrides`.

The mechanical caller constructs an `explainer-kit.run-request/v1` document whose
required keys are exactly:
`schemaVersion, recipe, slug, outputRoot, factBase, mode`. Set `recipe` to
`{ "id": "program-recap", "version": "1" }`; this is an object with exactly
`id` and `version`. Set `outputRoot` to `.oat/repo/explainers/<slug>/`. Bind the
synthesized fact-base file through `factBase` with the required keys
`mode, freshnessPolicy`, set `mode` to `"supplied"`, set `freshnessPolicy` to
`"live-wins"`, and set `path` to that file.

After the run, read the `explainer-kit.manifest/v1` document. Its required keys
are exactly:
`schemaVersion, runId, slug, recipe, createdAt, source, theme, artifacts, immutableHashes, outcome, buildRecord, warnings`.
Record the manifest's `runId` and `outcome` in the wave ledger row. Publishing is
human-gated; this caller never invokes publish.

## Success Criteria

- Zero convention re-derivation errors (branch naming, merge types, SHAs, gate
  scoping — the wave-1 incident class).
- Every lane: drift check honored, one verified commit per task, review round
  dispositioned, DoD + integration gates green.
- Orchestration log current at every group boundary; synthesis written before
  archive; follow-up ledger graduated.
- Deviations from THIS skill logged with a skill-abstraction tag — that is the
  evidence signal for future skill revisions.
