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

> [!WARNING]
> Running `oat pjm init` again, or running `oat pjm migrate --apply`,
> currently replaces the `pjm` section of `.oat/config.json` and deletes any
> `pjm.remote` settings, which hold the remote policy described below. Before
> you rerun either command, back up `.oat/config.json`. Afterwards, run
> `git diff .oat/config.json` and restore `pjm.remote` if it was removed.

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
operational storage.

> [!WARNING]
> In `replace` description mode, only creating an issue always needs fresh
> approval; later updates follow your `update-fields` authority, so
> `user-authorized` or `autonomous` authority can overwrite an issue's
> description without a person approving it. If someone must review each
> overwrite, set `pjm.remote.policy.authority.operations.update-fields` to
> `user-approved`.

`user-approved` authority requires applying the exact persisted preview.
Higher configured authority cannot bypass floors that the operation enforces.

The host submits a bounded observation with `oat pjm remote operation continue`.
Only an OAT `ok` envelope after authoritative read-back means success. A
connector response, process exit, or visible remote change is evidence rather
than a verdict. If a create or update is uncertain, do not retry it blindly;
use the recovery guidance in the envelope so OAT can search, relink, recreate,
or reconcile without producing duplicates.

## Storage and worktrees

> [!WARNING]
> OAT writes every binding record, including bindings for local projects, under
> `.oat/repo/pjm/remote/bindings/`, and it does not gitignore that directory, so
> those records are committed unless you exclude them. Review that directory
> before committing if tracker links should not appear in the repository.

Bindings are not yet stored with the project or backlog item that owns them;
the owner-specific routing design is not wired into the current store.

Operational snapshots, journals, batches, and receipts default to a
repository-fingerprinted directory under the Git common directory:
`.git/oat/pjm-remote/<repository-fingerprint>/`. All linked worktrees for one
repository therefore share the same local operational state, while another
clone gets its own store.

Shared operational storage is opt-in and may expose remote planning content to
everyone with repository access. It requires a persisted preview and fresh
approval.

> [!WARNING]
> Shared storage is meant to be refused for local projects, but the current CLI
> does not enforce that, so a local project's remote state is committed with
> everyone else's. Do not combine shared storage with local projects.

Preview with `oat pjm remote storage shared` without
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

A **binding** links one local backlog item or project to one GitHub, Linear, or
Jira issue. You create a binding in one of two ways: **intake** imports an
existing tracker issue as a local backlog item, and **publish** creates a
tracker issue from a local item. Both commands need capability evidence from
the host agent (see [Live host capability boundary](#live-host-capability-boundary)),
so in practice you ask your agent to run them through the `oat-pjm-remote`
skill. OAT creates no binding unless you ask, so local work stays complete
offline.

| Choice     | Choose it when                          | What you give up                                                                                                              |
| ---------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| No binding | The item matters only in the repository | Visibility in the tracker                                                                                                     |
| Intake     | The tracker owns the issue              | Title, description, and priority flow only into the repository; local edits never flow back                                   |
| Publish    | The work starts locally                 | You need write authority (below). Title, priority, and, if the description policy allows, the description then flow both ways |

- If you maintain an open-source project on GitHub, intake reported issues and
  publish only the work that maintainers start.
- If your team plans in Linear or Jira, intake the tickets that agents work on.

### How much of the description is sent

| `pjm.remote.policy.description` | Choose it when                            | What you give up                                                                               |
| ------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `none` (default)                | The local description is sensitive        | OAT never sends or compares a description. Intake still copies the issue's description locally |
| `managed-section`               | People also edit the issue in the tracker | OAT owns only the text between its marker comments; if the markers are broken, the write stops |
| `replace`                       | OAT is the only author of the description | Edits made in the tracker are overwritten (see the replace-mode warning above)                 |

### Who may write, and with what approval

Authority is set with `pjm.remote.policy.authority.default`, or per operation
under `pjm.remote.policy.authority.operations.<operation>`, in shared config
only. Before any write, OAT saves a preview of exactly what it would send,
identified by a digest (a content hash).

| Authority             | Choose it when                                                  | What you give up                                                                           |
| --------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `read-only` (default) | You only intake and refresh issues                              | All writes to the tracker                                                                  |
| `user-approved`       | A person must see each exact change                             | One approval per write: the person approves the preview digest within five minutes         |
| `user-authorized`     | An explicit request such as "publish BL-12 to Linear" is enough | Reviewing each change before it is sent                                                    |
| `autonomous`          | An OAT workflow writes as one of its steps                      | Most live oversight. The workflow's evidence must still match the exact operation and item |

Deleting, recreating, relinking, or detaching a binding, and creating an issue
in `replace` mode, always need `user-approved` approval, whatever you configure.

- Start with `read-only` and intake.
- When OAT should create and maintain issues, set both `create` and
  `update-fields` to `user-approved`.
- Choose `user-authorized` or `autonomous` only when you deliberately accept
  that a request or a workflow step authorizes the write without a per-change
  review.

A provider section, `pjm.remote.policy.providers.<github|linear|jira>`, is unset
by default and then inherits the repository policy. If one policy fits every
tracker, leave it unset. If trust differs, for example a private Linear
workspace versus public GitHub, set a provider policy, but review it carefully:
it replaces the repository value and can grant more than the repository policy
does. A provider `authority.default` also replaces the repository's
per-operation settings, so repeat any per-operation limits you still need under
that provider.

### Where operation state is stored

Snapshots and journals (OAT's copy of each issue as last read, and its log of
remote operations) are stored locally by default, under the Git directory.
Every worktree of one clone shares them; other clones do not see them.

- Keep `local` storage unless teammates need each other's operation logs, for
  example to recover a create whose outcome was unclear.
- If you do switch to shared storage, review what it exposes first: it puts
  remote content and operation journals into Git history, and it does not move
  existing records. Do not use it with local projects (see the warning above).

Local storage does not make binding records private, because bindings are
always written to the repository as described in
[Storage and worktrees](#storage-and-worktrees).
