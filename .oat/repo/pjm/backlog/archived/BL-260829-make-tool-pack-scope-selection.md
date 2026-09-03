---
id: BL-260829-make-tool-pack-scope-selection
title: Make tool-pack scope, provider reachability, and dispatch state truthful
status: closed
priority: urgent
scope: feature
scope_estimate: L
labels:
  - tool-packs
  - scope
  - config
  - inventory
  - provider
  - cli
  - sync
  - agents
  - dispatch
  - provenance
assignee: null
created: 2026-08-29T00:25:34.986Z
updated: '2026-09-03T00:56:44Z'
associated_issues: []
external_plans: []
---

## Description

Make interactive tool-pack installation preserve and report the user's actual
requested scopes, and make the resulting canonical assets, provider views, and
subagent dispatch behavior agree with that state. The picker currently treats
declared `tools.*` configuration as if it were verified physical placement, so
it can show `installed: project + user` before any project assets exist. In the
reported run, the ideas, utility, research, and brainstorm prompts each
received `User scope`, but the realized installation summary recorded
`project + user`.

The same run exposed the next boundary of the user-scope tool-pack feature:
canonical user-scope agents can exist under `~/.agents/agents/` while the
active Claude session has no corresponding `~/.claude/agents/` view. A generic
user-scope sync currently enumerates skills only, even though provider path
mappings advertise agent directories. This leaves `oat-phase-implementer` and
`oat-reviewer` unavailable to native dispatch and encourages a generic-child
fallback whose behavior must not be represented as native-role equivalence.

Define one explicit state model across declared intent, verified canonical
installation, provider materialization, session catalog visibility, and
dispatch provenance. Preserve additive installation and safe provider-directory
ownership where they are intentional, but do not let stale intent or a hidden
provider limitation silently change the user's selected scope. Source:
[GitHub issue #228](https://github.com/voxmedia/open-agent-toolkit/issues/228),
[verbatim transcript comment](https://github.com/voxmedia/open-agent-toolkit/issues/228#issuecomment-5459103358).

Related boundaries: [BL-260818-make-the-project-management](../archived/BL-260818-make-the-project-management.md)
shipped user-scope eligibility; [BL-260827-clean-up-tool-pack-lifecycle](../archived/BL-260827-clean-up-tool-pack-lifecycle.md)
completed the adjacent lifecycle/config consistency work, while this item owns
the remaining scope-selection and provider-truthfulness follow-up;
[BL-260827-correct-scope-and-adoption](BL-260827-correct-scope-and-adoption.md)
contains the existing provider-aware diagnostic project but intentionally does
not broaden user-agent syncing; [BL-260724-support-provider-directory](BL-260724-support-provider-directory.md)
owns collection-level provider symlink adoption and divergence safety;
[BL-260828-add-project-level-oat-guidance](BL-260828-add-project-level-oat-guidance.md)
owns AGENTS.md guidance; and [BL-260826-populate-native-subagent](BL-260826-populate-native-subagent.md)
owns runtime observation rather than native-role materialization.

The implementation should reconcile the seams currently represented by
`packages/cli/src/commands/init/tools/index.ts`,
`packages/cli/src/commands/init/tools/install-state.ts`,
`packages/cli/src/shared/types.ts`, `packages/cli/src/engine/compute-plan.ts`,
the provider path mappings, `pack-inventory.ts`, and the OAT dispatch/review
skills. A project-scope installation remains a valid recovery path, but a
user-scope installation must either reach every configured supported provider
or report the unsupported provider/scope boundary explicitly.

## Acceptance Criteria

- Define and implement a single state model that keeps these dimensions
  distinct and inspectable: scope intent declared in project or user config,
  verified canonical asset presence/completeness, provider-view materialization,
  provider-session catalog visibility, and dispatch runtime observation. A
  declared intent is not physical-install evidence, and provider visibility is
  not inferred from canonical presence alone.
- Picker placement annotations are derived from verified managed assets and
  provider/inventory evidence, not from `tools.*` declarations alone. A
  declared-but-absent project install is not displayed as `installed: project`
  or `installed: project + user`; if intent is shown, it is clearly labeled as
  intent rather than installation.
- Selecting `User scope` for a pack that has no verified project installation
  installs that pack at user scope only. The reported ideas, utility, research,
  and brainstorm selections each have regression coverage for this exact
  interaction, including the picker labels shown before installation begins.
- Existing verified project or user placement is preserved according to the
  documented additive/reconciliation contract. A resulting `project + user`
  placement occurs only when both scopes were already realized or the user
  explicitly selected both; stale declarations, missing assets, and picker
  annotations cannot silently add a scope.
- The installer writes scoped configuration and canonical assets for the
  resolved end state, auto-syncs only scopes that actually changed, and reports
  the same realized placement in its completion summary. Partial writes,
  failed reconciliation, and post-apply verification failures leave intent and
  unrelated content safe and diagnosable.
- `oat tools list`, init picker state, sync planning, install output, and
  post-install diagnostics agree for absent, declared-but-absent, partial,
  current, drifted, duplicate, and provider-unreachable installations. Human
  and JSON output use the same placement and reachability facts.
- User-scope provider capability is evaluated as an explicit provider x scope x
  content-type matrix. The matrix covers skills, agents, rules, and any other
  managed content; it respects provider configuration authority: explicitly
  enabled providers are active even when undetected, explicitly disabled
  providers are inactive even when detected, unset-plus-detected providers are
  active, and unset-plus-undetected providers are inactive.
- For every active supported provider with a user agent directory, user-scope
  sync materializes the supported managed OAT agents, including the phase
  implementer and reviewer roles. Claude's `~/.claude/agents/` path is covered
  explicitly; the current special-case exception must not hide missing managed
  roles from diagnostics. If a provider/content type is genuinely unsupported,
  sync and install fail closed with an actionable project-scope or provider
  configuration recovery path rather than silently omitting the view.
- Canonical installation and provider visibility are reported separately. A
  pack can be complete in `~/.agents/` while unavailable to Claude, and that
  state produces a named diagnostic with the affected managed agents, provider,
  scope, recovery command, and whether a session restart is required. The
  diagnostic does not falsely claim that a bundled-role exception makes every
  user-scope agent reachable.
- `oat init`, aggregate tool-pack installation, standalone pack installation,
  and `oat sync` clearly announce when canonical agents were installed but are
  not visible to the active provider. The message distinguishes a missing
  provider view, an unsupported content type, a disabled provider, and a
  provider session whose catalog must be restarted or refreshed.
- After materialization changes a provider's agent catalog, the user-facing
  result explicitly states the provider restart/refresh requirement when the
  provider loads agent metadata only at session startup. The notice is
  actionable and does not claim that restarting can repair a missing or
  unsupported materialization.
- Native dispatch and fallback records distinguish: resolved native role;
  native role unavailable before launch; exact provider/model/role target;
  generic-child or fresh-session fallback; canonical role-file instructions;
  fallback reason; and runtime observation. A generic child with copied role
  instructions is recorded as a fallback approximation, never as proof of
  native-role equivalence.
- Fallback dispatch preserves the resolved target, model pin, provider,
  authority boundary, role-file path/version, requested tool or sandbox
  settings, and pre-start rejection evidence. It does not silently substitute a
  different role or model, and the record remains sufficient to explain why
  `subagent_type: oat-phase-implementer` or `oat-reviewer` was rejected.
- Provider collection-directory symlinks integrate with the existing
  `BL-260724` contract: exact-target aliases are adopted only when safe,
  unmanaged divergence causes per-entry fallback, manifest ownership remains
  explicit, and provider disablement or alias rejection cannot delete
  canonical user assets. This item does not duplicate that directory-safety
  implementation.
- Repeated initialization, installation, sync, and provider refresh are
  idempotent. They do not migrate, duplicate, prune, or overwrite a pack,
  provider view, user configuration, custom agent, or AGENTS.md section merely
  because declared intent or stale manifest state is present.
- Focused unit and integration tests cover declared-but-absent placement,
  project-only, user-only, both-scope, partial-install, all four reported
  user-scope selections, explicit both selection, repeated runs, auto-sync
  scope reporting, provider enable/disable/detection combinations, Claude
  user-agent materialization, hidden special-role diagnostics, unsupported
  content types, restart notices, native-role rejection, exact fallback
  provenance, directory divergence, and failed reconciliation.
- User-facing picker, scope, inventory, sync, provider-materialization, and
  dispatch documentation encode the same distinction between intent,
  installation, provider visibility, and runtime observation. The exact issue
  #228 comment and all related backlog boundaries remain linked in the item.
- The implementation is reconciled with `BL-260827-correct-scope-and-adoption`
  without preserving its current diagnostic-only limitation: that item may own
  shared inventory/diagnostic mechanics, while this item owns the user-scope
  provider materialization and end-to-end install/dispatch contract. The
  existing lifecycle, provider-directory, AGENTS.md-guidance, and
  native-subagent records retain their stated ownership boundaries.
