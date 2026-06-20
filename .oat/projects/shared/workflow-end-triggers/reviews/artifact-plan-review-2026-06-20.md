---
oat_generated: true
oat_generated_at: 2026-06-20
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: manual
oat_project: .oat/projects/shared/workflow-end-triggers
---

# Artifact Review: plan

**Reviewed:** 2026-06-20
**Scope:** Plan artifact review for the quick-mode `workflow-end-triggers`
project, with `design.md` included because the user explicitly requested review
of the incorporated design/plan discussion.
**Files reviewed:** 8
**Commits:** n/a (artifact review)

## Summary

The plan is close and captures the V1/V2 split correctly: V1 is runtime-level
cross-provider execution, while same-target/model-level selection is deferred to
`bl-e6fc`. The remaining gaps are in executable command semantics. In
particular, the plan stores policy and argv-shaped provider commands but does not
yet define enough CLI plumbing for those values to reliably affect
`cross-provider-exec`.

## Findings

### Critical

None.

### Important

1. **`execPolicy.avoid` is configured, but `cross-provider-exec` has no way to read it.**
   - Evidence: `design.md` defines `GateConfig.execPolicy?: { avoid?: GateAvoid }`
     and documents `avoid: none` as changing the dispatcher selection behavior
     (`.oat/projects/shared/workflow-end-triggers/design.md:107`,
     `.oat/projects/shared/workflow-end-triggers/design.md:112`,
     `.oat/projects/shared/workflow-end-triggers/design.md:164`).
   - Evidence: the plan normalizes `execPolicy.avoid` and exposes `gate set
--avoid`, but the dispatcher task is only `oat gate cross-provider-exec
<prompt...>` and the Gate Execution prose runs the configured `command`
     unchanged (`.oat/projects/shared/workflow-end-triggers/plan.md:62`,
     `.oat/projects/shared/workflow-end-triggers/plan.md:225`,
     `.oat/projects/shared/workflow-end-triggers/plan.md:245`,
     `.oat/projects/shared/workflow-end-triggers/plan.md:275`,
     `.oat/projects/shared/workflow-end-triggers/plan.md:276`).
   - Impact: a user can configure `execPolicy.avoid: "none"` and see it round-trip
     through schema/write surfaces, but the dispatcher has no resolved gate,
     skill name, flag, or environment contract from which to consume that
     setting. The default `same-runtime` path can work, but the planned V1
     `avoid: none` feature is effectively inert.
   - Fix guidance: add an explicit policy handoff. Reasonable options are:
     `cross-provider-exec --avoid <same-runtime|none>` plus a Gate Execution step
     that derives the flag from the resolved gate; or an environment contract such
     as `OAT_GATE_AVOID` exported before running the command; or remove
     `execPolicy` from V1 and require policy to live inside the command itself.
     Add tests proving a configured `avoid: none` gate can select a same-runtime
     target.

2. **The planned `gate target set` argv surface cannot reliably accept provider commands with flags.**
   - Evidence: `ExecTarget.baseCommand` is intentionally `string[]` so model and
     effort flags can be opaque argv, and the backlog follow-up examples already
     rely on commands such as `["claude","-p","--model","opus"]`
     (`.oat/projects/shared/workflow-end-triggers/design.md:115`,
     `.oat/projects/shared/workflow-end-triggers/design.md:117`,
     `.oat/repo/reference/backlog/items/gate-same-target-execution.md:44`,
     `.oat/repo/reference/backlog/items/gate-same-target-execution.md:50`).
   - Evidence: the plan specifies `oat gate target set <id> --runtime <r>
--base-command <argv...> [--host-detection <argv...>] [--availability
<argv...>]` and tests only that the registry round-trips, not that provider
     command flags survive parsing
     (`.oat/projects/shared/workflow-end-triggers/plan.md:198`,
     `.oat/projects/shared/workflow-end-triggers/plan.md:201`,
     `.oat/projects/shared/workflow-end-triggers/plan.md:208`).
   - Evidence: the repo uses Commander (`packages/cli/src/commands/config/index.ts:1387`).
     A local Commander probe for the proposed shape rejects provider flags like
     `claude -p --model opus`, `cursor-agent -p --model composer-2.5`, and `codex
exec -m gpt-5.5` as unknown OAT options.
   - Impact: the write surface can pass tests for simple commands but fail for
     the actual provider target variants users need. This undermines both V1
     user-provided targets and the V2 model/effort target examples.
   - Fix guidance: make command argv input unambiguous before implementation.
     Examples: `--base-command-json '["claude","-p","--model","opus"]'`, repeated
     `--base-command-arg` flags, or a documented terminator/subcommand grammar
     with tests for provider commands containing `-p`, `-m`, `--model`, and
     `--effort`.

### Medium

1. **Built-in host detection is required for independence but not specified or tested concretely.**
   - Evidence: V1 depends on built-in `codex/claude/cursor` exec targets with
     `hostDetectionCommand`, and the dispatcher treats an unknown current runtime
     as excluding nothing under `same-runtime`
     (`.oat/projects/shared/workflow-end-triggers/plan.md:71`,
     `.oat/projects/shared/workflow-end-triggers/plan.md:234`,
     `.oat/projects/shared/workflow-end-triggers/plan.md:239`).
   - Evidence: the design says current-runtime detection falls back to built-in
     host detection and that unknown host means all targets are eligible
     (`.oat/projects/shared/workflow-end-triggers/design.md:163`,
     `.oat/projects/shared/workflow-end-triggers/design.md:220`).
   - Impact: if a built-in detector is missing or wrong, a default
     `same-runtime` gate can accidentally reselect the current runtime, weakening
     the independence guarantee. This is especially important for multi-provider
     hosts such as Cursor.
   - Fix guidance: extend p01/p05 with concrete built-in detector acceptance
     tests and documented fallback behavior. At minimum, pin Cursor runtime
     detection to `CURSOR_AGENT=1`, and make Codex/Claude detectors either
     explicit best-effort commands or explicitly rely on `OAT_CURRENT_RUNTIME`
     when no reliable built-in signal exists.

### Minor

1. **The plan's readiness footer says the project is ready for code review and merge before implementation has started.**
   - Evidence: `plan.md` frontmatter says `oat_ready_for:
oat-project-implement`, while `implementation.md` shows 0/8 tasks complete
     (`.oat/projects/shared/workflow-end-triggers/plan.md:3`,
     `.oat/projects/shared/workflow-end-triggers/implementation.md:25`,
     `.oat/projects/shared/workflow-end-triggers/implementation.md:37`).
   - Evidence: the plan footer still says "Ready for code review and merge"
     (`.oat/projects/shared/workflow-end-triggers/plan.md:348`,
     `.oat/projects/shared/workflow-end-triggers/plan.md:362`).
   - Impact: this is likely inherited from the generic template, but it is an
     inaccurate lifecycle signal for a pre-implementation plan artifact.
   - Fix guidance: change the footer to "Ready for implementation" or equivalent.

## Plan/Design Alignment

### Coverage

| Design area                    | Status   | Notes                                                                                                         |
| ------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------- |
| Gate schema and normalization  | covered  | p01 covers `GateConfig`, `ExecTarget`, defaults, null disables, and built-ins.                                |
| Layered gate/target resolution | covered  | p02 covers whole-object gate resolution and keyed partial target merge.                                       |
| Gateability validation         | covered  | p03 correctly validates `oat_gateable` via skill frontmatter, not agent parsing.                              |
| CLI read/write surfaces        | partial  | p04 covers read/write commands, but target argv parsing needs a safer contract.                               |
| Cross-runtime dispatcher       | partial  | p05 covers selection mechanics, but lacks a policy handoff for `execPolicy.avoid`.                            |
| Skill Gate Execution step      | partial  | p06 covers marker/version bumps and the loop, but needs the policy handoff if `execPolicy` remains in config. |
| Release bookkeeping            | covered  | p07 includes lockstep public-package bumps and `pnpm release:validate`.                                       |
| Same-target/model variants     | deferred | Correctly deferred to backlog `bl-e6fc`; not required for V1.                                                 |

### Extra Work

None. The plan stays within the design's V1 scope and properly defers
same-target execution to `bl-e6fc`.

### Dispatch Profile Advisory

The plan has no `## Dispatch Profile` section. That is normal for artifact plan
review and is not a finding.

## Verification Commands

- `oat project status --project-path .oat/projects/shared/workflow-end-triggers --json`
  - Result: passed; quick-mode project, plan complete, implementation at 0/8
    tasks.
- `oat project validate-plan --project-path .oat/projects/shared/workflow-end-triggers --json`
  - Result: passed; no output, exit 0.
- Commander probe for proposed `--base-command <argv...>` shape
  - Result: provider flags `-p`, `-m`, and `--model` are rejected as unknown
    command options under the naive variadic option design.
- `pnpm run cli -- config get activeProject`
  - Result: failed before command execution because the current workspace is
    missing `@open-agent-toolkit/control-plane/dist/index.js`; this was treated
    as environment/build state, not a plan finding.

## Recommended Next Step

Run the `oat-project-review-receive` skill to convert the Important/Medium
findings into plan fix tasks, then re-review `artifact plan`.
