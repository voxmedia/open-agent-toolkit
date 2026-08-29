---
name: oat-cursor-cloud-projects
version: 1.1.1
description: Use when OAT work is mentioned in a Cursor Cloud environment. Orients agents to cloud detection, repo-rooted project homes, user-first assets, CLI availability, and Cursor dispatch context without owning lifecycle execution.
disable-model-invocation: false
user-invocable: true
allowed-tools: Read, Write, Bash, Glob, Grep
---

# OAT in Cursor Cloud

Orient OAT work in Cursor Cloud before any project lifecycle skill runs. This
skill is a harness-layer adapter: it resolves environment and asset context,
then returns control to the provider-agnostic OAT lifecycle.

## When to Use

Use automatically when both are true:

- the request involves OAT projects, skills, tools, config, gates, or project
  artifacts; and
- the current host may be a Cursor Cloud agent.

Also use when the user asks how OAT is configured in Cursor Cloud, when multiple
repositories make project location ambiguous, or before Cursor-specific review
dispatch.

Do not use this skill as the project orchestrator. Explicit autonomous
end-to-end requests route to `oat-project-autonomous` after orientation.

## Prerequisites

- A shell and Node/npm are available.
- Read `references/cursor-cloud-mechanics.md` only when model-family identity,
  dispatch-surface catalogs, or degraded review evidence is needed.

## Mode Assertion

**OAT MODE: Cursor Cloud Orientation**

**Purpose:** Establish trusted cloud, repository, asset, CLI, and dispatch
context without taking ownership of a lifecycle phase.

**BLOCKED Activities:**

- Creating, approximating, or mutating project artifacts when `oat` is missing.
- Selecting a repo asset over an existing user-scope asset because its version
  is higher.
- Treating semver comparison as source arbitration.
- Placing projects in the workspace root, user home, or a cross-repo shared
  directory outside the target repository.
- Reimplementing provider dispatch mechanics from
  `oat-dispatch-subagents/references/provider-cursor.md`.
- Assuming one Cursor model catalog is a superset of another.

**ALLOWED Activities:**

- Detecting Cursor Cloud from environment and run metadata.
- Resolving the target repository and repo-rooted project home.
- Resolving user, repo, and bundled asset paths.
- Verifying or installing the supported OAT CLI.
- Comparing skill versions as a freshness check.
- Loading Cursor mechanics and org-layer context skills when relevant.
- Recording environment anomalies and degraded routes in project learnings.

**Self-Correction Protocol:**

If you catch yourself:

- Reading a repo copy while a user copy exists → STOP and re-read the user copy
  by absolute path.
- Switching source because the repo semver is higher → STOP, retain the user
  source, log the anomaly, and refresh the user tier.
- Hand-authoring an OAT artifact because the CLI is unavailable → STOP and
  restore the CLI first.
- Copying model launch instructions into this skill → STOP and defer to the
  dispatch provider reference.

**Recovery:**

1. Re-resolve the target repository and absolute user paths.
2. Record any stale-tier or unavailable-surface anomaly.
3. Return to the lifecycle skill with the corrected context, or stop when
   freshness/CLI integrity cannot be restored.

## Progress Indicators (User-Facing)

Print this banner once when orientation performs work:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OAT ▸ CURSOR CLOUD ORIENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Print each indicator only when that step starts:

- `[1/5] Detecting Cursor Cloud context…`
- `[2/5] Verifying the OAT CLI…`
- `[3/5] Resolving the target repository and project home…`
- `[4/5] Selecting user-first OAT assets…`
- `[5/5] Loading required harness and context guidance…`

## Process

### Step 0: Detect Cursor Cloud

Treat positive run metadata as authoritative. When the `cursor-cloud` MCP is
available, call `run-info`; use `environment-info` when repository layout,
environment provenance, or setup status matters.

Environment markers are deterministic supporting evidence:

- `CURSOR_AGENT=1`;
- `CURSOR_CONVERSATION_ID` beginning with `bc-`;
- `AWS_PROFILE=cursor-cloud-agent`;
- `HOSTNAME=cursor`.

One strong marker or positive MCP metadata is sufficient to apply this
orientation. Record which signal resolved the context. If no signal is present,
return control without imposing Cursor-specific guidance.

Do not infer model family from self-report. When dispatch identity is needed,
follow `references/cursor-cloud-mechanics.md`.

### Step 1: Verify the OAT CLI

Before reading or changing OAT project state:

```bash
if command -v oat >/dev/null 2>&1; then
  oat --version
else
  npm install -g @open-agent-toolkit/cli@latest
  oat --version
fi
```

If installation fails, report the exact non-secret error and stop OAT artifact
work. Never approximate `oat project new`, state transitions, templates,
manifest behavior, or configured gates manually.

An OAT source checkout may use its repository-supported source CLI command for
development verification, but that does not prove the globally installed CLI
is ready for unrelated repositories.

### Step 2: Resolve Repository and Project Home

First identify the repository that owns the requested product/code change.
Projects always live under that repository's configured OAT projects root.

Resolve from the target repository:

```bash
PROJECTS_ROOT="${OAT_PROJECTS_ROOT:-$(oat config get projects.root 2>/dev/null || echo ".oat/projects/shared")}"
PROJECTS_ROOT="${PROJECTS_ROOT%/}"
PROJECT_PATH=$(oat config get activeProject 2>/dev/null || true)
if [ -n "$PROJECT_PATH" ]; then
  PROJECT_SCOPE=$(oat project scope "$PROJECT_PATH" --format value) || exit 1
  if [ "$PROJECT_SCOPE" = "synced" ]; then
    oat project pull "$PROJECT_PATH"
  fi
fi
```

Run this guard from the target repository before reading project artifacts. A
record-backed synced path whose checkout is absent is materialized by the pull;
remote-only projects are adopted by the same command.

Rules:

- **Single-repo workspace:** the sole target repository owns `.oat/`, local
  config, project artifacts, commits, and PRs.
- **Multi-repo workspace:** choose the repository whose code and branch own the
  primary objective. Resolve its local config from that repo, not from the
  workspace parent or whichever repo happened to be the shell's first cwd.
- **Cross-repo objective:** anchor the OAT project in one explicitly selected
  primary repository. Record secondary repositories and their write/commit
  boundaries in the project plan; never create a workspace-level project home.

If repository ownership is ambiguous and choosing would alter branch, PR, or
artifact ownership, stop for explicit direction. Once resolved, run lifecycle
commands from the target repository or pass their supported project path.

### Step 3: Resolve Assets with User Scope First

Apply one source order independently to every asset file:

1. user scope;
2. target-repository scope when the user asset is absent;
3. bundled CLI asset when both installed tiers are absent.

User locations:

| Asset    | User source                 |
| -------- | --------------------------- |
| Skill    | `~/.agents/skills/<skill>/` |
| Template | `~/.oat/templates/<file>`   |
| Script   | `~/.oat/scripts/<file>`     |

Repository locations are `.agents/skills/`, `.oat/templates/`, and
`.oat/scripts/` within the target repository.

The user tier is provisioned from `@latest` at environment boot and is the
canonical execution tier. Repository copies in this fleet are not customized;
a difference indicates staleness, not a local override.

#### Absolute-path loading contract

The p02-t01 environment probe proved OAT-level discovery of
`~/.agents/skills/` but could not verify fresh Cursor model auto-surfacing.
Therefore, resolve and read the selected user asset by absolute path as the
**primary mechanism**:

```bash
USER_SKILLS_ROOT="${HOME}/.agents/skills"
USER_TEMPLATES_ROOT="${HOME}/.oat/templates"
USER_SCRIPTS_ROOT="${HOME}/.oat/scripts"
```

Do not rely on ambient skill discovery or a provider hot reload for
correctness. Auto-surfacing is a convenience only.

#### Skill version verification

When both user and repo copies of a skill exist, compare their frontmatter
`version:` values. This check verifies the expected invariant:

```text
user version >= repo version
```

It never chooses the source:

- user version equal to or higher than repo → read the user copy;
- repo version higher than user → still read the user copy, append an anomaly
  to `oat-execution-learnings.md`, and flag the user tier for refresh with
  `oat tools update` or an environment rebuild;
- if freshness is safety-critical, refresh and re-verify before continuing;
  stop if the user tier cannot be refreshed safely.

Never silently switch to the repo copy. Apply per-file precedence to templates
and scripts without using skill semver as their arbitration mechanism.

### Step 4: Load Cursor Dispatch Context When Needed

For Cursor review/worker dispatch:

1. Read `references/cursor-cloud-mechanics.md`.
2. Resolve and read the selected user-scope
   `oat-dispatch-subagents/SKILL.md` by absolute path, falling back to
   repo/bundled tiers only when the user skill is absent.
3. Resolve and read the selected user-scope
   `subagent-orchestration/references/model-selection-principles.md` and
   `subagent-orchestration/references/provider-cursor.md` by absolute path,
   with the same fallback rule.
4. Resolve and read the selected user-scope
   `oat-dispatch-subagents/references/provider-cursor.md` mechanics reference
   by absolute path, with the same fallback rule.
5. Let `oat-project-dispatch-subagents` adapt lifecycle scope and policy.
6. Let `oat-dispatch-subagents` own capability, catalog, route, launch,
   recovery, and generic evidence.

This skill supplies identity and catalog context only. Do not restate or alter
the provider dispatch algorithm.

### Step 5: Surface Adjacent Skills and Record Degradation

- If the user explicitly requested goal-to-PR or resume-to-PR autonomy, load
  `oat-project-autonomous` from the selected user-first source.
- Discover context/research skills supplied by the active organization or
  environment when integrated systems require them. Do not hard-depend on,
  name, or emulate an absent org layer.
- When an expected skill, MCP server, CLI surface, or credential is absent,
  record the gap in the active project's `oat-execution-learnings.md`. Continue
  only through a documented integrity-preserving route.

Return an orientation summary:

```text
Cursor Cloud: {detected | not detected} via {signal}
Target repository: {absolute path}
Projects root: {repo-relative or absolute configured path}
Active project: {path | none}
OAT CLI: {version | blocked}
Asset tier: user-first; absolute-path loading primary
Freshness: {verified | anomaly logged | refresh required}
Dispatch context: {not needed | mechanics loaded}
```

## Examples

### Basic Usage

```text
/oat-cursor-cloud-projects
```

### Conversational

```text
I need to continue an OAT project in this Cursor Cloud workspace.
```

```text
Which OAT skill and template copies should this cloud agent use?
```

## Troubleshooting

**Multiple repositories contain `.oat/`:** Resolve the repository that owns the
change and branch. Do not select by lexical order or create a workspace-level
project.

**User skill is older than repo skill:** Keep the user skill as source, log the
anomaly, run `oat tools update` or rebuild the environment, and block
safety-critical work until freshness is restored.

**Skill does not auto-surface:** Read its user-scope `SKILL.md` by absolute path.
Do not require an agent restart for correctness.

**Cursor model names disagree across commands:** Treat each command/tool as a
separate dispatch surface and snapshot its current catalog. See
`references/cursor-cloud-mechanics.md`.

## Success Criteria

- ✅ Cursor Cloud context was resolved from metadata or deterministic markers.
- ✅ `oat` was verified before project artifact work.
- ✅ The project home is anchored inside the target repository in both single-
  and multi-repo environments.
- ✅ Existing user assets won independently for skills, templates, and scripts.
- ✅ Skill version comparison verified freshness without changing source.
- ✅ User assets were read by absolute path as the primary mechanism.
- ✅ Cursor dispatch mechanics remained delegated to the canonical provider
  reference.
- ✅ Missing surfaces and freshness anomalies were recorded rather than hidden.
