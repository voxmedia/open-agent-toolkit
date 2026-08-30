---
skill: deep-research
schema: technical
topic: GitHub Issues as an OAT/PJM remote tracker provider
model: gpt-5-6-luna
generated_at: 2026-08-30
depth: exhaustive
context: .oat/projects/shared/remote-project-management
---

# GitHub Issues provider dossier

## Executive Summary

GitHub Issues is a repository-scoped tracker with organization-scoped issue
types and issue fields, repository-scoped labels and milestones, optional
sub-issues/dependencies/projects, and a shared issue/pull-request surface. It
is a viable OAT/PJM provider, but it is not a drop-in equivalent of Linear or
Jira. The adapter must preserve provider identity and native metadata instead
of pretending that every remote field is a normalized OAT field.

Recommended v1 posture:

- Use the REST Issues API for ordinary read/list/create/update, labels,
  milestones, comments, timeline, and incremental polling. Use GraphQL when
  project/field hierarchy, transfer/delete, richer timeline connections, or
  cross-resource reads are required. Probe capabilities per host/repository.
- Treat the official GitHub MCP server as an agent-facing access layer when it
  is configured, but keep an explicit REST/GraphQL or `gh` fallback. MCP tool
  names, enabled toolsets, host, scopes, and read-only mode are deployment
  configuration, not a provider guarantee.
- Use `gh` as the operator/debugging interface and for the repository’s
  existing triage/filed workflows. Pin or probe the CLI version and parse
  explicit `--json` fields; do not make formatted human output the adapter
  protocol.
- Proposed boundary for the integration (pending project approval): keep OAT
  artifacts authoritative for execution evidence and deep plans, and keep
  GitHub Issues authoritative for tracker intent, public ownership, and remote
  issue lifecycle. Do not mutate OAT phase/status from a GitHub issue merely
  because a branch, pull request, or Actions run exists. Development
  automation/status evidence is a separate integration surface.
- In the first implementation, comments and assignees are informational
  remote-only data. Read them for context and reconciliation evidence, but do
  not synchronize them into OAT fields or use them as implicit ownership
  commands.

The most important correctness rule is fail-closed synchronization. GitHub
silently drops several writes (labels, milestone, assignees, type, and issue
fields) when the token lacks push access. The adapter must record the requested
field mask, re-read the issue, and report a partial/failed write if the
response does not prove the requested state.

## Methodology

This dossier was prepared on 2026-08-30 from:

1. The active OAT remote-project-management discovery, state, handover,
   templates, CLI backlog creation path, PJM instructions, triage/filed
   workflows, and provider-neutral decisions in this checkout.
2. Current primary GitHub documentation for Issues REST, GraphQL, sub-issues,
   issue types/fields, milestones, transfer, timeline/events, issue/PR
   linkage, permissions, and the official `github/github-mcp-server`.
3. The installed GitHub CLI, verified locally as `gh version 2.96.0 (2026-07-02)`
   on 2026-08-30. Local auth and extension output were observed read-only and
   are environment evidence, not a contract for every operator.

Statements labelled **Verified** describe an observed source or documented
behavior. **Recommendation** and **Inference** are adapter design judgments
derived from those facts. GitHub limits, feature availability, and host
configuration can change; implementation should retain capability probes and
response validation.

## Findings

### 1. Provider data model and schema

#### 1.1 Canonical issue resource

**Verified.** GitHub’s REST model treats every pull request as an issue, but
not every issue as a pull request. An issue payload includes a repository-scoped
`number`, opaque `id`/`node_id`, API/HTML URLs, `repository_url`, title, Markdown
body, author, assignees, labels, milestone, lock fields, state, timestamps,
`closed_at`, `closed_by`, `author_association`, `state_reason`, and a
`pull_request` object only when the resource is a PR. See the [Issues REST
reference](https://docs.github.com/en/rest/issues/issues?apiVersion=2026-03-10).

**Recommendation.** Store a GitHub association with at least:

```yaml
type: github
host: github.com
owner: ORG_OR_USER
repo: repository
number: 123
node_id: I_kwDO...
url: https://github.com/ORG_OR_USER/repository/issues/123
```

`host + owner + repo + number` is the human/API locator. `node_id` (or the
GraphQL node ID) is the stronger remote identity when available; retain both
because transfer changes the repository/number locator while the provider’s
opaque identity is the best way to detect continuity. Keep the URL for
operator navigation, but do not use a URL alone as the identity key.

#### 1.2 Text and tracker metadata

**Verified.** Issue titles are single values and bodies are Markdown; the APIs
also expose rendered HTML/text variants in GraphQL. GitHub has no native OAT
“acceptance criteria” field. Acceptance criteria must remain in OAT or be
encoded in the body using a documented, provider-owned section/task-list
convention. Labels are repository-scoped named tags. Milestones are
repository-scoped groupings with description, due date, open/closed state, and
completion counts; see [milestones](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones).

**Verified.** Issue types are organization-scoped custom categories (up to 25
per organization, with default task/bug/feature types); organization owners
manage them. [Issue types](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/managing-issue-types-in-an-organization)
are not repository labels and may be unavailable to a token or repository.

**Verified.** Organization issue fields (up to 25) can be single-select,
text, number, or date; default fields include Priority, Effort, Start date,
and Target date. They are organization-owned and can apply across repositories.
See [issue fields](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/managing-issue-fields-in-your-organization)
and [field management](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-and-managing-issue-fields).

**Recommendation.** Normalize only title, body/description, lifecycle state,
and a stable association in v1. Preserve labels, milestone, issue type, issue
fields, project item IDs, and rendered/body hashes in a provider extension.
Do not map arbitrary labels to OAT priority without explicit configuration;
label names are mutable and repository-local.

#### 1.3 Hierarchy, dependencies, and projects

**Verified.** GitHub supports parent/sub-issue relationships and issue
dependencies (`blockedBy`/`blocking`). REST sub-issue endpoints use the
numeric issue ID, not the issue number, for add/remove/reprioritize operations:
[sub-issues REST](https://docs.github.com/en/rest/issues/sub-issues?apiVersion=2026-03-10).
The GraphQL `Issue` type exposes `parent`, `subIssues`, dependency summaries,
tracked issues, and timeline connections: [GraphQL Issue reference](https://docs.github.com/en/graphql/reference/issues).

Projects are Project V2 resources and can attach issue items, but a project is
not an issue and project field values are not repository issue fields. The
official MCP server separates `projects` from `issues`; a provider adapter
should keep project membership as optional remote metadata rather than infer a
PJM project from any one issue.

#### 1.4 Comments, assignees, and reactions

**Verified.** Comments, assignees, reactions, participants, and author
association are first-class GitHub data, and REST/GraphQL/MCP/CLI can read or
write much of it. **Proposed provider policy (pending project approval):**
comments and assignees are informational remote-only fields. They may appear in
a read snapshot or evidence report, but they are not OAT sync fields, do not
determine local assignee/ownership, and must never be silently overwritten by a
backlog sync. An explicitly approved outbound completion annotation/comment
would be a separate candidate operation, not synchronization.

### 2. Identity, revisions, and lifecycle

#### 2.1 Identity and references

**Verified.** Issue numbers are unique only within a repository. A canonical
association therefore needs host, owner, repository, and number; `node_id`,
database ID, and URL are useful continuity/navigation evidence. GitHub Enterprise
Server (GHES) changes the host and may change MCP/API endpoint configuration.

**Recommendation.** Use a provider-qualified reference such as
`github:github.com/ORG/REPO#123`, with structured fields alongside the display
reference. Treat `node_id` as an immutable-match candidate, not as a license to
omit repository/number. If only a URL is supplied, parse and validate host,
owner, repo, and issue number before any write.

#### 2.2 State and state reason

**Verified.** Issue state is `open` or `closed`; `state_reason` distinguishes
`completed`, `not_planned`, `duplicate`, and `reopened` (or null). Closing an
issue is permissioned separately from editing all metadata. A duplicate can
retain a canonical duplicate relationship in GraphQL (`duplicateOf`) and the
timeline. See [closing issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/administering-issues/closing-an-issue)
and the [REST issue update](https://docs.github.com/en/rest/issues/issues?apiVersion=2026-03-10).

**Recommendation.** Map `open` to OAT `open` unless a local projection has an
explicit in-progress signal; map `closed + completed` to `closed`, `closed +
not_planned` to `wont_do`, and `closed + duplicate` to `wont_do` with a
provider duplicate extension. `reopened` maps to `open`. Do not infer
`in_progress` from a label, assignee, branch, or PR unless a separately
approved policy says so.

#### 2.3 Updated timestamps, events, and history

**Verified.** REST issue payloads have `created_at`, `updated_at`, and
`closed_at`; GraphQL exposes `createdAt`, `updatedAt`, `lastEditedAt`, and
timeline items. REST repository issue listing supports `since` (last updated
timestamp) and pagination. REST timeline endpoints and [issue event
types](https://docs.github.com/en/rest/using-the-rest-api/issue-event-types)
provide event IDs, actor, event type, commit references, and creation time.
GraphQL `timelineItems` supports cursors, `since`, `updatedAt`, and item-type
filters; the older `timeline` field is deprecated.

**Recommendation.** Persist `remote_updated_at`, `remote_last_edited_at` when
available, the last timeline cursor/event ID, and a retrieval timestamp. Use
`updated_at + since` for a bounded poll, then consume timeline items for
field-level evidence. Timestamps are change signals, not complete revisions:
two changes can share a timestamp and some provider changes may not be
represented by the selected endpoint. A post-write GET or GraphQL read is
mandatory.

#### 2.4 Transfer, deletion, and inaccessible resources

**Verified.** An issue transfer is allowed only while open and requires write
access to source and target under the documented owner/org rules. The issue
number changes; its old URL redirects; comments and assignees remain, while
labels/milestones are retained only when matching target names (and milestone
due dates where applicable). See [transferring an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/administering-issues/transferring-an-issue-to-another-repository?tool=cli)
and `gh issue transfer`.

**Verified.** REST GET commonly returns 301 for a transferred locator, 404
when inaccessible/not found, and 410 for a deleted resource when the caller
had access. GraphQL exposes a `deleteIssue` mutation, while REST has no general
issue-delete endpoint. Therefore deletion cannot be treated as an ordinary
closed state.

**Recommendation.** On 301, follow the redirect, read the new canonical
locator/node ID, and require explicit re-link confirmation if identity differs.
On 404/410, mark the association `remote_missing` or `remote_deleted` and stop
writes; never recreate automatically. Retain a tombstone with last known ID,
URL, and retrieval time so a later relink cannot create a duplicate.

### 3. MCP and API surfaces

#### 3.1 REST capability surface

**Verified.** The [REST Issues API](https://docs.github.com/en/rest/issues/issues?apiVersion=2026-03-10)
supports repository issue reads/lists, create, update, comments, labels,
milestones, and timeline. Repository issue list accepts state, milestone,
assignee, creator, mentioned user, labels, type, `since`, and pagination (up to
100 per page). Create and update support title/body/state/state reason,
milestone, labels, assignees, issue type, and issue field values where the
resource and permission allow them.

**Important verified hazard.** Create/update can silently drop labels,
milestone, assignee, issue type, and issue-field writes when the caller lacks
the required push-level permission. The response can look successful. The
adapter must compare a requested-field mask with a re-read, and surface
`partial_write` rather than claim synchronization.

Sub-issue REST endpoints provide parent lookup, child listing, add/remove, and
priority ordering. REST issue timeline/event APIs provide historical evidence,
not a globally monotonic revision number. REST does not provide full issue
deletion; GraphQL is needed for that operation.

#### 3.2 GraphQL capability surface

**Verified.** GraphQL’s `Issue` implements assignment, closing, comments,
deletion, labels, locking, Project V2 ownership, reactions, repository
membership, and issue relationships. It exposes body HTML/text, issue fields,
issue type, parent/sub-issues, dependency/tracked-issue relationships,
linked branches, closed-by-PR references, projects, timestamps, and timeline
items. Mutations cover issue create/update/close/reopen, labels/assignees,
sub-issues/dependencies, issue fields, comments, transfer, and deletion where
the schema and token permit them.

**Recommendation.** Keep GraphQL behind a capability-specific adapter module:
queries are efficient for a rich snapshot but are sensitive to schema drift,
cost limits, deprecations, and nullability. Request only fields needed by the
selected capability and retain a raw provider extension for fields not yet
normalized.

#### 3.3 Official GitHub MCP server

**Verified.** The official [GitHub MCP server](https://github.com/github/github-mcp-server)
supports configurable toolsets. GitHub documents default `repos`, `issues`,
and `pull_requests` toolsets; the server README also describes `labels`,
`projects`, `orgs`, `actions`, `git`, `users`, and other toolsets. Hosted MCP
uses a GitHub Copilot MCP endpoint/OAuth or PAT; local execution supports a
Docker image, `GITHUB_PERSONAL_ACCESS_TOKEN`, `--gh-host`/`GITHUB_HOST` for
GHES, and explicit toolset/tool allowlists. Read-only mode disables writes.

The issue toolset includes `issue_read` (get/comments/sub-issues/parent/labels),
`list_issues`, `search_issues`, `issue_write`, `add_issue_comment`,
`sub_issue_write`, issue type/field listing, and label operations. `issue_write`
can carry title/body/state/state reason/duplicate-of/labels/assignees/milestone/
type/issue fields; parent creation uses a parent issue number. MCP sub-issue
operations still require the numeric issue ID for the child. Projects have a
separate toolset and scope.

**Verified permissions from the MCP documentation.** Issue access generally
needs `repo`; organization issue type/field reads may need `read:org`; project
reads need `read:project`; project writes need `project`. Exact OAuth/PAT
permissions depend on hosted vs local server and the target host.

**Recommendation.** MCP should be a provider transport, not the normalized
provider contract. At startup record host, server version/configuration,
enabled toolsets, read-only mode, and a harmless read probe. A missing tool or
scope is `unsupported`/`unauthorized`, never an instruction to guess a REST
mutation. The server’s content filtering/lockdown features improve prompt
safety but do not replace repository authorization or public-body sanitization.

#### 3.4 Tracker versus development automation/status evidence

GitHub Issues (`issues`, `labels`, `projects`) represent tracker records.
Pull requests, linked branches, commits, Actions/workflow runs, checks, and
Copilot tools represent development automation or status evidence. GitHub’s
keyword linkage can close an issue when a PR merges, but that event is a
provider lifecycle side effect, not proof that OAT’s plan/spec/implementation
artifacts are complete. OAT should record a PR URL/merge SHA as evidence when
available and apply its own completion workflow separately. This follows the
directional guidance in the existing remote handover, which proposes external
status from GitHub integration while OAT owns deeper execution artifacts; that
boundary remains pending project approval ([handover](./linear-integration-discovery-handover.md#question-1-source-of-truth-model)).

### 4. CLI tooling (`gh`)

#### 4.1 Locally verified surface

**Verified locally (2026-08-30).** `gh version` is 2.96.0, released
2026-07-02. `gh auth status` reported an active `github.com` account with
`gist`, `read:org`, `repo`, and `workflow` scopes. `gh extension list` showed
`github/gh-stack v0.0.8`. This is local operator evidence and must not be
embedded as a provider requirement.

#### 4.2 Issue commands and machine output

**Verified.** `gh issue` exposes create, list, view, edit, close, reopen,
comment, delete, lock/unlock, pin/unpin, develop, transfer, and status. The
current [issue create manual](https://cli.github.com/manual/gh_issue_create)
supports title/body, labels, milestone, assignee, project, type, parent,
blocked-by, and blocking. Project creation/use may require `gh auth refresh -s
project`.

`gh issue list --json` and `gh issue view --json` expose fields including
`assignees`, `author`, `blockedBy`, `blocking`, `body`, `closed`, `closedAt`,
`closedByPullRequestsReferences`, `comments`, `createdAt`, `id`, `issueType`,
`labels`, `milestone`, `number`, `parent`, `projectItems`, `state`,
`stateReason`, `subIssues`, `subIssuesSummary`, `title`, `updatedAt`, and
`url`; see [issue list](https://cli.github.com/manual/gh_issue_list). `gh search
issues --json` provides compact search fields (including `isPullRequest`,
repository, labels, state, timestamps, and URL), supports `--state all`,
`--include-prs`, repository/owner/label/milestone/project/time filters, and
`--limit`; see [search issues](https://cli.github.com/manual/gh_search_issues).

**Recommendation.** Use `gh` in skills for human-approved triage, duplicate
search, and filing because that is the repository’s established workflow. For
an adapter, use explicit `--json` projections, check exit codes directly, and
record CLI version/host. Do not parse colors, tables, or prose. `gh` extensions
are useful operator plugins (and can add commands such as `gh stack`) but are
not part of the stable GitHub Issues provider API.

### 5. Authentication and permissions

**Verified.** Fine-grained PATs and GitHub App installation/user tokens have
repository and organization visibility boundaries. A GitHub App installation
token can see only repositories where the App is installed. Public reads may
be unauthenticated, but private/restricted data and all writes require
authorization. GitHub’s [fine-grained PAT permissions reference](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)
and endpoint docs are authoritative for the selected operation.

Typical requirements:

| Operation                                     | Minimum practical permission (verify on target)                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Read/list issue                               | Issues read (public issue may be anonymous)                                                        |
| Create issue                                  | Repository pull access; Issues write for fine-grained token                                        |
| Edit/close another user’s issue               | Repository write/Triage+; Issues write or shared PR permission                                     |
| Labels/milestones/assignees/type/fields write | Push-level repository access in addition to Issues write; org fields/types may need org permission |
| Read issue fields/types                       | Organization visibility, commonly `read:org` through MCP                                           |
| Project read/write                            | `read:project` / `project` or equivalent App permissions                                           |
| Transfer                                      | Write access to source and target, owner/org eligibility, open issue                               |
| Delete                                        | GraphQL delete permission and explicit approval; no REST equivalent                                |

**Verified failure signals.** APIs can return 301 (transfer), 304
(conditional-read unchanged), 400/422 (validation), 403 (forbidden/rate or
secondary limit), 404 (inaccessible/not found), 410 (gone/deleted/disabled),
and 503 (service unavailable). The `X-Accepted-GitHub-Permissions` response
header can identify required permissions; see [REST troubleshooting](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api).

**Recommendation.** Credentials belong in the user’s MCP/CLI/secret manager
configuration, never in `.oat` files or issue bodies. Preflight auth and issue
availability without creating anything, as the repository’s filing workflow
requires ([retro filing capability preflight](../../../../../.agents/skills/oat-project-retro-file/SKILL.md#step-3-capability-preflight)).
For public destinations, sanitize private logs, URLs, hostnames, tokens, and
identifiers before filing; the existing workflow makes this an explicit gate.

### 6. Normalized OAT mapping

#### 6.1 Existing OAT integration point

**Verified local.** Remote integration is intentionally layered on the
polymorphic `associated_issues` array; the discovery names future GitHub Issues
support and warns against abstraction leakage ([discovery findings and
constraints](../discovery.md#research-findings), [key decisions and
constraints](../discovery.md#key-decisions)). The backlog template currently
has OAT status, priority, scope, estimate, labels, assignee, timestamps,
`associated_issues`, and `external_plans` ([backlog template](../../../../templates/backlog-item.md)).
The state template currently documents backlog/project/Jira/Linear references
([state template](../../../../templates/state.md#L1-L6)). The CLI creator emits
`status: open`, null assignee, timestamps, empty `associated_issues`, and
empty `external_plans` ([backlog creation code](../../../../../packages/cli/src/commands/backlog/new.ts#L169-L202)).

#### 6.2 Proposed mapping contract

| OAT field                 | GitHub Issues mapping                                         | Direction/v1 rule                                                                   |
| ------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `title`                   | issue title                                                   | Bidirectional with conflict detection; preserve single-line OAT validation          |
| Description               | Markdown issue body; optional OAT-owned links/summary section | Intake/publish explicitly; do not overwrite remote prose without consent            |
| Acceptance criteria       | OAT body; optional provider-owned task-list section           | Proposed OAT authority; parse only an agreed marker                                 |
| `status: open`            | issue `open`                                                  | Bidirectional lifecycle projection                                                  |
| `status: in_progress`     | no native equivalent                                          | OAT-local unless explicit label/field policy is configured                          |
| `status: closed`          | issue closed, reason `completed`                              | Remote close requires explicit lifecycle consent or approved post-merge action      |
| `status: wont_do`         | issue closed, reason `not_planned` (or `duplicate`)           | Preserve reason and duplicate target in extension                                   |
| `priority`                | configured issue field or label                               | Optional, provider-owned mapping; never infer from arbitrary labels                 |
| `scope`, `scope_estimate` | no required native equivalent                                 | OAT-local; optionally copy into a clearly named issue field only by policy          |
| `labels`                  | repository labels                                             | Keep remote labels in extension; do not treat local labels as full replacement      |
| `assignee`                | GitHub assignees                                              | Informational remote-only; no sync                                                  |
| `milestone`               | repository milestone                                          | Optional extension; match by ID/name+due date, not name alone                       |
| `issueType`, issue fields | organization metadata                                         | Optional extension; capability- and org-permission-gated                            |
| hierarchy/dependencies    | parent/sub-issue/blocked-by/blocking                          | Optional extension; never create from OAT plan tasks automatically                  |
| comments/reactions        | comments/reactions                                            | Never synchronized; approved outbound completion annotation is a separate candidate |
| PR linkage                | `closedByPullRequestsReferences`, timeline/cross-reference    | Evidence-only; does not itself set OAT status                                       |
| timestamps/events         | `createdAt`, `updatedAt`, `lastEditedAt`, timeline            | Reconciliation cursors/evidence; not user-editable OAT timestamps                   |

Add `github` to the documented `associated_issues` type vocabulary only in an
implementation change with schema/version review. Until then, an adapter can
use a provider-neutral object with `type: github` and the structured fields
above, while preserving unknown fields in a `provider` extension rather than
changing generated templates ad hoc.

#### 6.3 Cardinality and lifecycle

The handover proposes this cardinality: one backlog item may link one or more
remote issues; one OAT project may aggregate many backlog items/issues. Do not
equate an OAT project with a GitHub Project V2 or a parent issue without
explicit mapping. It also proposes manual/skill-driven lifecycle moments,
not a long-running webhook bridge; both directions remain pending project
approval ([sync trigger guidance](./linear-integration-discovery-handover.md#question-4-sync-direction-and-trigger)).

### 7. Capability matrix

Legend: **N** = native/usable, **P** = possible with provider configuration or
permissions, **—** = not a safe v1 contract, **E** = evidence-only.

| Capability                | REST                                      | GraphQL                          | Official MCP                | `gh`                            | OAT v1 posture                           |
| ------------------------- | ----------------------------------------- | -------------------------------- | --------------------------- | ------------------------------- | ---------------------------------------- |
| Read one issue            | N                                         | N                                | N (`issue_read`)            | N                               | Required                                 |
| List/incremental poll     | N (`since`)                               | N (connections)                  | N (`list_issues`)           | N                               | Required; cursor/timestamp persisted     |
| Search duplicates         | N (search API)                            | P                                | N (`search_issues`)         | N (`gh search issues`)          | Required before create; candidate review |
| Title/body                | N                                         | N                                | N                           | N                               | Explicit bidirectional field policy      |
| Open/close + reason       | N                                         | N                                | N                           | N                               | Consent-gated; re-read                   |
| Labels                    | N/P; silent-drop hazard                   | N                                | N with labels toolset       | N                               | Extension/optional mapping               |
| Milestone                 | N/P; silent-drop hazard                   | N                                | P                           | N                               | Extension/optional                       |
| Assignees/comments        | N                                         | N                                | N                           | N                               | Informational remote-only                |
| Issue types               | P/org                                     | N                                | N (`list_issue_types`)      | N (`--type`)                    | Extension; probe org visibility          |
| Organization issue fields | P/org                                     | N                                | N (`list_issue_fields`)     | Partial/version-dependent       | Extension; field-mask validation         |
| Parent/sub-issues         | N (ID-based)                              | N                                | N (`sub_issue_write`)       | N (`--parent`)                  | Optional hierarchy                       |
| Dependencies              | P/endpoint coverage varies                | N                                | P                           | N fields                        | Optional evidence/extension              |
| Projects/project fields   | P                                         | N                                | P (`projects`)              | P/scope                         | Separate project adapter, not issue core |
| Timeline/history          | N                                         | N/richer                         | Best-effort issue read      | Partial                         | Cursor/evidence, not sole revision       |
| PR closing linkage        | N/issue payload/events                    | N/rich                           | P via pull requests         | N fields                        | Evidence-only                            |
| Transfer                  | Redirect/read; write endpoint constraints | N                                | P                           | N (`transfer`)                  | Explicit relink gate                     |
| Delete                    | —                                         | N                                | P                           | N command, permission-sensitive | Explicit destructive gate only           |
| Webhooks                  | N as external service                     | N subscriptions not a substitute | Server/deployment dependent | —                               | Deferred; manual polling v1              |

### 8. Three-way reconciliation and failure semantics

#### 8.1 Snapshot model

**Recommendation.** For each association, retain:

```text
base = last verified remote snapshot + local projection + provider identity
local = current OAT desired fields (only fields this adapter owns)
remote = current GitHub read (issue + selected timeline/relationship fields)
```

Compare by stable identity first, then classify each owned field:

- unchanged on both sides: no-op;
- local-only change: push if capability, consent, and write mask allow it;
- remote-only change: pull/report into OAT projection or leave remote-only;
- both changed to the same normalized value: record converged;
- both changed differently: conflict; do not last-writer-wins silently;
- 301/changed identity: transfer/relink review;
- 404/410: inaccessible/deleted tombstone and no recreate.

Use `updated_at`/GraphQL cursors to bound reads, but compare field values and
timeline evidence because timestamps do not prove causality. After every write,
re-read the resource and update the base snapshot only when the response
proves all requested fields.

#### 8.2 Failure classes

| Failure                                                     | Adapter result                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------- |
| Missing token/host/repository/Issues disabled               | `preflight_failed`; no write                                          |
| 401/403 or missing scope                                    | `unauthorized`; report exact capability/unblock                       |
| 301 transfer                                                | `identity_changed`; follow/read, require relink                       |
| 404 inaccessible/not found                                  | `remote_missing`; no recreate                                         |
| 410 deleted/issues disabled                                 | `remote_deleted` or `provider_disabled`; no recreate                  |
| 422 validation/type/field error                             | `invalid_request`; preserve local state and exact error               |
| Rate/secondary limit or 503                                 | bounded retry honoring `Retry-After`; then `retryable_failed`         |
| Successful response but requested field absent after reread | `partial_write`; never mark synced                                    |
| GraphQL null/deprecation/cost/tool unavailable              | `unsupported` or `schema_drift`; no fallback mutation without a probe |
| Duplicate search candidates                                 | `needs_review`; do not create or mutate automatically                 |

Partial writes must identify field-level outcomes. If title/body succeeded but
labels were silently dropped, report those separately and keep the base
snapshot at the last fully verified state. Never use a green HTTP status as the
sole success criterion.

#### 8.3 Duplicate search and idempotency

The existing OAT triage and retro workflows search active and archived local
backlog plus open/closed GitHub issues before proposing a new item, and use
`gh search issues --repo ... --state all` for issue candidates ([triage
reconciliation](../../../../../.agents/skills/triage-oat-issues/SKILL.md#step-5-reconcile-existing-coverage),
[retro duplicate check](../../../../../.agents/skills/oat-project-retro-file/SKILL.md#step-5-check-duplicates)).
Adopt the same rule for GitHub provider creation: exact title/keyword hits are
candidates, not proof; inspect repository, state, body, labels, and acceptance
scope. Require explicit disposition before linking, strengthening, or creating.

If a separately approved outbound completion annotation/comment is considered,
use an idempotency marker that is safe for the provider’s public body/comment
policy (for example an OAT project ID in a short footer), search before posting,
and re-read the created comment URL. This is a candidate filing operation, not
comment synchronization. Do not hide secrets or private context in markers.

### 9. Technical tradeoffs

| Choice                        | Strengths                                                                      | Costs/risks                                                                            | Recommendation                                      |
| ----------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------- |
| REST                          | Familiar CRUD/list, `since`, predictable HTTP, broad CLI parity                | Some relationship/field/delete gaps; silent-drop writes                                | Default core transport                              |
| GraphQL                       | Rich issue graph, fields/projects/timeline, transfer/delete, fewer round trips | Query cost, schema/deprecation/nullability drift, more complex error handling          | Optional rich transport behind probes               |
| Official MCP                  | Agent-native tools, hosted OAuth, issue/project toolsets, GHES options         | Toolset/version/config drift, scope ambiguity, content filtering, not always installed | Preferred agent path when configured; keep fallback |
| `gh` CLI                      | Existing OAT skills, good operator UX, JSON projections, duplicate search      | Version/output drift, shell/credential dependency, extensions not stable API           | Operator fallback and approved filing path          |
| Webhooks                      | Near-real-time event delivery                                                  | Requires durable service, secret validation, replay/idempotency/state store            | Defer for ephemeral-session v1                      |
| Full bidirectional field sync | Convenient human/agent parity                                                  | Conflicts, provider-native semantics, accidental public writes                         | Start with owned fields + explicit actions          |

Provider-neutral lifecycle mechanics should be shared, while GitHub codecs,
markers, capability probes, target collection, and collision rules remain
provider-owned, consistent with the accepted [provider-neutral extensions
decision](../../../../repo/reference/decisions/DR-260718-provider-neutral-extensions.md).

### 10. Risks and open questions

1. **Identity after transfer.** Confirm whether the selected API path exposes a
   stable node ID across all supported GitHub.com/GHES transfer cases; retain a
   human relink gate regardless.
2. **Organization feature availability.** Issue types and fields are org
   features with owner controls, limits, and visibility. Define a minimum
   repository-only mode that works without them.
3. **Priority semantics.** Decide whether an OAT priority-to-label/field mapping
   is configured per organization, or keep priority entirely OAT-local.
4. **Body ownership.** Define an OAT-managed section/marker and conflict policy
   before bidirectional body writes; Markdown task-list rendering is not an
   acceptance-criteria schema.
5. **Project boundary.** Decide whether a future provider project adapter is in
   scope or whether project membership remains informational on issue links.
6. **Status authority.** The handover’s dual-record boundary is directional
   guidance, not a final decision: GitHub tracker state would be human-facing
   remote evidence, while OAT project phase/completion would remain governed by
   OAT lifecycle and approved PR/merge evidence. Obtain project approval before
   implementing that boundary.
7. **API and tool drift.** Pin/record REST API version, GraphQL schema/tool
   server version, and `gh` version; run capability probes in CI and at runtime.
8. **Public/private destinations.** Keep sanitization and consent as hard gates
   when filing from private OAT evidence to a public issue.
9. **Rate limits and pagination.** Bound polling, honor retry headers, persist
   cursors, and avoid N+1 timeline/comments/relationship calls.
10. **Destructive operations.** Delete, transfer, close, label changes, and
    comments need explicit per-operation consent and receipts. A successful
    local plan or green tests are not authorization for remote mutation.

## Sources & References

### Official GitHub documentation

- [REST Issues API](https://docs.github.com/en/rest/issues/issues?apiVersion=2026-03-10)
- [REST sub-issues](https://docs.github.com/en/rest/issues/sub-issues?apiVersion=2026-03-10)
- [REST timeline](https://docs.github.com/en/rest/issues/timeline)
- [REST issue event types](https://docs.github.com/en/rest/using-the-rest-api/issue-event-types)
- [REST fine-grained PAT permissions](https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens)
- [REST troubleshooting and permission headers](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api)
- [GraphQL Issue reference](https://docs.github.com/en/graphql/reference/issues)
- [About Issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/about-issues)
- [Organization issue types](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/managing-issue-types-in-an-organization)
- [Organization issue fields](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/managing-issue-fields-in-your-organization)
- [Adding/managing issue fields](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-and-managing-issue-fields)
- [Milestones](https://docs.github.com/en/issues/using-labels-and-milestones-to-track-work/about-milestones)
- [Transferring an issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/administering-issues/transferring-an-issue-to-another-repository?tool=cli)
- [Linking pull requests to issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/linking-a-pull-request-to-an-issue)
- [Managing auto-closing issues](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/managing-auto-closing-issues)
- [Official GitHub MCP toolsets](https://docs.github.com/en/copilot/how-tos/provide-context/use-mcp-in-your-ide/configure-toolsets)
- [Official github/github-mcp-server README](https://github.com/github/github-mcp-server)

### Official GitHub CLI documentation

- [`gh issue create`](https://cli.github.com/manual/gh_issue_create)
- [`gh issue list`](https://cli.github.com/manual/gh_issue_list)
- [`gh issue view`](https://cli.github.com/manual/gh_issue_view)
- [`gh search issues`](https://cli.github.com/manual/gh_search_issues)
- [`gh help reference` and extensions](https://cli.github.com/manual/gh_help_reference)

### Local OAT evidence

- [Remote integration discovery](../discovery.md)
- [Linear integration discovery handover](./linear-integration-discovery-handover.md)
- [Remote project state](../state.md)
- [Backlog item template](../../../../templates/backlog-item.md)
- [Project state template](../../../../templates/state.md)
- [Backlog creation command](../../../../../packages/cli/src/commands/backlog/new.ts)
- [GitHub issue triage skill](../../../../../.agents/skills/triage-oat-issues/SKILL.md)
- [Retro filing skill](../../../../../.agents/skills/oat-project-retro-file/SKILL.md)
- [Provider-neutral extensions decision](../../../../repo/reference/decisions/DR-260718-provider-neutral-extensions.md)
- [Provider verification decision](../../../../repo/reference/decisions/DR-260701-provider-verification-happens.md)
- [Filing as a companion workflow decision](../../../../repo/reference/decisions/DR-260805-filing-is-a-companion-workflow.md)
