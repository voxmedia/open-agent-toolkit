## Purpose

Revalidate the paused remote project-management discovery against current GitHub Issues, Linear, and Jira Cloud capabilities and the ways those providers can coexist in one OAT workflow.

This remains discovery work. It records a directional local-first, multi-provider model without approving a specification, design, implementation, or remote-write policy.

## Changes

- [x] Add evidence-backed [GitHub Issues](https://github.com/voxmedia/open-agent-toolkit/blob/t3code/oat-pjm-external-tracking/.oat/projects/shared/remote-project-management/reference/github-issues-provider-dossier-gpt-5-6-luna.md), [Linear](https://github.com/voxmedia/open-agent-toolkit/blob/t3code/oat-pjm-external-tracking/.oat/projects/shared/remote-project-management/reference/linear-provider-dossier-gpt-5-6-luna.md), and [Jira](https://github.com/voxmedia/open-agent-toolkit/blob/t3code/oat-pjm-external-tracking/.oat/projects/shared/remote-project-management/reference/jira-provider-dossier-gpt-5-6-luna.md) provider dossiers.
- [x] Reframe providers as complementary bindings rather than mutually exclusive repository configuration.
- [x] Define directional `source`, `planning`, `delivery`, and `reference` binding profiles.
- [x] Capture explicit intake, publish, refresh, reconcile, and closeout lifecycle operations.
- [x] Add GitHub-only, GitHub-to-Linear, GitHub-to-Jira, and offline representative workflows.
- [x] Require per-binding baselines, receipts, uncertainty handling, and concurrency-safe retry behavior.
- [x] Record that comments and assignees remain remote-only information and are not synchronized OAT fields.
- [x] Resume the project state in discovery while keeping the discovery HiLL checkpoint pending.

## Testing

- [x] `pnpm exec oxfmt --check` for the changed project artifacts
- [x] `git diff --check`
- [x] `oat project status --json`
- [x] Full repository CI-equivalent gates

## Breaking CLI grammar changes

- [x] Not applicable
- [ ] This PR changes CLI command or option placement.

## Notes

- No provider credentials or live tracker mutations were used.
- No commands, schemas, adapter interfaces, or storage layouts are finalized by this PR.
- Discovery remains in progress. Normalized fields, authority defaults, storage boundaries, transport precedence, approval policy, and closeout behavior remain open questions.
- All three provider adapters are part of the directional deliverable, but implementation may proceed incrementally after discovery, specification, and design approval.
