---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-10
oat_generated: false
oat_template: false
oat_template_name: discovery
---

# Discovery: claude-instructions-sync

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Create a capability for syncing `AGENTS.md` files to `CLAUDE.md` files throughout a project tree. The feature needs to support nested directories all the way down the repo, adopt `CLAUDE.md` files when no sibling `AGENTS.md` exists, and support multiple sync strategies:

- pointer file content like `@AGENTS.md`
- symlinked `CLAUDE.md`
- hard-copy `CLAUDE.md`

## Clarifying Questions

### Question 1: Scope

**Q:** Should this include user-level provider roots such as `~/.claude`, `~/.codex`, `~/.cursor`, and `~/.copilot` in the first release?
**A:** No. Keep the first release project-only.
**Decision:** V1 is limited to repo-scoped recursive discovery and repair. User-level scanning is deferred.

### Question 2: Workflow Placement

**Q:** Should this live in the existing `oat instructions` lane or be promoted into the broader provider-sync manifest engine?
**A:** Extend the current instructions workflow rather than refactoring provider sync.
**Decision:** Implement this as an expansion of `oat instructions validate` / `oat instructions sync`.

## Solution Space

### Approach 1: Expand `oat instructions` with strategy-aware sync and adoption _(Recommended)_

**Description:** Keep `AGENTS.md` / `CLAUDE.md` handling in the existing instructions command family, but broaden discovery to recognize paired and unpaired files, strategy-aware drift, and adoptable `CLAUDE.md` strays.
**When this is the right choice:** Best when the goal is to evolve the current project-scoped instruction workflow without changing the provider-sync manifest model.
**Tradeoffs:** Adds complexity to `oat instructions`, but avoids inventing a second control plane for instruction files.

### Approach 2: Promote instruction files into the provider-sync engine

**Description:** Treat `AGENTS.md` / `CLAUDE.md` relationships like any other canonical-to-provider mapping and manage them through manifest-backed provider sync.
**When this is the right choice:** Best when instruction files must participate in the same drift, manifest, and removal semantics as provider assets under `.agents/**`.
**Tradeoffs:** Over-scoped for the first release. It would require new content modeling and manifest semantics for top-level repo files.

### Approach 3: Keep the current pointer-only integrity checks

**Description:** Preserve the current `@AGENTS.md` pointer contract and add only limited repair coverage.
**When this is the right choice:** Best when the requirement is strict pointer consistency and no alternate strategies or adoption flows are needed.
**Tradeoffs:** Does not meet the requested need for symlink, copy, and stray adoption behavior.

### Chosen Direction

**Approach:** Expand `oat instructions` with project-scoped strategy-aware sync and `CLAUDE.md` adoption.
**Rationale:** The repo already has nested `AGENTS.md` discovery and `CLAUDE.md` pointer validation in the instructions command lane, so this is the smallest coherent extension that satisfies the requested behavior.
**User validated:** Yes

## Options Considered

### Option A: Project + user scope in the first release

**Description:** Implement repo-scoped recursion and provider-root user-scope scanning together.

**Pros:**

- Solves both repo-local and home-directory use cases immediately
- Avoids revisiting the command surface later for scope expansion

**Cons:**

- Requires additional discovery-root logic for enabled/detected providers
- Adds more behavior and testing surface before the command model is stabilized

**Chosen:** B

### Option B: Project-only first release

**Description:** Limit discovery, repair, and adoption to directories inside the current repository.

**Pros:**

- Fits the existing recursive scanner model
- Keeps the first implementation bounded and easier to validate

**Cons:**

- Defers user-level support
- May require a later extension to the instructions command surface

**Chosen:** B

**Summary:** Start with project-only support and defer user-level provider roots until the project-scoped model is stable.

## Key Decisions

1. **Workflow placement:** Extend `oat instructions` rather than refactoring the provider-sync engine.
2. **Release scope:** Limit V1 to project scope only.
3. **Discovery model:** Detect both `AGENTS.md` and `CLAUDE.md` so the workflow can identify valid pairs, drift, and adoptable Claude-only strays.
4. **Strategy support:** Support pointer, symlink, and hard-copy strategies for generating or repairing `CLAUDE.md`.
5. **Adoption behavior:** When a directory contains `CLAUDE.md` but no `AGENTS.md`, adopt the Claude file into canonical `AGENTS.md` and then regenerate `CLAUDE.md` using the selected strategy.

## Constraints

- Project scope only for this release
- Recursive support for nested directories throughout the repo
- No implementation through the main provider-sync manifest engine in V1
- Preserve the existing `oat instructions` validation/sync entry points
- Avoid unsafe content loss when adopting or overwriting files

## Success Criteria

- `oat instructions validate` can distinguish valid pairs, drifted pairs, missing files, and adoptable `CLAUDE.md` strays in nested project directories
- `oat instructions sync` can create or repair `CLAUDE.md` using pointer, symlink, or copy strategies
- Claude-only stray directories can be adopted into `AGENTS.md` with clear conflict handling
- Existing nested discovery exclusions continue to prevent scans of `.git`, `.oat`, `.worktrees`, and `node_modules`
- Project-only behavior is documented and covered by tests

## Out of Scope

- User-level provider-root scanning under home-directory config
- Refactoring instruction files into manifest-managed provider sync entries
- Adding non-Claude provider-specific instruction file behavior in this project

## Deferred Ideas

- User-scope support for roots like `~/.claude` and `~/.cursor` - deferred to keep the first release bounded to repo-local behavior
- Broader provider-sync manifest integration - deferred because command-layer extension is sufficient for the requested functionality

## Open Questions

- **Strategy persistence:** Should strategy defaults live only on the CLI at first, or also in project config for repeatable sync behavior?
- **Adoption UX:** Should Claude-only adoption happen automatically during `sync`, or require an explicit flag such as `--adopt-strays`?

## Assumptions

- Existing `oat instructions` consumers expect project-scoped recursive discovery
- `createSymlink` from the shared FS helpers is sufficient for file-level symlink creation with copy fallback where needed
- The repo’s command help snapshots and docs should be updated alongside the behavior change

## Risks

- **Overwriting or adopting the wrong file:** Strategy-aware repair and Claude-only adoption increase the chance of destructive behavior if states are misclassified
  - **Likelihood:** Medium
  - **Impact:** High
  - **Mitigation Ideas:** Make scan states explicit, require force for destructive overwrite paths, and cover edge cases with integration tests

- **Command-surface drift:** Adding more behavior to `oat instructions` can make reports, JSON payloads, and tests inconsistent if the state model is not updated cleanly
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Update types, formatters, integration tests, and help snapshots together

## Next Steps

- Proceed directly to quick-mode planning
- Generate implementation tasks for scan/state modeling, strategy-aware sync, Claude-only adoption, and test/docs updates
- Hand off to `oat-project-implement` once the plan and implementation tracker are finalized
