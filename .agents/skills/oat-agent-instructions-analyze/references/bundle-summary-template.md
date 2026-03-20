---
bundle_version: 1
analysis_artifact: { artifact-path }
manifest: recommendations.yaml
pack_count: { N }
generated_at: { YYYY-MM-DD }
---

# Agent Instructions Analysis Bundle Summary

Companion bundle for `{artifact-path}`.

## Purpose

This bundle is the machine-oriented handoff for `oat-agent-instructions-apply`.
The markdown analysis artifact remains the reviewer-facing summary. If they diverge, the bundle wins for generation.

## Recommendation Index

| ID        | Action          | Target   | Provider / Format   | Pack               | Notes             |
| --------- | --------------- | -------- | ------------------- | ------------------ | ----------------- |
| `rec-001` | {create/update} | `{path}` | {provider / format} | `packs/rec-001.md` | {short rationale} |
| ...       |                 |          |                     |                    |                   |

## Validation Rules

- Every recommendation in `recommendations.yaml` must appear in this table.
- Every listed pack file must exist under `packs/`.
- Recommendation IDs must match across the markdown artifact, the manifest, and the pack filename.
- Apply may use this summary for quick context, but it should load the manifest and matching pack before generating
  output.
