---
skill: deep-research
schema: technical
topic: 'OAT/PJM integration with Linear'
model: gpt-5-6-luna
generated_at: 2026-08-30
context: .oat/projects/shared/remote-project-management
depth: exhaustive
---

# OAT/PJM Integration with Linear

## Executive Summary

Linear is a GraphQL-backed, workspace/team issue tracker with Markdown content,
custom team workflows, projects, milestones, cycles, relations, and a first-party
hosted MCP server. The strongest OAT/PJM boundary is the directional working model
in the project handover: Linear remains the human-facing record for intent,
ownership, approvals, status, and portfolio reporting; OAT remains the record for
deep artifacts and execution traces. The proposed bridge syncs backlog items to
Linear issues at deliberate lifecycle moments and lets Linear's GitHub integration
infer engineering status from branches and pull requests. Comments are never
synchronized; an outbound completion annotation remains a separately approved
candidate operation.

Use the official hosted MCP endpoint (`https://mcp.linear.app/mcp`) as the agent
access path in v1. Its read-only endpoint and OAuth/API-key authentication avoid a
new GraphQL client, but its public documentation describes categories rather than
a stable exhaustive tool-name contract. Discover tools at runtime and fail closed
when a required operation is unavailable. Keep a GraphQL/SDK adapter as a tested
escape hatch for operations that MCP does not expose, and treat community CLIs as
optional human/shell tooling rather than an OAT dependency.

The user's vault records an explicit installation of **Finesssee/linear-cli 0.3.15**
using `cargo install linear-cli`; this is high-confidence evidence of historical
use, not proof of the currently installed binary. The canonical upstream repository
is now `nesszer/linear-cli` (the README retains a legacy Finesssee clone URL), with
release `v0.3.27` verified on 2026-06-26. The adapter
must identify remote objects by immutable UUID plus current shorthand identifier,
retain `updatedAt`/`archivedAt` and local hashes, and use field-level three-way
reconciliation. Comments and assignees are informational remote data by default,
not OAT sync fields.

## Methodology

Research was conducted on 2026-08-30 for the bounded OAT/PJM remote-project-
management project. The local evidence pass read the active discovery and state,
the directional Linear handover, repository templates, and the backlog/project CLI
creation paths. A read-only Stoa search covered Linear CLI notes and the user's
tooling history. A read-only PATH probe in this environment found neither
`linear-cli` nor `linear`; another machine/profile may differ. The vendor pass used current first-party Linear documentation,
the official GraphQL schema/client repositories, and GitHub integration and release
pages. Community CLI facts are marked separately from Linear's own API claims.

Angles covered: provider data model and identity; revision/history/deletion;
MCP, GraphQL, SDKs, webhooks, and rate limits; authentication and permissions;
community CLI ergonomics and maintenance; OAT normalization and cardinality;
reconciliation, offline behavior, failure semantics, and GitHub boundaries.

Evidence labels used below:

- **Verified-current (VC):** checked against a first-party page or repository on
  the generated date. Product behavior can still change; re-check before shipping.
- **Proposed direction (PD):** a directional OAT working model or proposed design in
  the handover, not a finalized decision or claim about Linear's implementation.
- **Vault-derived historical (VH):** a private Stoa/Obsidian note. It identifies
  the user's past setup but is not current runtime evidence.
- **Recommendation (REC):** an adapter design choice inferred from the evidence.

## Findings

### Packages & Libraries

#### Linear API and SDK options

| Surface                       | Current evidence                                                                                                                                                                                                                                                                                                                                                            | Fit for OAT/PJM                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Official hosted MCP           | VC: Streamable HTTP endpoint is `https://mcp.linear.app/mcp`; `/sse` is deprecated. Read-only is `/mcp/readonly` or the standard endpoint with the `read` OAuth scope. The docs promise finding, creating, and updating objects such as issues, projects, and comments, but do not publish a complete stable tool-name list. See [Linear MCP](https://linear.app/docs/mcp). | Primary agent path in v1. Runtime `tools/list` discovery is required; do not hard-code undocumented names.       |
| GraphQL API                   | VC: `https://api.linear.app/graphql`, API-key or OAuth bearer auth, introspection, typed query/mutation errors, cursor pagination, filters, and archived-resource options. See [GraphQL API](https://linear.app/developers/graphql), [pagination](https://linear.app/developers/pagination), and [filtering](https://linear.app/developers/filtering).                      | Complete escape hatch and integration-test oracle; more code, schema coupling, and credential handling than MCP. |
| `@linear/sdk`                 | VC: official strongly typed TypeScript SDK for the GraphQL API, supporting API keys and OAuth. See [Linear SDK](https://linear.app/developers/sdk).                                                                                                                                                                                                                         | Best choice if a durable direct adapter is needed; pin the SDK/schema and retain raw IDs.                        |
| Official schema/client source | VC: the official [linear-node-sdk schema](https://github.com/linear/linear-node-sdk/blob/master/schema.md) exposes issue/project/state/label fields; the [linear](https://github.com/linear/linear) repository describes a generated typed client. The schema page is a snapshot, so introspect production before relying on newer fields.                                  | Useful for code generation and fixture design, not a substitute for runtime capability checks.                   |

#### Community CLI candidates

| CLI                                          | Verified/current snapshot                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | OAT implications                                                                                                                                                                             |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nesszer/linear-cli` (legacy Finesssee name) | VC: Rust project, installable with `cargo binstall linear-cli` or `cargo install linear-cli`, with self-update/check commands. The [canonical repository](https://github.com/nesszer/linear-cli) is active; [v0.3.27 release](https://github.com/nesszer/linear-cli/releases/tag/v0.3.27) was published 2026-06-26. Its README/agent guidance documents JSON output, field selection, `--data`/stdin, dry-run, aliases, and explicit exit-code behavior; treat those as CLI contracts, not Linear contracts. | Broad terminal automation and a useful diagnostic fallback, but younger/single-maintainer supply-chain and command-shape risk. Do not make OAT correctness depend on its local installation. |
| `schpet/linear-cli`                          | VC: community TypeScript/Deno CLI; [GitHub release page](https://github.com/schpet/linear-cli/releases) shows `2.5.0` on 2026-08-11. The [npm package](https://www.npmjs.com/package/%40schpet/linear-cli) is also published as `@schpet/linear-cli`.                                                                                                                                                                                                                                                        | More mature issue-to-branch/PR ergonomics and a reasonable fallback; still external community code and a separate credential store.                                                          |

Vault comparison notes are historical: they described Finesssee 0.3.15/0.3.16 and
schpet 1.11.1 in March 2026, and favored Finesssee for breadth while recognizing a
younger-maintainer risk. The current release check supersedes those version
numbers; see the private vault evidence at `02 - Projects/Linear Integration/References/CLI Comparison.md:24-36`.

### Repository Analysis and Existing OAT Boundary

The active project contains a directional working model for the core ownership and
granularity questions; it is not a finalized provider decision:

- **PD:** Linear owns intent, ownership, approvals, status, and portfolio reporting;
  OAT owns `discovery.md`, `spec.md`, `design.md`, `plan.md`,
  `implementation.md`, and `summary.md`. Mirror links and concise summaries rather
  than duplicating full artifacts. GitHub integration, not OAT, drives Linear
  engineering status ([handover](.oat/projects/shared/remote-project-management/reference/linear-integration-discovery-handover.md:21-36)).
- **PD:** synchronize backlog item ↔ issue bidirectionally, allow one OAT project
  to reference many Linear issues, and do not turn plan tasks into Linear
  sub-issues. Intake, promotion, and closeout are manual/skill-driven; v1 has no
  long-running webhook bridge ([handover](.oat/projects/shared/remote-project-management/reference/linear-integration-discovery-handover.md:38-68)).
- `state.md` already permits `associated_issues: []` entries with
  `{type: linear, ref: identifier}` ([state template](.oat/templates/state.md:1-8)).
  The backlog template has status, priority, scope, labels, assignee, timestamps,
  `associated_issues`, and `external_plans`, but no origin/provider revision fields
  ([backlog template](.oat/templates/backlog-item.md:1-22)).
- `oat backlog new` normalizes title, priority (`urgent|high|medium|low|none`),
  scope (`idea|task|feature|initiative`), scope estimate, labels, description, and
  timestamps, then writes an empty `associated_issues` array and regenerates the
  index ([backlog new](packages/cli/src/commands/backlog/new.ts:73-203)). It does
  not currently accept or render `origin`, so the proposed provenance field needs a
  separate compatibility change.
- Project scaffolding creates state/discovery/plan/implementation files for quick
  mode (and adds spec/design for spec-driven mode), with no provider hook
  ([project scaffold](packages/cli/src/commands/project/new/scaffold.ts:114-125)).

The local project is paused at discovery, not an implementation. The adapter should
therefore preserve the existing templates and add provider-specific metadata in a
forward-compatible extension, rather than silently changing the generic CLI
contract.

### Vox Mobile App Case Study (read-only repository audit)

**Checkout evidence (VC-local):** `/Users/tstang/Code/vox/vox-mobile-app` was on
branch `main`, tracking `origin/main` and reported `[behind 44]`; HEAD was
`ee3b043a26701230518d0da9cf0188ba22d56e87`, commit
`chore: onboarding project completion — docs, summary, and repo reference (#95)`
dated 2026-06-26. This audit did not switch branches, mutate files, use credentials,
or call Linear.

**Policy/documentation, not executable integration:** The repository's `AGENTS.md`
requires work to be tracked in the `VOX` Linear team, asks OAT projects to record
an associated issue, requires the `repo:vox-mobile-app` label for repository issues,
and documents PR-title/commit-ID rules (`AGENTS.md:156-166`). It specifically says
only a PR that actually resolves an issue may carry its ID, because Linear's GitHub
integration can auto-transition that issue to Done on merge; references and
dependencies belong in the PR body. The contributor guide repeats the PR-title
expectation (`documentation/docs/contributing/codebase.md:50-76`). These are
maintainer policies, not a runtime Linear client.

**OAT association evidence:** `home-hero/state.md` stores a typed link
`{ type: linear, ref: 'VOX-17' }`, PR URL #76, and an open-review state
(`.oat/projects/shared/home-hero/state.md:1-29`). Its summary repeats the
VOX-17 URL (`.oat/projects/shared/home-hero/summary.md:12-18`). The updated
podcasts summary records Linear VOX-100, branch `mc-updated-podcasts-tab`, PR #63,
and completion date (`.oat/repo/reference/project-summaries/20260515-updated-podcasts-tab.md:12-17,87-89`).
Conversely, the earlier Podcasts summary explicitly marks VOX-33 as reference-only
and says not to auto-close it through a PR title (`.oat/repo/reference/project-summaries/20260424-podcasts-tab.md:59-67`).
This is strong evidence for feature-scoped links plus intentional negative
associations, but not evidence of bidirectional synchronization.

**Association shape drift:** Current project state uses a typed object, while older
backlog references use scalar IDs (`associated_issues: - VOX-97`) and a separate
`related_linear_issues` list (`.oat/repo/reference/backlog/items/migrate-scripts-to-typescript.md:1-14`,
`.oat/repo/reference/backlog/items/webview-fallback-edge-cache-vary.md:1-18`). A
provider adapter should parse both legacy shapes and normalize new writes; it must
not silently treat a related/reference-only issue as the issue being resolved.

**Concrete CLI export (branch-only):** Local ref
`origin/chore/linear-ticket-export` points to `dba8b9dea47c21a28e1ed5f4f7ce8af92ed6972f`
(`chore: add local Linear ticket export (VOX team)`, 2026-06-25). The commit body
says the export was shared for reference and “not intended to be merged.” Its
`linear-export/export.py` invokes a subprocess named `linear-cli`, parses JSON,
lists all VOX issues with `--all --output json --quiet --fields identifier`, then
fetches each issue and comments and renders state/project folders
(`dba8b9d:linear-export/export.py:15-24,59-112,122-150`). The script preserves
remote fields such as state, team, assignee, priority, labels, project, URL,
timestamps, parent/children, and comment text in Markdown, but it clears generated
state folders before export (`dba8b9d:linear-export/export.py:115-121`). This is a
valuable case study of a read/export shape and JSON automation affordance, not an
OAT provider adapter, and it demonstrates why comments must remain remote-only.

**Executable-surface conclusion:** The current `main` checkout has no
`linear-cli` dependency, Linear API client, Linear MCP server entry, or sync script.
Its committed MCP configurations contain only the Argent local-tool server
(`.mcp.json:1-9`, `.cursor/mcp.json:1-9`, `.codex/config.toml:58-60`). The only
Linear CLI integration found is the unmerged export branch above. Treat the
repository policy, OAT associations, and branch export as separate evidence types:
policy informs adapter requirements; the export informs practical field/JSON shape;
neither proves live sync or current credentials.

### Provider Data Model and Schema

#### Workspace, organization, team, and identity

Linear resources are workspace/organization-scoped, while every issue belongs to
exactly one team. A team supplies the shorthand key (`ENG` in `ENG-42`), workflow
states, labels, cycles, and numbering. An issue's immutable UUID is the safest
foreign key; its human identifier and URL can change when an issue moves teams.
Moving an issue to another team generates a new issue ID/URL while old URLs and
previous IDs remain searchable ([editing issues](https://linear.app/docs/editing-issues)).

Store all of the following for a remote reference:

```yaml
provider: linear
workspace_id: <workspace UUID>
team_id: <team UUID>
remote_uuid: <issue UUID>
identifier: ENG-42 # current shorthand; mutable on team move
url: https://linear.app/acme/issue/ENG-42/...
previous_identifiers: [] # observed after moves, if available
```

Resolve an identifier to UUID before mutation, and re-read the object after a team
move. Do not use the shorthand alone as the durable key.

#### Issue fields

VC from the official schema and GraphQL docs: an issue exposes `id`, `number`,
`identifier`, `url`, `title`, Markdown `description`, `createdAt`, `updatedAt`,
`archivedAt`, `creator`, `assignee`, `subscriber`/delegates, `team`, `state`,
`priority`, labels, project, cycle, parent/sub-issues, relations, `startedAt`,
`completedAt`, and `canceledAt`. Comments and attachments are related resources.
The exact generated field set can grow; use introspection and tolerate nulls.

The issue is the correct remote counterpart for an OAT backlog item. A project is a
portfolio container, not an OAT plan. A project may span multiple teams, but an
issue has one project at a time ([projects](https://linear.app/docs/projects)).

#### Projects, milestones, and cycles

- **Project:** bounded work with name (required), description/docs, lead, status,
  teams, members, start/target dates, icon, and optional initiative. An issue may
  belong to at most one project. Deletion goes to a 30-day recently-deleted area
  ([project overview](https://linear.app/docs/project-overview), [projects](https://linear.app/docs/projects)).
- **Milestone:** ordered stage within one project, with optional target date,
  description, and issue membership. It cannot be shared between projects; use
  `projectId + milestoneId` as the local key ([project milestones](https://linear.app/docs/project-milestones)).
- **Cycle:** a team-scoped 1–8 week timebox with repeating schedule and rollover;
  cycles are not releases and should not be mapped to OAT projects or milestones
  by default ([cycles](https://linear.app/docs/use-cycles)).

#### States, categories, priorities, labels

- Workflow states are team-specific. Linear's default categories are Backlog,
  Unstarted, Started, Completed, and Canceled, with configurable names and
  ordering ([configuring workflows](https://linear.app/docs/configuring-workflows)).
  Normalize by category/type, not by the display name alone. A destination-team
  move remaps to the closest workflow state.
- Priority is fixed and optional: `0` No priority, `1` Urgent, `2` High, `3`
  Medium, `4` Low; custom priorities are not supported
  ([priority](https://linear.app/docs/priority)). This is directly compatible
  with OAT's five priority values, with OAT `none` ↔ Linear `0`.
- Labels have name, color, description, archive state, and scope at team or
  workspace level. Archive prevents new use while preserving historical labels;
  deletion is irreversible and removes label associations
  ([labels](https://linear.app/docs/labels)). Match by ID first, then normalized
  name within workspace/team; never assume names are globally unique.

#### Relations, parent/sub-issues, and duplicates

Linear supports `blocked by`, `blocking`, `related`, and `duplicate` relations; an
issue may have many relations ([issue relations](https://linear.app/docs/issue-relations)).
Sub-issues inherit parent team, priority, and project (and may inherit cycle), but
labels do not automatically inherit. Parent/sub-issue automation can close a
parent when children complete ([parent and sub-issues](https://linear.app/docs/parent-and-sub-issues)).
OAT plan tasks remain local per the handover; only explicitly user-created,
feature-level sub-issues should be linked.

Linear's workspace search covers issue ID, title, description, comments, projects,
and documents, and supports exact issue IDs ([search](https://linear.app/docs/search)).
The GraphQL filtering API supports equality, `in`/`nin`, date and numeric ranges,
string `contains`/`startsWith`, and relationship filters ([filtering](https://linear.app/developers/filtering)).
Use exact UUID/identifier first; then constrained team/project title and description
search; then an origin marker. Ambiguous candidates must stop creation and ask for
selection.

#### Descriptions, documents, comments, and activity

Issue descriptions are Markdown and support ordinary Linear links; authenticated
image loading may be required. Documents and project descriptions have version
history ([documents](https://linear.app/docs/documents)); issue descriptions can
be restored from history ([editing issues](https://linear.app/docs/editing-issues)).
Comments are separate, editable/threaded resources and can include files
([comment on issues](https://linear.app/docs/comment-on-issues)). Comments are not
sync fields: never import or mirror comment threads into OAT. A structured outbound
closeout annotation based on `summary.md` may be offered as a separately approved
operation, and must not replace the description.

Activity records status, assignment, and other changes. The first three minutes of
changes may not appear in the activity log, so activity is audit context, not a
complete revision ledger ([GraphQL API](https://linear.app/developers/graphql)).

### Identity, Revisions, Archive, and Deletion

Use `updatedAt` as the provider revision signal, supplemented by a canonical field
hash. Save `archivedAt`, `completedAt`, and `canceledAt` where present. GraphQL
resources are archived/hidden by default; request `includeArchived: true` when
reconciling old links. Issues auto-archive after inactivity in completed/canceled
states; they can be restored. Deleted resources are recoverable for 30 days and
then permanent ([delete/archive issues](https://linear.app/docs/delete-archive-issues)).

Recommended local revision envelope:

```yaml
remote_revision:
  updated_at: 2026-08-30T12:34:56Z
  archived_at: null
  canonical_hash: sha256:<normalized-mutable-fields>
local_revision:
  updated_at: 2026-08-30T12:30:00Z
  canonical_hash: sha256:<oat-fields>
sync_base:
  remote_hash: sha256:<last-observed-remote>
  local_hash: sha256:<last-observed-local>
  observed_at: 2026-08-30T12:30:00Z
```

The hash must exclude volatile comments/activity ordering and informational
assignee fields unless the user explicitly opts into syncing them. A remote team
move is an identity event: retain UUID, update current identifier/URL, append the
old identifier, and re-run duplicate detection.

### MCP, GraphQL, SDK, and Webhooks

#### Official MCP

VC from [Linear MCP documentation](https://linear.app/docs/mcp):

- Hosted Streamable HTTP endpoint: `https://mcp.linear.app/mcp`.
- Read-only endpoint: `https://mcp.linear.app/mcp/readonly`, or the standard
  endpoint authorized only with the OAuth `read` scope.
- OAuth 2.1 dynamic client registration is supported; a bearer token or API key
  may also be passed directly. Each workspace needs its own authorization context.
- `/sse` is deprecated for new setups. Codex's documented setup uses
  `codex mcp add linear --url https://mcp.linear.app/mcp`.
- Documentation describes tools for finding, creating, and updating issues,
  projects, comments, and related objects, but does not guarantee a complete
  public list of operation names or input schemas. An unauthenticated
  `POST .../mcp` `tools/list` probe returned HTTP 401 `invalid_token` on the
  research date; tool availability therefore requires an authenticated runtime
  discovery step.

**Adapter rule (REC):** at session start, call authenticated `tools/list`, record a
capability snapshot, and map semantic operations (read issue, create issue, update
description, add comment) to discovered names. If a required semantic operation is
missing, return `unsupported` with no local/remote mutation. Do not infer a write
tool from a third-party example or a stale MCP registry.

#### GraphQL/SDK

VC: API endpoint is `https://api.linear.app/graphql`; API keys use an
`Authorization` header and OAuth uses a bearer token. GraphQL can return HTTP 200
with both data and an `errors` array, so any non-empty errors array is a non-success
unless the adapter explicitly classifies partial data. Introspection, filters,
cursor pagination (default first 50), `orderBy: updatedAt`, and
`includeArchived: true` support efficient incremental reads. The official SDK is
strongly typed, but production schema drift still requires defensive decoding.

Use GraphQL for integration tests and an optional fallback adapter when MCP lacks a
needed operation. Keep query complexity bounded; do not poll every issue. Prefer
webhooks or filtered `updatedAt` windows for incremental sync.

#### Webhooks

VC from [webhooks](https://linear.app/developers/webhooks): Linear can send data
change webhooks for issues, comments/attachments/labels, projects and updates,
documents, initiatives, cycles, customers/requests, and users. Creation/reading
requires workspace admin or OAuth admin access. Endpoints must be public HTTPS and
return 200 within five seconds; retries are at roughly one minute, one hour, and
six hours (up to three attempts). Verify `Linear-Signature` with HMAC-SHA256 and
reject stale `webhookTimestamp` values to prevent replay.

**PD/REC:** OAT v1 does not run a webhook service because agent sessions are
ephemeral. A future daemon could use signed webhooks to enqueue reconciliation, but
that is a separate deployment, secret, retry, and durability project.

#### Rate limits and pagination

VC from [rate limiting](https://linear.app/developers/rate-limiting): leaky-bucket
limits are approximately 2,500 requests/hour per API key and 5,000/hour per OAuth
app, with complexity budgets and a maximum single-query complexity. A 400 response
can contain GraphQL `RATELIMITED`; inspect `X-RateLimit-*` headers and retry with
bounded backoff. Use cursor pagination and server-side filters, not issue-by-issue
polling.

### Code Examples

#### Runtime MCP capability discovery (semantic, not name-dependent)

The hosted server's public contract does not promise stable tool names. The OAT
adapter should discover and classify tools after the MCP client authenticates:

```typescript
type SemanticOperation =
  | 'readIssue'
  | 'searchIssues'
  | 'createIssue'
  | 'updateIssue'
  | 'createComment';

const tools = await mcp.listTools();
const capabilities = classifyLinearTools(tools); // adapter-owned mapping

if (!capabilities.has('readIssue')) {
  return { status: 'unsupported', reason: 'Linear MCP cannot read issues' };
}
```

`classifyLinearTools` should use declared names/descriptions and a small allowlist
of known schemas, record the discovered server/tool versions, and never turn a
missing write operation into a best-effort mutation. This is an integration pattern,
not an assertion that `mcp.listTools()` or any particular tool name is Linear's
public API.

#### Narrow GraphQL read with revision fields

When the optional direct adapter is selected, keep queries small and request the
fields required for identity and reconciliation:

```graphql
query IssueForOat($id: String!, $includeArchived: Boolean!) {
  issue(id: $id, includeArchived: $includeArchived) {
    id
    identifier
    url
    title
    description
    team {
      id
      key
    }
    state {
      id
      type
      name
    }
    priority
    project {
      id
      name
    }
    cycle {
      id
      number
    }
    updatedAt
    archivedAt
  }
}
```

The production schema should be introspected and the generated SDK types pinned;
the snippet illustrates the requested data, not a promise that every nullable
relationship is present in every workspace. Treat a response containing a
GraphQL `errors` array as non-success until the adapter proves the requested object
is complete.

#### OAT link and provenance shape

The generic link remains compatible with current templates while the namespaced
extension carries immutable identity:

```yaml
associated_issues:
  - type: linear
    ref: ENG-42
provider_data:
  linear:
    workspace_id: 00000000-0000-0000-0000-000000000000
    team_id: 11111111-1111-1111-1111-111111111111
    issue_id: 22222222-2222-2222-2222-222222222222
    identifier: ENG-42
    url: https://linear.app/acme/issue/ENG-42/example
origin: linear:ENG-42
```

`origin` is proposed handover metadata and should remain optional until the backlog
writer accepts it. The UUID, current identifier, and URL must be refreshed after a
team move.

### Integration Notes

#### Compatibility and setup

- Runtime is the OAT Node/TypeScript CLI. MCP credentials stay in the host's MCP
  configuration; a direct GraphQL adapter uses the official SDK and an approved
  token source. No Linear token belongs in a repository, project artifact, or
  process log.
- Resolve a workspace and team before the first read/write. Cache team states,
  labels, and project metadata for one session, with an explicit refresh operation
  after mutations.
- Use the remote Markdown description as input to intake. On publish, render OAT
  acceptance criteria into a marked section and preserve unrelated human text.
- Treat local project scaffolding and backlog index regeneration as independent
  transactions. A failed remote call must not leave a half-written local index;
  a failed local write must not report remote success.

#### Migration path from inert links

1. Read existing `associated_issues` entries and resolve each shorthand identifier
   to UUID, workspace, team, and URL. Mark unresolved links for manual relink.
2. Add an optional `provider_data.linear` envelope and `origin` only when the
   provenance is known; do not rewrite historical descriptions automatically.
3. Implement read-only intake and reconciliation first. Exercise archived objects,
   moved-team IDs, permission errors, and rate limits in fixtures.
4. Add explicit publish/link commands with duplicate detection and a persisted
   operation receipt. Require confirmation for ambiguous title matches.
5. Offer an outbound closeout annotation only after explicit approval. Keep status
   untouched so GitHub remains the status authority. A future webhook daemon, if
   approved, is a separate migration.

#### Breaking-change and drift guards

- Linear customizes state names per team, so compare state categories/types and
  retain state IDs; never match `"In Progress"` globally.
- Archived issues disappear from default queries. Reconciliation must opt into
  archived resources and distinguish archive, recent deletion, and permanent loss.
- A team move changes shorthand ID/URL and may clear project, cycle, and labels.
  Preserve the UUID and rehydrate destination metadata.
- MCP tool availability, SDK generated types, and community CLI flags can change
  independently. Record capability/version snapshots and return `unsupported` for
  unknown operations instead of guessing.

### Auth and Permissions

Linear personal API keys can be full or restricted to Read, Write, Admin, Create
issues, or Create comments, and can be scoped to selected teams
([API and webhooks](https://linear.app/docs/api-and-webhooks), [security/access](https://linear.app/docs/security-and-access)).
OAuth scopes include `read`, `write`, `issues:create`, `comments:create`,
`timeSchedule:write`, and `admin`; PKCE is supported, user tokens expire in about
24 hours with refresh tokens, and app-actor tokens are available for agent/service
accounts ([OAuth](https://linear.app/developers/oauth-2-0-authentication), [actor authorization](https://linear.app/developers/oauth-actor-authorization)).

Agent APIs are a developer preview and add actor-specific scopes such as
`app:assignable` and `app:mentionable`; an app cannot request admin, so do not
assume agent identity can edit every object ([agents](https://linear.app/developers/agents)).

Credential policy (REC):

1. Keep tokens in the MCP host, OS keychain, or an approved secret manager; never
   serialize them in `.oat` artifacts or comments.
2. Prefer least privilege: read-only for intake/reconciliation, `issues:create`
   for publish. A separately approved outbound completion annotation may require
   `comments:create`; request write only when an
   explicit user command needs field updates.
3. Treat 401 as reauthentication required, 403 as a permission/scope failure, and
   a write attempted through `/readonly` as a deterministic blocked operation.
4. Make workspace and team selection explicit. A valid token can authorize one
   workspace while the intended issue is in another.

### Normalized OAT Mapping

#### Core mapping

| OAT field                                             | Linear field             | Direction and rule                                                                                                                                       |
| ----------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                                               | `issue.title`            | Bidirectional at intentional sync moments; remote Markdown is not needed.                                                                                |
| Description + acceptance criteria                     | `issue.description`      | OAT should render a clearly delimited Markdown section; preserve remote text and avoid destructive replacement when both sides changed.                  |
| `status` (`open`, `in_progress`, `closed`, `wont_do`) | state category           | `open` → Backlog/Unstarted, `in_progress` → Started, `closed` → Completed, `wont_do` → Canceled. Category-first; team state IDs are provider extensions. |
| `priority`                                            | integer 0–4              | OAT `urgent/high/medium/low/none` ↔ Linear 1/2/3/4/0.                                                                                                    |
| `labels`                                              | label IDs                | Name-match only within workspace/team; retain unknown remote labels in extension data.                                                                   |
| `assignee`                                            | `assigneeId`             | Informational remote-only by default; do not overwrite local human ownership.                                                                            |
| `created`, `updated`                                  | `createdAt`, `updatedAt` | Keep local creation time; use remote `updatedAt` for revision checks.                                                                                    |
| `associated_issues`                                   | UUID + identifier + URL  | Add `{type: linear, ref: "TEAM-123"}` for compatibility, plus a provider envelope for immutable identity.                                                |
| OAT project                                           | Linear project(s)/issues | Project may reference many issues; do not map every artifact or plan task to a remote child issue.                                                       |

#### Provider extension envelope

Add a namespaced, optional extension rather than widening every generic template:

```yaml
provider_data:
  linear:
    workspace_id: null
    team_id: null
    issue_id: null # immutable UUID
    identifier: null # current TEAM-123
    url: null
    previous_identifiers: []
    state_id: null
    state_type: null
    project_id: null
    project_milestone_id: null
    cycle_id: null
    label_ids: []
    relation_ids: []
    parent_id: null
    remote_updated_at: null
    remote_archived_at: null
    last_pulled_at: null
    last_pushed_at: null
    last_remote_hash: null
    last_local_hash: null
```

The handover's proposed `origin: null # manual | project:<name> | linear:<id> |
intake` is a useful human-readable provenance field
([handover](.oat/projects/shared/remote-project-management/reference/linear-integration-discovery-handover.md:90-99)),
but it is not currently emitted by `oat backlog new`. Use the immutable provider
envelope as the correctness key and `origin` as a convenience/audit hint.

#### Deliberate lifecycle operations

The proposed skill sequence is: `oat-linear-intake` (read issue → backlog),
`oat-linear-publish` (backlog → issue), `oat-linear-link` (manual association),
and `oat-linear-post-summary` (optionally annotate a Linear issue with
`summary.md`, only after separate approval). Promotion can carry Linear identifiers
into a branch name; closeout evidence does not change status
([handover](.oat/projects/shared/remote-project-management/reference/linear-integration-discovery-handover.md:153-191)).

### Capability Matrix

The MCP column is intentionally semantic: exact tool names must be learned from
authenticated `tools/list`. “Documented” means the official docs describe the
category, not that a particular name is guaranteed.

| Capability                    | Official MCP                                                   | GraphQL/SDK                              | nesszer/linear-cli (legacy Finesssee)            | v1 adapter proposal                                               |
| ----------------------------- | -------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| Read issue by UUID/identifier | Documented category; runtime verify                            | Full query                               | Supported by repo command/help; verify version   | Required; read-only safe                                          |
| List/filter incrementally     | Documented search/find category; schema runtime                | Full filters/cursors/`updatedAt`         | JSON/filter flags documented in repo guidance    | Required; server-side filters                                     |
| Workspace/team discovery      | Runtime tool-dependent                                         | Full query                               | Setup/profile helpers                            | Required before writes                                            |
| Create issue                  | Documented category                                            | `issueCreate`                            | Supported; current release added `--project`     | Required for publish                                              |
| Update title/description      | Documented category                                            | `issueUpdate`                            | Supported; exact flags versioned                 | Required only with explicit push                                  |
| State/priority/labels         | Likely object update; runtime verify                           | Full typed mutations                     | Broad command coverage; verify state IDs         | Map status/priority; labels by ID                                 |
| Projects/milestones/cycles    | Docs say projects and related objects; exact MCP tools unknown | Full schema/mutations                    | Broad surface, but not required for issue bridge | Informational extensions; no plan-task sync                       |
| Relations/sub-issues          | MCP expansion may expose; runtime verify                       | Full relation/parent mutations           | Repo advertises relations                        | Manual link only in v1                                            |
| Comments/summary              | Documented category                                            | Comment create/update                    | Supported                                        | Never synchronize comments; optional approved outbound annotation |
| Activity/history              | MCP examples/category may expose; not guaranteed               | Activity queries with caveats            | CLI history behavior versioned                   | Read-only evidence; do not treat as complete revision log         |
| Archive/delete/restore        | Runtime verify; read-only endpoint can inspect                 | Include archived; mutations permissioned | Commands may exist                               | Never delete automatically; surface archive/deletion              |
| Webhooks                      | Not a hosted OAT listener                                      | Full provider webhooks                   | CLI may provide local listener                   | Deferred; separate service design                                 |
| Auth/read-only                | OAuth/API key; `/readonly`                                     | API key/OAuth scopes                     | API key/keychain/OAuth varies                    | Enforce least privilege and explicit failure                      |
| Offline queue                 | No provider guarantee                                          | No provider guarantee                    | Local CLI behavior varies                        | Local intent only; never claim remote success                     |

### Reconciliation and Failure Semantics

#### Three-way algorithm

For each linked issue, retain base snapshot **B** (last observed local and remote
canonical hashes), current local **L**, and freshly read remote **R**:

1. If `L == B` and `R != B`, accept remote mutable fields into OAT.
2. If `R == B` and `L != B`, publish local fields only when the command is
   explicitly authorized; otherwise record pending publish.
3. If both changed, compare field by field. Apply disjoint changes, but create a
   conflict artifact and make no overwrite for the same field.
4. Exclude comments, activity order, and assignees from the default conflict set.
   Include them as informational snapshots and links.
5. Re-read after a successful mutation, update `updatedAt`/hash, and only then
   advance B. A timeout before re-read leaves the operation pending/unknown.

Do not use a last-writer-wins timestamp rule: clock skew, automated GitHub status,
and description history make it unsafe. Include the remote UUID and observed
`updatedAt` in every mutation log. If GraphQL returns partial data plus errors,
classify as partial/failed and do not advance B unless the specific mutation's
post-read proves success.

#### Duplicate prevention

Before create: exact linked UUID/identifier; origin marker; canonical URL; then an
exact normalized title within the selected team/project; then constrained title or
description contains. If one candidate remains, require an explicit link/confirm
unless the command is an idempotent retry with a persisted create intent. Multiple
candidates return `ambiguous` and do not create. Include the user's requested
title/team/project and candidate IDs in the handoff.

#### Error taxonomy

| Condition                                     | Classification                        | Recovery                                                                   |
| --------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| Missing/expired token (401)                   | `auth_required`                       | Prompt/reconnect; no mutation.                                             |
| Scope/team denial (403)                       | `permission_denied`                   | Report missing scope/team; do not retry blindly.                           |
| Unknown/archived/deleted object (404 or null) | `remote_missing` or `remote_archived` | Query archived/recently-deleted views; require relink or explicit restore. |
| Validation/schema/tool absent                 | `unsupported`/`invalid_input`         | Surface semantic operation and runtime capability snapshot.                |
| Rate limit (RATELIMITED/headers)              | `retryable_throttle`                  | Honor headers, bounded exponential backoff, then pending.                  |
| Network/timeout                               | `unknown_remote_outcome`              | Re-read by intent marker/UUID before retry; never duplicate blindly.       |
| GraphQL `errors` with 200                     | `partial_failure`                     | Inspect per-field errors; no success until post-read.                      |
| Duplicate candidates                          | `ambiguous_duplicate`                 | No create; ask user to choose.                                             |
| Concurrent update (`updatedAt` changed)       | `conflict`                            | Re-read, three-way merge, conflict artifact.                               |

All failures should be append-only in a local operation receipt with provider,
workspace/team, semantic action, correlation ID, observed revision, and retry
disposition. Do not put credentials or full private comments in the receipt.

### Offline and GitHub Implications

OAT sessions are ephemeral. An offline run may create a local backlog item or a
pending publish intent, but it cannot represent a remote write as complete. On
reconnect, validate the workspace, issue UUID/identifier, revision, permissions,
and duplicate candidates before applying the intent. Retry only idempotent reads or
creates with an explicit persisted intent marker.

Linear's [GitHub integration](https://linear.app/integrations/github) links issues
when the identifier appears in a branch or PR title and can automate branch/PR/
merge status transitions. The handover therefore requires a promoted branch to
include `TEAM-NUMBER` and explicitly says OAT must not perform status transitions
([handover](.oat/projects/shared/remote-project-management/reference/linear-integration-discovery-handover.md:120-149)).
Do not conflate Linear's separate GitHub-issues synchronization with branch/PR
linking. OAT never synchronizes comments. An outbound completion annotation based
on `summary.md` can remain an optional, separately approved operation; merge remains
the status authority.

### Technical Tradeoffs

| Choice                                | Benefits                                                                                             | Costs/risks                                                                               | Recommended use                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Hosted MCP                            | No bespoke GraphQL client; agent-native OAuth/API key; read-only endpoint; provider maintains server | Tool names/schema can be opaque; runtime availability varies; endpoint/network dependency | Primary v1 access, with semantic discovery and capability receipts |
| GraphQL + official SDK                | Complete typed CRUD, introspection, filters, archive support, deterministic tests                    | Schema/version coupling, pagination/complexity/rate handling, secret lifecycle            | Optional fallback and contract-test adapter                        |
| nesszer/linear-cli (legacy Finesssee) | Shell-friendly JSON/NDJSON, profiles, broad operations, diagnostics                                  | Community supply chain, local install/auth drift, young maintainer base, command drift    | Human ergonomics and manual recovery only                          |
| schpet CLI                            | Mature issue-to-branch/PR loop, npm/Deno distribution                                                | Smaller surface, community dependency and separate auth                                   | Optional alternate terminal tool                                   |
| Webhook service                       | Near-real-time updates and fewer polls                                                               | Public endpoint, HMAC/replay defense, retries, durability, deployment ownership           | Future phase; explicitly out of v1                                 |

Performance is dominated by API latency, pagination, and complexity budgets rather
than local YAML processing. Keep payloads narrow, cache team/state/label metadata for
the session, and refresh caches after a mutation. Portability is strongest when the
normalized OAT record stores provider-neutral fields plus a namespaced Linear
extension and an escape-hatch raw UUID.

### Risks and Open Questions

1. **MCP contract drift:** Which semantic operations and exact input schemas are
   available in the authenticated workspace on each session? Capture runtime
   snapshots and test read-only/write separation.
2. **Workspace/team ambiguity:** How should OAT choose among multiple authorized
   workspaces or teams? Require explicit configuration; never select by display name
   alone.
3. **Actor permissions:** Is the configured token a human, app, or agent actor, and
   can it create comments/issues without admin? Exercise least-privilege fixtures.
4. **Description ownership:** What delimiter/marker lets OAT update its generated
   acceptance section while preserving human edits? Decide before enabling
   bidirectional description writes.
5. **Idempotency marker:** Should create intents use an extension field, a hidden
   description marker, or a local receipt only? Prefer a local receipt plus visible
   OAT link; avoid polluting user descriptions without approval.
6. **Move-team behavior:** Validate previous IDs, URL redirects, project/cycle
   clearing, status remapping, and label scope after a move.
7. **Archive/deletion policy:** Define whether intake includes archived items and how
   a permanently deleted issue is represented locally. Never auto-delete OAT data.
8. **Labels and state IDs:** Names are human-friendly but not unique; cache IDs and
   remap only within workspace/team.
9. **Project cardinality:** A project may reference many issues and an OAT project
   may satisfy many Linear issues. Keep the association many-to-many in the provider
   envelope even if the first intake UX is 1:1.
10. **Webhook phase:** If introduced, assign deployment, secret rotation, replay
    windows, retry receipts, and disablement monitoring to a separately approved
    service.
11. **CLI version drift:** The vault's 0.3.15 install and the current 0.3.27 release
    are different snapshots. At runtime record `linear-cli --version`, binary path,
    and command help before relying on flags.
12. **Remote-only informational data:** Comments, assignees, subscribers, and
    activity are never synchronized. A separately approved outbound completion
    annotation is the only comment-like candidate in this proposal.

## Sources & References

### Official Linear documentation and repositories (verified-current)

1. [Linear MCP](https://linear.app/docs/mcp) — hosted endpoint, read-only mode,
   OAuth/API keys, and `/sse` deprecation.
2. [GraphQL API](https://linear.app/developers/graphql) — endpoint, auth, errors,
   issue queries/mutations, Markdown, and archive behavior.
3. [Pagination](https://linear.app/developers/pagination) and
   [Filtering](https://linear.app/developers/filtering) — Relay cursors, limits,
   ordering, and filter operators.
4. [Linear SDK](https://linear.app/developers/sdk), [linear-node-sdk schema](https://github.com/linear/linear-node-sdk/blob/master/schema.md),
   and [official linear client repository](https://github.com/linear/linear) — typed
   client/schema references.
5. [Configuring workflows](https://linear.app/docs/configuring-workflows),
   [priority](https://linear.app/docs/priority), [labels](https://linear.app/docs/labels),
   [issue relations](https://linear.app/docs/issue-relations), and [parent/sub-issues](https://linear.app/docs/parent-and-sub-issues).
6. [Projects](https://linear.app/docs/projects), [project overview](https://linear.app/docs/project-overview),
   [project milestones](https://linear.app/docs/project-milestones), and [cycles](https://linear.app/docs/use-cycles).
7. [Editing issues](https://linear.app/docs/editing-issues), [delete/archive](https://linear.app/docs/delete-archive-issues),
   [search](https://linear.app/docs/search), [documents](https://linear.app/docs/documents),
   and [comments](https://linear.app/docs/comment-on-issues).
8. [API and webhooks](https://linear.app/docs/api-and-webhooks), [security and access](https://linear.app/docs/security-and-access),
   [OAuth 2.0](https://linear.app/developers/oauth-2-0-authentication), [actor authorization](https://linear.app/developers/oauth-actor-authorization),
   and [agent APIs](https://linear.app/developers/agents).
9. [Webhooks](https://linear.app/developers/webhooks) and [rate limiting](https://linear.app/developers/rate-limiting).
10. [GitHub integration](https://linear.app/integrations/github) and [code/reviews](https://linear.app/docs/code-and-reviews).
11. [nesszer/linear-cli (legacy Finesssee name)](https://github.com/nesszer/linear-cli), its [README](https://github.com/nesszer/linear-cli/blob/master/README.md), and [v0.3.27 release](https://github.com/nesszer/linear-cli/releases/tag/v0.3.27) — community CLI repository, command/JSON/auth claims, and current release line.
12. [schpet/linear-cli](https://github.com/schpet/linear-cli), [releases](https://github.com/schpet/linear-cli/releases),
    and [npm package](https://www.npmjs.com/package/%40schpet/linear-cli) — alternate
    community CLI.

### Local OAT evidence (directional working model and implementation surface)

1. `.oat/projects/shared/remote-project-management/discovery.md` — initial remote
   PM requirements, common fields, and open source/auth/sync questions.
2. `.oat/projects/shared/remote-project-management/state.md` — paused discovery
   state and handover pointer.
3. `.oat/projects/shared/remote-project-management/reference/linear-integration-discovery-handover.md:21-56` — dual system of record, official MCP primary, sync granularity, and lifecycle triggers.
4. `.oat/projects/shared/remote-project-management/reference/linear-integration-discovery-handover.md:60-99` — cardinality, bidirectional intake/publish, and proposed origin field.
5. `.oat/projects/shared/remote-project-management/reference/linear-integration-discovery-handover.md:120-149` — branch naming/GitHub status boundary and explicit OAT non-goals.
6. `.oat/projects/shared/remote-project-management/reference/linear-integration-discovery-handover.md:153-204` — proposed skill suite and MCP design implication.
7. `.oat/templates/state.md:1-8` and `.oat/templates/backlog-item.md:1-22` — current generic metadata contracts.
8. `packages/cli/src/commands/backlog/new.ts:73-203` and `packages/cli/src/commands/project/new/scaffold.ts:114-125` — current normalization and project scaffold behavior.
9. `/Users/tstang/Code/vox/vox-mobile-app/AGENTS.md:156-166` and `documentation/docs/contributing/codebase.md:50-76` — repository Linear-tracking and PR-title policy (documentation, not executable integration).
10. `/Users/tstang/Code/vox/vox-mobile-app/.oat/projects/shared/home-hero/state.md:1-29`, `/Users/tstang/Code/vox/vox-mobile-app/.oat/projects/shared/home-hero/summary.md:12-18`, and `/Users/tstang/Code/vox/vox-mobile-app/.oat/repo/reference/project-summaries/20260515-updated-podcasts-tab.md:12-17,87-89` — concrete typed association, PR, branch, and summary examples.
11. `/Users/tstang/Code/vox/vox-mobile-app/.oat/repo/reference/project-summaries/20260424-podcasts-tab.md:59-67` — explicit reference-only issue that must not auto-close through a PR title.
12. `origin/chore/linear-ticket-export` at commit `dba8b9dea47c21a28e1ed5f4f7ce8af92ed6972f` — unmerged, reference-only export; `linear-export/export.py:15-24,59-112,115-150` invokes `linear-cli` and writes JSON-derived issue/comment snapshots.
13. Audited checkout command evidence: `git -C /Users/tstang/Code/vox/vox-mobile-app status --short --branch` (`main...origin/main [behind 44]`), `rev-parse HEAD` (`ee3b043a26701230518d0da9cf0188ba22d56e87`), and PATH probes (`command -v linear-cli`, `command -v linear` both miss on this machine).

### Vault-derived historical evidence (not current runtime proof)

1. `/Users/Shared/Vault/02 - Projects/Linear Integration/Linear Change Log.md:68-75` — records the user's `cargo install linear-cli` installation of Finesssee/linear-cli 0.3.15, API-key auth, and a historical `init list` bug. **Identification confidence: high for historical use; this vault record does not establish a current installed version.**
2. `/Users/Shared/Vault/02 - Projects/Linear Integration/Linear Change Log.md:96-106` — records a historical local working choice for official MCP as the agent path, optional CLIs, labels over issue types, and GitHub-owned status; the current handoff treats the provider boundary as directional/proposed.
3. `/Users/Shared/Vault/02 - Projects/Linear Integration/References/CLI Comparison.md:24-36,40-60,90-105` — historical comparison of Finesssee and schpet breadth, maintenance, and JSON/automation ergonomics. It predates the current Finesssee repository rename/release and should not be used for current version claims.
4. `/Users/Shared/Vault/02 - Projects/Linear Integration/References/Chat - Linear CLI Tools and Architecture Research.md` — historical research recommending MCP plus a thin CLI wrapper; source is private and only the tooling identification/recommendation was used here.

### Current-user CLI conclusion

The user-confirmed unofficial CLI is **Finesssee/linear-cli**, now maintained under
**`nesszer/linear-cli`**. Evidence confidence is **high** that this was the user's
installed CLI in the vault's 2026-03 setup (`cargo install linear-cli`, version
0.3.15). In the audited environment, `command -v linear-cli` and `command -v
linear` both miss, so no current local binary is installed on `PATH`; another
machine, shell profile, or unlisted path could differ. The current upstream release
is independently verified as `v0.3.27` and must not be reported as the user's
installed version.
