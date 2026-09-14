# Tracked package fixture provenance

These fixtures are byte-for-byte snapshots of the three package inputs read by
`verifyRun`. They intentionally exclude manifests, QA evidence, themes, and
`source/fact-base.md`.

| Fixture           | Source package                                                                         | Run ID                                 | Source commit                              |
| ----------------- | -------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| project-explainer | `.oat/projects/shared/agent-authored-recap/explainers/agent-authored-recap-explainer/` | `40b9a35e-8f2a-419c-be2a-9f28eae4215a` | `4febb8634ab14afeba12dfa5863de5b3464a2e75` |
| program-recap     | `.oat/repo/reference/explainers/2026-08-31-execution-program-recap/`                   | `c07644cf-a5f3-4e88-8993-124ff83fa7d1` | `4febb8634ab14afeba12dfa5863de5b3464a2e75` |

Each fixture contains only `site/index.html`, `source/ledger.json`, and
`source/fact-base.json`.
