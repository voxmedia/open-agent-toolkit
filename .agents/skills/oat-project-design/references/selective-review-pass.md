# Selective Review Pass

This reference defines the prose-driven classification pass used by `oat-project-design` when `DESIGN_MODE == "selective"`. The skill body owns flow; this file owns the heuristic.

## Signal Set

Classify each design section as `routine` or `needs-eyes`. Bias is conservative: any one `needs-eyes` signal marks the section `needs-eyes`.

Always `needs-eyes`:

- `Overview + Architecture`
- `Security Considerations`
- `Performance Considerations`
- `Error Handling`
- `Migration Plan`

Per-section `needs-eyes` signals:

- The user flagged concern, uncertainty, or worry about this area during discovery.
- Discovery Open Questions mention this area.
- Three or more spec FRs/NFRs directly touch this area.
- Component boundaries cross modules not already described in `.oat/repo/knowledge/architecture.md`.
- The section introduces a pattern absent from `.oat/repo/knowledge/conventions.md` and `.oat/repo/knowledge/stack.md`.
- The section changes public API, CLI, configuration, workflow semantics, defaults, or persisted state.
- The section introduces a new dependency, provider, service, storage model, permission boundary, or external integration.
- The section depends on knowledge files that are missing, stale, or too thin to support a low-risk classification.

`routine` means the section follows established repo patterns, is low-risk, and has enough grounding to draft silently. It does not mean the section is unimportant; it still appears in the committed design and final review gate.

## Adequate Grounding

Grounding is adequate when at least one strong source, or two weaker sources, exists for the design surface:

- Strong sources: `.oat/repo/knowledge/project-index.md`, `.oat/repo/knowledge/architecture.md`, or a configured docs app with relevant architecture/convention docs.
- Weaker sources: non-thin `docs/`, `.oat/repo/knowledge/conventions.md`, `.oat/repo/knowledge/stack.md`, `.oat/repo/knowledge/concerns.md`, discovery notes with concrete implementation context, or existing nearby implementation patterns found in the repo.

Treat grounding as broadly absent when discovery skipped solution-space exploration and the knowledge base/docs are sparse. In that case, do not recommend Selective Collaborative; prefer Collaborative.

## Recommendation Rules

Before the picker, run a lightweight classification preflight against the shared section list. Assign Selective Collaborative one of four states:

- `recommended`: grounding is adequate and at least 3 sections, or roughly 30-40% of sections, classify as `routine`.
- `available`: grounding is adequate but Collaborative is still the safer default.
- `available-not-recommended`: grounding exists, but savings are marginal for this design.
- `unavailable`: grounding is broadly absent.

Default recommendation is Collaborative when in doubt. Draft-and-review is never the picker default unless explicitly selected through argument, environment, or config.

## Edge Cases

- If every section is `needs-eyes`, Selective Collaborative collapses to Collaborative. Emit: "All sections flagged for review — running as full collaborative."
- If zero sections are `needs-eyes`, force `Overview + Architecture` to `needs-eyes` so the user sees the framing before silent drafting continues.
- If a user elevates a `routine` section in the Section Review Plan, keep it `needs-eyes` for the rest of the run.
- If the user chooses "walk me through every remaining section" during a needs-eyes confirmation, mark all remaining sections `needs-eyes`.
- If the classification cannot explain its reason in one sentence, treat the section as `needs-eyes`.

## Examples

Routine example:

| Section          | Classification | Reason                                                                                             | Signals hit         |
| ---------------- | -------------- | -------------------------------------------------------------------------------------------------- | ------------------- |
| Testing Strategy | routine        | Follows existing requirement-to-test mapping pattern and no discovery uncertainty touches testing. | established pattern |

Needs-eyes example:

| Section    | Classification | Reason                                                                | Signals hit                                 |
| ---------- | -------------- | --------------------------------------------------------------------- | ------------------------------------------- |
| API Design | needs-eyes     | Adds a new public CLI/config surface that changes workflow semantics. | public API/CLI/config, user-facing defaults |

## Dogfood Notes

Use this section to capture misclassifications found while dogfooding Selective Collaborative mode. Keep entries short and actionable.

Template:

```markdown
- Date/project:
- Section:
- Classified as:
- Should have been:
- Missed or overweighted signal:
- Prose adjustment:
```

### Dogfood run 2026-04-30: collaborative-design-workflow

Classification pass run manually against this project's own `spec.md`, `design.md`, `discovery.md`, and `.oat/repo/knowledge/*` context. Grounding was adequate (`project-index.md`, `architecture.md`, `conventions.md`, `stack.md`, and detailed discovery/design artifacts exist). Result: Selective Collaborative would be `recommended` because 3 of 12 sections classify as `routine` while high-risk sections still receive live review.

| Section                                             | Classified As | Expected? | Notes                                                                 |
| --------------------------------------------------- | ------------- | --------- | --------------------------------------------------------------------- |
| Overview + Architecture                             | needs-eyes    | yes       | Forced floor; user should see framing before any silent drafting.     |
| Component Design                                    | needs-eyes    | yes       | Cross-skill workflow semantics and config/skill boundaries changed.   |
| Data Models                                         | routine       | yes       | No database/domain model changes; config risk covered elsewhere.      |
| API Design                                          | needs-eyes    | yes       | Public CLI/config surface changes via `workflow.designMode`.          |
| Security Considerations                             | needs-eyes    | yes       | High-risk-by-default section.                                         |
| Performance Considerations                          | needs-eyes    | yes       | High-risk-by-default section.                                         |
| Error Handling                                      | needs-eyes    | yes       | High-risk-by-default section.                                         |
| Testing Strategy (with Requirement-to-Test Mapping) | needs-eyes    | yes       | New prose-contract validation plus manual dogfood acceptance surface. |
| Deployment Strategy                                 | routine       | yes       | No deployment-path change; release packaging validated separately.    |
| Migration Plan                                      | needs-eyes    | yes       | High-risk-by-default section, even when no migration is expected.     |
| Implementation Phases                               | routine       | yes       | Follows established OAT plan/task structure.                          |
| Risks and Mitigation                                | needs-eyes    | yes       | New user-facing workflow mode and heuristic failure modes.            |

No classification misfires were identified in this artifact-only pass. Live picker taxonomy, mid-flight elevation, and final recap behavior still require an interactive dogfood run because `oat-project-design` is a provider skill, not an executable CLI command.

Deferred follow-up dogfood after this PR opens:

- Exercise picker taxonomy live paths: `Recommended`, `Available / not recommended`, and `Unavailable`.
- Select "walk me through every remaining section" during a needs-eyes confirmation and verify every remaining section is presented.
- Confirm the final user-review gate lists sections drafted without live confirmation.
