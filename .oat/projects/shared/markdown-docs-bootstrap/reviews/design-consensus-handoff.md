# Markdown Docs Bootstrap Design Review Handoff

## Result

Consensus Review completed once against the full design at commit `7781647a23359767ed8ff9c126eb377cce4eb527`.

- Verdict: **pass**.
- Findings: **0 critical, 0 high, 6 medium, 2 low**.
- Selected and passed reviewer: `claude`, model `claude-opus-5-5`, effort `high`.
- Observed provider: Claude. Model and effort were not independently exposed by the provider envelope; the reviewer claimed the requested model and effort.
- Reviewed design SHA-256: `15dd0a1ce4af4a2cccfbdad9cc167320b93ac7f7255508b20b148f7e4d2cbbbc`.
- Drift comparison: stable within the runtime's documented coverage.
- Original review artifacts and their captured draft are unchanged. The user approved the dispositions below, which have now been incorporated into the working design. That revised design has not received independent re-review.

## Canonical Artifacts

- [Canonical Markdown review](/Users/tstang/.local/state/consensus/23c1ab20b82ce9ad21ad653f9f324337825a847d1c90e15e0590c7adff9653c5/reviews/4b98c9ed-890b-4b82-afb9-92e2bfb1d8df/review.md)
- [Canonical JSON result](/Users/tstang/.local/state/consensus/23c1ab20b82ce9ad21ad653f9f324337825a847d1c90e15e0590c7adff9653c5/reviews/4b98c9ed-890b-4b82-afb9-92e2bfb1d8df/result.json)
- [Reviewed design](../design.md)

## Findings to Resolve Before Planning

1. **M1 — Agent guidance location:** avoid creating docs-root AGENTS.md contrary to the content-tree pointer exclusion; decide root managed guidance plus contributing-page ownership explicitly.
2. **M2 — Dry-run:** define the read-only managed-guidance preview mechanism and outcomes for blocked/manual-required and no-change cases.
3. **M3 — Detection ownership:** the existing detect-docs helper is consumed by oat init, while bootstrap has its own preflight. Choose whether to keep Markdown detection in bootstrap or extend oat init with complete config and guidance behavior.
4. **M4 — Replacement behavior:** reconcile existing framework --yes semantics with explicit Markdown adoption and framework initialization over a configured Markdown surface.
5. **M5 — Explicit-path index protection:** guard the full configured Markdown content root and authored configured index even when --docs-dir selects a narrower subtree.
6. **M6 — Consumer inventory:** include docs-root-resolution, analysis/bootstrap references, instruction-sync/config docs, and project-document/doctor consumers that assume an app or generated index.
7. **L1 — Repository-root target:** explicitly define whether root '.' is refused; existing content-root exclusion cannot represent it safely.
8. **L2 — Managed guidance body:** define deterministic Markdown guidance paths and mode labels so repeat adoption can converge.

## Root Verification

Read-only source checks corroborated the docs-content pointer exclusion, oat init's partial docs-config writer, the index generator's guard against only the selected source tree, and the authoring reference's generated-index assumption. Other findings remain reviewer recommendations for design clarification. No implementation or runtime acceptance tests were performed.

## Invocation and Limits

Used the clean Consensus Review skill at `/Users/tstang/Code/skills/skills/consensus-review/` because installed plugin cache `skills/consensus/0.2.5` contained unresolved merge markers and its executable failed parsing. No installed assets were changed.

Read-only provider controls are not universal filesystem/network isolation. Drift detection covered HEAD, index, Git status, and selected-path hashes; unselected/ignored and transient changes can escape detection. External run retention is operator-managed. This is an independent design document review; the generic runtime's Markdown frontmatter labels it code, and no OAT artifact-review gate disposition is inferred from that label.

## Approved Dispositions Applied

The user approved these dispositions after the root agent presented its assessment:

| Finding | Disposition | Applied design decision                                                                                                     |
| ------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| M1      | Accept      | Root managed AGENTS guidance plus contributing; no docs-root AGENTS scaffold; content excluded from pointer writes          |
| M2      | Accept      | Shared read-only guidance classifier preview; dry-run status/exit codes and no-change contract                              |
| M3      | Narrow      | Bootstrap preflight owns Markdown detection; general oat init remains unchanged                                             |
| M4      | Clarify     | Markdown requires adopt; existing framework replacement prompts/--yes stay intact, including replacement of Markdown config |
| M5      | Accept      | Canonical configured content root and authored index protected regardless of narrowed --docs-dir or symlink aliases         |
| M6      | Accept      | Explicit consumer inventory spanning skill references, instruction sync, project-document/doctor, and docs                  |
| L1      | Accept      | Dedicated root required; repository root and escaping paths refused                                                         |
| L2      | Accept      | Deterministic Markdown managed section with correct authored index and contributing paths                                   |

Design-only self-review checked placeholders, internal consistency, scope, and ambiguity. The independent pass remains evidence for the original draft only; no claim of re-review or implementation acceptance is made.

Revised design SHA-256: `818e8db294bb0a83d09e84596bdcfd9c57df5c40502830a8731d26a74ffdafa0`. Discovery completion passed the CLI validation boundary with ready-for `oat-project-quick-start`.
