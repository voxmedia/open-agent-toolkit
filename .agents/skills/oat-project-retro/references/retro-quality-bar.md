# Project Retro Quality Bar

## Evidence Standard

- Ground claims in project paths, log-entry themes, review findings, or session
  events.
- Distinguish confirmed causes, hypotheses, and inconclusive mechanisms.
- Prefer classification over blame and avoid generic praise.
- Treat committed evidence as authoritative when transcript tool-result bodies
  are missing.
- Record rejected or superseded alternatives when they shaped the outcome.
- Make reflections specific to this run: what changed, why the result is
  trustworthy, and what future work should do differently.

## Required Core Sections

Every rendered retro includes:

1. Executive Summary
2. Evidence and Review Method
3. Outcome Snapshot
4. What Went Well
5. Challenges and Struggles
6. Where We Changed Course
7. Repo Improvements (Promotion Register)
8. OAT Upstream Feedback (Upstream Register)
9. Reflections

The upstream section remains present with `No upstream feedback identified.`
when evidence warrants no items.

## Conditional Sections

Include only when evidence supports meaningful content:

- Decision Register and Rejected or Superseded Alternatives
- New Architecture Patterns and Approaches
- Domain Learnings
- Gotchas for Humans
- Gotchas for Autonomous Agents
- Remaining Boundaries and Follow-Ups

For small projects, omit unsupported conditional sections and keep each core
section brief. For large projects, use subsections and evidence tables where
they make distinct failure classes or decisions easier to review. Do not add
empty headings or `N/A` placeholders.

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
