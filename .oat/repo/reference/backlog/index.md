# OAT Backlog Index

> Generated backlog table lives inside the managed section below. Keep curated narrative updates in the overview section so CLI regeneration stays safe.

## Curated Overview

- `bl-42f9` tracks the only in-progress backlog item and is currently being delivered through the active `local-project-management` project.
- Workflow backlog work is now concentrated on the remaining completion-state helper cleanup (`bl-0ace`), configurable lifecycle follow-through (`bl-fb3f`), and a Jira-oriented backlog refinement flow.
- `bl-ea64` moved to completed history after the archive-sync-closeout-config project shipped S3-backed archive sync, completion-time archive upload/export behavior, and related config discoverability improvements.
- Planned follow-on investments cluster around provider ergonomics (`bl-cbdd`), review collaboration (`bl-9fb8`), dependency analysis (`bl-3327`), and ideas-to-project promotion (`bl-b3f7`).
- Longer-horizon backlog work now includes explicit entries for freshness hardening (`bl-f9bd`) and memory/provider-enhancement work (`bl-71a1`).
- Control-plane follow-through now has an explicit low-priority item: `bl-931d` tracks a possible `listProjects()` summary fast path, but only if real performance measurements show the current full-state assembly is too expensive.
- `bl-281c` captures the broader follow-up from PR #38: migrate read-only skills to `oat project status --json` (instead of manual file parsing) and fix the cloud-environment gap by adding `npx @open-agent-toolkit/cli` fallback when `oat` isn't installed. This was intentionally kept out of the workflow-friction project to avoid scope creep.
- `bl-af93` captures a small-but-sharp CLI gap discovered while dogfooding workflow preferences: there's no `oat config unset <key>` command, so users cannot remove a config value without hand-editing JSON. Especially load-bearing for enum workflow keys (`hillCheckpointDefault`, `postImplementSequence`, `reviewExecutionModel`) where no value represents "prompt me again" — once set, the user is stuck unless they edit `~/.oat/config.json` directly.

<!-- OAT BACKLOG-INDEX -->

| ID      | Title                                                                                           | Status      | Priority | Scope      | Estimate |
| ------- | ----------------------------------------------------------------------------------------------- | ----------- | -------- | ---------- | -------- |
| bl-42f9 | Add first-class OAT project/repo management workflow family (oat-pjm-_ or oat-repo-reference-_) | in_progress | high     | initiative | XL       |
| bl-af93 | Add `oat config unset <key>` command for removing config values                                 | open        | medium   | feature    | S        |
| bl-fb3f | Add configurable autonomous project lifecycle follow-through                                    | open        | medium   | feature    | L        |
| bl-3327 | Add dependency intelligence skill family                                                        | open        | medium   | feature    | L        |
| bl-b3f7 | Add idea promotion and auto-discovery flow to oat-project-new                                   | open        | medium   | feature    | L        |
| bl-9fb8 | Add PR review follow-on skill set (provide-remote, respond-remote, summarize-remote)            | open        | medium   | feature    | L        |
| bl-ff5d | Backlog Refinement Flow (Jira ticket generation)                                                | open        | medium   | feature    | L        |
| bl-281c | Migrate skills to control-plane-backed CLI with cloud-env fallback                              | open        | medium   | initiative | L        |
| bl-0ace | Move oat-project-complete state mutations into a CLI helper                                     | in_progress | medium   | feature    | M        |
| bl-cbdd | Optional Codex prompt-wrapper generation for synced OAT skills                                  | open        | medium   | feature    | M        |
| bl-f9bd | Staleness + knowledge drift upgrades                                                            | open        | medium   | feature    | L        |
| bl-71a1 | Memory system + provider enhancements                                                           | open        | low      | initiative | XL       |
| bl-931d | Optimize control-plane `listProjects()` summary path                                            | open        | low      | task       | M        |

<!-- END OAT BACKLOG-INDEX -->

## Notes

- Active item files live in `backlog/items/`
- Archived item files live in `backlog/archived/`
- Historical completions are summarized in `backlog/completed.md`
