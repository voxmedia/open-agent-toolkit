# Repo Review Artifact Template

Use this template for tracked/local file output and for structuring inline responses.

## Required Frontmatter

```yaml
---
oat_generated: true
oat_generated_at: YYYY-MM-DD
oat_analysis_type: repo-review
oat_analysis_scope: repo|directory
oat_analysis_target: <path>
oat_analysis_mode: full
oat_output_mode: auto|tracked|local|inline
oat_analysis_commit: <sha>
---
```

## Required Sections

1. Executive Summary
2. Scoring Summary
3. Prioritized Findings
4. Quick Wins (XS/S)
5. Strategic Initiatives (M/L/XL)
6. Suggested Execution Plan (Now / Next / Later)
7. Appendix (inventory metrics + assumptions)

## Finding Schema

Each finding entry should include:
- `id`
- `title`
- `category`
- `Concern`
- `Value`
- `Scope`
- `Confidence`
- `Evidence`
- `Why this matters`
- `Recommended action`
- `Suggested owner`
- `Dependencies`
- `Success criteria`

## Completion Summary (User-Facing)

Include a concise completion summary after analysis:

- `findings by Concern` (`Critical`, `High`, `Medium`, `Low`)
- `findings by Value` (`High`, `Medium`, `Low`)
- `artifact path` (or `inline-only`)
- `execution mode` (`single-agent` or `fan-out`)

Do not include the clarification channel in this summary.

## Verification Commands

Use these checks before declaring completion:

```bash
# Repo scope dry check
rg -n "Executive Summary|Scoring Summary|Prioritized Findings|Quick Wins|Strategic Initiatives|Now / Next / Later" <artifact-or-inline-draft>

# Directory-scope dry check
echo "<resolved-target>" | rg -n "^[^/]|."

# Inline-mode contract check
rg -n "findings by Concern|findings by Value|artifact path|execution mode" <artifact-or-inline-draft>
```
