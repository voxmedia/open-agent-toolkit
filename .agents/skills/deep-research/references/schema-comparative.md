<!-- schema-comparative.md — Extended schema for comparative analysis.
     Used by: /deep-research (when schema=comparative is selected),
              /compare (artifact mode).
     Inherits: schema-base.md (Executive Summary, Methodology, Sources & References).
     Replaces: Findings section with structured comparison below. -->

# Comparative Analysis Schema

Inherits the base artifact template from `schema-base.md`. The Findings section is
replaced with the structured comparison sections below.

---

## Comparison Overview

{What is being compared and why. Include:

- The options under evaluation (name each clearly)
- The context driving the comparison (project constraints, goals, timeline)
- The evaluation approach (how dimensions were selected, any weighting rationale)
- Scope boundaries — what is explicitly excluded from the comparison}

## Dimensions

{Table of evaluation criteria with per-option assessment. Use a Markdown table with
one row per dimension and one column per option.

Example structure:

| Dimension     | Option A     | Option B     | Option C     |
| ------------- | ------------ | ------------ | ------------ |
| {Criterion 1} | {Assessment} | {Assessment} | {Assessment} |
| {Criterion 2} | {Assessment} | {Assessment} | {Assessment} |
| ...           | ...          | ...          | ...          |

Choose dimensions relevant to the decision context. Common dimensions include:

- Performance characteristics
- Developer experience / API ergonomics
- Ecosystem and community health
- Maintenance and long-term viability
- Cost (licensing, infrastructure, operational)
- Migration effort from current state}

## Scoring

{Qualitative assessment per dimension. Provide a brief narrative for each dimension
explaining the relative strengths and weaknesses of each option.

Avoid numeric scores by default — qualitative labels (strong, adequate, weak, N/A)
communicate better when dimensions are not commensurable. If the user requests
numeric scoring, use a consistent 1-5 scale with clear rubric.}

## Recommendation

{Clear winner declaration with rationale:

- **Recommended option**: {Name}
- **Primary reasons**: {2-3 key differentiators that drove the recommendation}
- **Fit for context**: {Why this option is the best match for the stated constraints}

If there is no clear winner, state that explicitly and describe the conditions under
which each option would be preferred.}

## Caveats

{When the recommendation might not apply:

- Alternative contexts where a different option would win
- Assumptions the recommendation depends on
- Information gaps that could change the conclusion
- Time sensitivity — when this comparison should be revisited}
