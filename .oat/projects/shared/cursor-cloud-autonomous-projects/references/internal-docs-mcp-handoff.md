# Handoff: `internal-docs-mcp` — first skill for the new org-skills plugin repo

> Generated 2026-07-13 when Phase 5 of `cursor-cloud-autonomous-projects` was
> descoped (user direction): the skill moves to a dedicated org-skills plugin
> repository instead of `pntr`. Hand this document to the agent setting up
> that repository. Publication is tracked as an operator dependency in
> `plan.md`.

## Context

You are setting up a new organization-level Cursor plugin repository
("org-skills"). It holds org-specific agent skills that intentionally stay out
of generic tooling (OpenAgent Toolkit remains org-agnostic). The first skill is
`internal-docs-mcp`: it teaches agents to research cross-repository integration
context through the **vox-docs MCP server** (an existing team MCP that indexes
internal repos and docs) before implementing against systems owned by other
repos.

## What to build

1. A marketplace-publishable Cursor plugin containing one skill:
   `internal-docs-mcp`.
   - Standard Cursor plugin layout: a `plugin.json` manifest plus
     `skills/internal-docs-mcp/SKILL.md`.
   - The plugin is **skill-only** — do not define an MCP server in it.
     vox-docs already exists as a team MCP; this skill teaches usage patterns,
     it does not provision the server.
2. Use the SKILL.md draft below as the starting point; adjust only frontmatter
   or layout details your repo conventions require. Org names (vox-docs) are
   allowed here by design — this is the org layer.

## Operator follow-ups to record in the repo README

- Publish the plugin to the Cursor marketplace / team registry and choose the
  installation mode (recommend default-on for cloud environments).
- vox-docs CI indexing must cover the repos agents will research. Known gaps
  as of 2026-07-13: `bruno`, `pntr`, `open-agent-toolkit`,
  `cloud-agent-env-node`.
- Downstream consumer: the OAT project `cursor-cloud-autonomous-projects`
  (in `open-agent-toolkit`) validates this skill's fallback behaviors in its
  Phase 6 scenario matrix. Its FR10 live checks stay environment-limited until
  this plugin is published — notify that project's operator when it ships.

## SKILL.md draft

```markdown
---
name: internal-docs-mcp
description: Use when the code you are working on integrates with a system, service, or repository outside the current checkout — before implementing against an internal API, schema, event contract, or workflow owned by another repo. Searches indexed internal documentation and repositories through the vox-docs MCP.
version: 1.0.0
---

# Internal Docs Research (vox-docs)

Research integration context across the organization's repositories before
writing code that depends on it. This skill wraps vox-docs MCP usage patterns;
it does not provision the server.

## When to run

- You are about to implement against an API, schema, queue, or workflow owned
  by another internal repository.
- A task references an internal system you cannot see in the current checkout.
- An autonomous (OAT) run reaches its external-research mandate for integrated
  systems.

## When NOT to run

- The question is answerable from the current repository alone.
- The target is public/third-party library documentation (use official docs).

## Workflow

1. **Coverage check.** Call `list_libraries` on the vox-docs MCP and confirm
   the target repo/system is indexed. If it is not, record the gap (see
   Fallbacks) — never fabricate coverage.
2. **Scoped queries.** Use `search_docs` with narrow, integration-shaped
   queries (system name plus the interface you touch: endpoint, event, table,
   config key). Prefer several small queries over one broad one. Capture a
   citation (doc or file/line) for every claim you rely on.
3. **Prefer the local checkout for depth.** If the target repo is mounted in
   the current (multi-repo) environment, read the source directly for
   load-bearing details; treat vox-docs results as the map, not the territory.
4. **Synthesize.** Before implementation continues, summarize the integration
   contract — inputs, outputs, invariants, owning repo — with citations.

## Fallbacks

- **MCP unattached** (tools absent): note "vox-docs unavailable" and proceed
  with local evidence only.
- **MCP unreachable** (attached but erroring): log the error, retry once, then
  proceed as unattached.
- **No coverage** for the target: flag it to the operator. In an OAT run,
  append the gap to the project's `oat-execution-learnings.md` (category:
  cloud-env improvements); otherwise state it in your summary.

## Guardrails

- Do not present indexed snippets as current behavior when they conflict with
  local source; the checkout wins.
- Do not copy secrets or credential-bearing config values from indexed docs
  into code, logs, or artifacts.
```
