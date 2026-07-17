---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-17
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

## Open Questions (for discovery/spec)

1. **Pack placement:** workflows pack (lifecycle-adjacent, like the project
   skills) vs a new pack? The packet assumes workflows; confirm against pack
   conventions.
2. **CLI-absorption sequencing:** which §3 rows land IN this project vs
   deferred-with-owner? The wave command family (`oat wave …`) is the
   largest; a defensible v1 is "skills ported as-is + 1.4.1/1.5.0 queue,
   absorption deferred to follow-ups" — decide explicitly.
3. **Genericization surface:** which parts of the SKILL.md rule text are
   stoa-specific (fixture exclusions, `pnpm` DoD commands, `.codex` view
   paths) and how are they parameterized (repo config? conventions doc
   reference?).
4. **Validation harness:** the packet suggests a fixture-repo mini-wave
   dry-run before the real stoa W6 validation — what is the minimal honest
   fixture (a tiny repo with 2-3 toy plans)?
5. **Naming:** do the skills keep their names on promotion, and does
   `oat-wave-program`'s artifact format become a documented OAT contract?

## Out of scope

- Running stoa's wave 6 (happens in the stoa repo, on the promoted skills —
  it is this project's acceptance evidence, not its work).
- Root-causing `BL-260715-investigate-oat-config-json` (tracked in stoa;
  §3 notes a possible CLI-level tracked-config guard as an absorption idea).
- explainer-kit v1 itself (separate project in this repo).
