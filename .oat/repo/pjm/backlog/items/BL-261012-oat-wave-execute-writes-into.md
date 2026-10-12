---
id: BL-261012-oat-wave-execute-writes-into
title: oat-wave-execute writes into the roll-up-owned Workflow Observations section
status: open
priority: medium
scope: task
scope_estimate: S
labels:
  - artifact-cleanup
  - skills
  - wave
assignee: null
created: 2026-10-12T04:48:59.076Z
updated: 2026-10-12T04:48:59.076Z
associated_issues: []
external_plans: []
---

## Description

Found by the artifact-cleanup p04-t02 documentation audit. oat-wave-execute SKILL.md (step 2 of wave closeout) and assets/orchestration-log-template.md tell the wave to roll its orchestration-log.md synthesis into summary.md ## Workflow Observations. oat project log rollup is the only writer of that section and replaces or removes it wholesale (it did so on main before artifact-cleanup too), so the wave's synthesis is lost at the next roll-up, for example during oat-project-complete. Route the wave synthesis through the project log (judgment entries the digest can select) or a summary section the roll-up does not own, and update the skill and template wording.

## Acceptance Criteria

- oat-wave-execute no longer instructs any write into summary.md ## Workflow Observations
- The wave's end-of-run synthesis survives a later oat project log rollup, shown by running roll-up on a project that holds it
- The skill's metadata.version is bumped and its contract pins are updated
