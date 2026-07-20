# W6 Recap-Path Defect Handoff — explainer-kit + wave-promotion (2026-07-20)

From the stoa-side orchestrator (operator-directed). Supplements
`w6-acceptance-report-2026-07-20.md`. Audience: BOTH the wave-promotion agent
(recap caller integration, p06) and the explainer-kit agent (core defects).
Evidence source: the first live unattended `project-recap` run,
run-19af6e55, stoa project wave-6-execution (archived at
`.oat/projects/archived/wave-6-execution/explainers/wave-6-execution-recap/`
in the stoa repo + S3).

## Defect 1 (core, validator/manifest): incomplete `immutableHashes` coverage

- The run's `manifest.json` hashes 5 files (fact-base .json/.md, content md,
  theme.resolved.json, `site/initiatives/<slug>/index.html` — path is
  CORRECT) but omits `run-request.json` and `source/content-approval.json`.
- `oat project archive --project-recap-run` fails closed:
  "Selected project recap manifest immutable hashes do not cover the
  complete v1 package." So no recap can currently survive lifecycle
  completion into the tracked export root.
- Fix: core hashes every immutable run file (run-request, content-approval),
  or the validator's coverage set matches what the core records. Both sides
  currently disagree; pick one contract.

## Defect 2 (core, design gap): unattended recap has no content-authoring seam — SEVERITY: HIGH

- The unattended lifecycle run federated the approved OAT artifacts and
  emitted their RAW TEXT as the deck's content: implementation.md pasted
  verbatim into "Original Request" (frontmatter included), markdown tables
  flattened to run-on prose, a stray list-marker "1" rendered as body text.
- Structural QA passed (HTML is valid; browser probes green), the critic
  seam passed (facts consistent) — nothing in the pipeline owns PROSE.
  The result was published-grade garbage that every automated gate approved.
- Root shape: the kit has a caller-supplied critic seam for fact
  adjudication but no analogous AUTHORING seam. `source/content/<recipe>.md`
  is assembled mechanically from bound sources instead of being written.
- Fix direction (mirrors the critic contract): a caller-supplied author
  callback (in-process) / `authorModulePath` (JSON-CLI) that receives the
  reconciled fact base + recipe outline and returns the content document;
  unattended lifecycle runs REQUIRE it the way federated runs require the
  critic — or refuse to emit narrative sections rather than pasting
  artifacts. A content-QA heuristic (e.g., n-gram overlap between emitted
  prose and raw source text above a threshold ⇒ fail) would have caught this
  as a backstop.
- Reference for intended output quality: the operator-approved rebuild
  (authored by an LLM generator from summary.md + the orchestration-log
  synthesis, same fact base) is live at
  https://dy4vzrzaexuy5.cloudfront.net/explainers/stoa-wave-6-recap-2026-07/index.html
  and tracked in the stoa repo at
  `.oat/repo/explainers/stoa-wave-6-recap-2026-07/index.html`. Diffing it
  against the run's `site/initiatives/wave-6-execution-recap/index.html`
  shows exactly what the authoring seam must add.

## Sequence of events (for the record)

1. Completion ran the unattended recap: build succeeded, critic clean, QA
   green, `built-not-durable` (defect 1 blocked the archive export).
2. Operator human-gated a publish; the raw-dump content (defect 2) was
   discovered on first viewing; artifact unpublished + CloudFront
   invalidated within minutes.
3. Operator-approved authored rebuild published to the same URL;
   hash/self-containment/leakage-QA'd; durable copy committed in stoa.

## Asks

- explainer-kit: fix defects 1 + 2 (defect 2 is the release-quality risk —
  the recap path should not be considered production-usable until an
  authoring seam exists). Happy to re-run the W6 recap as the regression
  case once patched; all inputs are archived and reproducible.
- wave-promotion: the p06 recap-caller docs should state the authoring
  requirement explicitly (the caller owns prose, same as it owns critic
  execution) so wave-close integrations don't ship raw-dump decks; pairs
  with the "optional steps need recorded skip decisions" signal already in
  the acceptance report.
