# Fix PR Completion Prompting and Pack Reconciliation in `oat tools update`

## Summary

Implement this as a provider-plan artifact intended for later import via `oat-project-import-plan`.

The change has two parts:

- Make OAT project state explicitly track PR creation so `oat-project-complete` skips the "Open a PR?" question when the project already has a tracked open PR.
- Make `oat tools update --pack <pack>` and `oat tools update --all` reconcile already-installed packs, including newly added bundled skills and agents that were not previously present locally.

## Implementation Changes

### 1. Explicit PR tracking for OAT project completion

- Extend the `state.md` frontmatter template with:
  - `oat_pr_status: null | ready | open | closed | merged`
  - `oat_pr_url: null | string`
- Update `oat-project-pr-final` so PR state is written deterministically:
  - After PR artifact generation, but before a PR exists, set `oat_pr_status: ready` and `oat_pr_url: null`.
  - After successful `gh pr create`, set `oat_pr_status: open` and persist the returned PR URL in `oat_pr_url`.
- Update `oat-project-complete` to read PR fields before batching questions:
  - If `oat_pr_status == open`, do not ask whether to open a PR.
  - If `oat_pr_status != open`, keep the current prompt behavior.
  - When a PR URL is present, show it in the completion summary instead of asking to create a new PR.
- Keep `oat_phase_status` behavior unchanged. `pr_open` remains routing state; `oat_pr_status` becomes the source of truth for actual PR existence.
- Update lifecycle and state docs and skill text anywhere they currently imply that `pr_open` alone means a PR definitely exists.

### 2. Reconcile installed packs during `tools update`

- Keep `oat tools update <name>` unchanged: it updates one installed tool only and does not install unrelated pack members.
- For `oat tools update --pack <pack>` and `oat tools update --all`:
  - Detect installed packs per scope from existing bundled tools already present in that scope.
  - Enumerate bundled members for those packs from the pack manifest source of truth.
  - Treat missing bundled members as update candidates for that same scope.
- Copy missing bundled skills and agents alongside normal outdated updates.
- Do not install anything for packs that have no installed presence in a scope.
- Keep reconciliation internal to `tools update`; do not change `tools list` or `tools outdated` output in this pass.
- Update core-pack handling so `.oat/docs` is refreshed whenever core is reconciled, including via `--all`, not only via explicit `--pack core`.

## Public Interfaces

- `state.md` frontmatter gains:
  - `oat_pr_status`
  - `oat_pr_url`
- No new CLI flags or command names.
- No change to existing `oat_phase_status` values.

## Test Plan

- Add unit coverage for `tools update`:
  - `--pack <pack>` updates outdated members and installs newly added bundled members missing from an installed pack.
  - `--all` installs missing bundled members only for packs already present in that scope.
  - Name-based update remains update-only.
  - Core reconciliation refreshes `.oat/docs` for both `--pack core` and `--all`.
- Add lifecycle and skill acceptance coverage for PR tracking:
  - `oat-project-pr-final` writes `ready` before PR creation and `open` plus URL after successful creation.
  - `oat-project-complete` omits the PR question when `oat_pr_status: open`.
  - `oat-project-complete` still asks when PR state is `null` or `ready`.
- Manual verification:
  - Run `oat-project-pr-final`, then `oat-project-complete`, and confirm no duplicate PR prompt.
  - Run `oat tools update --all` against an older installed pack and confirm newly added bundled members are installed into the same scope.

## Assumptions

- Installed-pack presence is inferred from existing bundled members already present in a scope; this change does not add a separate persisted pack registry.
- This fixes the in-flow OAT case. PRs created entirely outside OAT remain untracked unless a later command writes `oat_pr_status` and `oat_pr_url`.
- After approval, this plan should be imported into an OAT project with `oat-project-import-plan` before implementation.
