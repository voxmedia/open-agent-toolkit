---
title: OAT in Cursor Cloud
description: 'How Cursor Cloud agents resolve the OAT project home, verify provisioned tooling, and use cloud-specific execution surfaces safely.'
---

# OAT in Cursor Cloud

Cursor Cloud is a harness environment for the same repository-rooted OAT
workflow used locally. Cloud context does not change project artifact formats,
gate ownership, or autonomy boundaries.

The `oat-cursor-cloud-projects` orientation skill owns cloud-specific setup and
routing guidance. It should surface when OAT is used in a Cursor Cloud
environment, and it can also be invoked explicitly. Use
`oat-project-autonomous` separately when the user explicitly requests an
end-to-end autonomous run; being in Cursor Cloud does not activate autonomy by
itself.

## Resolve the project home first

All tracked project artifacts belong to a repository, not to the workspace
container or user home.

### Multi-repository workspace

1. Identify the **primary repository** whose branch, commits, and final PR own
   the requested work.
2. Run OAT from that repository root.
3. Keep the project under that repository's configured projects root, normally
   `<primary-repo>/.oat/projects/shared/<project>/`.
4. Keep checkout-specific state such as `activeProject` in the primary
   repository's `.oat/config.local.json`.
5. Treat sibling repositories as research or integration context unless the
   approved plan explicitly assigns them work. Do not create a workspace-level
   `.oat` directory to coordinate multiple repositories.

For cross-repository work, choose one primary repository as the artifact and
provenance anchor. Record external repository assumptions and evidence in its
project artifacts rather than splitting one OAT project across unrelated
workspace roots.

### Single-repository workspace

The checked-out repository is the project home. Run OAT at its root and use its
`.oat/` tree exactly as in a local checkout. Do not introduce multi-repository
path assumptions.

In both layouts, never store tracked projects under `~/.oat/projects`, a
workspace aggregator such as `/workspace/.oat`, or another repository merely
because it also contains OAT assets.

## Orientation and cloud detection

The orientation skill confirms cloud context from environment markers and,
when available, Cursor Cloud run metadata. Run metadata is also the preferred
source for the current model family; model self-report is not dispatch
evidence.

If cloud metadata is unavailable, the skill degrades to verified environment
signals and reports the missing evidence. It does not invent run identity or
block repository-local OAT work that otherwise has the required tooling.

## Provisioning expectations

A ready cloud environment provides:

- the latest published OAT CLI on `PATH`;
- OAT packs and skills installed at user scope;
- user-level `~/.oat/config.json` defaults for the dispatch candidate ladder
  and gate execution targets, with availability probes;
- `cursor-agent` installed for configured headless routes;
- headless authentication supplied from a Cloud Agents secret;
- repository-local config overrides only where a specific repository needs
  cloud behavior that differs from its shared config.

Provisioning must be idempotent and must not require an
`open-agent-toolkit` source checkout. A practical readiness pass verifies at
least:

```bash
oat --version
oat config dump
cursor-agent --version
```

It also verifies that required user-scope packs are present, configured gate
targets resolve or degrade through their availability probes, and the harness
auth probe succeeds. A missing optional gate CLI may permit a documented
degraded route. A required route with no adequate fallback is a boundary.

Secrets stay in the environment or the platform's secret broker. Never write
`CURSOR_API_KEY` or another credential into OAT config, project artifacts,
dispatch records, prompts, logs, or the VM image.

## User-scope asset precedence

In provisioned cloud environments, the user-scope installation is the execution
source for every OAT asset class: skills, templates, and scripts. The user tier
is refreshed from the published package during environment setup; repository
copies are compatibility context, not an override.

For skills, compare frontmatter versions as a freshness check:

- user version at or above the repository version is the expected state;
- a higher repository version is an environment anomaly;
- even in that anomaly, keep the user copy as the execution source, log the
  mismatch in `oat-execution-learnings.md`, and refresh the user tier before
  safety-critical work.

Version comparison verifies provisioning. It never switches execution to the
repository copy.

## Cursor execution surfaces

Cursor Cloud native subagents, Cursor IDE subagents, the Cursor CLI subagent
enum, and the Cursor CLI full model catalog are separate dispatch surfaces.
Each can expose a differently named subset.

Snapshot the catalog for the surface being used before dispatch. Do not infer
that a model available to a native cloud task is available to `cursor-agent`,
or the reverse. The dispatch substrate owns route mechanics and records the
selected surface, exact configured model string, selection reason, and accepted
launch. See [Programmatic Execution](programmatic-execution.md) and
[Orchestration Model](orchestration-model.md).

## Autonomous runs

For an explicitly autonomous cloud run:

1. Resolve the primary repository and project home.
2. Verify the provisioned OAT and Cursor surfaces.
3. Invoke `oat-project-autonomous`; it activates the session-scoped autonomy
   signals.
4. Use the same policy boundaries and review contract as local autonomy.
5. Append cloud setup gaps, degraded checks, and freshness anomalies to the
   project-local execution-learnings log.

Missing credentials, repository-policy approval, destructive changes,
unresolved blocking reviews, and material product ambiguity remain boundaries.
See [Autonomous Project Execution](autonomy.md).

## Related

- [Autonomous Project Execution](autonomy.md) — activation, boundaries, review,
  and learnings.
- [Programmatic Execution](programmatic-execution.md) — Cursor CLI and native
  execution surfaces.
- [Dispatch Policy](dispatch-ceiling.md) — candidate ladders and exact route
  selection.
- [Configuration](../../cli-utilities/configuration.md) — user, shared, and
  repository-local config ownership.
