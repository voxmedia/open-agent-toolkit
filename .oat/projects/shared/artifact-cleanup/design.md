---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-10-11
oat_generated: false
oat_template: false
---

# Design: artifact-cleanup

Lightweight design for a quick-mode project, revision 2 (Astra round 1
applied, `references/astra-design-round-1.md`, verdict ALIGNED WITH CHANGES,
13 findings). It covers what the plan needs: which surface owns each fix, the
contracts the writers and the CLI share, the negative controls, the
documentation obligation and the phase split. Decisions D1–D13 are in
`discovery.md`. The two audit reports are machine-local; the baseline below
restates every number the plan relies on.

## Overview

### Historical baseline (restated from the audit and Sol's verification)

102 archive directories represent 97 distinct projects (five twin pairs).
Forty-eight summaries contain 3,589 copied roll-up lines (median 29.1% of
those summaries, maximum about 85%). Four journals contain 6,547 lines of
pasted dispatch JSON (about 68% and 73% of the two cited journals; records
left at `child_outcome: running`). Forty-nine logs contain 892 structural and
31 judgment entries, 37 contain no judgment entry, and their copied template
headers contribute 1,862 lines; five legacy learnings files contain 33
learnings. The audit flags 21/102 journals with task evidence in tables or
checklists the parser cannot read, 32/102 with unreconciled records, 10/102
with misfiled content (after `## References`, oversized nonstandard sections,
or pasted payloads) and 52/102 with template residue. These are heuristic
historical classifications, not validated current defect rates: the
unreconciled set includes stale gates and one flow-style YAML false positive,
the misfiled set is broader than after-References placement, and the template
set conflates absence with residue. PR fields read 85 open / 16 merged / 1
ready, observations that do not prove the status was false when archived.
Current-source inspection (Sol's era table) establishes the surviving writer
gaps; fresh lifecycle output measures this project's success (D1).

### Causes and fix set

The four causes are in the writers, not the names: noise copied between files
(roll-up, dispatch payloads); statuses nobody reconciles at completion;
records written where no reader looks (non-canonical task formats, appends
after References, unfilled template slots); and lessons split across two
files. The fix set: a bounded observations digest instead of a copy; one
canonical journal format with a shared record reader and a mode-aware
validator at the right boundaries; a producer-made run record checked at
closeout; fixed slots, slimmer templates and every writer moved together;
`state.md` as the owner of gate transitions with terminal receipts in the
journal; learnings folded into the project log losslessly across all three
producers; archive retries that cannot create twins; and documentation moved
in the same phase as each contract. Names stay (D3).

## Architecture

### System Context

```text
writers (skills)                           CLI                                           readers
───────────────────────                    ──────────────────────────────────────        ───────────────────
implement refs ──run line──────────────▶ project dispatch record --format line
review-receive, review-receive-remote,
revise, implement, pr-* ──receipts, fixes, deferrals──▶ journal slots ──▶ project journal check ──▶ implement (preflight) / complete (final)
autonomous, cloud, goal ──learnings──▶ project log append --category --source ──▶ project log rollup (digest) ──▶ summary.md ──▶ repo export
summary / retro ◀── project-log.md (judgment + category) + legacy learnings files (read-only) ◀──────────────────┘
complete ──prose rewrite, refresh, validate, seal, archive──▶ project archive (retry identity, generations)
templates (.oat/templates, registered in packages/cli/scripts/bundle-inputs.mjs) ──slots──▶ scaffold
docs (apps/oat-docs, AGENTS.md, decisions) ◀── every changed contract, same phase
```

### Component Diagram

| Component            | Owner surface                                                                                                                                                                                                      | Depends on                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Observations digest  | `packages/cli/src/commands/project/log/rollup.ts`, config schema/resolver (digest bound)                                                                                                                           | log grammar; summary template; source-locator contract            |
| Learnings fold       | `log/grammar.ts`, `log/append.ts`, `log/check.ts`, `log/rollup.ts`; writers `oat-project-autonomous`, `oat-cursor-cloud-projects`, `oat-project-goal`; readers summary, retro                                      | digest; source identity                                           |
| Shared record reader | `packages/control-plane/src/state/` (new heading-only reader with locations, ownership, fence exclusion) consumed by task progress and the validator                                                               | —                                                                 |
| Journal validator    | new `packages/cli/src/commands/project/journal-check/` (pure evaluator + I/O), consumed by implement preflight, review, and complete; `closeout-check`/`complete-state` unchanged in their write-nothing contracts | shared reader; brief/goal readers; delivery evaluator; goal audit |
| Slim run record      | `project dispatch record --format line` (additive renderer) + validator rule                                                                                                                                       | journal validator                                                 |
| Archive identity     | `project/archive/archive-utils.ts`                                                                                                                                                                                 | snapshot metadata, retained-artifact manifest                     |
| Templates            | `.oat/templates/{implementation,implementation-brief,project-log,summary}.md` (registration conserved in `packages/cli/scripts/bundle-inputs.mjs`)                                                                 | template contract tests                                           |
| Writer skills        | implement references, review-receive, review-receive-remote, review-provide, revise, complete, summary, retro, autonomous, cloud, goal, pr-progress, pr-final, brief contract §12 learnings clause                 | templates, CLI                                                    |
| Documentation        | `apps/oat-docs/docs/**`, root `AGENTS.md`, decision records, skill docs mapping                                                                                                                                    | each component, same phase                                        |
| Probe                | fresh lifecycles per mode plus focused grammar cases                                                                                                                                                               | everything above                                                  |

### Data Flow

A run writes one line per launch into `## Orchestration Runs` and updates it
in place with the terminal outcome. Receive (local or remote), revise,
implement and the PR skills write task and execution blocks into their
normalized phase, review and gate receipts into the owning phase or `##
Reviews and Gates`, and deferred findings into `## Deferred Findings`;
`## References` is last. Autonomous, cloud and goal runs append judgment
entries carrying a category and a stable source id. Implement's pre-Step-16
closeout call validates accepted evidence while the terminal headers and
pointers Step 16 owns may still be unwritten; after those writes, complete
runs its existing no-write preflight, then the owner-controlled prose and
summary refresh, then final journal validation before roll-up, seal or
lifecycle mutation, then archives with a stable retry identity. Readers
(summary, retro, dashboard) consume the same files they do today.

## Component Design

### Observations digest (D4)

`rollup.ts` currently renders every entry (`renderEntries`) under `##
Workflow Observations` in `summary.md`, and separately graduates
`general`-scope judgment entries into the repo ledger. The digest replaces
only the summary rendering:

- Input: judgment entries only; structural entries are provenance and stay in
  the log. Workflow Observations has a hard total entry bound and a rendered
  size bound (configuration key `workflow.projectLog.digest` with `maxEntries`
  default 12 and `maxLines` default 60, validated in the config schema and
  resolver and documented); `decision` and `gotcha` categories are
  prioritized within the bound, never exempted from it. Deterministic
  ordering: newest first, then category priority, then heading text as the
  tie-breaker. Per-item rendering is concise (one heading line, the first
  observation sentence, the recommendation when present, self-contained
  limitations and uncertainty); omitted-source counts are reported without
  copying raw bodies.
- Each recommendation appears once across the two summary sections:
  `## Autonomous Execution Learnings` (summary skill) owns synthesized
  actionable recommendations; the CLI-owned digest carries at most a concise
  cross-reference to them. Roll-up remains the sole Workflow Observations
  writer under an explicit deduplication and projection contract.
- Every projected lesson is self-contained and carries an explicit archive
  identity plus a collision-safe entry identity (date, type, area and a
  per-entry ordinal or source id). No bare relative `project-log.md` link is
  emitted into a tracked export, and no gitignored archive or review path is
  presented as a retrievable link. Before archive the locator is an explicit
  project/source locator that the export finalizes through the
  archive-owned snapshot/export contract, including retries and generations.
  Obsolete `.oat/projects/shared/...` or synced locations inside selected
  judgment bodies are removed or labelled while meaningful source and run
  identifiers are retained.
- The section is omitted when there is no durable lesson. General-scope
  graduation (`rollup.ts` ledger path with its dedupe and failure semantics)
  processes the complete original judgment set independently of digest
  selection. The existing `ambiguous` refusal before summary or ledger writes
  and the structured roll-up failure routing are preserved; skipping one
  individually malformed entry is reported under `--json` and never turns an
  unreadable log into an empty one.
- Negative controls at the public boundary (`oat project log rollup` on a
  fixture log): baseline renders a structural entry, a live shared path and
  an over-bound entry set into the summary; the digest refuses each for the
  intended reason while a judgment entry with a category survives with its
  locator; the exported summary is verified from its destination directory,
  including duplicate-heading sources and a non-default export path.

### Learnings fold (D3, Option D)

- Grammar: judgment headings keep the four types and the regex is unchanged.
  The body gains an optional structured head: `**Category:** <gotcha |
efficiency | documentation-gap | candidate-skill-content | decision |
environment-limited>`, `**Source:** <stable per-observation source id>`,
  `**Origin:** <producer>`, `**Recorded:** <UTC timestamp>`, then title,
  observation, impact, recommendation and uncertainty. `append` accepts
  `--category`, `--source`, `--origin` (validated; category must be one of
  the six) and an idempotency key so retries preserve each distinct learning
  exactly once; `check`, `rollup` and the parser expose these fields.
- Producers: the fold changes the actual writers and their persistence
  paths: `oat-project-autonomous` (mapping `gotcha`, `environment-limited` →
  `friction`; `efficiency`, `candidate-skill-content` → `worked-well`;
  `documentation-gap`, `decision` → `feedback`; category preserved
  verbatim), `oat-cursor-cloud-projects` and its mechanics reference, and
  `oat-project-goal`'s concrete write/commit instruction (brief-contract §12
  points at the same write). Scaffold creates no learnings file today and
  receives only a regression check.
- Disabled-log behavior (reconciles the discovery success criterion): when
  the project log is disabled the writers keep the existing
  `oat-execution-learnings.md` contract unchanged, so "no new legacy files"
  holds for projects with the log enabled, which is the default in this
  repository; the goal disabled-log contract is preserved until a compatible
  replacement is specified (deferred idea).
- Readers: summary and retro read the unified log first and legacy files
  second, deriving legacy identity from timestamp, category and title and
  deduplicating only proven identical sources; retro's evidence order and
  evidence-strength rules are preserved. New or changed learning-source
  identities invalidate summary freshness independently of task or phase
  freshness. A writer is retired only when all its consumers and persistence
  paths have moved; `project log check` reports a legacy learnings file as
  `learnings: legacy`.
- Controls: compatibility — an entry without `--category` is accepted by
  both versions (not a negative control); negative — the autonomous writer's
  contract test fails when category or source is missing, and a retry with
  the same idempotency key appends nothing; legacy — a legacy file is still
  read by summary and retro and deduplicated against a migrated twin.

### Shared record reader and journal validator (D5, D6, D8)

**Shared reader.** A heading-only record reader in the control plane with
source locations, explicit heading ownership (a task block ends at the next
heading of equal or higher level), fenced and indented code excluded, phase
and task identity normalization shared with the task parser, and raw records
retained so duplicates cannot disappear into a set. Task-mode progress
(`state/tasks.ts`) and the validator consume it; no table or checklist
completion support is added, so the dashboard and the validator read one
contract. State and journal metadata are read through the production
frontmatter reader, distinguishing malformed, missing and non-terminal
values.

**Validator.** `oat project journal check --project <path> --at
<implement-preflight|review|completion> [--scope pNN[,pNN]] --json`, a pure
evaluator plus I/O, read-only:

- Boundaries. `implement-preflight` (implement's pre-Step-16 call) validates
  accepted task and phase evidence and the existing closeout invariant while
  allowing the terminal headers and pointers Step 16 owns to remain
  unwritten. `review` takes an explicit phase scope and does not require
  future phases, future tasks or whole-project terminal headers; it warns for
  live unresolved runs. `completion` (complete, after the owner-controlled
  refresh and before roll-up, seal or lifecycle mutation) requires the
  terminal journal shape and cleared pointers; `oat_phase_status: pr_open`
  is a valid completion posture.
- Task modes: normalized plan task ids ↔ unique journal blocks; exactly one
  owned terminal status per block plus owned commit evidence or an explicit
  approved scope disposition; no plan task without a block at completion;
  overview totals match the blocks.
- Brief and goal: the landed phase-unit readers; failed, cancelled and
  no-change execution records are valid history without SHAs and are not
  accepted phases; goal uses the exhaustive outcome audit, extraction and
  backlink checks and the delivery-coverage evaluator; approved deferred or
  retired dispositions remain incomplete in progress and are never
  normalized.
- Status agreement: journal `oat_status`/`oat_ready_for`, phase and task
  `**Status:**` lines and `state.md` fields must agree with the claim at the
  boundary; a `blocked`/`in_progress` header on a completed phase is a
  refusal citing the line.
- Placement and operational records, validated across the whole newly
  written journal: task and execution blocks belong to their normalized
  phase; receipts to the owning phase or `## Reviews and Gates`; deferrals
  to `## Deferred Findings`; `## References` last; dispatch payloads (a
  fenced block carrying the record's `request_id`, `caller` and `role_name`
  triple) are refused anywhere, with only explicitly marked quoted examples
  or incident evidence exempt; every run line has a terminal
  launch/outcome combination at completion; no template placeholder
  survives.
- Override: a finite set of journal-only reason codes
  (`scope-disposition-approved`, `evidence-lost`, `operator-accepted-gap`)
  with the authorizing decision identity. The checker never writes.
  `oat-project-complete` records an authorized override idempotently in the
  journal's `## Deviations from Plan / Design` and, when enabled and
  unsealed, in the log before sealing; no override bypasses the existing
  closeout, goal audit, delivery coverage, ambiguity or seal guards;
  `complete-state` evaluates all guards before any write and writes nothing
  on refusal.
- Output: `{ status: ok | refused, reasons: [{code, path, line, owner}] }`.
- Controls, each through the public boundary with baseline acceptance,
  post-change refusal for the named reason and a minimally different valid
  control: fenced fake task heading; status or SHA leakage from the next
  section; duplicate normalized ids; revision spellings (`prev1`/`p-rev1`);
  a `blocked` header under a completed overview; a plan task with no block;
  a checklist instead of blocks (tolerant display, not completion); a
  payload under Deferred Findings with the run slot empty (fails for
  ownership and payload semantics, never for length); a `running` run line
  at completion; `{Task Name}` residue; valid flow-style YAML frontmatter
  (the audit's false positive) accepted; a goal journal with a failed
  execution record, an extracted phase and an approved deferral accepted;
  validation compared with actual control-plane progress on the same
  fixture.

### Slim run record (D6)

- `project dispatch record --format line` is an additive rendering of the
  same validated, redacted record and event; stdin support and the
  validation-only behavior are preserved, and no full-payload file is
  mandatory (the mandate removed by PR #288 does not return; full evidence is
  retained only for a named consumer). Grammar: `request_id · target ·
stamp · launch_status · child_outcome`, `·` delimited with escaping of the
  delimiter inside fields, identity and stamp taken from the record, one
  line per unique request id, outcome updated idempotently in place;
  `--json` returns the same fields structured. Terminal launch/outcome
  combinations are enumerated (`accepted`+`{done, done-with-concerns,
needs-context, failed, cancelled}`, `blocked-before-start` with no child
  outcome, `rejected`); a non-empty `child_outcome` is not sufficient.
  Continuation linkage and configured-versus-observed dispatch identity are
  preserved in the line without copying payloads.
- Severity policy (one, used by the validator): malformed or misplaced
  payloads refuse at review and completion; unresolved live runs warn only in
  the non-terminal review context.
- Control: the audit's pasted block is refused at review and completion; the
  one-line form passes; a `blocked-before-start` line passes without an
  outcome.

### Fixed slots, templates and writer ownership (D7, D8)

- `.oat/templates/implementation.md`: adds `## Reviews and Gates` and `##
Deferred Findings` before `## Final Summary`; drops `## Implementation
Log`, the per-phase `## Test Results` table and the "Conventions"
  blockquote (one free-text verification line per phase remains); keeps `##
Deviations from Plan / Design`, filled by review-receive and complete.
  `implementation-brief.md` gets the same two slots and keeps its phase-unit
  records. `project-log.md`: the 39-line header becomes two lines and a docs
  link; the sample entry is dropped. `summary.md`: `## Workflow
Observations` becomes the digest section with the omit-when-empty rule.
  Registration in `packages/cli/scripts/bundle-inputs.mjs` is conserved and
  verified; bundle assets regenerate through normal tooling.
- One ownership contract for all writers: implement references,
  review-receive, review-receive-remote, revise, pr-progress and pr-final.
  Receipts retain finding identity and substance, disposition and rationale,
  fix-record or approved-deferral linkage and final outcome, so journal and
  plan are understandable without the review file (D2); review paths are
  local-only citations and an unresolved citation is never a completion
  defect. The old run-table and template instructions are replaced and
  still-required outstanding-item information moves to its declared slot.
- `state.md` owns gate transitions; the journal keeps one terminal line per
  gate run plus waivers, overrides, operator choices and failure
  dispositions.
- Controls: template contract tests and bundle registration for both journal
  templates; a scaffolded and completed scratch project has no residue the
  validator flags; a receipt written by the old receive instruction lands
  after References and is refused, the new one lands in the slot and passes.

### Closeout prose and refresh (D9, D10, D12)

Closeout invokes the current summary contract and preserves task-mode
`oat_summary_last_task`, revision count and list semantics, brief
`oat_summary_phase_fingerprint` and the goal delivery-endpoint fragment; new
or changed learning-source identities trigger a refresh on their own.
Mechanical pointer and projection refresh creates no task; substantive
evidence correction or accepted design change remains traceable work with
commits, and review-provide says refresh-only findings are not tasks. Only
`summary.md` and the journal's terminal prose (Final Summary) are rewritten
from observed facts, with true follow-ups and timestamped historical
observations retained; log judgments are corrected by appending a
source-linked correction before sealing, never by rewriting prior entries,
completed synthesis or sealed history. `oat_pr_status`/`oat_pr_url` in the
archived `state.md` are labelled as observations with a timestamp. The
`ambiguous` refusal, seal and retry handling stay as they are.

### Archive identity (D11)

Persisted retry identity is project plus originating scope plus explicit
generation/snapshot identity, bound to a canonical retained-artifact manifest
(exclusions and archive-owned derived fields specified once, the review
exclusion preserved) and, for synced projects, the existing source-ref SHA.
An identical retry reuses the original local snapshot, dated export identity,
S3 destination and receipt across dates and after source removal; conflicts
and ambiguous candidates refuse before export, overwrite or remote mutation
with guidance to open a follow-up project. A new generation is authorized
only by an explicit `oat project archive --new-generation <reason>` that
records its predecessor in the snapshot metadata; until then, reopened work
is a follow-up project. The `49aeb5075` recordless synced retry,
authoritative completed-ref matching, stale-source refusal and exact-root
guards are preserved. Controls: identical retained-source retry,
source-absent resume, changed content, same slug in a different scope or
generation, and synced ambiguous or mismatched identities, all without
modifying existing archives.

### Documentation

Every changed contract is documented in the phase that changes it; the final
phase audits the set. Pages: `reference/project-artifacts.md` (artifact set,
slots, learnings fold, review-citation rule), `workflows/projects/execution/
project-log.md` (category, source, digest), `workflows/projects/execution/
index.md` and the implementation-execution guidance (run lines, slots),
`closeout/retro.md` and `closeout/closeout-skills.md` (where learnings live,
the validator, overrides), `workflows/advanced/autonomy.md` and
`workflows/advanced/cursor-cloud.md` (the learning write), `reference/
cli-reference.md` (`journal check`, `log append --category/--source/--origin`,
`dispatch record --format line`, `archive --new-generation`),
`reference/configuration.md` (digest bound), `workflows/advanced/
workflow-gates.md` and `reviews/index.md` (gate lines, local-only review
paths), the lifecycle and project-state-machine pages where closeout gains the
validator. Root `AGENTS.md` where the journal slots and Definition of Done
change; every edited skill's own prose and references; `skill-docs.json`
where a skill gains a docs section; decision records for D1–D12 via `oat
decision new` with the index regenerated; backlog items for deferred ideas.
Docs checks (`pnpm --filter oat-docs check`, markdownlint, `docs:skills:check`)
run in each docs-editing phase and `pnpm build:docs` in the final gate run.

### Probe and testing (success criteria)

For each new refusal: an otherwise valid case through the existing public
boundary, baseline acceptance recorded, post-change refusal for the named
reason, and a minimally different valid control; old completion and archive
behavior is tested rather than the absence of the new command. Compact
regression fixtures with captured archive provenance are kept in the test
tree; large generated probe artifacts live under scratch or ignored analysis
with exact commands, assertions and evidence locations recorded in the
journal. Each assurance guard is neutralized once to show its assertion fails.
Four fresh mode lifecycles (quick, lite, brief, goal) run implement with one
dispatched phase and one review round with a fix, explicit autonomous, cloud
and goal learning writes, summary refresh, retro consumption and complete;
supplemented by focused spec-driven and import grammar cases, revision fixes,
mixed terminal execution statuses, goal extraction and approved deferrals,
delivery refusal, disabled and legacy learning reads, log seals and
ambiguity, unchanged-byte completion refusal, and cross-date and
source-absent archive retries. The expected-red list is frozen before a phase
runs (test, obsolete contract, reason, owner, restoring phase); same-phase
pins move with their producers; no new runtime failure is whitelisted; the
project finishes with no expected reds and genuinely executed gates.

## Surface dispositions

| Surface                                                                                                                                                                                                   | Disposition                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `log/rollup.ts`, `log/grammar.ts`, `log/append.ts`, `log/check.ts`, config schema/resolver                                                                                                                | change (digest bound and projection, category/source/origin, idempotency, legacy learnings report) |
| `packages/control-plane/src/state/` shared record reader; `state/tasks.ts`                                                                                                                                | new reader; task progress consumes it                                                              |
| `project/journal-check/*`                                                                                                                                                                                 | new                                                                                                |
| `closeout-check`, `complete-state`                                                                                                                                                                        | consume the validator at their boundaries; write-nothing-on-refusal unchanged                      |
| `project/dispatch/record.ts`, `dispatch/index.ts`                                                                                                                                                         | `--format line`                                                                                    |
| `project/archive/archive-utils.ts`                                                                                                                                                                        | retry identity, generation authorization, manifest                                                 |
| `project/new/scaffold.ts`                                                                                                                                                                                 | regression check only                                                                              |
| templates: implementation, implementation-brief, project-log, summary                                                                                                                                     | change; registration conserved                                                                     |
| skills: implement references, review-receive, review-receive-remote, review-provide, revise, complete, summary, retro, autonomous, cursor-cloud-projects, goal, pr-progress, pr-final, brief contract §12 | change                                                                                             |
| docs, AGENTS.md, decision records, backlog                                                                                                                                                                | change, same phase                                                                                 |
| archives, S3 snapshots, sealed logs, artifact names                                                                                                                                                       | untouched (D1, D3)                                                                                 |

## Error Handling

Validator and archive guard fail closed with a reason code, path, line and
owner; `complete-state` writes nothing on refusal. The digest reports a
skipped malformed entry under `--json` and preserves the `ambiguous` refusal.
The learnings writer refuses an unknown category. A legacy learnings file is
reported, not migrated.

## Implementation Phases

Four sequential, integration-complete phases; phases 1–2 are not a parallel
group (shared CLI reference, shared summary and template contracts, and the
validator must not precede the writers it validates):

1. Log category/source/origin contract, idempotent append, bounded summary
   projection and the source-locator contract, with the affected summary,
   template and freshness consumers, config schema and docs.
2. Shared record reader, journal and run-line grammar, fixed slots and both
   journal templates, every writer skill moved together, validator
   integration at the three boundaries, overrides, closeout prose and
   refresh, and their docs.
3. Unified learning producers (autonomous, cloud, goal) and legacy readers
   (summary, retro), archive retry and generation identity, their docs.
4. Lifecycle probes per mode and the focused cases, final documentation
   audit, decision and backlog records, PR-scoped version bumps and the full
   gate run.

Bounded internals may be parallelized by the plan only after shared
interfaces are fixed and files, docs, tests, generated outputs and
integration ownership are assigned disjointly.

## Open Questions

Resolved in revision 2: boundaries and override codes for the validator,
digest bounds and locator, learnings identity and producers, run-line
grammar, archive retry contract, documentation inventory. Left to the plan:
the exact expected-red list and the per-phase gate commands.

## References

- `discovery.md` (D1–D13, success criteria); `references/astra-design-round-1.md`
- `.oat/repo/analysis/2026-10-11-archived-artifact-audit.md` and `…-sol-review.md` (machine-local)
- `packages/cli/src/commands/project/{log,archive,dispatch,closeout-check,complete-state}/`, `packages/control-plane/src/state/tasks.ts`, `packages/cli/scripts/bundle-inputs.mjs`
- `.agents/skills/oat-project-brief/references/brief-contract.md` §12
