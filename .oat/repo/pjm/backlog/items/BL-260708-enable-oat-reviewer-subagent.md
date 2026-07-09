---
id: BL-260708-enable-oat-reviewer-subagent
title: 'Enable oat-reviewer subagent orchestration for faster broad reviews'
status: open # open | in_progress | closed | wont_do
priority: high # urgent | high | medium | low | none
scope: feature # idea | task | feature | initiative
scope_estimate: M # XS | S | M | L | XL | XXL
labels: [reviews, subagents, orchestration, cost-control]
assignee: null
created: '2026-07-08T22:00:35Z'
updated: '2026-07-08T22:00:35Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

Gate reviews and final code reviews can be slow and expensive when a frontier reviewer model must enumerate many files, phases, docs, or generated artifacts on its own. Explore and implement guidance for `oat-reviewer` to orchestrate cheaper/faster subagents for bounded reconnaissance while keeping the primary reviewer responsible for source validation, synthesis, severity judgment, and final findings.

The intent is to increase parallelism and reduce review latency/cost without weakening review quality. Reconnaissance lanes should return compact evidence with file/line references; the main reviewer must verify load-bearing claims before using them in findings.

## Acceptance Criteria

- `oat-reviewer` guidance defines when reviewer subagent orchestration is appropriate, especially final code reviews, broad phase reviews, docs sweeps, and provider-view audits.
- The guidance clearly separates delegable reconnaissance from non-delegable reviewer responsibilities: synthesis, severity, source validation, final judgment, and user-facing findings remain with the primary reviewer.
- Dispatch guidance prefers cheaper/faster tiers for reconnaissance lanes when available and records how to avoid recursive or unbounded subagent fan-out.
- Review artifacts or reviewer prompts preserve evidence quality requirements, including compact reports with file/line references and explicit uncertainty.
- Tests or contract checks cover the new reviewer-orchestration wording so future skill/agent sync does not silently drop it.
- Documentation or workflow notes explain the expected latency/cost benefit and the safety boundary for broad reviews.
