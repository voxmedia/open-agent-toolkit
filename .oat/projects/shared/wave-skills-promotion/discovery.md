---
oat_status: complete
oat_ready_for: oat-project-design
oat_blockers: []
oat_last_updated: 2026-07-18
oat_generated: false
---

# Discovery: wave-skills-promotion

## Initial Request

Upstream the stoa repo's dogfooded wave-orchestration skills —
`oat-wave-execute` 1.4.0 and `oat-wave-program` 1.0.0 — into the OAT
toolkit, applying the queued change backlog and dispositioning the
CLI-absorption list. The skills executed a six-PR, 48-plan program (waves
0–5, 2026-07-12→16) in the stoa repo; every standing rule they carry is
evidence-cited from that run. This project starts from a complete handover:
`references/2026-07-17-wave-skills-promotion-packet.md` is the authoritative
scope document — read it first; this discovery only frames what the packet
does not.

## Source material (all under `references/`)

- `2026-07-17-wave-skills-promotion-packet.md` — asset inventory, queued
  1.4.1/1.5.0/unversioned changes (§2), CLI-absorption table (§3), RC-gated
  explainer-kit integration scope (§4), suggested shape (§5), success
  criteria (§6).
- `2026-07-17-program-retrospective.md` — the narrative of what the pattern
  proved and what cost real time.
- `2026-07-17-wave-signal-ledger.md` — every Skill-signal across six waves
  with its ruling; the rule-evolution history mapped to version bumps; the
  full upstream-feedback status table.
- `skill-sources/oat-wave-execute/` + `skill-sources/oat-wave-program/` —
  verbatim copies at 1.4.0 / 1.0.0 (canonical source of truth remains the
  stoa repo until promotion ships).
- Worked example at full scale: stoa's execution-program artifact + six wave
  summaries + archived wave projects (S3 bucket
  `tkstang-open-agent-toolkit/repositories/stoa/projects/`).

## What the skills are (one paragraph each)

`oat-wave-execute` runs one wave of an external-plan program as a wrapper
OAT project: worktree bootstrap, wave-boundary drift refresh, wrapper
scaffold from bundled templates, brief/gate-prompt templates, merge
choreography with a conflict-resolution contract, verified bookkeeping
edits, and a strict closeout sequence. It deliberately owns only the
MECHANICAL layer; group composition, review dispositions, synthesis, and
user checkpoints stay with the orchestrating agent — this split is the
load-bearing design finding of the whole program.

`oat-wave-program` owns the durable execution-program artifact over a plan
corpus: `new` (compose waves with a mechanically-verified coverage
invariant), `refresh` (fold follow-up plans in at wave boundaries), and
`wave-close` (record merges, flip ledger rows). Proven session-loss-resilient:
a wave was composed entirely from the durable artifacts after context loss.

## Constraints

- **Zero-regression bar:** the promoted skills must run stoa's wave 6 with
  no behavioral regressions vs 1.4.0 + the §2 queue. Stoa is the reference
  consumer; its repo-local copies stay authoritative until promotion ships
  and stoa migrates to the packaged versions.
- **The signal-ledger discipline survives promotion:** orchestration-log
  contract + end-of-run synthesis requirement are part of the skills'
  identity — they produced every improvement in the ledger.
- **§2 queue items ship or are rejected with rationale** — none silently
  dropped. §3 CLI-absorption rows are adopt/defer decisions, not mandates.
- **§4 explainer integration is RC-gated:** build only against the packaged
  explainer-kit v1 RC (its project runs in this repo —
  `.oat/projects/shared/explainer-kit`); coordinate merge order with its
  Phase 3, which touches the same lifecycle skills.
- Skills must be genericized where stoa-isms leak (e.g. DoD command names,
  fixture-tree lint rules cited in rule text) — the rules' INTENT is
  general; parameterize per-repo specifics rather than deleting the rules.

## Key Decisions (operator-resolved 2026-07-17)

All five open questions plus the §4 shape were resolved with the operator
in the discovery session:

1. **Pack placement → workflow pack.** The wave skills land in the existing
   workflow pack alongside the lifecycle skills they invoke
   (`oat-project-implement`, `oat-worktree-bootstrap-auto`). No new pack, no
   new installer surface.
2. **CLI absorption → defer the big rows; do the cheap rows here.**
   - Row 1 (wave command family `oat wave new/refresh/close`): **deferred**
     — becomes an owned follow-up backlog item. Rationale: largest lift; new
     public CLI surface (lockstep version bumps, help parity) would double
     what stoa's W6 must validate against the zero-regression bar; needs the
     artifact format frozen first.
   - Row 2 (singleton-group semantics in validate-plan help): **in scope**
     — docs/help change to an existing command, essentially free.
   - Row 3 (`oat worktree bootstrap-group`): **deferred** — owned follow-up
     backlog item. The proven bash script ports as-is; the queued 1.5.0
     view-parity check is applied to the script, not to a rewrite.
   - Row 4 (reviews-row stomp): **deferred post-W6** — the "one more clean
     observation" that closes it IS stoa's W6; the promoted skill keeps the
     step-6.5 restore-watch.
   - Row 5 (config-integrity guard): **deferred with owner** — root cause
     is open and operator-owned (BL-260715); a guard now would mask the bug.
   - Row 6 (still-open upstream feedback triage): **in scope** — file/confirm
     the four items (configurable gate timeout, runbook verify-commands,
     `--scope all` drift, resolver flag conflict) as backlog items here.
3. **Genericization → neutral phrasing + repo-conventions reference.** Rule
   text refers to "the repo's DoD gates / formatter / env setup" rather than
   stoa's literal commands; stoa specifics survive as cited evidence
   examples. No new config schema, no install-time placeholders.
4. **Validation fixture → in-repo.** A tiny fixture repo in this monorepo's
   test area with 2–3 toy plans + a plan index; the mini-wave dry-run
   exercises program-new coverage invariant, one 2-lane group + 1 ungrouped
   lane, merge choreography, and wave-close — before stoa W6.
5. **Naming → keep `oat-wave-execute` / `oat-wave-program`.** "Wave" is its
   own domain (waves orchestrate ABOVE per-project lifecycle — each wave
   creates a wrapper project), matching the `oat-<domain>-<action>`
   convention and any future `oat wave` CLI noun. `oat-project-wave-*` was
   considered and rejected as a scope mismatch. Stoa migration is not a
   concern (it replaces its repo-local copies wholesale).
   **Artifact format → descriptive skill docs only** for now; "stable OAT
   contract" status is a **required backlog item** explicitly noted to be
   grouped with the deferred wave-CLI work (a second consumer is the
   trigger).
6. **§4 explainer integration → RC-gated final phase in THIS project** (not
   split out). Blocks on the packaged explainer-kit v1 RC; merge order is
   coordinated with that project's Phase 3 when the RC exists. Note: the
   explainer-kit project directory is not visible in this worktree —
   resolve its location/RC delivery channel during spec/design.

## Open Questions (remaining for spec)

- Where the explainer-kit RC is published/consumed from (its project dir is
  not in this worktree's `.oat/projects/shared/`).
- Exact placement + shape of the in-repo validation fixture (design-level).

## Success Criteria

Packet §6, restated against the resolved decisions:

- Promoted skills (workflow pack) run stoa's wave 6 with zero regressions
  vs 1.4.0 behavior + the §2 queue applied.
- Every §2 queued item shipped or explicitly rejected with written
  rationale — none silently dropped.
- Every §3 row dispositioned per decision 2 above: rows 2 + 6 done in this
  project; rows 1, 3, 4, 5 deferred with named owner/trigger as backlog
  items.
- §4 lands against the frozen explainer-kit RC with the personal-wrapper
  E2E green (final, gated phase).
- The signal-ledger discipline survives: promoted skills keep the
  orchestration-log contract and end-of-run synthesis requirement.
- The mini-wave fixture dry-run passes before stoa W6 is attempted.
- OAT repo release conventions honored: canonical skills under
  `.agents/skills/` with frontmatter version bumps, lockstep public package
  bumps (bundled assets count as shipped CLI functionality),
  `pnpm release:validate` green.

## Deferred Ideas (follow-up backlog items to file during this project)

- `oat wave new/refresh/close` CLI family (absorb `oat-wave-program`
  mechanics; grouped with the artifact-format-contract item).
- Execution-program artifact format as a documented stable OAT contract
  (explicitly grouped with the wave-CLI item; trigger = second consumer).
- `oat worktree bootstrap-group` CLI command (TypeScript rewrite of
  `bootstrap-group.sh`).
- Post-W6: delete skill step 6.5 reviews-row restore-watch once W6 provides
  the confirming clean observation.
- CLI-level tracked-config guard — blocked on BL-260715 root cause
  (operator-owned, stoa repo).

## Out of scope

- Running stoa's wave 6 (happens in the stoa repo, on the promoted skills —
  it is this project's acceptance evidence, not its work).
- Root-causing `BL-260715-investigate-oat-config-json` (tracked in stoa;
  §3 notes a possible CLI-level tracked-config guard as an absorption idea).
- explainer-kit v1 itself (separate project in this repo).
