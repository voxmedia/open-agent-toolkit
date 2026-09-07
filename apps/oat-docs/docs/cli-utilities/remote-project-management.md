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
oat pjm remote intake github:example/repository#123 --to-backlog BL-123 --json
oat pjm remote publish --binding rb_example --json
oat pjm remote refresh --binding rb_example --json
oat pjm remote reconcile --binding rb_example --json
oat pjm remote closeout --project .oat/projects/shared/example --json
oat pjm remote discussion --binding rb_example --limit 20 --json
oat pjm remote resolve relink --binding rb_example github:example/repository#456 --json
oat pjm remote resolve detach --binding rb_example --json
oat pjm remote resolve recreate --binding rb_example --json
oat pjm remote doctor --json
oat pjm remote migrate --check --json
```

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
Repository, provider, purpose, and operation policy combine by intersection, so
a narrower layer can tighten authority or fields but cannot broaden them.
Autonomous configuration is not a background grant: the caller must also
provide evidence of an active, otherwise authorized OAT workflow.

## Live host capability boundary

At operation time, the host agent inspects currently granted MCP or connector
descriptions for the requested semantic operation and exact account, workspace,
site, or repository context. If no capable connector is available, it may
inspect the live help of an already configured provider CLI before the first
attempt.

OAT does not store provider tool names, native schemas, captured catalogs,
executable names, flags, or CLI dialects. The host returns only bounded,
sanitized capability evidence. It must not install tools, request credential
values, or switch execution surfaces after an attempt begins.

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

Fresh approval is always required for complete description replacement,
relink, detach, recreate, destructive operations, and promotion to shared
operational storage. `user-approved` authority also requires applying the exact
persisted preview. Higher configured authority cannot bypass those floors.

The host submits a bounded observation with `oat pjm remote operation continue`.
Only an OAT `ok` envelope after authoritative read-back means success. A
connector response, process exit, or visible remote change is evidence rather
than a verdict. If a create or update is uncertain, do not retry it blindly;
use the recovery guidance in the envelope so OAT can search, relink, recreate,
or reconcile without producing duplicates.

## Storage and worktrees

Portable binding metadata follows its backlog or project owner. Shared backlog
metadata lives under `.oat/repo/pjm/remote/bindings`; project metadata lives
under that project's `remote/bindings` directory. Local projects keep their
portable metadata in the local operational store.

Operational snapshots, journals, batches, and receipts default to a
repository-fingerprinted directory under the Git common directory:
`.git/oat/pjm-remote/<repository-fingerprint>/`. All linked worktrees for one
repository therefore share the same local operational state, while another
clone gets its own store.

Shared operational storage is opt-in and may expose remote planning content to
everyone with repository access. It requires a persisted preview and fresh
approval, and it is rejected for local projects. Preview the exact proposed
paths through `oat pjm remote storage shared --help` before applying them.

## Offline behavior

OAT can inspect portable bindings, the bounded local snapshot, journals,
receipts, and pending recovery instructions while offline. `remote doctor` and
`migrate` are local-only. Provider refresh, publication, reconciliation writes,
and authoritative verification remain pending or blocked until matching live
capability evidence is available; offline state never fabricates remote
freshness or success.

## Related references

- [Configuration](configuration.md)
- [CLI Reference](../reference/cli-reference.md)
- [File Locations](../reference/file-locations.md)
- [Troubleshooting](../reference/troubleshooting.md)
