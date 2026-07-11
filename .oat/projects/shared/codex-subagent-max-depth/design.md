---
oat_status: complete
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-10
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: codex-subagent-max-depth

## Overview

This change makes OAT's existing native Codex execution topology runnable and
unambiguous without changing the topology itself. Materializing any managed
Codex role will ensure the target configuration resolves
`agents.max_depth >= 2`, allowing a root session at depth 0 to spawn a phase
coordinator at depth 1 and that coordinator to spawn one exact task worker at
depth 2.

The dispatch contract will also distinguish exact launch control from runtime
telemetry. Selecting a resolver-returned materialized role as the native
`agent_type` is sufficient launcher-declared model/effort provenance. Missing
agent self-reporting or independent runtime telemetry does not make the role
unavailable and must not trigger the nested `codex exec` fallback. That fallback
remains available only after an actual native role-selection rejection.

## Architecture

### System Context

The implementation extends existing boundaries rather than adding a new
service or dispatch abstraction.

**Key Components:**

- **Scope-aware Codex config input:** Resolves the target config and any
  lower-precedence user depth relevant to preserving an existing preference.
- **Shared Codex config merge:** Applies the depth floor while preserving
  unrelated settings, custom roles, higher depth values, and idempotence.
- **Codex doctor check:** Diagnoses managed-role configs whose effective depth
  cannot support OAT's coordinator/worker topology.
- **Native dispatch contract:** Makes exact `agent_type` payload selection the
  correctness boundary and keeps self-reporting non-authoritative.
- **Generated provider assets:** Propagates canonical skill/docs changes through
  normal bundling and sync.

### Component Diagram

```text
project/user materialization request
            |
            v
scope resolver ---- read-only inherited user depth (project scope only)
            |
            v
shared Codex config merge ---- managed role registrations
            |                  features.multi_agent = true
            |                  agents.max_depth >= 2
            v
target .codex/config.toml only

root launcher -- exact coordinator agent_type --> phase coordinator
                                                    |
                               exact worker agent_type
                                                    v
                                               task worker
```

### Data Flow

1. Resolve the requested materialization scope and its single writable Codex
   config path.
2. For project scope, read the user Codex depth only as a lower-precedence
   input; never write user configuration.
3. Parse the target TOML and compute
   `max(2, target max_depth, inherited user max_depth)`, considering only valid
   numeric values.
4. Merge managed roles and `features.multi_agent` as today, serialize once, and
   write only when bytes differ.
5. During implementation, resolve the exact model/effort candidate and compile
   its materialized role.
6. Build the native spawn payload with that role as `agent_type`, record
   launcher-declared axes and producer provenance, and dispatch it.
7. Use a pinned CLI child only when native role selection is actually rejected,
   not when runtime model telemetry is unavailable.

The inherited-depth read prevents a project override from accidentally lowering
an existing user-level value. Codex gives trusted project config higher
precedence than user config, so writing project depth `2` over user depth `3`
would otherwise reduce the effective value.

## Component Design

### Shared Depth-Aware Config Merge

**Purpose:** Keep sync and direct materialization on one deterministic merge
contract.

**Responsibilities:**

- Treat missing, non-numeric, or numeric values below `2` as requiring `2`.
- Preserve equal and higher target values.
- Preserve a higher inherited user value when writing project config.
- Preserve unrelated top-level tables, feature keys, and custom roles.
- Keep repeated merges byte-stable.

**Interface adjustment:**

```typescript
interface CodexConfigMergeArgs {
  existingContent: string | null;
  desiredRoles: CodexManagedRoleConfig[];
  staleManagedRoles?: string[];
  inheritedMaxDepth?: number;
}
```

The merge remains pure. Scope-specific callers may supply
`inheritedMaxDepth`; the merge never reads or writes another scope itself.
Any new helper function will carry JSDoc and accept an object argument when it
needs three or more inputs.

### Scope-Aware Materialization

**Purpose:** Supply the correct merge inputs without crossing write boundaries.

**Responsibilities:**

- Project sync and direct project materialization write only
  `<project>/.codex/config.toml`.
- User sync and explicit `--scope user` materialization write only
  `~/.codex/config.toml`.
- Project materialization may read user `agents.max_depth` to avoid overriding a
  higher lower-precedence value.
- User materialization has no inherited project input.
- Dry-run remains non-mutating while reporting the target config operation.

### Doctor and Preflight

**Purpose:** Explain why a managed Codex role surface cannot execute OAT's
native nested topology.

**Responsibilities:**

- Run only when managed Codex roles are detected in the inspected scope.
- Pass when effective `agents.max_depth` is numeric and at least `2`.
- Warn when missing, invalid, or below `2`.
- State that OAT requires
  `root (0) → phase coordinator (1) → task worker (2)`.
- Recommend `oat sync --scope project` for project scope and
  `oat sync --scope user` for user scope.
- Mention direct materialization with the matching explicit scope when a single
  role is the intended repair.

For project diagnosis, effective depth follows Codex precedence: a project
value wins when present; otherwise the user value is inherited. The repair
still writes only the requested project config and preserves any higher user
value.

### Native Dispatch and Provenance

**Purpose:** Prevent missing runtime telemetry from being misclassified as
native role unavailability.

**Responsibilities:**

- Require the actual native payload to contain the resolver-returned Codex
  variant as `agent_type`.
- Derive model and effort axes from resolver output and the compiled payload.
- Record producer identity as `declared` when an exact materialized role pins
  the model family.
- Treat coordinator and worker self-reported model/effort as optional,
  non-authoritative diagnostics.
- Keep task reports focused on task ID, result, commit, verification, changed
  files, and concerns. A target echo may remain for correlation but is not
  proof.
- Attempt the native exact-role dispatch before considering a fresh child.
- Enter the fresh-child fallback only after an actual unsupported or rejected
  `agent_type` result. A started child that later returns `BLOCKED` is a task
  outcome, not a role-selection failure.

## Error Handling

- Invalid TOML continues to fail before any write.
- Invalid `max_depth` values are repaired to the safe floor during
  materialization and warned on by doctor before repair.
- A native role-selection rejection may use the existing exact pinned-child
  fallback.
- Missing self-report or runtime model telemetry never triggers fallback.
- A managed candidate that lacks a materialized variant or cannot be launched
  exactly still blocks; generic/base-role downgrade remains forbidden.
- Scope resolution failures occur before writes, preventing partial
  project/user mutation.

## Testing Strategy

### Unit Tests

- Shared merge: missing, lower, equal, and higher target depth.
- Shared merge: higher inherited user depth is preserved in project output.
- Shared merge: invalid depth repair, unrelated configuration preservation,
  custom role preservation, and repeated idempotence.
- Doctor: managed-role pass at `2` and above; warning for missing, invalid, and
  lower values; no depth warning when no managed role exists.
- Skill contracts: exact native `agent_type` is sufficient declared
  provenance; missing self-report is not unavailability; CLI fallback requires
  an actual native selection rejection.

### Integration Tests

- Direct project materialization changes only project config.
- Explicit user materialization changes only user config.
- Project materialization reads but does not mutate a higher user depth.
- Project and user sync output report the correct config create/update/skip
  operation and converge on a second run.
- Doctor emits scope-appropriate sync/materialization remediation.

### Generated and Release Verification

- Run normal asset bundling and provider sync; do not hand-edit derived views.
- Bump the canonical implementation skill version once if its instructions
  change.
- Bump all five lockstep public package versions.
- Run focused CLI tests, skill validation, formatting, lint, type-check, build
  checks appropriate to touched surfaces, and `pnpm release:validate`.

## Open Questions

- None.

## References

- Discovery: `discovery.md`
- Codex configuration precedence:
  `https://developers.openai.com/codex/config-basic`
- Codex subagent depth and role configuration:
  `https://developers.openai.com/codex/subagents`
