---
id: BL-260712-per-project-override
title: 'Per-project override to disable configured external gates'
status: open # open | in_progress | closed | wont_do
priority: medium # urgent | high | medium | low | none
scope: feature # idea | task | feature | initiative
scope_estimate: S # XS | S | M | L | XL | XXL
labels: [workflow-gates, configuration, ux]
assignee: null
created: '2026-07-12T20:57:00Z'
updated: '2026-07-12T20:57:00Z'
associated_issues: []
oat_template: true
oat_template_name: backlog-item
---

## Description

External gates (phase review gates and lifecycle gates via `gates.execTargets`)
are opt-in through configuration, but the opt-in is effectively global for a
config layer: a user who has gates configured and wants to skip them for one
specific project must edit their shared configuration to do so, then remember
to restore it. There is no project-scoped lever that says "gates are configured
here, but disabled for this project."

Add a per-project override — e.g. in the project's `state.md` frontmatter or a
project-scoped config key — that disables (or selectively narrows) configured
external gates for that project only, without touching the owning global/user
configuration. The override must be explicit, recorded evidence (dispatch and
gate records should show gates were configured-but-disabled by project
override, not unconfigured), and visible in progress/status output so a
disabled gate never looks like a passed or missing gate.

Origin: 2026-07-12 wall-clock cost review of the oat-project-fixture
hardening work — external gates are the second-largest time cost after the
coordinator layer, and the user identified the missing lever: "if you have the
configuration set for external gates but want to disable it for a specific
project, you shouldn't have to modify your config just to disable it for one
project."

## Acceptance Criteria

- A project-scoped setting disables configured external gates for that project
  without modifying user/global gate configuration
- Selective form supported or explicitly scoped out (e.g. disable phase gates
  but keep the lifecycle gate)
- Gate resolution records the configured-but-disabled state as explicit
  evidence, distinct from "no gate configured"
- Progress/status output surfaces the override so reviewers can see gates were
  deliberately disabled for the project
- Documentation updated (workflow-gates page and relevant project-config docs)
