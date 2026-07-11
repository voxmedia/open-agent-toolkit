# Recon: Archived Dispatch/Subagent Project History

> Recon briefing produced 2026-07-11 during quick-start discovery for the
> `oat-project-fixture` project. Read-only recon worker (gpt-5.6-terra-medium)
> over the five archived projects under `.oat/projects/archived/` in this
> worktree.

## backlog-lifecycle-hardening

- **Shipped:** Atomic `oat backlog archive` close-out, canonical status
  handling, five backlog-drift doctor checks, PJM scaffold/lifecycle guidance,
  instruction sync expanded to `.oat/repo/**`. Released 0.1.41.
- **Settled decisions:**
  - Backlog closure is command-owned and idempotent; status enum is
    `open | in_progress | closed | wont_do`.
  - Doctor owns enforcement of invalid lifecycle state; index regeneration
    warns rather than fails.
  - `oat pjm init` never writes `CLAUDE.md`; instruction-shim ownership stays
    with `oat instructions sync`.
  - Cross-runtime review is valuable: Codex caught a duplicate-ID archive
    defect missed by same-family reviews.
- **Residual:** derive `backlog_archived_open` non-terminal statuses from
  shared status helpers; keep the globally installed `oat` current (a stale
  binary produced a misleading `codex exec` gate failure).

## model-dispatch-improvements

- **Shipped:** Replaced ambiguous "no ceiling" with explicit managed capped
  policies, managed `Uncapped`, and `Inherit Host Defaults`; resolver output,
  skills, docs, generated provider views updated. Codex effort-pinned; Claude
  per-Task model selection with `fable` as Frontier.
- **Settled decisions:**
  - Missing policy is not `Uncapped`; managed uncapped requires explicit state.
  - `Inherit Host Defaults` means OAT supplies no model/effort controls.
  - Resolver owns preferred-target selection: capped is
    `min(preferred, cap)`; uncapped selects preferred.
  - Only capped managed policies receive deterministic reviewer targets;
    uncapped/inherit reviews use the base/no-target path.
  - Claude is model-axis-only; no synthetic Claude reasoning-effort matrix.
- **Residual:** Claude effort pins only if usage justifies; Frontier
  entitlement detection; GPT-5.6/Sol Codex mapping deferred pending concrete
  supported provider value.

## multi-family-dispatch

- **Shipped:** Sparse layered provider/tier matrices; producer
  identity/provenance stamps; model-family classification; Cursor
  model-argument routing; family-aware gate selection; ordered implementation
  routes; gate timeouts. Released 0.1.45.
- **Settled decisions:**
  - Parseable `Dispatch:` stamps are the boundary for producer identity,
    provenance, role, policy, target.
  - Gate selection defaults to avoiding the producer's model family; unknown
    producers preserve the prior same-runtime safety floor.
  - Provider-native validation oracles preferred over curated model catalogs.
  - Routes retain explicit `(harness, model, effort)` axes; cross-harness
    routes are advisory, never silently executed as same-harness
    substitutions.
  - Cursor model IDs are opaque configured values.
- **Residual:** Gates V2 same-target/model-preference deferred;
  producer-identity ergonomics and range-review semantics need work.

## codex-family-subagents

- **Shipped:** Deterministic materialization of canonical Codex agents for
  explicit model+effort targets (`oat providers codex materialize`);
  matrix-driven sync creates only needed managed roles; Cursor kept generic
  agents plus Task-level model arguments.
- **Settled decisions:**
  - Dispatch policy rungs are abstract; the matrix, not policy names, selects
    Sol/Terra/Luna targets.
  - Codex requires a complete model+effort target for deterministic managed
    dispatch.
  - Codex managed roles are generated from canonical agent definitions;
    materialization limited to explicit or matrix-referenced targets.
  - Cursor uses generic `.cursor/agents` and Task-level model arguments,
    validated for subagent eligibility rather than catalog membership.
  - `uncapped` remains OAT-managed preferred selection, distinct from inherit.
  - No default GPT-5.6 mapping shipped pending live verification.
- **Residual:** verify Cursor GPT-5.6 subagent slugs; consider
  reviewer-orchestrated exploratory subagents; add a reusable dispatch-machine
  schema/formatter; revisit Codex `max`/`ultra` after verifiable support.

## gate-review-provenance-target-safety

- **Shipped:** Gate reviews carry immutable configured target/invocation
  provenance; explicit `--project` and run/artifact corroboration failing
  closed on mismatch; phase-review-gate setup; ordered candidate ladders and
  ceilings; a 26-role Luna/Terra/Sol Codex catalogue; coordinator-led phase
  execution with serial exact task workers.
- **Settled decisions:**
  - Lifecycle gate commands are target-neutral by default; the gate dispatcher
    chooses an eligible independent configured target.
  - Configured invocation provenance is gate-owned and immutable;
    self-reported/observed identity cannot overwrite it.
  - Gate artifact, declared project, containing project, and run ID must
    corroborate before a pass.
  - Candidate ladders are configuration-owned; projects/phases name a maximum
    permitted tier rather than a provider target.
  - Managed tasks resolve one exact below-ceiling candidate; missing or
    above-ceiling targets fail closed.
  - Codex dispatch must use an exact registered role or an explicitly pinned
    fresh child; base-role fallback limited to inherit/default and documented
    uncapped-review behavior.
  - Phase coordinators own sequencing/integration; bounded task workers own
    one task and its commit.
- **Residual:** dispatch-machine schema/formatter deferred (now landed in
  dispatch-schema-matrix-infrastructure); matrix normalization/traversal
  consolidation deferred (same); Cursor catalog caching and GPT-5.6 string
  validation deferred.

## Cross-Project Timeline & Tensions

1. **Jul 5–6: backlog-lifecycle-hardening** — unrelated feature, but showed
   stale global binaries can invalidate conclusions about gate behavior.
2. **Jul 5–7: model-dispatch-improvements** — capped vs uncapped vs inherit
   semantics.
3. **Jul 6–8: multi-family-dispatch** — provider routing, producer provenance,
   Cursor support, family-diverse gates.
4. **Jul 8–9: codex-family-subagents** — generic Codex model+effort role
   materialization; deferred default GPT-5.6 mappings.
5. **Jul 10: gate-review-provenance-target-safety** — hardened gate
   provenance; exact roles/children; phase coordinator/task-worker execution.

Key tensions:

- `codex-family-subagents` deferred Sol/Terra/Luna mappings pending
  verification; the gate project then committed a 26-role catalogue — an
  intentional move to a registered supported-target set, still fail-closed.
- `model-dispatch-improvements` defined uncapped reviewers as
  no-target/base-role fallback; later work preserved that narrow exception
  while making managed dispatch exact-target-or-fail-closed.
- **The likely historical seam behind the current defect:** the gate project's
  exact-target/pinned-child rule must apply only where native subagent
  machinery cannot express the selection — it was never permission to replace
  ordinary native implementation dispatch with `codex exec`, `cursor-agent`,
  or `claude -p`.
- Recurring unresolved themes: shared dispatch-machine representation, Cursor
  model eligibility/catalog validation, provider entitlement verification, and
  separating declared provenance, observed identity, gate-review execution,
  and normal implementation execution.
