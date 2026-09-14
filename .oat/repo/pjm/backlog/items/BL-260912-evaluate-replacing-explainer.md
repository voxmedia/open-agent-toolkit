---
id: BL-260912-evaluate-replacing-explainer
title: Evaluate replacing Explainer Kit authoring guidance with a pinned
  Effective HTML subset
status: open
priority: medium
scope: task
scope_estimate: M
labels:
  - explainer
  - simplification
  - upstream
  - evaluation
assignee: null
created: 2026-09-12T02:12:11.468Z
updated: 2026-09-12T02:12:11.468Z
associated_issues: []
external_plans: []
---

## Description

After the agent-authored-recap project completes, evaluate whether the custom visual-authoring guidance and templates behind the stable OAT wrapper/router should be replaced by a pinned, attributed subset of plannotator/effective-html. Preserve OAT-owned source binding, recipes, verification, immutable package recording, lifecycle outcomes, and the strict project-recap archive boundary; measure the actual maintenance, portability, quality, and supply-chain tradeoffs before deciding.

## Acceptance Criteria

- [ ] Inventory the current wrapper/router boundary and identify exactly which
      Explainer Kit authoring references, templates, themes, and tests a pinned
      Effective HTML subset could replace; keep OAT-owned input binding,
      recipes, verification, manifest/package recording, lifecycle outcomes,
      and project-recap archive validation explicitly out of replacement scope.
- [ ] Select and record one immutable upstream commit, the minimal candidate
      file subset, its MIT license/provenance obligations, and an offline OAT
      distribution/update strategy. Do not fetch an unpinned latest revision
      during user installation.
- [ ] Produce a disposable paired prototype from the same representative
      fact-base and recipe: one artifact through the shipped authoring path and
      one through the pinned candidate guidance. Run the same OAT static,
      traceability, browser, manifest/hash, and inventory checks and compare
      the 320, 768, and 1440 pixel results. Do not overwrite the tracked
      acceptance package.
- [ ] Quantify the expected gain and cost: bundled files and maintained prose,
      duplicated guidance, test surface, provider portability, output quality,
      installation/update work, supply-chain exposure, and upstream drift.
- [ ] Check candidate guidance for conflicting behavior—especially public
      `tot` publication, output outside the selected run root, external network
      dependencies, or looser script safety—and document the wrapper overrides
      required to preserve current policy.
- [ ] Produce a concrete keep/replace recommendation and migration boundary. If
      adoption is recommended, require a durable decision record and a
      separately planned implementation rather than changing the authoring
      layer as part of this evaluation.
