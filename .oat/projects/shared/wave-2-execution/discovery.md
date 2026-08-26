---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-08-26
oat_generated: false
---

# Discovery: wave-2-execution

## Initial Request

Execute Wave 2 ("Sync provenance warning") of the operator-approved 2026-08-19
execution program
(`.oat/repo/reference/external-plans/2026-08-19-execution-program.md`) as a
thin wrapper OAT project via `oat-wave-execute`. One lane, governed entirely by
its immutable external plan:

- `2026-08-19-warn-sync-version-skew.md` — surface sync producer/invoker
  version skew before mutation (`BL-260718-warn-when-oat-sync-uses`).

Wave 1 merged to `main` at `5bb2f914` (wave-close `1bd5424b`); this wave starts
from that baseline (public packages at 0.2.33).

## Inherited Contract (from `oat-wave-execute`)

- The wrapper never restates, narrows, or overrides the source plan; the wrapper
  adds ordering, wrapper-level DoD gates, review mapping, and bookkeeping.
- Source-plan STOP conditions are honored verbatim; a tripped STOP parks the
  lane.
- Reviewed history is append-only; every fix disposition stores a verification
  record; integration DoD gates run after fan-in before bookkeeping; configured
  cross-runtime gates run exactly as configured and `passed` is the only
  terminal gate-row state.

## Key Decisions

1. **Workflow mode: quick** — one S-sized lane with a complete external plan;
   the configured plan gate is the bundled pre-implementation artifact review.
2. **Solo lane, no parallel group** — a single ungrouped phase (`p01`) executed
   in the integration checkout's own worktree.
3. **Lockstep bump is part of the lane** — the plan's step 4 bumps all five
   public packages (0.2.33 → 0.2.34) together with `pnpm-lock.yaml`; W1's
   lesson (any `packages/cli/src/**` change is a publishable change) is
   pre-planned here rather than discovered at integration.
4. **Dispatch policy:** managed / `high` (Claude `opus`) for implementer and
   reviewers; Sonnet only for bounded read-only recon.
5. **Completion tail:** deferred to program close (`completion tail: deferred to
program close`; `recap: deferred to program close`).

## Rules adopted from Wave 1 (applied to this wave)

- Every root command uses absolute paths / `git -C`; no bare `cd`.
- Drift refresh intersects the lane's write surface with the release
  change-detection roots and states the planned bump up front.
- Implementer briefs invoke each gate literally and capture per-gate exit codes
  to log files; the root reads the logs.
- Reviewer briefs for ordering/containment claims require delete- and
  reorder-class mutations; reviewer-designed adversarial probes stay mandatory.
- A pre-child gate provider rejection is a boundary after one identical retry.
- Immutable explainer-kit packages are committed only with the formatter ignore
  in place (now in `.oxfmtrc.jsonc`).

## Constraints

- No force-push, no rewriting reviewed commits, no bypassing branch policy, no
  weakening tests or gates, no discarding unrelated work.
- Version skew stays advisory (no exit-code change); manifest schema and
  recovery behavior are out of scope per the plan.
- Do not absorb ReviewPlan work, plugin discovery, or unrelated features.

## Success Criteria

- The source plan's `## Done criteria` confirmed and recorded in
  `implementation.md`.
- Phase review, final review, and the configured implementation exit gate all
  `passed` with fresh evidence on the reviewed head.
- Full definition of done green on `wave-2-execution`; wave PR merged; program
  ledger W2 row closed with PR, merge SHA, and completion record.

## Out of Scope

- W3 and W4 (own wrapper projects); manifest schema changes; blocking on skew.

## Risks

- **Docs drift:** sync JSON envelope docs may need a note for the new optional
  field — handled at the `document` step.
- **Gate provider quota/outage:** mitigated by background gate dispatch with a
  receipt and the pre-child-rejection boundary rule.

## Next Steps

Quick mode → `plan.md` (wrapper plan) → configured plan gate →
`oat-project-implement`.
