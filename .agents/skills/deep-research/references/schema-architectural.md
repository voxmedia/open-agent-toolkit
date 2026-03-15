<!-- schema-architectural.md — Extended schema for architectural decision research.
     Used by: /deep-research (when schema=architectural is selected).
     Inherits: schema-base.md (Executive Summary, Methodology, Sources & References).
     Extends: Findings section with architectural decision subsections below. -->

# Architectural Decision Research Schema

Inherits the base artifact template from `schema-base.md`. The Findings section is
extended with the following subsections.

---

## Findings

### Decision Framework

{Criteria for evaluating architectural options. Define:

- **Decision drivers** — the forces shaping this decision (performance requirements,
  team expertise, timeline, budget, compliance, etc.)
- **Constraints** — non-negotiable boundaries (must run on X, must support Y)
- **Quality attributes** — the -ilities that matter most (scalability, maintainability,
  testability, observability, etc.)
- **Evaluation method** — how options were assessed against these criteria}

### Options Analyzed

{Each option presented as a subsection with consistent structure:

#### Option N: {Name}

- **Description** — what this approach entails at a high level
- **Tradeoffs** — pros and cons specific to this option
- **Constraints it satisfies** — which decision drivers and constraints it addresses
- **Constraints it violates** — where it falls short or requires compromise
- **Fit assessment** — how well it matches the stated requirements
- **Precedent** — where this approach has been used successfully (or unsuccessfully)

Include 2-5 options. If fewer than 2, the decision may not warrant this schema. If
more than 5, consolidate similar approaches.}

### Tradeoff Matrix

{Key dimensions where options differ, presented as a comparison table:

| Dimension             | Option 1     | Option 2     | Option 3     |
| --------------------- | ------------ | ------------ | ------------ |
| {Quality attribute 1} | {Assessment} | {Assessment} | {Assessment} |
| {Quality attribute 2} | {Assessment} | {Assessment} | {Assessment} |
| {Constraint fit}      | {Assessment} | {Assessment} | {Assessment} |
| ...                   | ...          | ...          | ...          |

Focus on dimensions where options meaningfully differ. Omit dimensions where all
options perform equivalently.}

### Risk Considerations

{What could go wrong with each approach:

- **Technical risks** — failure modes, scaling limits, integration hazards
- **Organizational risks** — team capability gaps, hiring implications, vendor lock-in
- **Timeline risks** — implementation duration, migration complexity, ramp-up time
- **Reversibility** — how costly it would be to change direction after adoption

Rate risk severity (low/medium/high) and likelihood where possible.}

### Recommendation

{Preferred approach with conditions:

- **Recommended option**: {Name}
- **Rationale** — why this option best satisfies the decision framework
- **Conditions** — assumptions that must hold for this recommendation to remain valid
- **Fallback** — which option to pursue if conditions change or key assumptions fail
- **Next steps** — concrete actions to begin implementing the recommendation}
