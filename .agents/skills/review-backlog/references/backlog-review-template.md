# Backlog & Roadmap Review

**Date:** {YYYY-MM-DD}
**Scope:** {Description of what was reviewed, e.g., "All items in backlog.md (Inbox + Planned)"}
**Roadmap:** {Path to roadmap if included, or "N/A"}
**Purpose:** Prioritize by value/effort, surface dependencies, and recommend an execution sequence

---

## 1. Executive Summary

The backlog contains **{N} items** ({breakdown by section}) spanning {N} themes:

| Theme | Count | Key Observation |
|---|---|---|
| {Theme name} | {N} | {Brief observation} |
| ... | ... | ... |

**Top-line recommendations:**

1. {Most important recommendation}
2. {Second recommendation}
3. {Third recommendation}

---

## 2. Item Catalog

### Rating Key

| Rating | Value | Effort |
|---|---|---|
| **High** | Unblocks other items, daily workflow impact, or product milestone prerequisite | > 3 days, high complexity, or touches many files |
| **Medium** | Improves quality/consistency but not blocking | 1-3 days, moderate complexity |
| **Low** | Nice-to-have or future-facing | < 1 day, straightforward, isolated change |

### Priority Quadrants

```
                     High Value
                        |
         STRATEGIC      |      QUICK WIN
        (plan carefully)|    (do first)
                        |
  High Effort ----------+---------- Low Effort
                        |
         AVOID /        |      FILL-IN
         DEFER          |    (slot into gaps)
                        |
                     Low Value
```

---

<!-- Repeat this block for each backlog item -->

### {BNN} - {Item Title}

> {One-line description of the item}

| Dimension | Rating | Rationale |
|---|---|---|
| **Value** | **{High/Medium/Low}** | {Why this value rating} |
| **Effort** | **{High/Medium/Low}** | {Why this effort rating} |
| **Quadrant** | **{Quick Win / Strategic / Fill-in / Avoid}** | |

- **Dependencies:** {What this item depends on, or "None"}
- **Blocked by:** {Item IDs, or "Nothing"}
- **Blocks:** {Item IDs this unblocks, or "Nothing"}

---

<!-- End of per-item block -->

## 3. Dependency Graph

```
Legend:  ──▶  hard dependency (must complete first)
         - -▶  soft dependency (beneficial but not required)

{Render the full dependency graph here}

{Group independent items at the bottom}
{item} [independent]
```

---

## 4. Parallel Lanes

These are independent work streams that can be tackled concurrently without conflicts.

### Lane {A}: {Lane Name}

{Brief description of this work stream}

```
{Item sequence with arrows showing internal ordering}
```

**Total estimated effort:** {Low/Medium/High}
**Cross-lane dependencies:** {Any connections to other lanes}

<!-- Repeat for each lane -->

---

## 5. Recommended Execution Order

### Wave {N}: {Wave Name}

| Order | Item | Effort | Rationale |
|---|---|---|---|
| {Na} | **{BNN}** - {Title} | {Low/Med/High} | {Why now} |
| ... | ... | ... | ... |

**Parallelism:** {Which items in this wave can run in parallel}

<!-- Repeat for each wave -->

### Deferred

| Item | Rationale |
|---|---|
| **{BNN}** - {Title} | {Why deferred} |

---

## 6. Roadmap Alignment

<!-- Include this section only if a roadmap was provided -->

### How backlog items map to roadmap phases

| Roadmap Phase | Status | Backlog Items | Notes |
|---|---|---|---|
| {Phase name} | {Status} | {BNN, BNN, ...} | {Notes} |
| ... | ... | ... | ... |

### Gaps: Roadmap items without backlog coverage

| Roadmap Item | Phase | Recommendation |
|---|---|---|
| {Item} | {Phase} | {Add backlog item? Defer? Already covered?} |

### Orphans: Backlog items not on the roadmap

| Backlog Item | Recommendation |
|---|---|
| **{BNN}** - {Title} | {Add to roadmap? Keep as standalone? Defer?} |

---

## 7. Observations & Recommendations

### Strategic observations

1. {Key insight about the backlog shape, sequencing, or priorities}
2. {Second insight}
3. ...

### Risks

| Risk | Mitigation |
|---|---|
| {Risk description} | {How to mitigate} |

### Quick wins to tackle immediately

1. **{BNN}** - {Title} ({effort}, {why it's a quick win})
2. ...
3. ...
