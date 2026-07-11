# Orchestration Execution Log — oat-project-fixture

Chronological record of every orchestration event in the 2026-07-11
quick-start session (brainstorm → discovery → design → plan → gate), with
outcomes and evidence-based classifications in the style of
`codex-subagent-max-depth`'s `subagent-orchestration-learnings.md`. Initial
root: Cursor IDE harness (Fable 5); implementation resumed after a user model
switch under a GPT-5.6 Sol xhigh root agent. Intended to feed the
end-of-project review and the p06 docs deliverable.

## Dispatch Log

### 1. Recon fan-out (3 native background subagents)

- **Mechanism:** Cursor native Task tool, `generalPurpose`, read-only,
  background; explicit pin `model: gpt-5.6-terra-medium` (user-selected).
- **Targets:** codex-subagent-max-depth project briefing;
  dispatch-schema-matrix-infrastructure project briefing; five archived
  projects history sweep.
- **Outcome:** all three launches accepted, all completed with usable
  structured briefings (now `references/recon-*.md`).
- **Classification — confirmed:** exact Task-model pinning to
  `gpt-5.6-terra-medium` works in the Cursor IDE harness (accepted +
  completed ×3). This is the positive control the Cursor verification
  analysis called for, at the configured-invocation evidence layer.
- **Limitation observed:** read-only ("Ask mode") subagents cannot run even
  read-only git commands; both project-recon workers had to skip
  `git log`/`status` verification, which the root agent backfilled. Factor
  this into future recon prompts (either grant shell or pre-supply git
  facts).

### 2. Plan artifact self-review, rounds 1–2 (native, pinned)

- **Mechanism:** native Task `oat-reviewer`, `oat_output_mode: structured`,
  read-only, pinned `gpt-5.6-sol-high-fast`.
- **Why pinned:** the then-current `oat-project-plan-writing` contract
  routes even self-reviews through managed reviewer resolution under a
  capped policy. Resolver returned `gpt-5.6-sol-high` (user-config cursor
  high final candidate) — **not natively pinnable** (not in the curated
  Task catalog); a project-state matrix override
  (`cursor.high.candidates: [..., gpt-5.6-sol-high-fast]`) made the
  resolved target natively dispatchable.
- **Shape lesson (confirmed):** a bare-array project matrix override is
  parsed as a legacy fallback **route** (route 0 selected → `sol-low`);
  the `{ candidates: [...] }` shape gives ladder semantics (reviewer =
  final candidate → `sol-high-fast`). Live demonstration of PR #136's
  normalization boundary.
- **Outcomes:** round 1: 0C/3I/4M/3m → all fixed (Importants applied,
  M/m user-approved). Round 2: 1I/1M → fixed. Both dispatches accepted and
  concluded in structured mode; no artifacts written (correct).

### 3. Plan artifact self-review, round 3 (native, inherited)

- **Mechanism:** native Task `oat-reviewer`, structured, **no model pin** —
  inherited parent model, per newly minted discovery Decision #11
  (planning-phase self-reviews inherit; the planning root is already
  at/above ceiling).
- **Outcome:** clean except 1 Minor (applied). Plan marked reviewed and
  implementation-ready.
- **Decision minted here:** #11 phase-scoped review dispatch — planning
  self-review inherits; implementation self-review resolves **at ceiling**
  (workers may run below ceiling; reviews must not inherit a cheap worker
  model); gates pin cross-family CLI exec targets. Correcting the
  plan-writing contract's over-pinning is p04 scope.

### 4. Lifecycle gate, run 1 (cross-runtime CLI exec target) — TIMEOUT

- **Mechanism:** `oat gate review` (configured quick-start skill gate);
  host-avoidance correctly skipped the Cursor root and selected
  `codex-5-6-sol-max` (`codex exec --model gpt-5.6-sol -c
model_reasoning_effort=max`); gate run `262c4812`.
- **Observed topology:** cursor root → gate wrapper → Codex exec-target
  session → which itself resolved and dispatched a **nested managed
  reviewer child** (`oat-reviewer-gpt-5-6-sol-high` via `agent_type`).
  Three dispatch layers; a key motivator for the docs diagram requirement.
- **Outcome:** killed at the 600 s fixed timeout while the nested reviewer
  was demonstrably mid-work (`collab: Wait`); **no artifact; all review
  work lost.**
- **Classification — confirmed non-resolution:** fixed wall-clock timeouts
  conflate hang detection with duration budgeting. Second occurrence of
  this incident class (first: max-depth project, which raised the default
  to 15 min in PR #137 — still a fixed number).
- **Remediation minted:** `BL-260711-add-activity-aware-gate`
  (idle-activity hang detection; early artifact-template write as
  liveness/correlation signal; hard cap; artifact-aware timeout recovery).

### 5. Lifecycle gate, attempt 1 (20-min env override) — BLOCKED, productive

- **Mechanism:** same target; `OAT_GATE_EXEC_TIMEOUT_MS=1200000`.
- **Outcome:** completed in ~11 min. Verdict blocked: 0C/2I/2M
  (non-deterministic negative control; `node --test <dir>` invalid on Node
  22 — reviewer _reproduced_ it; unbounded conditional fix clauses; missing
  exact live-task commands). Artifact
  `reviews/artifact-plan-review-2026-07-11T165003Z.md`, run `2904d24d`,
  gate frontmatter fields copied verbatim; reviewer committed its own
  bookkeeping atomically. All four findings fixed in plan.

### 6. Lifecycle gate, attempt 2 (merged 15-min default) — BLOCKED, new findings

- **Mechanism:** same target; post-merge `oat` 0.1.51, `timeout=900000ms`
  (PR #137's fix observed live).
- **Outcome:** prior fixes verified clean; 3 new Important + 1 Medium
  (installed ≠ authenticated preflight; Codex live task missing
  `report.mjs --check` acceptance commands — an asymmetry introduced by the
  attempt-1 fix itself; docs task vs `oat-project-document` contract; p06-t03
  conditional evidence outside declared scope). Artifact
  `reviews/artifact-plan-review-2026-07-11T170953Z.md`, run `7c142d9e`.
- **Disposition:** `maxAttempts: 2` exhausted → escalated per
  `onFailure: block`. User decision: apply all fixes, skip further gate
  runs; docs-workflow nuance recorded (default flow, not hard prohibition).
  All recorded in the plan review row and `implementation.md`.

### 7. Implementation preflight and native-catalog drift

- **Trigger:** implementation resumed after the user changed the root session
  model from Fable 5 to GPT-5.6 Sol.
- **Earlier root catalog snapshot (Fable 5):**
  `gpt-5.6-terra-medium`, `gpt-5.6-sol-high-fast`,
  `composer-2.5-fast`, `composer-2.5`, `gpt-5.3-codex`,
  `gpt-5.5-extra-high`, `grok-4.5-fast-xhigh`,
  `claude-4.6-sonnet-medium-thinking`,
  `claude-sonnet-5-thinking-high`, `claude-fable-5-thinking-high`,
  `claude-opus-4-8-thinking-high`.
- **Catalog available to the GPT-5.6 Sol xhigh root agent:**
  `gpt-5.6-terra-medium`, `gpt-5.6-sol-xhigh`,
  `composer-2.5-fast`, `composer-2.5`, `gpt-5.3-codex`,
  `gpt-5.5-extra-high`, `grok-4.5-fast-xhigh`,
  `claude-4.6-sonnet-medium-thinking`,
  `claude-sonnet-5-thinking-high`, `claude-fable-5-thinking-high`,
  `claude-opus-4-8-thinking-high`.
- **Observed root delta:** `gpt-5.6-sol-high-fast` disappeared and
  `gpt-5.6-sol-xhigh` appeared. The account/CLI catalog still exposes both.
  The model switch and tool-schema change are temporally correlated, but
  causation is not yet proven; proving it requires switching the root model
  again and comparing the newly injected Task schema.
- **Correction to preflight wording:** “not exposed by this session” was too
  broad. The exact high-fast slug was exposed and accepted earlier in this
  same conversation. It is absent only from the current root invocation's
  native Task schema.
- **Nested coordinator observation:** a native, inherited phase coordinator
  launched successfully, but its nested Task schema exposed only
  `composer-2.5-fast`. Therefore it could not natively launch the configured
  `gpt-5.6-terra-medium` task worker.
- **Controlled probes (fresh, read-only):**

  | Child role              | Child model            | Nested tool | Nested explicit model catalog |
  | ----------------------- | ---------------------- | ----------- | ----------------------------- |
  | `generalPurpose`        | `gpt-5.6-terra-medium` | available   | `composer-2.5-fast` only      |
  | `oat-phase-implementer` | `gpt-5.6-terra-medium` | available   | `composer-2.5-fast` only      |
  | `oat-phase-implementer` | `gpt-5.6-sol-xhigh`    | available   | `composer-2.5-fast` only      |

- **Classification — confirmed:** within the tested matrix, the nested catalog
  is independent of child role and chosen child model. The strongest supported
  explanation is a child/nesting tool-policy restriction, not account
  availability or the selected coordinator model. A broader host/runtime test
  would be required to prove the restriction is universally depth-based.
- **Project impact:** the configured ladder was satisfiable through Cursor
  CLI (`cursor-agent --list-models` includes both Terra medium and Sol
  high-fast) but not through the coordinator's nested native tool. This is a
  live reproduction of the catalog-mismatch case p04/p05 are meant to specify
  and smoke-test.
- **p01 execution evidence:**
  - `p01-t01`: native nested launch rejected before start; coordinator made a
    deliberate pre-start CLI selection (`selection_reason=pre-start-rejection`,
    candidates considered: Terra medium and Composer fast), launched
    `cursor-agent --model gpt-5.6-terra-medium`, and committed
    `35bfc3b6bc890b5301ea2148b724493b529d2ac7`. Focused test, lint, and format
    passed.
  - `p01-t02`: the same exact CLI target was accepted and ran for about
    710 seconds before user interruption. No fallback is eligible after that
    accepted launch. Four untracked preset files remain as possible partial
    output; no worker process remains.

## Cross-Cutting Incidents

- **Stale binaries, twice:** (a) global `oat` 0.1.48 predated the dispatch
  matrix → `Unknown config key: workflow.dispatchCeiling.providers` →
  false "ladder missing" diagnosis, resolved by merging main + local CLI +
  later `npm i -g` (0.1.51). (b) The repeat of the
  backlog-lifecycle-hardening incident class; the smoke runner's
  stale-global preflight guard (p02-t02) exists for exactly this.
- **Generated-file merge conflicts, twice:** `.oat/repo/pjm/backlog/index.md`
  and `.oat/sync/manifest.json` — both resolved by regeneration
  (`oat backlog regenerate-index`, `oat sync`), never by hand-merging.
- **Duplicate/stale async notifications:** subagent and shell completion
  notifications re-delivered after processing; harmless but worth knowing
  when reading this session's transcript.

## Confirmed Facts Worth Reusing

1. Cursor IDE harness accepts exact Task-model pins from its curated
   catalog (~11 slugs, snapshot in
   `subagent-catalog-and-selection-findings.md`); omit-model inherits; no
   CLI enumeration of that catalog exists.
2. Gate host-avoidance works: Cursor root reliably routed to a Codex exec
   target across all three gate runs.
3. Gate reviewers copy injected invocation-provenance frontmatter verbatim
   and commit bookkeeping atomically — corroboration fields all validated.
4. The gate exec target running a full skill session will itself perform
   managed nested dispatch; any timeout/diagram/documentation reasoning
   must account for that inner layer.
5. Review quality tracked target strength: the sol-max gate reviews found
   real, reproducible defects the sol-high-fast/inherited self-reviews
   missed (Node 22 `--test` behavior; docs contract) — supporting the
   "reviewer at or above ceiling" invariant.

## Open Items Carried Forward

- `BL-260711-add-activity-aware-gate` (gate timeout mechanism).
- p04: phase-scoped review dispatch semantics into the plan-writing /
  implement / phase-implementer contracts (Decisions #11, #12).
- Claude topology and Cursor CLI Task observability: answered by p05 live
  runs, not yet evidenced.
- This log should be extended during implementation (per-phase dispatch
  notes land in `implementation.md`; cross-cutting orchestration
  observations belong here) and consumed by the end-of-project review and
  p06 docs.
