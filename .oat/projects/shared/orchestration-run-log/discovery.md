---
oat_status: complete
oat_ready_for: oat-project-quick-start
oat_blockers: []
oat_last_updated: 2026-07-13
oat_generated: false
oat_template: false
oat_template_name: discovery
---

# Discovery: orchestration-run-log

> **Status note:** discovery was revalidated through a brainstorm/design conversation with the operator on 2026-07-13. All major design questions are resolved below. Next step: **lightweight design** (the operator's required step for this project) covering the helper CLI surface, template, and skill integration details — then plan.

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

## Initial Request

From a downstream operator's feedback packet (Stoa repo, full orchestrated OAT lifecycle runs on oat CLI 0.1.55→0.1.59, 2026-07-13), item 7 — a feature request with its own detailed proposal document:

A first-class, opt-in, append-only per-project run log where lifecycle skills append structural entries automatically (dispatch stamps, gate envelope results, STOP/park events, bootstrap statuses, disposition maps) and agents add judgment entries under a documented taxonomy; rolled up at completion into `summary.md` and a repo-level cross-project ledger before the archive seals the log away.

Source material (operator's packet, `~/Downloads/Orchestration Feedback/`):

- `02-run-log-feature-request.md` — full proposal: problem statement, quantified evidence, opt-in mechanics, entry classes, per-skill append table, end-of-run synthesis contract, roll-up-before-archive ordering, six open questions.
- `03-run-log-template.md` — suggested artifact format (contract-in-the-header, entry taxonomy, structural one-liner format, synthesis section shipping as visibly "pending").
- `reference/wave-0-orchestration-log.md` — the 222-line real-world exemplar (also archived at `/Users/tstang/Code/stoa/.oat/projects/archived/wave-0-execution/orchestration-log.md`).

## Problem Evidence (from the exemplar run)

- Orchestrated runs generate operationally valuable observations (tool bugs, contract mismatches, friction, worked-wells) that evaporate into chat scrollback or tribal memory.
- ROI from one project's ~220-line hand-rolled log: 1 upstream bug closure (natural retest with version context), 1 in-repo fix, 5+ upstream feedback items, 1 backlog item, 4 adopted process rules, and the evidence base for a keep/drop pilot verdict.
- Demonstrated failure mode of NOT being first-class: hand-rolled mid-run (no scaffold), skills didn't know to append (all structural entries were orchestrator-authored), and the log was sealed into the gitignored archive at completion — the durable essence survived only via manual roll-up into summary.md first.
- Notably, several of the exemplar's highest-value entries were not orchestration-specific (pre-commit hook behavior, CLI ergonomics, an MCP schema gotcha, a turbo-cache quirk) — evidence for the general framing chosen below.

## Solution Space

### Chosen Direction (confirmed with operator, 2026-07-13)

**A general-purpose project log with orchestration-first integrations.** The artifact is `project-log.md` — a general log for anything that breaks, surprises, requires a workaround, or works notably well during a project — not an orchestration-specific log. v1 wires the appends at orchestration points (where expected value is highest), and coverage widens from there. Rationale: the taxonomy is not orchestration-specific, the exemplar's best entries weren't either, and an orchestration-specific name would suppress general observations. This is a deliberate broadening of the original proposal's framing; nothing in the operator's answers conflicts with it (their `[project | general]` scope axis anticipates it), and the operator confirmed it directly.

## Key Decisions (all confirmed with operator, 2026-07-13)

1. **Artifact:** `project-log.md`, scaffolded alongside `implementation.md`. Append-only; corrections by strike-through + note. Header carries the logging contract. General-purpose content; orchestration-first integrations.
2. **Append mechanism — CLI helper:** a `oat project log` command group owns all writes. `oat project log append` takes flag-structured input (entry kind, `--scope project|general`, `--type bug|friction|worked-well|feedback`, `--area`, body) and owns: artifact-exists/config check (silent no-op when off), create-on-first-append (under `auto`), heading composition, append-only discipline, and formatting. Skills call it via one-line prose instructions; `oat gate review` calls it internally from code.
3. **Self-teaching help:** the helper's `--help` text carries the entry contract — what each flag means, what belongs in each field, log-worthiness triggers, "evidence not narrative," `worked-well` as the do-not-regress evidence base, 1–3 sentence guidance, reference-artifacts-by-path. Agents verify contracts against live `--help`; the contract lives at the point of use.
4. **Entry format:** pure markdown; the heading line (`### YYYY-MM-DD · [project | general] · [bug | friction | worked-well | feedback] · <area>`) is the machine-parseable grammar. No per-entry YAML/HTML-comment metadata (doubles authoring cost and rots — operator). Grammar is guaranteed by construction for helper-written entries (composed from validated flags); `oat project log check` validates hand-written entries.
5. **Config:** `workflow.projectLog: true | false | auto` (local > shared > user), **default `auto`**. `auto` = create-on-first-append: the log comes into existence the first time an OAT lifecycle append point fires (in practice, the first subagent dispatch). `true`/`--with-run-log` scaffold it up front; `false`/`--no-run-log` make the helper a silent no-op. Trigger coverage equals appender coverage and widens with the fast-follows. (Operator's dispatch-count answer, reconciled with their earlier default-off note, resolved to `auto`.)
6. **v1 appender scope — core trio + roll-up:** `oat-project-implement` (dispatch stamps, STOP/park events, phase outcomes), `oat gate review` (one line per run: target, threshold, findings counts, exit, status, artifact path — internal call), and the completion path (`oat-project-summary` roll-up + `oat-project-complete` seal). Fast-follows: review-receive disposition maps, worktree-bootstrap status lines, quick-start/plan gate results, and root-agent judgment logging (`BL-260713-root-agent-judgment-logging`).
7. **Separation from implementation.md:** separate artifact; structural entries reference implementation.md run records by path + anchor, never mirror them (stale-duplicate hazard was the exemplar run's worst bookkeeping failure — operator, strongly held).
8. **Roll-up before archive (hard ordering):** `oat-project-summary` reads the log into a `## Workflow Observations` section of summary.md; general/graduated entries append to the repo-level ledger; follow-ups graduate via `oat-pjm-add-backlog-item`; only then does complete/archive seal the log.
9. **Ledger:** OAT-owned convention, repo-configurable path. Default `.oat/repo/reference/` where a reference layer exists; config-overridable; warn-and-skip where none. (If left to consuming-repo convention, skills can't find it and aggregation silently dies — operator.)
10. **Synthesis enforcement:** `oat project log check` reports log existence, pending-synthesis state, and entry counts. `oat-project-complete` calls it before archive and surfaces a **warning** (not a hard block) when synthesis is pending. Summary uses the same check to know there's something to roll up.
11. **Size bounds:** structural entries are one-liners referencing artifacts by path; judgment entries 1–3 sentences; no hard caps in v1 (`check` may warn on inlined blocks).
12. **Ledger dedup:** by entry date + area at roll-up; revisit if cross-project volume demands more.
13. **Formatting:** every appender path runs the repo's format command on the log (inherits the `agent-artifact-hygiene-contract` project's contract; the helper can do this mechanically).

## Constraints

- Scaffold/template changes, the new config key, the new CLI command group, and lifecycle-skill append steps all count as shipped functionality → lockstep five-package version bump + `pnpm release:validate`; changed canonical skills get frontmatter version bumps.
- Touched surfaces in v1: `oat project new` scaffold + template, config schema, new `oat project log` command group, `oat-project-implement`, `oat gate review` (CLI), `oat-project-summary`, `oat-project-complete`.
- Must preserve quick mode's minimal-ceremony contract (`auto` + create-on-first-append achieves this: no dispatch → no log).
- Roll-up-before-archive ordering is a hard requirement — the archive is typically gitignored.

## Success Criteria

- Projects that dispatch subagents get a `project-log.md` automatically (under default `auto`) with a header contract sufficient for any agent to append correctly; single-context projects see zero ceremony.
- Structural entries appear automatically from the v1 trio; the helper's `--help` teaches the judgment-entry contract; taxonomy and grammar are enforced by flag validation.
- Completion performs the roll-up (summary section, ledger append, backlog graduation) strictly before archive seal; a pending synthesis on an existing log surfaces as a completion warning via `oat project log check`.
- Non-opted-in projects and repos see zero behavior change.

## Out of Scope

- v1 appends beyond the core trio (fast-follows tracked, incl. `BL-260713-root-agent-judgment-logging`).
- Cross-repo aggregation beyond the single repo-level ledger.
- Retroactive log generation for past projects.
- Renaming this project's slug (`orchestration-run-log`) to match the generalized artifact name — bookkeeping churn with no payoff.

## Deferred Ideas

- Root-agent judgment-logging responsibility → `BL-260713-root-agent-judgment-logging` (backlog, linked).
- Remaining structural appenders (review-receive, worktree-bootstrap-auto, quick-start/plan) — fast-follow after v1 proves the pattern.
- Hard size caps / `check` lint rules for inlined content — only if v1 logs bloat in practice.

## Open Questions (for lightweight design)

- Exact `oat project log append` flag surface for structural vs judgment entries (one subcommand with `--kind`, or `append` vs a structural-specific form).
- `check` output shape (JSON envelope consistent with other oat commands?) and precise warning wording in complete.
- Template final text: header contract wording for the general framing + synthesis section.
- Where the ledger path config key lives (`workflow.projectLogLedgerPath`?) and its interaction with repos lacking `.oat/repo/reference/`.

## Assumptions

- The `agent-artifact-hygiene-contract` project lands first (or concurrently), so appenders inherit the formatting contract; the helper formats mechanically regardless.

## Risks

- **Scope creep across many skills:** mitigated — v1 fixed to the core trio + roll-up; everything else is backlog/fast-follow.
- **Stale-duplicate hazard** if structural entries drift toward mirroring implementation.md: mitigated by the reference-by-path+anchor rule in the header contract and helper help text.
- **Diary-fication of the general log:** mitigated by taxonomy enforcement in the helper, 1–3 sentence contract, and the graduation flow moving durable items out to backlog/decisions.

## Next Steps

Quick mode → **lightweight design** (required per operator direction): helper CLI surface, template text, config key details, and the three skill integration diffs — then plan. Run `oat-project-quick-start` to continue.
