---
oat_status: in_progress
oat_ready_for: null
oat_blockers:
  - 'Discovery revalidation required: resume the brainstorm/design conversation before lightweight design and planning'
oat_last_updated: 2026-07-13
oat_generated: false
oat_template: false
oat_template_name: discovery
---

# Discovery: orchestration-run-log

> **Status note:** this discovery is seeded from a downstream operator's feature proposal and their follow-up answers, but has NOT been through a design conversation yet. Per the project owner's direction, pick this up by revalidating discovery through brainstorming, then produce a lightweight design before planning. Do not proceed straight to plan.

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

From a downstream operator's feedback packet (Stoa repo, full orchestrated OAT lifecycle run on oat CLI 0.1.55→0.1.59, 2026-07-13), item 7 — a feature request with its own detailed proposal document:

A first-class, opt-in, append-only per-project run log (working name `orchestration-log.md`) where lifecycle skills append structural entries automatically (dispatch stamps, gate envelope results, STOP/park events, bootstrap statuses, disposition maps) and agents add judgment entries under a documented taxonomy (`[project | general] · [bug | friction | worked-well | feedback]`); rolled up at completion into `summary.md` and an optional repo-level cross-project ledger before the archive seals the log away.

Source material (operator's packet, `~/Downloads/Orchestration Feedback/`):

- `02-run-log-feature-request.md` — full proposal: problem statement, quantified evidence, opt-in mechanics, entry classes, per-skill append table, end-of-run synthesis contract, roll-up-before-archive ordering, six open questions.
- `03-run-log-template.md` — suggested artifact format (contract-in-the-header, entry taxonomy, structural one-liner format, synthesis section shipping as visibly "pending").
- `reference/wave-0-orchestration-log.md` — the 222-line real-world exemplar (also archived at `/Users/tstang/Code/stoa/.oat/projects/archived/wave-0-execution/orchestration-log.md`).

## Problem Evidence (from the exemplar run)

- Orchestrated runs generate operationally valuable observations (tool bugs, contract mismatches, friction, worked-wells) that evaporate into chat scrollback or tribal memory.
- ROI from one project's ~220-line hand-rolled log: 1 upstream bug closure (natural retest with version context), 1 in-repo fix, 5+ upstream feedback items, 1 backlog item, 4 adopted process rules, and the evidence base for a keep/drop pilot verdict.
- Demonstrated failure mode of NOT being first-class: hand-rolled mid-run (no scaffold), skills didn't know to append (all structural entries were orchestrator-authored), and the log was sealed into the gitignored archive at completion — the durable essence survived only via manual roll-up into summary.md first.

## Proposed Design (operator input — treat as input, not spec)

- **Artifact:** `orchestration-log.md` scaffolded alongside `implementation.md`. Append-only; corrections via strike-through + note. Header carries the logging contract so any skill/agent touching the project inherits it.
- **Opt-in:** config `workflow.orchestrationLog: true | false | auto` (local > shared > user) + `--with-run-log` / `--no-run-log` scaffold overrides. Absent artifact = off; skills no-op gracefully.
- **Two entry classes:** structural (skills append mechanically — implement, gate review, review-receive, worktree-bootstrap-auto, quick-start/plan, complete) and judgment (agent-authored under the fixed taxonomy; version-stamp tool-related entries).
- **End-of-run synthesis as contract:** pilot verdict, adopted adjustments, graduated-entries ledger; missing synthesis = completion-gate warning when the log exists.
- **Roll-up before archive (critical ordering):** summary reads the log into a `## Workflow Observations` section; general/graduated entries append to a repo-level ledger; follow-ups graduate via `oat-pjm-add-backlog-item`; only then does complete/archive seal the log.
- **Formatting:** every appender runs the repo's format command on the log (inherits the `agent-artifact-hygiene-contract` project's contract).

## Operator Answers to the Proposal's Open Questions (2026-07-13)

1. **Machine-parseability:** keep pure markdown — it never hurt at one-project scale. The heading line is already a de facto grammar (`### YYYY-MM-DD · scope · type · area`); if aggregation tooling needs structure, **tighten the heading grammar** rather than adding per-entry YAML/HTML-comment metadata. Side metadata doubles authoring cost for every appending agent and will rot; a parseable heading keeps one source that's simultaneously the human format.
2. **Ledger ownership:** **OAT-owned convention, repo-configurable path.** The roll-up is performed by OAT lifecycle skills at completion; if the location is left to consuming-repo convention, skills can't reliably find it and cross-project aggregation — the whole point — silently dies. Default under the repo's OAT reference layer where one exists (`.oat/repo/reference/`), config-overridable path, warn-and-skip where there's no reference layer.
3. **Folding into implementation.md:** **strongly against** — the run's worst bookkeeping hazard was exactly duplicated/appended state going stale against canonical sections.
4. **Relationship to implementation.md run records (proposal Q6):** structural entries should **reference run records by path + anchor, never mirror them** — avoid a third copy of dispatch stamps.
5. **Auto trigger:** **dispatch-count (any subagent dispatch)** fits the evidence better than the parallel-groups proxy — the friction came from dispatch/gates/reviews, not from parallelism itself.
6. **Name:** no strong opinion.

## Key Decisions (provisional — confirm at revalidation)

1. **Pure-markdown entries with a tightened, parseable heading grammar** (operator answer 1).
2. **Repo-level ledger is OAT-owned with config-overridable path** (operator answer 2).
3. **Separate artifact; structural entries reference, never mirror** (operator answers 3–4).
4. **`auto` trigger keyed on subagent dispatch, not parallel groups** (operator answer 5).

## Constraints

- Scaffold/template changes, new config keys, and lifecycle-skill append steps all count as shipped functionality → lockstep five-package version bump + `pnpm release:validate`.
- Touches many surfaces: `oat project new` scaffold, config schema, `oat-project-implement`, `oat gate review` (CLI), `oat-project-review-receive`, `oat-worktree-bootstrap-auto`, `oat-project-quick-start`/`plan`, `oat-project-summary`, `oat-project-complete`. This breadth is why design comes first.
- Must preserve quick mode's minimal-ceremony contract (hence opt-in with `auto`).
- Roll-up-before-archive ordering is a hard requirement — the archive is typically gitignored.

## Success Criteria (provisional)

- Opted-in projects get a scaffolded log whose header contract is sufficient for any skill/agent to append correctly without external docs.
- Structural entries appear automatically from the integrated lifecycle skills; judgment entries follow the taxonomy.
- Completion performs the roll-up (summary section, ledger append, backlog graduation) strictly before archive seal; a missing synthesis on an existing log surfaces as a completion-gate warning.
- Non-opted-in projects see zero behavior change.

## Out of Scope (provisional)

- Cross-repo aggregation beyond the single repo-level ledger.
- Retroactive log generation for past projects.

## Open Questions (for the design pass)

- **Name:** `orchestration-log.md` vs `project-run-log.md` (operator indifferent; pick once, at design).
- **Size bounds:** cap structural verbosity (gate one-liners, not full envelopes; artifacts by path, never inlined) — how, concretely?
- **Heading grammar spec:** how tight, and does anything validate it (e.g. a lint in `oat project validate-*` or the completion gate)?
- **Structural-append ownership split:** which appends are CLI-side (`oat gate review` can append its own line) vs. skill-prose-side? CLI-side appends are more reliable but expand code scope.
- **Synthesis-warning mechanism:** where does the completion-gate warning live — `oat-project-complete` prose, or a CLI check?
- **Ledger dedup:** by entry date+area (proposal suggestion) — sufficient?

## Assumptions

- The `agent-artifact-hygiene-contract` project lands first (or concurrently), so appenders inherit the formatting contract rather than restating it.

## Risks

- **Scope creep across many skills:** the append-table touches most of the lifecycle.
  - **Likelihood:** Medium / **Impact:** Medium
  - **Mitigation Ideas:** design pass decides a minimal first-ship set of appenders (e.g. implement + gate + complete) with the rest as follow-up.
- **Stale-duplicate hazard** (the very hazard the operator warns about) if structural entries drift toward mirroring implementation.md.
  - **Likelihood:** Medium / **Impact:** Medium
  - **Mitigation Ideas:** reference-by-path+anchor rule stated in the header contract and enforced at design.

## Next Steps

**Revalidate discovery through a brainstorm/design conversation first** (project owner's explicit direction), then quick mode → lightweight design → plan. Run `oat-project-quick-start` only after revalidation.
