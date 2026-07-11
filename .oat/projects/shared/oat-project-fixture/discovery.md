---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-11
oat_generated: false
---

# Discovery: oat-project-fixture

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

Backlog item `BL-260711-add-live-workflow-smoke` (imported into this
worktree's backlog): add an opt-in, disposable live-provider smoke workflow
that exercises real OAT project execution end to end — a version-controlled
fixture project with two short phases of three deterministic log-append tasks
each, run through the normal lifecycle (exact task-worker dispatch, phase
reviews, final gate) against real authenticated providers, leaving the user's
OAT config and the source repository unchanged, then summarizing recorded
dispatch and gate evidence.

Motivation: recent workflow changes shipped without dogfooding and created a
tangled situation. Several simultaneous change streams — GPT-5.6 sol/terra/luna
family dispatch, Cursor subagent support, phase-coordinator orchestration, and
gate provenance hardening — interacted badly. The core defect: gate-reviewer
provenance requirements were conflated with implementation dispatch, causing
`codex exec` / `cursor-agent` / `claude -p` to be used for regular
implementation when native subagent tools should be used. The fixture gives a
cheap, safe acceptance surface so workflow/gate/dispatch changes can be
verified without burning tokens on (or breaking) real projects.

**Scope expansion agreed during discovery:** beyond fixture/smoke capability,
this project also lands a working subagent orchestration model across all
three harnesses (Codex, Cursor, Claude), and runs the live smoke workflow from
this worktree with each harness, recording evidence.

## Session Recon (see references/)

Deep recon was performed during discovery; findings are durable reference
artifacts rather than inline discovery content:

- `references/recon-codex-subagent-max-depth.md` — in-flight sibling project:
  native depth-2 topology validated; feature code unintegrated in child
  worktrees; state discrepancies; merge risks.
- `references/recon-dispatch-schema-matrix-infrastructure.md` — in-flight
  sibling project: dispatch matrix/report infrastructure complete except one
  blocking p06 review finding; contains a user-authorized temporary
  phase-direct workaround (not the intended topology).
- `references/recon-archived-dispatch-projects.md` — the five completed
  projects that built current dispatch/gate semantics, their settled
  decisions, and the historical seam behind the conflation defect.
- `references/subagent-catalog-and-selection-findings.md` — live session
  evidence on Cursor catalogs (native Task vs CLI vs UI), inheritance,
  the accepted exact Task-model positive control, family ordering
  (sol > terra > luna), and the converged dispatch-selection contract.

## Solution Space

Well-trodden by the backlog item and session discussion; a single direction
was validated rather than multiple competing approaches:

**Chosen direction:** a version-controlled fixture project template +
documented opt-in smoke runner that executes the normal OAT lifecycle against
real providers from a disposable worktree, with launcher-owned dispatch/gate
evidence as the acceptance surface. Alternatives (unit tests only, dogfooding
real projects) are what this project explicitly replaces as the verification
mechanism for cross-cutting workflow changes.

**User validated:** Yes (backlog item + session discussion).

## Key Decisions

1. **Fixture shape:** two phases × three explicit tasks with stable IDs; every
   task makes a bounded, deterministic append to a fixture log. Trivial
   implementation, real orchestration.
2. **Opt-in smoke runner:** executes the normal project lifecycle with real
   authenticated provider runtimes — exact task-worker dispatch, configured
   phase reviews, final lifecycle gate. Never modifies the source repo or the
   user's persisted OAT config. Documented as manual/release-validation smoke,
   not default CI.
3. **Cross-harness orchestration model (expanded scope):** the project lands a
   working native-first subagent orchestration model on Codex, Cursor, and
   Claude: root agents orchestrate phases/tasks with native subagent tools;
   nested native dispatch (phase coordinator → task workers) is the intended
   topology; provenance/exact-target pinning is a gate/review concern, not an
   implementation-dispatch requirement.
4. **Dispatch-selection contract** (full statement in
   `references/subagent-catalog-and-selection-findings.md`):
   - A named ceiling is a budget maximum, not a model selection.
   - The coordinator selects per task with full information (ceiling ∩
     configured ladder ∩ its harness-native catalog); no pick-then-miss.
   - Provider-CLI dispatch for a task is a deliberate pre-start selection
     recorded with reason when no native candidate satisfies — never a
     mid-flight fallback after an accepted/ambiguous native attempt.
   - Downward capability substitution never happens; task workers must not
     silently inherit an expensive root model.
   - Acceptable degradation: phase coordinator may inherit from root when its
     preferred tier is not natively pinnable.
5. **Fallback discipline (adopted from max-depth learnings):** external pinned
   children only on explicit pre-start native role-selection rejection;
   accepted-child outcomes (including `BLOCKED`) are terminal; missing
   self-report is never an availability signal.
6. **Live smoke evidence per harness:** run the smoke workflow from this
   worktree on each of Codex, Cursor, and Claude; record dispatch and gate
   evidence per the three-layer model (policy resolution / launcher-owned
   configured invocation / runtime-observed identity, with runtime identity
   allowed to be `not-reported`).
7. **Recon durability:** session recon lives in `references/`, keeping
   discovery lean while preserving merge-order analysis and evidence.
8. **Cursor is two harness flavors:** the IDE harness and the `cursor-agent`
   CLI behave differently (live-verified: exact Task pinning accepted in IDE;
   headless probes observed zero Task events even for controls). Smoke runs
   and evidence treat them as separate targets.
9. **Documentation deliverable:** the project ships high-quality OAT docs on
   orchestration/subagents/programmatic execution, including mermaid diagrams
   (topology, dispatch selection, evidence layers, smoke flow).
10. **Durable knowledge capture (Vault):** findings are mirrored into the
    user's Vault — `04 - Resources/Programmatic Agent Execution/Harnesses/`
    (per-harness dossiers created 2026-07-11) and
    `02 - Projects/Programmatic Cursor/` (change-log entry). A closing pass at
    project end adds smoke evidence learnings and selected mermaid diagrams.

## Constraints

- Extend, do not reimplement, what the two in-flight sibling projects ship
  (dispatch matrix/walker/report; max-depth merge floor). Their merge order —
  `dispatch-schema-matrix-infrastructure` first (after its p06 fix), then
  `codex-subagent-max-depth` rebased with contract-level skill reconciliation
  — is analyzed in `references/`.
- The smoke runner must consume real provider auth available on the local
  machine and preflight readiness clearly, exiting without starting a partial
  workflow when a runtime/target is unavailable.
- Cleanup must handle interrupted runs without deleting unrelated worktrees or
  project artifacts.
- The standard fixture must exercise a lower exact candidate beneath a higher
  named project ceiling, including a Cursor opaque model argument when Cursor
  is available.
- Cross-harness consistency: uniform selection semantics with harness-specific
  resolution; avoid divergent mechanisms per harness where possible.
- Repo release discipline applies (skill version bumps, lockstep public
  package bumps, `pnpm release:validate`) if shipped functionality changes.

## Success Criteria

- A version-controlled fixture can be copied into a disposable worktree; two
  phases with three stable task IDs each; bounded deterministic task outcomes.
- An opt-in smoke command or documented runner executes the normal lifecycle
  against real providers without mutating the source repo or persisted config.
- Fixture config and report prove: phase/task dispatch, exact selected
  provider model or Codex role, phase review execution, final gate execution,
  declared review project, and recorded invocation/producer provenance.
- The smoke run demonstrates the dispatch-selection contract, including a
  below-ceiling exact candidate and (when Cursor is available) an opaque
  Cursor model argument.
- Live smoke evidence recorded from this worktree for each harness target:
  Codex, Cursor IDE, Cursor CLI, Claude — demonstrating the native-first
  orchestration model (nested native dispatch where the harness supports it)
  and recording each harness's sanctioned topology.
- OAT documentation updated with an orchestration/subagents/programmatic
  execution section including mermaid diagrams; selected diagrams mirrored to
  the Vault.
- Vault capture passes completed at project start (done 2026-07-11) and
  project end.
- Preflight reports unavailable runtimes/targets and exits cleanly; cleanup is
  safe for interrupted runs.
- Runner documented as manual/release-validation smoke, not default CI.

## Out of Scope

- Root-owned dispatch broker (tracked as
  `BL-260711-add-root-owned-dispatch-broker`).
- Completing/merging the two in-flight sibling projects (their own lifecycle);
  this project documents merge-order analysis and provides the acceptance
  surface they can be verified against.
- Host-generated runtime attestations (additive future work; absence of
  runtime identity must not invalidate accepted launches).
- Default-CI integration of the smoke workflow.

## Deferred Ideas

- Cursor UI-configurable native subagent catalog (the settings "Edit"
  affordance) as a way to close the native tier-fidelity gap — verify before
  relying on it.
- Reviewer-orchestrated exploratory subagents (carried from
  codex-family-subagents residuals).

## Open Questions

- **Sibling sequencing:** can live smoke runs land before the two sibling
  branches merge (running against this worktree's local binary), or do some
  scenarios require their merged behavior? Likely answer: run against local
  binary now, re-verify after merges; confirm during planning.
- **Claude nesting:** does Claude's native subagent mechanism support
  coordinator → task-worker nesting, and if not, what is the sanctioned
  Claude topology for the smoke run?
- **Cursor native catalog authority:** how should the smoke evidence record
  the coordinator-read native catalog (it is not externally enumerable)?
- **Codex sandbox write surfaces:** the smoke fixture should exercise the
  scoped-writable-roots remedy (shared Git metadata, `.agents`) validated by
  max-depth — confirm how the runner provisions those roots per provider.

## Assumptions

- Local provider auth exists for Codex, Cursor, and Claude on this machine.
- The local `oat` binary built from this worktree is the executable under
  test; a stale global binary must not silently shadow it (prior incident in
  backlog-lifecycle-hardening).
- This session's accepted exact Task launches generalize to Cursor IDE-harness
  smoke runs (configured-invocation level only).

## Risks

- **Provider cost/flakiness of live runs:** Likelihood: Medium. Impact:
  Medium. Mitigation: trivial task bodies, bounded timeouts, per-harness
  opt-in, evidence capture even on partial failure.
- **In-flight merges change dispatch contracts mid-project:** Likelihood:
  Medium. Impact: High. Mitigation: merge-order analysis in `references/`;
  re-run smoke after each sibling merge; treat smoke as their acceptance
  gate.
- **Harness catalog drift (Cursor curated slugs change):** Likelihood: Medium.
  Impact: Low-Medium. Mitigation: coordinator reads its catalog at dispatch
  time; evidence records candidates considered.

## Next Steps

Quick mode with architecture decisions surfaced → lightweight design is
recommended before plan generation.
