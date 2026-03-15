<!-- schema-base.md — Base artifact template shared by /deep-research and /analyze.
     All extended schemas (technical, comparative, conceptual, architectural, analysis)
     inherit this skeleton and override or extend the Findings section. -->

# Artifact Frontmatter Contract

All artifact-producing skills in this suite emit YAML frontmatter at the top of the
generated artifact. Extended schemas inherit this contract automatically.

## Required Keys

```yaml
---
skill: deep-research | compare | analyze # which skill produced the artifact
schema: technical | comparative | conceptual | architectural | analysis # schema used
topic: 'human-readable topic' # research/analysis topic
model: opus-4-6 # model identifier slug
generated_at: 2026-03-14 # ISO date of generation
---
```

## Optional Keys

```yaml
context: docs/security-policy.md # --context path provided by user
depth: standard # research depth (for /deep-research)
focus: security # focus angle (for /deep-research)
input_type: code # classified input type (for /analyze)
```

---

# Base Artifact Template

<!-- Skills should emit frontmatter (see contract above), then this structure. -->

# {Title}

## Executive Summary

{2-3 paragraph overview of findings and key takeaways. Lead with the most important
conclusion. Include scope: what was researched, why it matters, and the bottom-line
recommendation or insight.}

## Methodology

{How this research or analysis was conducted. Cover:

- Sources consulted (documentation, repositories, benchmarks, articles)
- Angles or dimensions explored
- Tools or techniques used (code analysis, benchmarking, manual review)
- Any constraints or limitations that affected the investigation}

## Findings

{Structure varies by extended schema. Each extended schema either adds subsections
to this section or replaces it entirely. See the individual schema files for details.

When no extended schema applies, use free-form subsections organized by theme.}

## Sources & References

{Cited sources with sufficient detail for the reader to locate them:

- URLs for web resources
- File paths for local code references
- Package names with version numbers
- Paper titles with authors and publication year

Use a numbered or bulleted list. Prefer inline links where natural.}
