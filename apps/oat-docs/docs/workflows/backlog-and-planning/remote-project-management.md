---
title: Remote Project Management
description: Safely bind OAT planning records to GitHub, Linear, or Jira through provider-neutral host capabilities.
---

# Remote Project Management

Remote project management connects an OAT backlog item or project to a remote
GitHub, Linear, or Jira record. OAT owns policy, previews, approvals, durable
operation state, and authoritative read-back verification. The host agent owns
live execution capability discovery.

Remote management is deliberately explicit. It does not turn every plan task
into a remote issue, run background synchronization, or treat a provider result
as proof of success.

## Prerequisite

Confirm that file-backed project management is adopted before using a remote
command:

```bash
oat pjm doctor --json
```

Continue only when `adoption.state` is `declared` or `inferred-legacy`. Run
`oat pjm init` first when adoption is absent or only partially initialized.

## Lifecycle operations

The command family is `oat pjm remote`:

```bash
oat pjm remote intake github:example/repository#123 --to-backlog BL-123 --capability-evidence-stdin --json
oat pjm remote publish --binding rb_example --capability-evidence-stdin --json
oat pjm remote refresh --binding rb_example --capability-evidence-stdin --json
oat pjm remote reconcile --binding rb_example --capability-evidence-stdin --json
oat pjm remote closeout --project .oat/projects/shared/example --capability-evidence-stdin --json
oat pjm remote discussion --binding rb_example --limit 20 --capability-evidence-stdin --json
oat pjm remote resolve relink --binding rb_example github:example/repository#456 --capability-evidence-stdin --json
oat pjm remote resolve detach --binding rb_example --json
oat pjm remote resolve recreate --binding rb_example --capability-evidence-stdin --json
oat pjm remote doctor --json
oat pjm remote migrate --check --json
```

Before each provider-contacting example, the host discovers live capability and
supplies only its bounded provider-neutral evidence on standard input. Mutation
commands also require the current caller-owned authority evidence requested by
their live help.

- `intake` reads one remote record into a selected local backlog target and
  creates the binding.
- `publish` creates or updates one explicitly selected binding.
- `refresh` updates retained snapshots without writing remotely.
- `reconcile` classifies local, remote, and baseline changes before proposing
  any write.
- `closeout` prepares a reviewed batch while preserving independent per-binding
  outcomes.
- `discussion` returns one bounded, sanitized page as non-persisted evidence.
- `resolve relink`, `detach`, and `recreate` handle anomalous bindings without
  discarding identity history or retrying an uncertain create blindly.
- `doctor` and `migrate` diagnose or repair local records without contacting a
  provider.

Use `--help` on the live command for current options. JSON output uses one
versioned envelope and may return a nonzero shell exit for a safely persisted
`pending`, `needs-review`, `partial`, `uncertain`, or `blocked` outcome.

## Repository-owned policy

Remote policy lives only in the shared repository config at `.oat/config.json`.
The safe defaults are local operational state, no description publication, and
read-only authority:

```json
{
  "pjm": {
    "remote": {
      "schemaVersion": 1,
      "storage": { "state": "local" },
      "policy": {
        "description": "none",
        "authority": { "default": "read-only" }
      }
    }
  }
}
```

Use the config command instead of editing nested values by hand:

```bash
oat config set pjm.remote.policy.description managed-section --shared
oat config set pjm.remote.policy.authority.operations.update-fields user-approved --shared
oat config set pjm.remote.policy.providers.github.authority.operations.create user-approved --shared
```

Description modes are `none`, `managed-section`, and `replace`. Authority modes
are `read-only`, `user-approved`, `user-authorized`, and `autonomous`.
For each operation, OAT resolves the repository operation override, then its
repository default, then the built-in read-only fallback. A matching provider
operation override or provider default replaces that repository result and may
broaden it. Binding defaults and operation restrictions then clamp authority,
while purpose field grants intersect to narrow the outbound fields. Provider
configuration never bypasses hard approval floors or the requirement for
current caller-owned authority evidence; missing, stale, or mismatched evidence
fails closed. Autonomous configuration is not a background grant.

Current CLI bindings have a fixed intake/source or publish/planning purpose
and empty per-binding restrictions; no command exposes additional binding
restriction or purpose-grant setters. These remain internal narrowing layers,
not extra configurable user controls.

## Live host capability boundary

At operation time, the host agent inspects currently granted MCP or connector
descriptions for the requested semantic operation and exact account, workspace,
site, or repository context. If no capable connector is available, it may
inspect the live help of an already configured provider CLI before the first
provider-contacting command.

OAT does not store provider tool names, native schemas, captured catalogs,
executable names, flags, or CLI dialects. The host returns only bounded,
sanitized capability evidence through `--capability-evidence-stdin`. It must not
install tools, request credential values, or switch execution surfaces after an
attempt begins. The CLI may then emit one provider-neutral `externalAction`.
The host executes that exact action at most once and returns one bounded
observation with `oat pjm remote operation continue`.

## Content and outbound safety

Inbound provider text is retained only through an allowlist of core fields and
adapter-approved extensions. If a retained text field triggers a conservative
sensitive-content signal, OAT suppresses that whole field and marks the
snapshot incomplete. This is a bounded field-safety rule, not general DLP or
credential-value parsing.

Every remote create or update consumes only an explicit normalized projection.
The universal provider-neutral pre-write gate evaluates that projection before
preview, approval, action, and authoritative read-back. It never scans the
repository, worktree, Git history, or arbitrary files for secrets. Missing,
stale, failed, or blocked safety evidence prevents execution.

## Previews, approval floors, and uncertainty

Mutation-capable commands persist and return a preview before execution. The
preview digest binds the target, normalized fields, remote revision,
capability, safety result, and effective policy. If any load-bearing input
changes, the approval is stale.

Fresh approval is required for complete description replacement on create,
relink, detach, recreate, destructive operations, and promotion to shared
operational storage. **Current limitation:** replace-mode updates follow
configured `update-fields` authority without the create-time replacement
floor; choose `user-approved` if each overwrite needs human review.
`user-approved` authority requires applying the exact persisted preview.
Higher configured authority cannot bypass floors that the operation enforces.

The host submits a bounded observation with `oat pjm remote operation continue`.
Only an OAT `ok` envelope after authoritative read-back means success. A
connector response, process exit, or visible remote change is evidence rather
than a verdict. If a create or update is uncertain, do not retry it blindly;
use the recovery guidance in the envelope so OAT can search, relink, recreate,
or reconcile without producing duplicates.

## Storage and worktrees

Current production binding metadata lives under
`.oat/repo/pjm/remote/bindings`, including bindings for local projects. The
owner-specific routing design is not wired into that store. This directory
is not gitignored by OAT: review tracker metadata exposure before committing.

Operational snapshots, journals, batches, and receipts default to a
repository-fingerprinted directory under the Git common directory:
`.git/oat/pjm-remote/<repository-fingerprint>/`. All linked worktrees for one
repository therefore share the same local operational state, while another
clone gets its own store.

Shared operational storage is opt-in and may expose remote planning content to
everyone with repository access. It requires a persisted preview and fresh
approval. **Current limitation:** production does not enforce the intended
local-project rejection; do not combine shared storage with private local
project assumptions. Preview with `oat pjm remote storage shared` without
`--apply`, then use the returned approval digest for the explicit apply. The
help command describes flags; it does not preview proposed storage changes.

## Offline behavior

OAT can inspect portable bindings, the bounded local snapshot, journals,
receipts, and pending recovery instructions while offline. `remote doctor` and
`migrate` are local-only. Provider refresh, publication, reconciliation writes,
and authoritative verification remain pending or blocked until matching live
capability evidence is available; offline state never fabricates remote
freshness or success.

## Related references

- [Configuration](../../reference/configuration.md)
- [CLI Reference](../../reference/cli-reference.md)
- [File Locations](../../reference/file-locations.md)
- [Troubleshooting](../../reference/troubleshooting.md)

## Choosing bindings and policy

Default: no binding, preserving offline work. Choose intake for tracker-owned
tickets (title/body/priority inbound only), publish for locally owned tracker
work. Both need capability evidence; publication needs exact write authority.

| Description policy | Choose when                     | Tradeoff                                                         |
| ------------------ | ------------------------------- | ---------------------------------------------------------------- |
| `none` (default)   | The local body must not be sent | No outbound body comparison; intake still reads the remote body  |
| `managed-section`  | Humans also edit tracker prose  | OAT owns only its marked block; broken markers block writes      |
| `replace`          | OAT is the sole body author     | Can overwrite tracker prose; updates follow configured authority |

| Authority             | Choose when                                     | Tradeoff                                                       |
| --------------------- | ----------------------------------------------- | -------------------------------------------------------------- |
| `read-only` (default) | Intake/refresh before enabling writes           | No remote mutations                                            |
| `user-approved`       | Every exact payload needs review                | Fresh digest-bound approval per write                          |
| `user-authorized`     | A specific request supplies authority           | No mandatory per-payload preview approval                      |
| `autonomous`          | A workflow supplies matching authority evidence | Reduced live oversight, not unrestricted background permission |

**Recommendation (inference):** start read-only; enable create/update-fields
as user-approved together. Approval needs a matching digest within five minutes.
Replace updates lack the create-time floor: broader authority can overwrite
without human approval. Unset provider policy inherits; overrides can broaden
it, so restate needed operation restrictions after overriding provider defaults.

Storage defaults local (linked worktrees share it, clones do not). Shared
state exposes content/journals and does not migrate old records.
**Recommendation:** local unless exposure/recovery needs justify approved shared
storage. Local-project bindings remain in the repository, not inherently private.
