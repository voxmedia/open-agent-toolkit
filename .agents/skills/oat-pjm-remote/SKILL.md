---
name: oat-pjm-remote
version: 1.0.0
description: Use when explicitly intaking, publishing, refreshing, reconciling, or continuing an OAT PJM remote binding through a live host capability. Keeps policy, approval, state, and success verdicts in the OAT CLI while the host discovers and invokes currently granted execution capabilities.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Bash, AskUserQuestion
---

# Operate Remote Project Bindings

Use the OAT CLI as the authority for policy, approval, durable operation state,
and verified outcomes. Your role is limited to live capability discovery,
executing the exact semantic action emitted by the CLI, and returning one
bounded sanitized observation.

## Progress Indicators (User-Facing)

Provide short updates at the durable boundaries: preflight, CLI preview or
handoff, live capability selection, observation submission, and terminal CLI
verdict. Never describe a host invocation result as success before the CLI has
verified authoritative read-back.

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ REMOTE PROJECT MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

- `[1/4] Verifying PJM adoption and local policy…`
- `[2/4] Preparing the durable CLI action…`
- `[3/4] Discovering a matching live host capability…`
- `[4/4] Submitting evidence for CLI verification…`

## Preflight

Run:

```bash
oat pjm doctor --json
```

Continue only when `adoption.state` is `declared` or `inferred-legacy`. For
`none` or `partial-initialization`, stop before any remote action and direct the
operator to `oat pjm init`.

## Lifecycle

1. Run the requested `oat pjm remote` command in JSON mode. For mutations,
   supply only the exact caller-authority evidence requested by the command.
2. Treat CLI policy, preview, approval, safety, and terminal verdicts as
   authoritative. Never broaden a field mask or reconstruct publication
   content from repository files.
3. When the CLI returns `pending` with `externalAction`, follow
   [the action protocol](references/external-action-protocol.md).
4. Submit exactly one sanitized observation through `operation continue`.
5. Continue only while the CLI emits another exact action for the same durable
   operation. Stop on any terminal CLI envelope.

Never infer success from a connector result, process exit, or visible remote
change. Only a CLI `ok` envelope after authoritative read-back is success.

## Live Capability Discovery

At operation time, inspect currently granted MCP or connector tools and their
live descriptions. Select a capability only when its semantic operation,
provider, and exact account/workspace/site/repository context match the action.

If no capable granted connector exists, you may inspect an already configured
provider CLI and its live help before the first attempt. Do not install a tool,
request authentication material, encode or retain its command dialect, or
switch execution surfaces after an attempt begins.

## Discussion Reads

Discussion is read-only evidence. Honor the CLI-provided page/cursor and maximum
item limit. Return only the bounded sanitized observation. Do not persist a
thread, assignee list, activity history, or native response. A requested local
distillation is a separate local edit and never comment synchronization.

## Safety Boundary

- Never read, request, print, or persist authentication headers or credential
  values.
- Never scan the repository, worktree, Git history, or arbitrary files for
  secrets.
- Never add fields to the normalized outbound projection.
- Never pass native requests, raw provider payloads, tool catalogs, or help
  output into durable OAT evidence.
- Never declare remote success directly.
