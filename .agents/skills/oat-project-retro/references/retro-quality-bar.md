# Project Retro Quality Bar

## Evidence Standard

- Ground claims in project paths, log-entry themes, review findings, or session
  events.
- Distinguish confirmed causes, hypotheses, and inconclusive mechanisms.
- Prefer classification over blame and avoid generic praise.
- Keep evidence status to `used | unavailable`. When an evidence family is
  partial, split it into truthful source entries, such as
  `archived-review-markdown: unavailable` and `gate-receipts: used`. Do not add
  a `partial` evidence status. Derivative current-run reconnaissance
  transcripts are not original project-run evidence.
- Treat committed evidence as authoritative when transcript tool-result bodies
  are missing.
- Record rejected or superseded alternatives when they shaped the outcome.
- Make reflections specific to this run: what changed, why the result is
  trustworthy, and what future work should do differently.
- Make each material incident understandable without opening another artifact.
  Use stable evidence anchors such as project-log event IDs, artifact headings,
  review paths, decision IDs, and commit IDs. Anchors supplement but never
  replace explanation.

## Required Core Sections

Every rendered retro includes:

1. Executive Summary
2. Evidence and Review Method
3. Outcome Snapshot
4. Current State
5. What Went Well
6. Challenges and Struggles
7. Where We Changed Course
8. Repo Improvements (Promotion Register)
9. OAT Upstream Feedback (Upstream Register)
10. Reflections

The upstream section remains present with `No upstream feedback identified.`
when evidence warrants no items.

`Current State` is the narrowly bounded live-status surface. Derive it only
from register fields and frontmatter rollups. Apply and filing writeback may
refresh its contents, but headings, proposal bodies, and all other narrative
remain immutable after generation. Outside this section, qualify mutable status
as generation-time evidence; do not make unqualified claims that an item
"remains" proposed, filed, applied, or otherwise current.

## Conditional Sections

Include only when evidence supports meaningful content:

- Decision Register and Rejected or Superseded Alternatives
- New Architecture Patterns and Approaches
- Domain Learnings
- Gotchas for Humans
- Gotchas for Autonomous Agents
- Remaining Boundaries and Follow-Ups

Keep output concise by default. Every section must add distinct information.
Prefer references to evidence over repeated chronology. For a small project,
omit unsupported conditional sections and keep core sections brief. Use
subsections and tables only for evidence-rich projects where they improve
decisions. Do not add empty headings or `N/A` placeholders.

Section ownership prevents repeated chronology:

- `Challenges and Struggles` owns the complete incident narrative: what
  happened, impact, response, and result.
- `Where We Changed Course` records only the trigger, changed direction, and
  outcome.
- `Domain Learnings` abstracts reusable lessons without replaying chronology.
- `Gotchas for Humans` and `Gotchas for Autonomous Agents` contain
  future-facing instructions rather than incident summaries.

## Register Quality

- IDs are stable and sequential within the artifact (`RP-NN`, `UP-NN`).
- Every RP item has a valid Type, authoritative Disposition, disposition-valid
  Status, and required target field.
- Apply-items use `Target` and `Applied-ref`; file-items use `Destination`.
- `code-follow-up` defaults to `Disposition: file`.
- UP and publicly destined file-items carry a `Sanitized` field.
- Item prose is actionable: problem, evidence summary, and concrete direction.
- `oat_retro_promotions` derives only from RP apply-items.
- `oat_retro_filing` derives from UP items plus RP file-items.
- Each item contributes to exactly one rollup.
- `Current State` agrees with register fields and frontmatter rollups.

## Final Checks

- All evidence sources are marked `used` or `unavailable`.
- No unsupported transcript-only claim appears.
- Repo and upstream feedback are not conflated.
- Public-destination drafts contain no private URLs, hostnames, credentials,
  or verbatim sensitive logs.
- The rendered artifact has `oat_generated: true`, `oat_template: false`, and
  no `oat_template_name`.
- The artifact contains run-specific operational lessons, not a second project
  summary.
