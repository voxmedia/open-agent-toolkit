# Repo Review Rubric

## Scoring Labels

### Concern
- `Critical`: Immediate risk; likely production, security, or severe delivery impact.
- `High`: Significant quality or delivery risk that should be addressed soon.
- `Medium`: Meaningful issue with moderate impact.
- `Low`: Minor issue with limited near-term impact.

### Value
- `High`: Fix unlocks major reliability, velocity, or clarity gains.
- `Medium`: Fix delivers noticeable but bounded improvement.
- `Low`: Fix is incremental.

### Scope
- `XS`: Single-file or very small localized change.
- `S`: Small bounded change with minimal coordination.
- `M`: Multi-file change in one subsystem.
- `L`: Cross-subsystem change with broader testing needs.
- `XL`: Program-level initiative across teams/modules.

### Confidence
- `High`: Strong evidence from multiple direct signals.
- `Medium`: Good evidence with some assumptions.
- `Low`: Limited evidence; requires targeted validation.

## Required Categories

- `Architecture`
- `Conventions`
- `Documentation`
- `DX`
- `Testing` (include reliability observations in this category)
- `Maintainability`

## Evidence Quality Rules

- Every finding must include at least one concrete evidence bullet.
- Evidence should reference files, commands, or repository structures.
- Confidence should match evidence depth.

## Actionability Rules

- Recommended actions should be specific and executable.
- Success criteria should be testable or observable.
- Suggested owners should map to realistic team boundaries.

## Merge and Dedupe Policy

Use this policy whenever findings from multiple dimensions overlap:

- Overlap detection key:
  - same `category`
  - same normalized path token (file, package, or module)
  - equivalent title intent
- Concern precedence:
  - `Critical > High > Medium > Low`
- Material disagreement threshold:
  - Concern differs by 2+ levels, or
  - Value differs by 2+ levels
- If material disagreement exists, preserve strongest Concern and add a required `merge note` under evidence explaining the normalization decision.
