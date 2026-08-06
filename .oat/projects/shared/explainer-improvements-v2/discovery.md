---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-08-06
oat_generated: false
---

# Discovery: explainer-improvements-v2

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Review the recent explainer projects and make further improvements, driven by
an operator handoff document with production feedback. Prior project trees
used as context:

- archived `explainer-kit` (public skill family foundation)
- shared `explainer-improvements` (golden unattended recap recovery;
  PR #188 open)

## Handoff Feedback (scope driver)

Received 2026-08-05 and preserved verbatim at
`references/handoff-cyclone-case-study.md`. It uses the Duet
`cyclone-comments-generalization` project recap (Duet PR #6350, artifact
commit `156baa09`) as a production case study of the shipped
`explainer-kit`/`oat-explainer-kit` runtime, and directs upstream improvements
across five contract areas:

1. **Path derivation and publication.** Local output-root distinctions
   (project vs repository vs direct-caller) are correct and must be preserved.
   Remote scope must be derived per invocation by the adapter
   (`<repository-root>/projects/<project-slug>`), never by putting a project
   slug in shared repo config. Complete `s3-static` publish config must be
   documented/validated (provider, S3 root, public root, region) while
   publication stays human-gated. Secondary path-contract gaps (nested
   `publicBaseUrl`, adapter rejecting repository invocations, double-nested
   output roots, divergent URL encoding) must be fixed or documented.
2. **Link integrity.** Artistic HTML bypassed canonical link construction and
   shipped directory-style relative links that break on S3/VoxOps. Authors
   must receive canonical artifact URLs (or artifact IDs the renderer
   resolves), and a post-render internal-link validator must check every
   artifact against the manifest/site tree with explicit `index.html`.
3. **Publication integrity.** Published bytes were manually patched and
   diverged from the durable manifest. Published bytes must match manifest
   hashes; corrections trigger rebuild + reviews + durability + publication;
   no publication-time HTML transformation; durable `publish-receipt.json`
   with every artifact's ID, path, S3 URI, public URL, hash, and verification
   result. Protected public roots (401/403 anonymous) must be handled
   explicitly — never silently treated as success.
4. **Lifecycle and recovery.** Recap gate must record a terminal outcome
   before final approval completes; `built-needs-review` needs a bounded
   correction/rebuild path; the `request.sourceIds is not iterable` failure
   needs investigation and regression coverage; failed/superseded run
   evidence needs an explicit durability policy.
5. **Visual quality.** The original handoff prescribed a hub floor, adaptive
   expansion, structured rendering, role-based typography, deck patterns,
   semantic diagrams, and stronger visual critique. The later operator revision
   keeps those quality outcomes but supersedes the prescribed renderer,
   deterministic-heuristic, and expanded-golden mechanisms.

The handoff includes explicit acceptance criteria and a required test matrix
(path derivation, invocation fixtures, link validation including this case's
broken links, publication verification, the `sourceIds` regression, responsive
golden fixtures, and a negative visual-quality fixture).

## Operator Scope Revision (2026-08-06)

After p01 implementation, the operator concluded that the original plan
over-specified the creative layer. The accepted direction is a thin executable
safety kernel plus prose-led authoring and visual judgment.

Executable scope remains for path/URL derivation, credential hygiene, link
validation, manifest/hash equality, publication receipts, protected access,
publish gating, and lifecycle ordering. Structured renderer contracts,
general-purpose layout engines, deterministic visual-quality heuristics, and
new golden matrices are removed. Artifact strategy, typography, composition,
slide patterns, diagram semantics, and visual-review quality move to
recipe/brief/skill prose.

The existing golden suite remains unchanged in this project. A separate
evidence-based follow-up will assess its unique coverage, runtime, and
flakiness before simplification.

## Clarifying Questions

### Question 1: Handoff feedback document

**Q:** Please provide the handoff doc with feedback that should drive v2
scope.
**A:** Provided 2026-08-05 — Duet cyclone-comments-generalization case-study
handoff (see above).
**Decision:** The handoff is the production evidence and outcome driver. The
operator's 2026-08-06 scope revision is authoritative for implementation
mechanisms and supersedes its structured-renderer and expanded-golden
prescriptions.

## Solution Space

The handoff is prescriptive about outcomes and constraints, so the strategic
question is shape, not direction. A single feedback-driven improvement pass
across both skills is the chosen framing (the earlier candidate framings —
quality pass vs recipe expansion — collapsed once the handoff arrived: it is a
quality/contract pass, not a recipe expansion).

### Chosen Direction

**Approach:** Feedback-driven contract improvement pass on `explainer-kit`
(core) and `oat-explainer-kit` (adapter), organized around the handoff's five
contract areas and closed against its acceptance criteria and test matrix.
**Rationale:** Operator handoff explicitly defines scope, acceptance criteria,
tests, and constraints from a real production run.
**User validated:** Yes — the handoff itself is the operator's direction.

## Key Decisions

1. **Workflow mode:** Quick-start (operator-selected via
   `oat-project-quick-start`).
2. **Scope source of truth:** The Cyclone case-study handoff defines the
   production problems and desired outcomes. The 2026-08-06 operator revision
   governs mechanism choice: executable safety invariants plus prose-led
   creative judgment.
3. **Boundary preservation:** `explainer-kit` stays destination-neutral and
   config-blind; OAT project/repository topology, per-invocation remote scope
   derivation, and config resolution live in `oat-explainer-kit`.
4. **Safety preservation:** Immutable manifests, additive publishing, human
   publication gate, credential hygiene, provenance, and accessibility
   guarantees carry forward unchanged.
5. **No post-publication mutation:** Broken links are fixed at authoring/
   render/validation time; corrections flow through rebuild and review, never
   through publication-time transformation.
6. **Baseline:** Build on shipped explainer-kit + explainer-improvements
   outcomes; do not reopen settled foundation decisions (e.g. `ekrt1`
   removal) unless the handoff requires it.

## Constraints

- Keep `explainer-kit` destination-neutral and config-blind; do not hard-code
  Duet, VoxOps, or the case-study bucket into the core.
- Keep OAT project/repository topology in `oat-explainer-kit`; derive project
  publish scope per invocation, never via shared repo config.
- Preserve immutable manifests, additive S3 behavior, the explicit human
  publication gate, and no-credentials-in-artifacts.
- Preserve existing accessibility, keyboard, reduced-motion, print, and
  mobile requirements.
- Preserve local output-root distinctions: project runs under
  `<active-project>/explainers/<run>/`, repository runs under
  `.oat/repo/reference/explainers/<run>/`, direct core callers supply an
  explicit output root.
- Public package changes follow the five-package lockstep release policy;
  canonical skill edits require frontmatter version bumps and provider sync.

## Success Criteria

- **Path and publication:** correct local roots; adapter-derived
  `/projects/<project-slug>` remote scope; explicit `index.html` everywhere;
  every internal link resolves to a manifest-declared target; published bytes
  match manifest hashes; publication emits a complete durable receipt;
  protected-public-root behavior explicit and tested; publication remains
  human-gated, additive, and credential-free.
- **Visual quality:** content-adaptive artifact selection (hub floor);
  intentional typographic roles and hierarchy; purposeful slide patterns;
  semantically meaningful, fit-to-content diagrams; and visual-review guidance
  that catches weak hierarchy, composition, density, repetition, medium use,
  diagram semantics, and cross-artifact cohesion. These outcomes are expressed
  and judged through recipe/brief/skill prose rather than renderer schemas or
  deterministic visual scoring.
- **Lifecycle:** recap-gate-before-final-approval invariant; bounded
  correction path for `built-needs-review`; explicit failed-run evidence
  policy; corrected runs publish only after browser and visual review pass.
- **Tests:** focused unit/integration coverage for safety invariants, the
  `sourceIds` regression, and one cross-boundary publication acceptance test.
  The existing golden suite stays unchanged; no responsive or negative golden
  matrix is added.

## Out of Scope

- Open-ended visual recipe expansion (`BL-260728-additional-visual-workflows`
  candidates: diff review, plan review, fact-check, dashboards, complex
  tables) — the handoff is a quality/contract pass, not recipe expansion.
- Rebuilding the personal-kit private wrapper as a public deliverable.
- Reopening legacy `ekrt1` resume compatibility.
- Retro-publishing or mutating the Duet case-study artifacts themselves; they
  are evidence, not a deliverable.

## Deferred Ideas

- Additional visual workflow recipes remain deferred at P2 pending demand
  evidence.

## Open Questions

- **PR #188 relationship:** explainer-improvements PR is still open; v2 work
  presumably lands as a new PR on top once merged. Confirm sequencing at
  implementation time.

## Assumptions

- The open explainer-improvements PR (#188) is the baseline this work builds
  on and will merge before or alongside v2 landing.
- The Duet case-study artifacts and hashes cited in the handoff are accurate
  as recorded; local verification against the Duet repo is not required to
  scope this project.
- The current adaptive-set, browser-evidence, and one-correction contracts
  from explainer-improvements remain the substrate these improvements extend.

## Risks

- **Prose quality drift:** Judgment-oriented guidance may be interpreted
  inconsistently across providers or runs.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Keep recipe and critic guidance concrete, preserve
    the existing actionable pass/correct contract, and use focused guidance
    conformance checks without pretending to score design deterministically.
- **Verification-seam design:** The protected-destination resolution touches
  the destination contract's trust model; a weak choice could erode byte
  verification guarantees.
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Resolve explicitly in design with the three
    handoff-sanctioned options; never downgrade 401/403 to success.

## Next Steps

1. Complete the delta-focused review of the revised lightweight design and
   17-task plan.
2. Resume `oat-project-implement` at p02-t01.
3. Capture a separate backlog follow-up to audit the existing golden suite's
   unique coverage, runtime, and flakiness before any simplification.
