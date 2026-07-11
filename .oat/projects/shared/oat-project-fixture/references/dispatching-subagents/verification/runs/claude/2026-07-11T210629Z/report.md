# Claude — Supplementary Run 2026-07-11T210629Z: does a `Task` tool grant resolve?

## 1. Run Identity and Provenance

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Run ID            | `claude-2026-07-11T210629Z`                                            |
| Run type          | `supplementary`                                                        |
| Scope             | `supplementary` (single bounded question; not canonical coverage)      |
| Harness           | `claude` (flavor: `not-applicable`, Claude Code 2.1.207)               |
| Captured at       | 2026-07-11T21:06:29Z                                                   |
| Working directory | `/Users/tstang/orca/workspaces/open-agent-toolkit/oat-project-fixture` |
| Repository commit | `3111442a0831c3e5f1305968313f16fde7f2be40`                             |
| Root model        | `claude-opus-4-8[1m]`                                                  |
| Parent run        | `claude-2026-07-11T205550Z` (canonical, combined-capability)           |

**Why this packet exists.** The canonical run's contract correction `CC-4` asserted a
naming drift and then speculated, without probing it, that the `oat-phase-implementer`
agent definition's `Task` tool grant "may not resolve." A reviewer asked for that to be
checked independently. It has now been probed, and **the speculation is refuted**. This
packet holds the probe evidence; the canonical packet's `CC-4` has been corrected to
point here.

**Probe-budget disclosure.** The canonical protocol permits at most one provider CLI
sentinel per harness, and that budget was spent inside the canonical run. The four CLI
invocations below ran **after** the canonical packet was sealed, as a separate
supplementary investigation at explicit reviewer request. They are recorded here and are
deliberately **not** added to the canonical run's `launches[]`, so the canonical probe
budget stays intact and auditable. No canonical verdict row is changed by this packet.

## 2. Question

Does Claude Code resolve a `Task` entry in an agent definition's `tools:` frontmatter to
the live dispatch tool (which the canonical run established is named `Agent`), or is the
grant dead?

## 3. Filesystem Evidence

The grant is real and is present in every provider view:

- `.agents/agents/oat-phase-implementer.md:5` — `tools: Read, Write, Edit, Bash, Grep, Glob, Task`
- `.claude/agents/oat-phase-implementer.md:5` — identical (`version: 1.0.5`)
- Sibling definitions declare no dispatch tool at all: `oat-reviewer.md:5` and
  `oat-codebase-mapper.md:5` both grant `Read, Bash, Grep, Glob, Write`.

So `oat-phase-implementer` is the only OAT agent that requests a dispatch tool, and it
requests it under the name `Task`.

## 4. Probes

Four read-only `claude -p` invocations, each defining a throwaway custom agent via
`--agents` and running the session as it via `--agent`. No OAT production role was
dispatched. Model pinned to `claude-haiku-4-5-20251001`. Prompt in every case: "List the
exact names of every tool available to you, one per line. Do not use any tool. Just list
names." Deadline declared before launch: 180 seconds.

| Probe | `tools:` grant     | Tools the child reported | Purpose                                          |
| ----- | ------------------ | ------------------------ | ------------------------------------------------ |
| A     | `["Read","Task"]`  | `Read`, `Agent`          | Does `Task` resolve?                             |
| B     | `["Read","Agent"]` | `Read`, `Agent`          | Reference behavior                               |
| C     | `["Read"]`         | `Read`                   | **Control:** is the grant enforced at all?       |
| D     | `["Read","Bogus"]` | `Read`                   | **Control:** are unknown names silently dropped? |

The controls are what make A load-bearing. C shows the `tools:` grant genuinely
constrains the child — a `Read`-only grant yields a `Read`-only child, so the field is
not being ignored. D shows unknown tool names are silently dropped rather than passed
through — so a name that survives into the child's tool list was _recognized_, not merely
echoed. Given C and D, A's result is decisive.

## 5. Finding

**A `Task` grant resolves.** It materializes the dispatch tool, which the child then sees
under its live name, `Agent`. `Task` is a live alias for `Agent` in tool-grant resolution;
it is not dead, and `oat-phase-implementer` does receive a working dispatch tool.

This **refutes** the speculative half of canonical `CC-4`. What survives from `CC-4` is
only the cosmetic part: the provider draft calls the surface a "Native Task tool" while
the live tool is `Agent`, and the agent definition uses the older alias. That is naming
drift worth tidying for readability, **not** a functional defect. No fix is required for
`oat-phase-implementer` to dispatch.

Residual risk, unprobed and not claimed here: an alias that the harness still honors today
is a deprecation surface. If Claude Code ever drops the `Task` alias, this grant fails
silently — control D shows unknown tool names are dropped **without error**, so the failure
mode would be a coordinator that simply has no dispatch tool rather than a loud crash.
Migrating the grant from `Task` to `Agent` is cheap insurance, but it is a robustness
choice, not a live bug.

## 6. Claim Impact

No canonical claim row changes. `CLA-M01`, `CLA-M04`, `CLA-M05`, and `CLA-M11` were all
established with the generic `general-purpose` agent type and are untouched by this
result. `CLA-M09` (production-role launch behavior) remains `not_run` / `inconclusive` —
this packet probed tool-grant _resolution_, not whether `oat-phase-implementer` actually
coordinates correctly when dispatched. That still belongs to p05.

## 7. Redaction

No credentials, tokens, or unrelated configuration. Redaction status: **reviewed**.
