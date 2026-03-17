---
oat_generated: true
oat_generated_at: { YYYY-MM-DD }
oat_apply_type: agent-instructions
oat_source_analysis: { analysis-artifact-path }
oat_providers: [{ providers }]
---

# Agent Instructions Apply Plan

**Date:** {YYYY-MM-DD}
**Source Analysis:** `{analysis-artifact-path}`
**Providers:** {agents_md, claude, cursor, ...}

## Instructions

Review the full recommendation set first, then choose a review mode:

- **apply all** — approve the full set as presented
- **apply interactively** — review recommendation by recommendation
- **discuss** — pause to talk through the plan before approving

Recommendations should already carry evidence, confidence, disclosure guidance, and any structured content guidance
from the analysis artifact.
If a recommendation lacks that detail, it should be blocked pending a fresh analysis rather than guessed.

## Review Mode

**Selected Mode:** {apply all / apply interactively / discuss / pending}

**Global Notes:** {Any notes that apply to the whole plan, or "None"}

## Recommendations

### {N}. {Action}: `{target-file-path}`

| Field                           | Value                                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Action                          | {create / update}                                                                                                 |
| Provider                        | {agents_md / claude / cursor / copilot}                                                                           |
| Format                          | {AGENTS.md / Claude rule / Cursor rule / Copilot instruction / Copilot shim}                                      |
| Target                          | `{target-file-path}`                                                                                              |
| Rationale                       | {Why — references analysis finding #N or coverage gap #N}                                                         |
| Evidence                        | {exact file refs / config / docs that justify the recommendation}                                                 |
| Confidence                      | {high / medium / low}                                                                                             |
| Disclosure                      | {inline / link_only / omit / ask_user}                                                                            |
| Link Targets                    | {canonical docs/config/examples to reference instead of duplicating inline; required for `link_only`, else `N/A`} |
| Content Guidance                | {high-level generation guidance}                                                                                  |
| Must Include                    | {claims, commands, references, examples, or corrections that must survive generation}                             |
| Must Not Include                | {unsupported or stale content that must stay out}                                                                 |
| Preferred Default For New Files | {pattern A / pattern B / N/A}                                                                                     |
| Claim Corrections               | {`old claim -> verified replacement` or `none`}                                                                   |
| Template                        | `{template-file-path}`                                                                                            |

**Context:** {1-2 sentences describing what this file will contain and why it's needed.}

**Decision:** {approve / modify / skip | deferred until interactive review}
**Notes:** {User notes if modifying}

---

{Repeat for each recommendation}

## Summary of Actions

| #   | Action          | Target   | Provider   | Final Disclosure   |
| --- | --------------- | -------- | ---------- | ------------------ |
| {N} | {create/update} | `{path}` | {provider} | {inline/link_only} |
| ... |                 |          |            |

Only approved recommendations with a resolved disclosure mode should appear here. `omit` items are excluded, and `ask_user` items must be resolved before summary.

**Total:** {N} files to create, {N} files to update, {N} skipped

## Proceed?

Confirm to begin generating/updating the approved instruction files.
