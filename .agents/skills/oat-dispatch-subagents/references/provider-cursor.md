# Cursor Subagent Dispatch

Load this reference only when the active provider is Cursor. Cursor IDE and
Cursor CLI are separate harness contexts. Treat every observed catalog as a
volatile snapshot, never a durable inventory.

## Control Surfaces

| Source                       | Establishes                                               | Does not establish                                             |
| ---------------------------- | --------------------------------------------------------- | -------------------------------------------------------------- |
| Native Task/Subagent schema  | Roles and opaque selectors for that dispatcher invocation | CLI account eligibility or another dispatcher's native catalog |
| `cursor-agent --list-models` | Opaque selectors accepted by the account CLI              | Native Task eligibility                                        |
| Cursor UI role configuration | User-selected defaults and role settings                  | Live root or nested schema without a new observation           |

Root and nested catalogs are independent, volatile observations. Equality in
one run does not establish equality in another run or nesting boundary.

## Native Selection

1. Read the native model enum from the dispatcher that will launch the child.
2. Intersect configured candidates with that exact snapshot.
3. Pass the selected opaque string byte-for-byte.
4. Treat an omitted model as deliberate parent inheritance, not generic
   defaulting or evidence that a target was unavailable.
5. Record requested selector, acceptance, outcome, and runtime identity
   separately.

Do not infer Cursor IDE behavior from a headless CLI surface. Keep bounded
recon on economical explicit targets and reserve stronger targets for
context-heavy or consequential work.

## Dispatch Mode and Liveness

In an interactive Cursor session, a user message can interrupt a foreground
subagent turn. Run multi-minute implementers, fix loops, and reviewers in
background when the host provides a durable awaited handle; reserve foreground
for short checks. This background preference does not apply to headless gate
children, which must follow the inline/synchronously-awaited gate route
contract and never fire-and-forget.

The dispatch-returned agent ID directly addresses that background child's
transcript:

```text
~/.cursor/projects/<encoded-cwd>/agent-transcripts/<agentId>/<agentId>.jsonl
```

This is a sibling of the main thread's transcript directory. For silent-child
liveness, stat that specific file's mtime and size rather than inferring from a
directory. Metadata change is observable activity evidence, not a health
verdict.

## Pre-Start CLI Routes

When the current native intersection is absent or unsatisfactory, a caller may
use a deliberate pre-start CLI route only when:

- the caller's fallback policy allows it;
- the exact CLI selector exists in the account catalog;
- native mismatch, route, reason, and candidates are recorded before launch;
- the prompt is self-contained and authority-bounded.

Verify current CLI help before use. A typical shape is:

```sh
cursor-agent \
  --trust \
  --print \
  --model '<exact-opaque-model>' \
  '<self-contained bounded prompt>'
```

CLI completion proves configured invocation completion. It does not prove an
inner native selection or runtime model identity.

## Catalog-Mismatch Advisory

Report configured candidates missing from the current native catalog, nearby
native candidates as possible ladder additions, selected route, and the exact
observation boundary. Do not remove CLI-capable candidates solely because the
native surface cannot pin them, and do not write observed catalogs into durable
configuration without explicit user choice.
