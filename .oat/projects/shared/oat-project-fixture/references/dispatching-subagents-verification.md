# Dispatching Subagents — Concurrent Harness Verification

> **Purpose:** verify the draft dispatch contract in concurrent Codex and
> Claude root sessions before p04 promotes it into a canonical skill.

## Safety Boundary

- Read-only probes only.
- Do not modify repo files, user configuration, provider configuration, or
  generated agent assets.
- Do not start a full project workflow.
- At most one bounded native nested sentinel and one bounded CLI sentinel per
  harness.
- A sentinel returns a fixed string and performs no file or shell writes.
- Stop after an accepted launch; do not test fallback after acceptance.
- Report unavailable or inconclusive controls honestly.

## Shared Result Schema

Return Markdown using this structure:

```markdown
# <Harness> Dispatch Verification — <timestamp>

## Runtime

- harness:
- root model:
- working directory:
- relevant versions:

## Root Native Catalog

- enumeration source:
- exact roles/models:
- inheritance option:

## Nested Native Catalog

- coordinator role/model:
- nested tool available:
- exact roles/models:
- differs from root:

## Native Sentinel

- requested payload:
- accepted:
- result:
- configured-invocation evidence:
- runtime-identity evidence:

## CLI Surface

- help/model enumeration commands:
- exact model controls:
- read-only sentinel requested payload:
- accepted:
- result:

## Claim Verdicts

| Claim | Verdict                                | Evidence |
| ----- | -------------------------------------- | -------- |
| ...   | confirmed / unsupported / inconclusive | ...      |

## Contract Corrections

- ...

## Recommended Harness Topology

- ...
```

Save or return raw command/tool evidence separately when it is too large for
the report. Never include credentials or authentication tokens.

## Codex Verification Prompt

Copy this into a fresh Codex root session:

```text
You are performing a read-only harness verification for the active OAT project.

Repository:
/Users/tstang/orca/workspaces/open-agent-toolkit/oat-project-fixture

Read:
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents-draft.md
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents-codex-draft.md
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents-verification.md

Goal:
Verify the Codex-specific claims using your current root and nested native tool
schemas. This is evidence gathering, not implementation.

Rules:
- Stay read-only. Do not edit files or configuration.
- Enumerate only catalogs/roles actually exposed by your live tool schema or
  materialized configuration; distinguish those sources.
- Report effective agents.max_depth without changing it.
- Launch at most one read-only native coordinator sentinel. If it has a nested
  spawn tool, have it report its exact selectable role catalog and launch at
  most one read-only depth-2 sentinel that returns:
  OAT_CODEX_NESTED_SENTINEL_OK
- Capture the exact spawn payload and acceptance evidence.
- Missing self-reported identity is not launch rejection.
- Inspect current codex exec help/config syntax for explicit model + reasoning
  effort. At most one read-only CLI sentinel may be launched.
- Once a launch is accepted, do not attempt another route for that scope.
- Do not infer Cursor or Claude behavior.

Return the exact Shared Result Schema from the verification document. Mark each
claim confirmed, unsupported, or inconclusive and cite concrete tool/config
evidence.
```

## Claude Verification Prompt

Copy this into a fresh Claude Code root session:

```text
You are performing a read-only harness verification for the active OAT project.

Repository:
/Users/tstang/orca/workspaces/open-agent-toolkit/oat-project-fixture

Read:
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents-draft.md
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents-claude-draft.md
- .oat/projects/shared/oat-project-fixture/references/dispatching-subagents-verification.md

Goal:
Verify the Claude-specific claims using your current root and nested native Task
tool schemas. This is evidence gathering, not implementation.

Rules:
- Stay read-only. Do not edit files or configuration.
- Transcribe the exact explicit model choices exposed by the root Task tool.
- Distinguish explicit model selection, omit-model inheritance, and named-agent
  defaults.
- Launch at most one read-only native phase coordinator sentinel. Ask it to
  report whether nested Task exists and, if so, its exact model choices.
- If nested Task is available, launch at most one read-only nested sentinel
  with an exact model that returns:
  OAT_CLAUDE_NESTED_SENTINEL_OK
- Capture exact Task payloads and acceptance evidence.
- Inspect current claude -p help for explicit model controls. At most one
  read-only CLI sentinel may be launched.
- Once a launch is accepted, do not attempt another route for that scope.
- Do not infer Codex or Cursor behavior.

Return the exact Shared Result Schema from the verification document. Mark each
claim confirmed, unsupported, or inconclusive and cite concrete tool/help
evidence.
```

## Optional Cursor Recheck Prompt

Use only when a fresh Cursor session or account/runtime change justifies another
snapshot:

```text
Read the dispatching-subagents core, Cursor, and verification drafts in the
active oat-project-fixture project. Without modifying files or configuration:
enumerate the current root Task model enum, launch one read-only coordinator,
enumerate its nested Task model enum, and return the Shared Result Schema.
Compare only against committed execution-log evidence; do not assume catalog
stability.
```

## Merge Procedure

When reports return:

1. Add each report under project `references/` with a harness and timestamp.
2. Update the draft provider reference with confirmed facts and explicit
   inconclusive results.
3. Record contradictions in `orchestration-execution-log.md`.
4. In p04, promote the provider-neutral contract into
   `oat-dispatch-subagents/SKILL.md`.
5. Promote harness mechanics into one-level provider reference files.
6. Add contract tests that require consumers to load the shared skill and
   active-provider reference before dispatch.
