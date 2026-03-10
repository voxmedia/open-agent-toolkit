---
oat_generated: true
oat_generated_at: { YYYY-MM-DD }
oat_apply_type: docs
oat_source_analysis: { analysis-artifact-path }
oat_docs_target: { docs-target-path }
---

# Docs Apply Plan

**Date:** {YYYY-MM-DD}
**Source Analysis:** `{analysis-artifact-path}`
**Docs Target:** `{docs-target-path}`

## Instructions

Review the full recommendation set first, then choose a review mode:

- **apply all** — approve the full set as presented
- **apply interactively** — review recommendation by recommendation
- **discuss** — pause to talk through the plan before approving

Recommendations should already carry evidence, confidence, disclosure guidance, and link
targets when `link_only` is used. If a recommendation lacks that detail, it should be
blocked pending a fresh analysis rather than guessed.

## Review Mode

**Selected Mode:** {apply all / apply interactively / discuss / pending}

**Global Notes:** {Any notes that apply to the whole plan, or "None"}

## Recommendations

### {N}. {Action}: `{target-path}`

| Field        | Value                                                             |
| ------------ | ----------------------------------------------------------------- | ------------- | ------------- |
| Action       | {create / update / move / scaffold / sync-nav}                    |
| Target       | `{target-path}`                                                   |
| Rationale    | {why this recommendation exists}                                  |
| Source       | {finding # / contract gap / nav issue}                            |
| Evidence     | {exact file refs / config / docs that justify the recommendation} |
| Confidence   | {high / medium / low}                                             |
| Disclosure   | {inline / link_only / omit / ask_user}                            |
| Link Targets | {path or URL when link_only; otherwise N/A}                       |
| Helper       | `{oat docs nav sync                                               | oat docs init | manual edit}` |

**Context:** {1-2 sentences}

**Decision:** {approve / modify / skip | deferred until interactive review}
**Notes:** {user notes if modifying}

---

{Repeat for each recommendation}

## Summary of Actions

| #   | Action                                 | Target   | Disclosure                       | Decision                                                 |
| --- | -------------------------------------- | -------- | -------------------------------- | -------------------------------------------------------- |
| {N} | {create/update/move/scaffold/sync-nav} | `{path}` | {inline/link_only/omit/ask_user} | {approved_via_apply_all/approved/modified/skip/deferred} |
| ... |                                        |          |                                  |                                                          |

**Total:** {N} approved, {N} modified, {N} skipped

## Proceed?

Confirm to begin applying the approved documentation changes.
