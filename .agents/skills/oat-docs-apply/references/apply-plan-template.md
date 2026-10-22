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

## Guidance provenance

- Analysis-selected IA sources, in order: {locators + provenance}
- Local authority: {AGENTS/contributing citations}
- Read-only sources verified: {resolved entries or blocked recommendation IDs}
- Conflicts: {ask_user disposition or none}

Keep the analysis selection; do not copy private contents or invent missing evidence.

## Instructions

Review the full recommendation set first, then choose a review mode:

- **apply all** — approve non-blocked default items; explicit items require individual approval by ID
- **apply interactively** — review recommendation by recommendation
- **discuss** — pause to talk through the plan before approving

Recommendations should already carry evidence, confidence, disclosure guidance, and link
targets when `link_only` is used. If a recommendation lacks that detail, it should be
blocked pending a fresh analysis rather than guessed.

## Review Mode

**Selected Mode:** {apply all / apply interactively / discuss / pending}

**Global Notes:** {Any notes that apply to the whole plan, or "None"}

## Recommendations

### {R-NNN}. {Action}: `{target-path}`

| Field        | Value                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------------- |
| ID           | {R-NNN; stable within the source artifact}                                                         |
| approval     | {explicit / default; never inferred from blanket consent}                                          |
| Action       | {create / update / move / scaffold / sync-nav / record-ia / restructure / tooling-update / manual} |
| Target       | `{target-path}`                                                                                    |
| Rationale    | {why this recommendation exists}                                                                   |
| Source       | {finding # / contract gap / nav issue}                                                             |
| Evidence     | {exact file refs / config / docs that justify the recommendation}                                  |
| Confidence   | {high / medium / low}                                                                              |
| Disclosure   | {inline / link_only / omit / ask_user}                                                             |
| Link Targets | {path or URL when link_only; otherwise N/A}                                                        |
| Helper       | `oat docs nav sync` / `oat docs init` / `manual edit`                                              |

**Context:** {1-2 sentences}

**Decision:** {approve / modify / skip | deferred until interactive review}
**Notes:** {user notes if modifying}

---

{Repeat for each recommendation}

## Restructure block (one individually approved ID, one exact-path commit)

- ID / individual approval evidence: {R-NNN / operator choice, or pending}
- Source → destination map: {every moved/retired page}
- Parent Contents edits: {source and destination indexes}
- Grep-derived inbound rewrites: {command + referring file:line + old/new link,
  including anchors/assets and rewritten links inside moved pages}
- Old-URL strategy: {verified host redirect, authored stub, or archive pointer;
  static export: no assumed Next redirects}
- Retired-page recovery: {retained stub/archive pointer + parent Contents entry}
- Sidebar owner: {nav-sync / hand-authored / undeclared; Markdown: ignored}
- Verification: {nav-sync write then --check, or read-only membership/order
  comparison; file/link checks; actual base-path old URL; analyze rerun}
- Exact owned files and commit identity: {list including both rename sides}

## IA recording / tooling limits

- Record IA: {adoption.state from target pjm doctor; decision command/path;
  framework AGENTS or Markdown contributing section; shared mirror JSON}
- Tooling update: {individually approved ID; exact docs-app docs-\* upgrade
  command; supported migrate conversions; existing build verifier}
- Unsupported app config/routes/scripts: {manual required changes; no edits}

## Summary of Actions

| #   | Action                                 | Target   | Disclosure                       | Decision                                                 |
| --- | -------------------------------------- | -------- | -------------------------------- | -------------------------------------------------------- |
| {N} | {create/update/move/scaffold/sync-nav} | `{path}` | {inline/link_only/omit/ask_user} | {approved_via_apply_all/approved/modified/skip/deferred} |
| ... |                                        |          |                                  |                                                          |

**Total:** {N} approved, {N} modified, {N} skipped

## Structured result

```json
{
  "analysisArtifact": "{path}",
  "approvedRecommendationIds": ["R-001"],
  "applied": ["R-001"],
  "skipped": [
    { "id": "R-002", "reason": "explicit_requires_interactive_approval" }
  ],
  "failed": []
}
```

Every input ID has exactly one outcome. Unattended explicit items are skipped
regardless of the supplied ID list. Missing/unknown class or ID blocks intake.
Use reason `manual` with the required change for unsupported scaffold work;
failed entries carry an ID and error/verification reason.

## Proceed?

Confirm to begin applying the approved documentation changes.
