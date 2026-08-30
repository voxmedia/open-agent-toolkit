---
title: Writing Skills
description: 'Contributor guide to authoring OAT skills, including runtime contracts, governance, and where to start.'
---

# Writing Skills

Use this page when you are creating or updating OAT skills in `.agents/skills`.

Skill behavior is defined by frontmatter plus the process contract in each `SKILL.md`. The goal is to make lifecycle behavior explicit, reviewable, and reusable across sessions.

## Where Skills Live

- Canonical skills live in `.agents/skills`
- `AGENTS.md` is the session-facing registry and should stay aligned with skill frontmatter
- OAT project and review artifacts should reference skill names consistently

## Authoring Priorities

- Make the mode and purpose explicit.
- Keep prerequisites and expected artifacts concrete.
- Spell out blocked vs allowed activities for state-advancing skills.
- Define user-facing progress indicators for longer workflows.
- Define a pre-work capability and authorization gate for skills that delegate to subagents, workers, or reviewers.
- Keep output obligations explicit so downstream skills and users know what changed.

## Portable sibling reads (skills and agents)

Executable instructions must not assume the asset is running from a repository
checkout. The rule is not skill-specific: it applies to every Markdown asset
shipped by a pack whose `defaultScope` is `user`, which today means both
canonical skills under `.agents/skills` and canonical agents under
`.agents/agents`. The scanned surface is derived from `PACK_MANIFEST` rather
than a hand-maintained list, so adding a skill or agent to a user-default pack
puts it under the contract automatically.

The contract covers a cross-asset read of a sibling `SKILL.md` and of any file
or directory at or below a sibling's `references/`.

### Loaded skills resolve in three steps

Before a skill or one of its operational reference files reads a sibling,
resolve a `${SKILLS_ROOT}` in this order:

1. Derive `${SKILL_DIR}/..` from the directory containing the currently loaded
   `SKILL.md`, when the provider exposes that path.
2. Try the user-scope root at `${HOME}/.agents/skills`.
3. Fall back to the project-scope root at `<repo-root>/.agents/skills`.

Probe each candidate for the exact target and use the first match. If none
exists, name the missing sibling, give an actionable install or update command,
and stop that workflow branch instead of improvising the sibling's process.

### Skills bind canonical agent reads through a local provider root

When a skill must read one fixed canonical role instruction, bind a local
`${AGENT_PROVIDER_ROOT}` for that dependency in this order:

1. Derive `${SKILL_DIR}/../..` from the loaded skill path, but admit it only
   when the exact unsuffixed `agents/<canonical-name>.md` target is the
   same-scope canonical Markdown file or a symlink whose real path is exactly
   that file.
2. Try the user-scope root at `${HOME}/.agents`.
3. Fall back to the project-scope root at `<repo-root>/.agents`.

An invalid loaded target is a candidate miss, so resolution continues to the
user and project roots. Regular provider copies, broken or escaping symlinks,
transformed content, other role names, model/effort/variant-suffixed files, and
`.codex/agents/*.toml` are never canonical candidates. Claude and Cursor base
role symlinks can qualify when they resolve exactly to the same-scope canonical
file; Cursor materialized variants cannot.

`${AGENT_PROVIDER_ROOT}` is local authored-instruction notation, not a global
environment variable or a provider-native role selector. It has no authority
over provider, model, effort, variant, route, or dispatch choice. Resolve every
owning pack independently, even when multiple role dependencies coexist. If
all candidates miss for a workflows-owned role, stop before fallback launch
and report both recovery forms for the intended scope:

```bash
oat tools install workflows --scope <user|project>
oat tools update --pack workflows --scope <user|project>
```

### Materialized agents resolve in two steps

Canonical agents are materialized into provider-specific views — Codex receives
agent content as developer instructions, while Claude and Cursor use distinct
provider directories. No stable loaded-agent source path exists across those
providers, so an agent must not invent a `${SKILL_DIR}`-style loaded-agent
candidate. Agents resolve installed scope only:

1. Try the user-scope root at `${HOME}/.agents/skills`.
2. Fall back to the project-scope root at `<repo-root>/.agents/skills`.

User scope comes first because the packs that own these dependencies default
there; project scope remains a real fallback for project installations.

### Bind every dependency independently

When a caller needs multiple siblings, resolve and bind each one to its own
root variable. Do not freeze a single `${SKILLS_ROOT}` and assume every
dependency is installed there: a workflows adapter may be at project scope
while its utility contracts are at user scope. Validate the exact target file
before acting on it, and never substitute ambient discovery for a bound root.

Follow-on reads inside an already-bound sibling root — for example a second
reference file under a root that an earlier read established and validated —
are local reads rather than new cross-asset reads. They are only acceptable
when the anchoring read comes first.

### Fail closed with pack-specific recovery

A missing-sibling recovery must name the missing target, its owning pack, and
the intended scope, using `oat tools install <pack> --scope <user|project>` or
`oat tools update --pack <pack> --scope <user|project>` as appropriate. Do not
degrade to a partially guided path, and do not continue past the missing
dependency.

### The ratchet allows only exact historical baselines

Do not use a bare `.agents/skills/<sibling>/SKILL.md`,
`.agents/agents/<canonical-name>.md`, dot-relative equivalent, or repeated-parent
canonical `agents/<canonical-name>.md` hop for an executable read in any
user-default skill or agent. The bundled-docs contract test enforces this over
the whole manifest-derived surface and reports each violation as exact
`source -> target` evidence. Executable agent findings have a zero baseline, so
every bare canonical-agent read fails the ratchet. Portable
`${AGENT_PROVIDER_ROOT}/agents/...` reads and legitimate `.claude` or `.cursor`
provider-view examples are classified as non-findings.

The pinned historical baseline applies only to skill findings: its six exact
entries are non-executable evidence such as dogfood transcripts or fixture
READMEs, recorded by source file, target skill, and target path. There is no
wildcard, directory-wide, or skill-wide allowance, and no temporary migration
allowlist — executable debt is fixed at the caller instead of being exempted.
The same assertions run against the bundled CLI copies of both skills and
agents, and the sync contract test re-checks the roles it materializes for
Codex, so a canonical fix must survive bundling and Codex sync as well. No test
yet gates the generated `.claude` or `.cursor` agent views, so regenerate and
spot-check those by hand.

## Contract components

- Mode assertion (purpose, blocked/allowed activities)
- Preconditions and required artifacts
- User-facing progress indicator expectations
- Delegation capability detection and fallback behavior, when the skill dispatches helper agents
- Output obligations
- Escalation/guardrail behavior

## Frontmatter fields in active use

- `name`
- `description`
- `version`
- `disable-model-invocation`
- `user-invocable`
- `allowed-tools`
- `oat_gateable`

### The `version` field is gated

Changing any canonical skill's `SKILL.md` requires bumping its frontmatter
`version` in the same PR — one bump per changed skill in the final PR diff,
even if the skill was edited multiple times on the branch. The rule is
enforced by `pnpm run check:skill-bumps`, which runs locally (root `AGENTS.md`
Definition of Done) and in CI; a changed skill whose version matches
`origin/main` fails the gate.

## Practical Authoring Flow

1. Decide whether you are adding a general reusable skill or an OAT-specific lifecycle skill.
2. Add or update the skill under `.agents/skills/<name>/SKILL.md`.
3. Keep the `AGENTS.md` skills registry synchronized with the new frontmatter.
4. Update related docs or lifecycle references if the skill changes user-visible behavior.

## Governance rules

- Prefer skill-first invocation language.
- Keep `AGENTS.md` skills table synchronized with `.agents/skills`.
- Require explicit user approval for destructive or state-advancing transitions.

### Artifact-writing hygiene

Every role or skill that creates or edits tracked output must include the
artifact hygiene contract at its writing boundary. The writer uses a concrete
write/fix formatting command supplied by its plan, task, or brief. If none is
usable, it discovers the repository's documented command from applicable
`AGENTS.md` / `CLAUDE.md` instructions and relevant package manifests.

Contracts must distinguish write/fix commands from check-only commands, prefer
a file-scoped invocation when supported, avoid unrelated whole-tree rewrites,
and never infer or hardcode a formatter. If no command can be discovered, the
writer warns once with
`no format command discovered in repo instructions; skipping` and continues.
Run only verification relevant to the changed files unless the role's
definition of done requires broader gates.

For planned implementation, plan-producing skills resolve this command once and
place it in every artifact-writing task. Runtime discovery remains the fallback
for direct lifecycle writers and incomplete or stale plans. When the same
contract crosses dispatch boundaries, keep each copy self-contained and protect
equivalence with contract tests.

## Recommended Starting Points

- Use `create-oat-skill` when the new skill belongs to an OAT lifecycle or maintenance flow.
- Use `create-agnostic-skill` when you want a reusable workflow skill that is not OAT-specific.
- Use existing lifecycle skills as examples for progress banners, prerequisites, and artifact updates.

## Delegation-Capable Skills

Skills that dispatch subagents, workers, reviewers, or fresh-context helper sessions need a capability model before work starts. Do not assume delegation is available, and do not silently downgrade just because the runtime needs user authorization.

At minimum, the skill contract should:

- Probe whether the host can dispatch the required helper role(s).
- Distinguish `available`, `authorization required`, and `not resolved`.
- Ask once at skill start when authorization is required, with the approval scope stated clearly.
- Lock the selected tier for the run unless the user explicitly changes execution mode.
- Stop before side effects if delegation is required for correctness and authorization remains unresolved.
- Document the fallback path and any quality or independence tradeoff.

Delegation-capable skills should load `subagent-orchestration` instead of
copying task classes, model-selection principles, dated provider matrices, or
refresh evidence. Load exactly one active-provider selection reference from
that skill. The caller applies the guidance and still owns decomposition,
classification judgment, user interaction, verification of load-bearing
claims, cross-lane synthesis, and artifact writes.

OAT-specific skills should separately compose with the internal
`oat-dispatch-subagents` contract instead of copying launch or recovery rules.
Load exactly one matching provider mechanics reference from that skill. The
dispatch contract owns capability and authorization checks, live catalog
evidence, authorized routes, launch acceptance, recovery, and the neutral
dispatch record. Keep model/effort/reasoning/service-tier axes explicit and do
not collapse the selection and mechanics references into one provider matrix.
Before each launch, disclose the resolved dependency sources and effective
runtime target; never present a bundled recommendation as the selected target.

Keep project lifecycle policy out of that general layer. A lifecycle caller
loads `oat-project-dispatch-subagents` to resolve project, phase/task, gate,
write-boundary, commit, and worktree context, then passes a generic request to
`oat-dispatch-subagents`. Analytical callers such as repository audits can use
the guidance and dispatch contracts without requiring an active project. In
either case, resolve the provider first, then load one selection reference and
the matching mechanics reference.

Use `create-agnostic-skill` or `create-oat-skill` as the starting point; both include the current delegation guidance and optional capability-detection template.

## Gate-aware skills

A skill that supports configured final gates must declare `oat_gateable: true`
in frontmatter and include a final Gate Execution step in its process contract.
Without both pieces, a configured `workflow.gates.skills.<skill>` entry is a
validation warning rather than an executable contract.

The Gate Execution step should:

1. Run `oat gate resolve <this-skill> --json`.
2. Treat `null` as "no gate configured."
3. Export the resolved path with `export PROJECT_PATH` before launching the
   command shell.
4. For `oat gate review`, require the configured command to include
   `--project "$PROJECT_PATH"`; do not append it at runtime, because the resolved
   command must execute exactly as configured.
5. Run the resolved `command` as the skill's last step and use its exit code as
   the pass/fail signal.
6. Follow the gate's `onFailure` policy:
   - `block` - remediate and rerun up to `maxAttempts`, then escalate.
   - `prompt` - surface the failure and ask the user.
   - `warn` - record the failure and continue.

For OAT review gates, prefer putting
`oat gate review --project "$PROJECT_PATH" "<prompt>"` in the configured gate
command rather than hard-coding a provider CLI directly in the skill. Use
`oat gate cross-provider-exec "<prompt>"` for generic cross-runtime commands
that should report only the child process status, not review findings.
Reusable lifecycle gate commands must omit `--target <id>` so the
dispatcher can avoid the current runtime; reserve explicit targets for
manual/debug commands or deliberate local/user-specific overrides. See
[Workflow Gates](../cli-utilities/workflow-gates.md) for the config and command
surface.

## Reading project state

Skills that need fields from the active project's `state.md` (e.g. `phase`, `phaseStatus`, `workflowMode`, `docsUpdated`, `lastCommit`) MUST query the CLI instead of hand-parsing YAML with `grep`/`awk`.

For one field, use `--field`:

```bash
WORKFLOW_MODE=$(oat project status --field project.workflowMode 2>/dev/null || echo null)
```

If the skill is reading a resolved project path instead of the active project pointer, add `--project-path`:

```bash
WORKFLOW_MODE=$(oat project status --project-path "$PROJECT_PATH" --field project.workflowMode 2>/dev/null || echo null)
```

For multiple fields, use `--shell` so the CLI reads project state once and emits shell-safe assignments:

```bash
eval "$(oat project status --shell \
  PHASE=project.phase \
  PHASE_STATUS=project.phaseStatus \
  WORKFLOW_MODE=project.workflowMode 2>/dev/null)"
```

Skill snippets assume `oat` is available on `PATH`. Environments without a global install, including CI or cloud runners, can provide an `oat` shim backed by `npx`:

```bash
mkdir -p .oat/bin
cat > .oat/bin/oat <<'EOF'
#!/usr/bin/env bash
exec npx @open-agent-toolkit/cli "$@"
EOF
chmod +x .oat/bin/oat
export PATH="$PWD/.oat/bin:$PATH"
```

Create the shim once per checkout or CI job instead of putting `command -v oat` fallback branches in every skill. The same snippet also supports setups where `oat` is intentionally provided on `PATH` by `npx`.

The JSON output is a stable contract: the field set consumed by migrated skills is locked by `MIGRATED_FIELDS` in `packages/cli/src/commands/project/status.test.ts`, so removing or renaming any of those keys is a real test failure rather than a silent runtime break. See [CLI Reference](../reference/cli-reference.md) for the full locked field set.

## Reference artifacts

- `.agents/skills/*/SKILL.md`
- `AGENTS.md`
- `.agents/skills/oat-project-implement/SKILL.md`
- `.agents/skills/oat-project-complete/SKILL.md`
- `.agents/skills/oat-project-review-receive/SKILL.md`
