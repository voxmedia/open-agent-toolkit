# Documentation Gap Report

**Date:** {YYYY-MM-DD}
**Scope:** {Description — e.g., "All completed projects since 2026-01-01, full docs surface"}
**Filter:** {--since value or "all", --scope value or "all"}
**Purpose:** Identify documentation gaps left by completed OAT projects and produce a prioritized fix plan

---

## 1. Executive Summary

**{N} gaps** identified across **{N} completed projects**, affecting **{N} documentation files**.

| Priority           | Count | Description                                                     |
| ------------------ | ----- | --------------------------------------------------------------- |
| **P0 (Critical)**  | {N}   | Stale references or entirely undocumented core features         |
| **P1 (Important)** | {N}   | Shipped capabilities not yet mentioned in docs                  |
| **P2 (Minor)**     | {N}   | Incomplete coverage, outdated wording, missing cross-references |

**Top-line recommendations:**

1. {Most impactful fix}
2. {Second recommendation}
3. {Third recommendation}

---

## 2. Completed Work Inventory

Projects reviewed and their shipped capabilities.

| Project        | Completed | Key Capabilities | Skills Changed   | CLI Changes      |
| -------------- | --------- | ---------------- | ---------------- | ---------------- |
| {project-name} | {date}    | {brief list}     | {list or "none"} | {list or "none"} |
| ...            | ...       | ...              | ...              | ...              |

---

## 3. Gap Catalog

### Priority Key

| Priority           | Criteria                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| **P0 (Critical)**  | Docs reference something that no longer exists, or a core command/skill is entirely undocumented |
| **P1 (Important)** | New capability is shipped but not mentioned in relevant docs                                     |
| **P2 (Minor)**     | Docs exist but are incomplete, outdated wording, or missing cross-references                     |

---

<!-- Repeat this block for each gap -->

### {GNN} — {Gap Title}

> {One-line description of the gap}

| Field                | Value                                                                      |
| -------------------- | -------------------------------------------------------------------------- |
| **Priority**         | **{P0/P1/P2}**                                                             |
| **Affected file(s)** | `{path}`, `{path}`                                                         |
| **Source project**   | {project-name}                                                             |
| **Category**         | {stale-reference / missing-docs / incomplete-coverage / missing-cross-ref} |

**Current state:** {What the docs currently say or don't say}

**Expected state:** {What the docs should say after the fix}

**Suggested fix:** {Brief description of the change needed}

---

<!-- End of per-gap block -->

## 4. Recommended Execution Plan

### Wave 1: P0 — Critical Fixes

| Order | Gap       | Affected File(s) | Suggested Fix | Effort         |
| ----- | --------- | ---------------- | ------------- | -------------- |
| 1a    | **{GNN}** | `{path}`         | {fix}         | {Low/Med/High} |
| ...   | ...       | ...              | ...           | ...            |

**Estimated total effort:** {Low/Medium/High}

### Wave 2: P1 — Important Additions

| Order | Gap       | Affected File(s) | Suggested Fix | Effort         |
| ----- | --------- | ---------------- | ------------- | -------------- |
| 2a    | **{GNN}** | `{path}`         | {fix}         | {Low/Med/High} |
| ...   | ...       | ...              | ...           | ...            |

**Estimated total effort:** {Low/Medium/High}

### Wave 3: P2 — Minor Improvements

| Order | Gap       | Affected File(s) | Suggested Fix | Effort         |
| ----- | --------- | ---------------- | ------------- | -------------- |
| 3a    | **{GNN}** | `{path}`         | {fix}         | {Low/Med/High} |
| ...   | ...       | ...              | ...           | ...            |

**Estimated total effort:** {Low/Medium/High}

---

## 5. Stale Reference Inventory

Documentation references that point to removed or renamed content.

| Doc File | Line/Section      | Stale Reference      | Current State           | Fix             |
| -------- | ----------------- | -------------------- | ----------------------- | --------------- |
| `{path}` | {section or line} | {what it references} | {removed/renamed/moved} | {suggested fix} |
| ...      | ...               | ...                  | ...                     | ...             |

---

## 6. Skills & CLI Completeness Check

Cross-reference of skills and CLI commands against documentation coverage.

### Skills

| Skill        | SKILL.md Exists | In Skills Index | Description Accurate | Notes   |
| ------------ | --------------- | --------------- | -------------------- | ------- |
| {skill-name} | {yes/no}        | {yes/no}        | {yes/no/partial}     | {notes} |
| ...          | ...             | ...             | ...                  | ...     |

### CLI Commands

| Command   | In CLI Index | In Commands.md | Description Accurate | Notes   |
| --------- | ------------ | -------------- | -------------------- | ------- |
| {command} | {yes/no}     | {yes/no}       | {yes/no/partial}     | {notes} |
| ...       | ...          | ...            | ...                  | ...     |

---

## 7. Observations

### Patterns

1. {Systemic observation about documentation gaps — e.g., "CLI commands added in recent projects consistently lack index entries"}
2. {Second pattern}

### Recommendations

1. {Process improvement to prevent future gaps}
2. {Second recommendation}

### Risks

| Risk               | Impact   | Mitigation        |
| ------------------ | -------- | ----------------- |
| {risk description} | {impact} | {how to mitigate} |
