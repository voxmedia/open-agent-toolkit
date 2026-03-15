<!-- schema-analysis.md — Extended schema for multi-angle analysis.
     Used by: /analyze.
     Inherits: schema-base.md (Executive Summary, Methodology, Sources & References).
     Replaces: Findings section with per-angle analysis and synthesis below. -->

# Multi-Angle Analysis Schema

Inherits the base artifact template from `schema-base.md`. The Findings section is
replaced with the per-angle analysis structure below.

---

## Per-Angle Findings

{One subsection per analysis angle. Not all angles apply to every analysis — include
only those that produce meaningful observations. Each angle subsection follows the
same internal structure.}

### Adversarial / Critical

{Challenge the subject's assumptions, claims, and design decisions:

- **Weaknesses identified** — flaws, vulnerabilities, or unsupported claims
- **Stress points** — where the subject would fail under pressure or edge cases
- **Counter-arguments** — alternative interpretations or opposing perspectives
- **Severity assessment** — which issues are critical vs. cosmetic}

### Gap Analysis

{What is missing, incomplete, or underdeveloped:

- **Coverage gaps** — areas the subject does not address but should
- **Depth gaps** — topics touched on superficially that warrant deeper treatment
- **Audience gaps** — user segments or use cases not served
- **Dependency gaps** — external requirements not documented or accounted for}

### Opportunity Analysis

{Unrealized potential and improvement vectors:

- **Quick wins** — low-effort improvements with high impact
- **Strategic opportunities** — larger investments that could unlock significant value
- **Leverage points** — small changes that would have outsized positive effects
- **Synergies** — connections to other work that could amplify results}

### Structural / Organizational

{How the subject is organized and whether that organization serves its purpose:

- **Information architecture** — logical flow, hierarchy, navigability
- **Modularity** — separation of concerns, coupling, cohesion
- **Scalability** — how well the structure accommodates growth
- **Consistency** — adherence to patterns, naming conventions, style}

### Consistency / Coherence

{Internal and external consistency:

- **Internal contradictions** — places where the subject disagrees with itself
- **External alignment** — consistency with related artifacts, documentation, or standards
- **Terminology** — consistent use of terms and definitions
- **Behavioral consistency** — predictable patterns vs. surprising exceptions}

### Audience / Clarity

{How well the subject communicates to its intended audience:

- **Clarity** — ease of understanding, jargon management, assumed knowledge
- **Completeness for audience** — does the target reader have everything they need?
- **Tone and register** — appropriate formality, voice, and style
- **Actionability** — can the reader act on what they've read?}

## Cross-Angle Synthesis

{Patterns that emerged across multiple angles:

- **Recurring themes** — issues or opportunities that surfaced in more than one angle
- **Reinforcing signals** — findings from different angles that point to the same conclusion
- **Tensions** — where findings from different angles conflict or create tradeoffs
- **Root causes** — underlying factors that explain multiple surface-level observations}

## Prioritized Recommendations

{Ranked action items with effort/impact assessment:

| Priority | Recommendation | Impact  | Effort  | Angles                       |
| -------- | -------------- | ------- | ------- | ---------------------------- |
| 1        | {Action item}  | {H/M/L} | {H/M/L} | {Which angles surfaced this} |
| 2        | {Action item}  | {H/M/L} | {H/M/L} | {Which angles surfaced this} |
| ...      | ...            | ...     | ...     | ...                          |

Follow the table with a brief narrative for the top 3-5 recommendations, explaining
the reasoning and suggested approach.}
