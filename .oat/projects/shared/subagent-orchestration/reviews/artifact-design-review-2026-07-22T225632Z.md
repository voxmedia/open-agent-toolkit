---
oat_generated: true
oat_generated_at: 2026-07-22T22:56:32Z
oat_review_scope: design
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/subagent-orchestration
---

# Artifact Review: design

**Reviewed:** 2026-07-22
**Scope:** `design.md` (quick mode — upstream artifact: `discovery.md`)
**Files reviewed:** 2 (+ imported handoff references and current `.agents` consumer definitions consulted for alignment)
**Commits:** n/a (artifact review)
**Reviewer context:** Operator's laptop session (originator of the imported handoff dossier), reviewing over SSH. Selection reason: inherit (pre-plan; no project policy).

## Summary

The design is a faithful, well-structured realization of the discovery decisions: guidance/mechanics ownership split without rename, co-installation via the utility pack, additive-only dispatch evidence, fail-closed behavior for class-constrained dispatch, and safeguard preservation called out explicitly. Component boundaries and negative-ownership validation are clearly specified and testable. The main gap is that the design updates the dispatch skill's own required-loading contract but is silent about the other in-repo consumers of the old loading path (at minimum `.agents/agents/oat-reviewer.md`, which instructs reviewer lanes to read selection guidance from `oat-dispatch-subagents/references/`). Two Medium findings concern coherence of the Opus-first Claude revision and test-pinning of dated matrix content.

Findings: 0 critical, 1 important, 2 medium, 2 minor

## Findings

### Critical

None

### Important

**I1. Consumer loading contracts outside the two skills are not addressed.**
`design.md` rewrites required loading for `oat-dispatch-subagents` (principles → one selection reference → one mechanics reference) but never enumerates the other repo surfaces that embed the _old_ contract. Confirmed concrete instance: `.agents/agents/oat-reviewer.md` line 83 instructs reviewer-local reconnaissance to "read exactly one matching active-provider reference under `.agents/skills/oat-dispatch-subagents/references/`" — after the split those files contain mechanics only, so reviewer lanes would select models from a reference that deliberately contains no selection policy. Likely additional instances: `oat-project-dispatch-subagents` (adapter), gate prompt templates, and any workflow skill that names the references path. **Fix guidance:** add a "Consumer Migration" subsection to Component Design (or Validation Contracts) that (a) inventories consumers via a repo-wide grep for `oat-dispatch-subagents/references`, (b) updates each to the two-reference contract, and (c) adds a validation assertion that no active instruction file references the old path for selection purposes. This belongs in the design now because plan phases will otherwise omit the work.

### Medium

**M1. Opus-first Claude revision needs coherent reframing, not a row swap — and creates a known downstream divergence.**
Discovery Q2 (user-validated) keeps Opus as the hard-reasoning/consequential default with Fable as exceptional escalation; the design implements this and its testing section validates it. Two alignment consequences deserve explicit design treatment: (a) the imported Claude draft's _cyber-sensitive exception_ section is written as an exception **to a Fable-first ladder** ("prefer Opus 4.8 xhigh... instead of relying on Fable alone"); under Opus-first that framing is inverted — the revised selection reference should present Opus-first as the rule, with Fable's stronger cyber classifier as a _reason supporting_ the default rather than an exception to it, and keep the "stronger classifier ≠ capability weakness" caveat. (b) Downstream copies originating from the same dossier currently carry the Fable-first ladder (operator's private-repo synced references, vault decision matrix, global-file record). Sync will correctly supersede the private-repo copies once this ships, but the vault matrix and global-file record are not sync-managed and will silently disagree with canon. **Fix guidance:** note (a) as an explicit revision requirement in the Generic Guidance component's design decisions; record (b) as a one-line coordination note in References or Out of Scope so the operator's downstream refresh is a tracked consequence, not an accident. Artifact-alignment framing: no code/design direction change required.

**M2. Testing section pins dated matrix content, contradicting the "dated examples" principle.**
"Validate the Opus-first Claude matrix and exceptional Fable disposition" makes a _dated, refreshable_ mapping a test invariant. The same design (correctly) requires named models to be subordinate to live catalogs and refresh policy — under this test, every legitimate guidance refresh becomes a test change, and the test communicates that the incumbent ordering is durable policy. **Fix guidance:** scope skill-contract tests to structural/metadata invariants (matrix present, five classes, frontmatter dates ordered, effort notes separate from class mapping) plus the durable _routing rules_ (e.g., "Fable is not the default escalation route" phrased as policy), and validate specific incumbent names — if at all — in a single clearly-marked dated fixture that the refresh workflow is documented to update. The design already applies exactly this philosophy to safeguard pinning ("semantic assertions rather than broad snapshot tests"); extend it to the matrices.

### Minor

**m1. Discovery frontmatter status drift.** `discovery.md` has `oat_status: in_progress` while `state.md` records `oat_phase: design` / `oat_phase_status: complete` and discovery's own Next Steps say design review. Bookkeeping only — set discovery `oat_status: complete` in the next bookkeeping commit.

**m2. Design frontmatter `oat_ready_for: null`.** With design complete and plan next, `oat_ready_for` should name the planning route (per quick-mode convention) so workflow routing doesn't depend on inference. Bookkeeping only.

## Spec/Design Alignment

Quick mode — alignment target is `discovery.md` (Key Decisions 1–7).

### Requirements Coverage

| Requirement (discovery decision)                              | Status      | Notes                                                                                        |
| ------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------- |
| 1. One canonical guidance skill, progressive disclosure       | implemented | Overview + Data Flow steps 2–3                                                               |
| 2. Guidance owns selection; dispatch owns mechanics/records   | implemented | Component Design + negative-ownership validation                                             |
| 3. Imported dossier is review input, not implementation-ready | implemented | Overview; References section links `references/prior-project/`                               |
| 4. No rename in this project                                  | implemented | Explicit design decision; rename deferred as separate migration                              |
| 5. Opus-first Claude routing, Fable exceptional               | partial     | Decision present + tested, but revision coherence and downstream divergence unaddressed (M1) |
| 6. Guidance user-invocable + discoverable; dispatch internal  | implemented | Interfaces for both components                                                               |
| 7. Lightweight draft-and-review design                        | implemented | This artifact                                                                                |
| Constraint: preserve safeguards while moving content          | implemented | "Preserved verbatim in meaning" + pinning strategy; verify at implementation review          |
| Constraint: co-installation                                   | implemented | Utility pack + validation layer                                                              |
| Constraint: version/release contract                          | implemented | Distribution responsibilities                                                                |
| Success criterion: boundary + co-install tests                | partial     | Strong, but consumer-migration validation missing (I1)                                       |

### Extra Work (not in requirements)

None — scope discipline is good; distribution/validation additions all trace to discovery constraints.

## Verification Commands

```sh
# I1: inventory consumers of the old loading contract
grep -rn "oat-dispatch-subagents/references" .agents/ packages/ --include="*.md" --include="*.ts"

# M2: after plan/implementation, confirm matrix tests are structural
grep -rn "Opus\|Fable" packages/cli/src/validation/skills.test.ts
```

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert findings into plan tasks (I1 should become a design amendment + plan work; M1/M2 are design-note amendments; m1/m2 are bookkeeping).
