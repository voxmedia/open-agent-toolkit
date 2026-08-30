---
skill: deep-research
schema: technical
topic: 'Jira Cloud provider integration for OAT/PJM'
model: gpt-5-6-luna
generated_at: 2026-08-30
depth: exhaustive
context: .oat/projects/shared/remote-project-management/
---

# Jira Cloud Provider Dossier for OAT/PJM

## Executive Summary

This dossier evaluates Jira Cloud as a remote provider for OAT project-management (PJM) backlog integration. The target is Jira Cloud; Jira Data Center is materially different and is treated as a compatibility boundary rather than an interchangeable transport. Jira has a rich, tenant-configurable model: issue fields, create/edit screens, issue types, workflows, statuses, transitions, resolutions, custom fields, project components and (for Jira Software) sprints. OAT therefore needs a capability-negotiated adapter, not a fixed field-name mapping.

The recommended v1 boundary follows the directional proposal in the remote-PM discovery handover: Jira is the team-facing record for intent, ownership, approvals and status; OAT is the record for detailed artifacts and execution trace. Synchronize backlog items with Jira issues at intentional lifecycle moments, retain `associated_issues` links, and do not mirror OAT plan tasks or automatically drive remote status. Project closeout may, if separately approved, publish a concise OAT summary as an outbound informational Jira comment; comments are not synchronized fields. This keeps the local markdown model authoritative for artifacts while avoiding accidental workflow transitions.

Use Jira REST API v3 as the fidelity and automation path. The official Atlassian Rovo MCP server is useful for interactive agent work, but its dynamic/preview catalog and tenant-dependent permissions are not a stable contract for every adapter operation. Atlassian CLI (`acli`) is a practical human and scripted front end for common issue operations, but its command surface does not expose every field (notably arbitrary custom fields and priority on create/edit) and its JSON shape is not a versioned API contract. A production adapter should probe capabilities, prefer REST where available, and fail closed with a durable pending/review result when a required operation is unavailable.

Five load-bearing conclusions:

1. **Identity:** Persist Jira Cloud site/cloud ID plus immutable issue `id`; treat issue `key` as a mutable alias that can change after moves or project-key edits. Keep the current key and historical aliases for display and duplicate detection.
2. **Schema:** Resolve create/edit metadata for each project and issue type. Required fields, allowed values, custom-field IDs, screens and contexts differ by tenant; do not infer from labels such as “Priority” or “Story.”
3. **Workflow:** Map OAT status to Jira status categories and resolution semantics, then discover a legal transition path. A status name alone is not a portable state machine.
4. **Reconciliation:** Use a three-way base/local/remote comparison with immutable issue ID, `updated` timestamp, paginated changelog, normalized ADF hash and operation receipts. Jira search is eventually consistent; use enhanced JQL reconciliation options after writes.
5. **Safety:** Comments, assignees, reporter identity and rich remote metadata are informational remote-only data, not synchronized fields. A completion-summary comment is a separate optional outbound annotation. Deletion, archive, transition and comment publication require explicit operation policy and permission checks; they must never be implied by a local file edit.

## Methodology

Research was performed on 2026-08-30. It combined:

- Repository inspection of the active `remote-project-management` discovery, Linear handover, PJM templates and backlog creation code. Local evidence is linked in the findings.
- Primary Atlassian Jira Cloud REST v3, Jira Software Agile REST, Rovo MCP, Cloud administration and acli documentation. Links are inline and consolidated in Sources & References.
- Read-only inspection of the installed `acli` binary (`1.3.18-stable`) and its command help. The binary itself warns that `1.3.30-stable` is current, so CLI details are version-sensitive.
- A separate Data Center review to identify paths and authentication assumptions that must not leak into the Cloud adapter.

Facts labelled **Verified-current** are directly supported by the cited documentation or local command output. Items labelled **Recommendation** or **Inference** are design conclusions for OAT and should be validated against an authenticated tenant during implementation. No Jira tenant credentials were available, so tenant-specific permissions, custom fields, workflow screens and Rovo tool visibility were not live-tested.

## Findings

### Provider boundary and OAT context

**Verified-current.** The active [discovery](../discovery.md) explicitly targets Jira Cloud, not Server/Data Center, and retains Jira as a supported remote reference type. The local [state template](../../../../templates/state.md) already permits `associated_issues` entries with `type: jira`.

**Recommendation.** Keep the adapter behind a provider-neutral interface, but expose Jira capabilities and extension fields rather than flattening every Jira concept into OAT. The [Linear handover](linear-integration-discovery-handover.md) proposes (pending user validation) this directional boundary: external PM owns intent/ownership/approvals/status; OAT owns discovery/spec/design/plan/implementation/summary artifacts; backlog items map to remote issues; no plan-task sync; no OAT-driven remote status; a separately approved summary annotation may be posted as a comment. Adapt this as a Jira recommendation only after the discovery questions are explicitly resolved.

### Jira Cloud data model and schema

#### Work-item identity and envelope

**Verified-current.** Jira calls the unit of work an issue (newer Atlassian UI language may say work item). REST issue responses include an immutable numeric/string `id`, a human-facing `key`, `self` URL and a `fields` object. The key is normally `<project-key>-<sequence>`. The REST v3 issue resource can retrieve by ID or key and may return the current key when an old/moved identifier is supplied ([Jira REST v3 issue APIs](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/)).

Project keys are editable by administrators. When a key changes Jira retains previous keys as historical aliases; issue keys can also change when an issue is moved between projects. Old links generally resolve, but deleting a previous key can invalidate links and JQL ([project key administration](https://support.atlassian.com/jira-cloud-administration/docs/edit-a-projects-details/), [historical key migration](https://support.atlassian.com/migration/kb/migration-of-jiras-historical-keys-for-issues-and-projects/)).

**Recommendation.** Store a Jira reference with at least:

```yaml
type: jira
ref: PROJ-123 # current display key; mutable
provider: jira-cloud
cloud_id: 12345678-abcd-... # Atlassian accessible-resource/site identity
issue_id: '10001' # canonical identity used for API calls
url: https://example.atlassian.net/browse/PROJ-123
aliases: ['OLD-42'] # optional historical keys observed
```

The existing `associated_issues` schema only requires `type` and `ref`; provider metadata can be added as a Jira extension or sidecar without making the base OAT template Jira-specific. If only a key is available, resolve it immediately and persist the returned issue ID and current key. Never use summary text or sequence number as identity.

#### Core fields and dynamic custom fields

**Verified-current.** Jira system fields commonly include `summary`, `description`, `issuetype`, `project`, `status`, `priority`, `resolution`, `assignee`, `reporter`, `labels`, `components`, `parent`, `fixVersions`, due date, `created`, `updated`, comments, links and arbitrary issue properties. Exact presence and visibility depend on permissions and field configuration. The fields endpoint exposes system and custom field definitions (`id`, name, schema, clause names and flags); custom IDs use names such as `customfield_10042` ([issue fields API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields/)).

`GET /rest/api/3/issue/createmeta/{projectIdOrKey}/issuetypes` and its issue-type field endpoint describe fields available on a create screen, including requiredness, schema, defaults and allowed values. `GET /rest/api/3/issue/{issueIdOrKey}/editmeta` describes fields editable for that issue under its screens, field configuration, custom-field context and permissions. The older project-wide `GET /rest/api/3/issue/createmeta` endpoint is deprecated in favor of the scoped endpoints ([issue create and metadata APIs](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/)).

**Recommendation.** Treat field metadata as a runtime schema. Resolve and cache `(cloud_id, project_id, issue_type_id, operation)` metadata; invalidate on 400/422 field errors or an explicit refresh. Preserve unknown fields in a provider extension only when policy allows; never send a field merely because its display name matched. A field marked required by metadata is a hard preflight failure if OAT has no configured value.

#### Descriptions and Atlassian Document Format (ADF)

**Verified-current.** Jira REST v3 represents descriptions, comments, environments and textarea custom fields as Atlassian Document Format. ADF is JSON rooted at `version: 1`, `type: "doc"`, with block/inline nodes and marks; Atlassian publishes a JSON schema and supported node list ([ADF document structure](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/)). Single-line text fields remain strings in REST v3 ([REST v3 introduction](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)).

**Recommendation.** Convert OAT Markdown to ADF for writes, retaining the original Markdown in OAT. On reads, convert ADF to Markdown conservatively and keep a raw ADF hash/extension so formatting changes can be detected without false conflicts. Do not assume round-trip fidelity for tables, mentions, macros, inline cards or unsupported marks. ADF validation errors should be surfaced as a typed, non-retryable `invalid_payload` result with the offending field path.

#### Issue types and hierarchy

**Verified-current.** A default Jira hierarchy has Epic at level 1, standard work such as Story/Task/Bug at level 0 and Sub-task at level -1. Premium/Enterprise plans can add hierarchy levels; issue type names and schemes are tenant-configurable ([issue types](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-types/), [hierarchy configuration](https://support.atlassian.com/jira-cloud-administration/docs/configure-the-issue-type-hierarchy/)).

Atlassian deprecated generic parent/child issue links and hierarchy expansion in favor of explicit `parent` associations and project hierarchy APIs. The deprecation notice covers REST v3 issue-link fields and `expand=issueTypeHierarchy`; parent associations are the forward path ([hierarchy-level deprecation notice](https://developer.atlassian.com/cloud/jira/platform/deprecation-notice-hierarchy-levels/)). A sub-task create request requires a parent issue; parent values on standard issues depend on the configured hierarchy.

**Recommendation.** Discover issue types and their `subtask`/hierarchy metadata per project. Map OAT `scope` (`idea`, `task`, `feature`, `initiative`) to configurable Jira issue types (for example, Task, Story, Epic) without assuming names. Map only meaningful OAT parent relationships to Jira `parent`; do not create Jira subtasks for OAT plan tasks, consistent with the handover. Keep issue-type ID and name in the provider extension because names can be renamed.

#### Status, workflows, transitions and resolution

**Verified-current.** Jira statuses belong to exactly one status category: To do, In progress or Done. The category, not a particular status label, drives broad board/report semantics ([status administration](https://support.atlassian.com/jira-cloud-administration/docs/what-is-a-workflow-status/)). Workflows expose one-way transitions; a reverse transition must be configured separately, and a transition may loop without changing status. The resolution field is independent: an issue is considered unresolved while resolution is empty, and setting a resolution commonly indicates closure ([workflow transitions](https://support.atlassian.com/jira-cloud-administration/docs/create-workflow-transitions/), [statuses/priorities/resolutions](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-statuses-priorities-and-resolutions/)).

`GET /rest/api/3/issue/{issueIdOrKey}/transitions` returns transitions currently available to the caller; `POST` executes one. The statuses API returns status IDs, names and categories ([status REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-status/)).

**Recommendation.** Use a two-stage mapper:

1. Normalize the current Jira status category to OAT `open` (To do), `in_progress` (In progress), or a terminal state (Done).
2. For a requested remote transition, discover available transitions and select a configured transition ID. For `closed`, set a configured “Done” resolution if the workflow requires it; for `wont_do`, use a configured “Won’t do”/“Won't do” resolution or a tenant equivalent. If no legal transition or resolution path exists, return `transition_unavailable` and leave local/remote state unchanged.

Do not automatically transition Jira when OAT status changes under the current handover policy. If a future opt-in mode enables transitions, make it an explicit command with dry-run and permission checks.

#### Priorities

**Verified-current.** Jira priorities are configurable names and IDs. The default examples are Highest, High, Medium, Low and Lowest, but administrators can add, rename, disable or reorder priorities ([priority administration](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-statuses-priorities-and-resolutions/)).

**Recommendation.** Keep OAT's fixed `urgent | high | medium | low | none` vocabulary ([backlog item template](../../../../templates/backlog-item.md)). Resolve Jira priority IDs by configured mapping, with a tenant-specific fallback based on priority order only when explicitly approved. Jira's “none” may mean no value rather than a priority object. Preserve the raw Jira priority ID/name so a renamed priority does not silently remap history.

#### Labels, components, versions, projects and sprints

**Verified-current.** Labels are free-form issue strings. Components are project-scoped objects with IDs, names, descriptions, lead and optional component-assignee behavior; the project-components REST group provides paginated list/create/update/delete/count operations and requires project visibility ([project components API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-project-components/)). Projects have IDs, keys, names, project type and configuration; project REST supports search, issue types/statuses, hierarchy and lifecycle operations ([projects API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/)).

Sprints are Jira Software Agile resources, not a universal Jira platform field. Sprint objects have an ID, state (`future`, `active`, `closed`), name, dates, origin board and goal. Sprint listing and CRUD use `/rest/agile/1.0/...` and require Jira Software access ([board API](https://developer.atlassian.com/cloud/jira/software/rest/api-group-board/), [sprint API](https://developer.atlassian.com/cloud/jira/software/rest/api-group-sprint/)).

**Recommendation.** Sync OAT labels to Jira labels only when the operation is explicitly requested; do not map labels to components by string. Treat project ID/key as provider context, not a backlog field. Expose components, fix versions and sprints as optional Jira extension fields with capability checks. A project without Jira Software or a board should report `unsupported_capability: sprint`, not fail ordinary issue sync.

### Identity, revisions and lifecycle signals

#### Revision signals

**Verified-current.** Issue `updated` is a server timestamp, not a documented monotonic version. The changelog endpoint is paginated and records field changes visible to the caller; it requires Browse and issue-security access ([issue changelog API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/)). Enhanced JQL search supports `nextPageToken`, selected fields, `reconcileIssues` and a warning that newly written data may not be immediately visible. The match/count endpoints provide bounded duplicate and reconciliation queries ([enhanced issue search](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/)).

**Recommendation.** Persist the last observed `(updated, changelog cursor, normalized field hash, raw ADF hash)` as a base snapshot. Treat equal timestamps as potentially concurrent, not as proof of equality. Fetch changelog pages until the base timestamp/event is covered; if access is denied, downgrade confidence and surface `revision_unknown` instead of overwriting.

#### Deletion, archive and moves

**Verified-current.** Delete issue is destructive, returns no body on success, and requires Delete Issues plus Browse/issue-security permissions. Subtasks may block deletion unless `deleteSubtasks` is requested. Archive is separate: Cloud Premium/Enterprise admins can archive up to 1,000 issues per request (or use asynchronous JQL archive); archived issues are not editable. Unarchive is also an administrative operation ([issue archive/delete APIs](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/)).

**Recommendation.** Never translate a remote delete/archive into local file deletion automatically. Record a remote tombstone (`deleted` vs `archived`, observed time, actor if available) and require explicit user policy before closing or removing an OAT backlog item. A moved issue is not a new item: reconcile by immutable issue ID and update the key alias.

#### Webhooks and event delivery

**Verified-current.** Jira Cloud dynamic webhooks can subscribe to issue created/updated/deleted, comments and related events; registrations expire after 30 days and must be renewed. Atlassian is separating comment events from generic issue updates and has published deprecation notices for comment payloads in issue webhooks ([Cloud webhooks](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-webhooks/), [comment webhook change](https://developer.atlassian.com/cloud/jira/platform/change-notice-removal-of-comments-from-issue-webhooks/)).

**Recommendation.** Defer webhooks for v1 because agent sessions are ephemeral and the [project handover](linear-integration-discovery-handover.md) explicitly rejects a long-running bridge. A future event receiver must renew registrations, authenticate/sign requests, handle retries and deduplicate event IDs, and subscribe to dedicated comment events.

### REST API surface and failure semantics

The following is the minimum Cloud adapter surface. Permission and scope checks are both required: OAuth scopes/API-token entitlements limit the maximum action, while project roles, issue security, workflow conditions and admin permissions decide whether the acting principal may perform it.

| Capability          | Cloud endpoint(s)                                                    | Adapter use                                        | Important failure/consistency behavior                                                                                           |
| ------------------- | -------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Read issue          | `GET /rest/api/3/issue/{idOrKey}`                                    | Fetch canonical identity and selected fields       | 404 can mean missing or invisible; requested key may resolve to a new key.                                                       |
| Create issue        | `POST /rest/api/3/issue`                                             | Publish OAT backlog item                           | Preflight create metadata; Browse + Create required; 400/422 field errors are non-retryable until mapping changes.               |
| Bulk create         | `POST /rest/api/3/issue/bulk`                                        | Bounded batch publish                              | Up to 50 issues; partial per-item failures require per-item receipts and no blanket retry.                                       |
| Create metadata     | `GET /rest/api/3/issue/createmeta/{project}/issuetypes[/fields]`     | Resolve required/allowed fields                    | Metadata is screen/context-specific and can change without code deployment.                                                      |
| Edit issue          | `PUT /rest/api/3/issue/{idOrKey}`                                    | Update title/description/labels/extension fields   | Transition is not performed by edit; use transition endpoint. Use editmeta first.                                                |
| Edit metadata       | `GET /rest/api/3/issue/{idOrKey}/editmeta`                           | Check editable fields                              | A field may be present globally but unavailable on this issue's screen/context.                                                  |
| Search              | `GET/POST /rest/api/3/search/jql`                                    | Pull issues and preflight duplicates               | Enhanced endpoint is current; legacy `/search` is deprecated. Eventual consistency; `reconcileIssues` improves read-after-write. |
| Match/count         | `POST /rest/api/3/jql/match`, `/search/approximate-count`            | Duplicate guard and bounded diagnostics            | Results are limited to visible issues; JQL may be invalid or permission-filtered.                                                |
| Transitions         | `GET/POST /rest/api/3/issue/{idOrKey}/transitions`                   | Optional explicit workflow action                  | Available IDs depend on current workflow, conditions and caller; 409/422 indicate no valid path.                                 |
| Changelog           | `GET /rest/api/3/issue/{idOrKey}/changelog`                          | Three-way revision evidence                        | Paginated; inaccessible history lowers confidence.                                                                               |
| Comments            | `GET/POST/PUT/DELETE /rest/api/3/issue/{idOrKey}/comment`            | Informational closeout summary/readback            | ADF body; Add comments/Browse required; visibility restrictions apply.                                                           |
| Archive/delete      | `/rest/api/3/issue/archive`, `DELETE /rest/api/3/issue/{idOrKey}`    | Explicit administrative lifecycle only             | Destructive or Premium/Enterprise admin-only; never implicit in sync.                                                            |
| Projects/components | `/rest/api/3/project...`, `/rest/api/3/project/{project}/components` | Resolve project context and optional component map | Project and component visibility/permissions vary.                                                                               |
| Agile sprints       | `/rest/agile/1.0/board...`, `/sprint...`                             | Optional sprint extension                          | Jira Software only; board visibility and sprint permissions required.                                                            |

**Failure taxonomy recommendation.** Normalize transport errors to `auth_required`, `forbidden`, `not_found_or_invisible`, `rate_limited`, `timeout`, `conflict`, `invalid_payload`, `metadata_stale`, `transition_unavailable`, `unsupported_capability`, `eventual_consistency`, and `unknown`. Retry only network/5xx/rate-limit classes with bounded backoff and an idempotency/duplicate check. Never retry a create blindly after a timeout without searching for the deterministic candidate.

#### Duplicate search and JQL

**Verified-current.** Enhanced JQL search accepts a JQL expression, field selection, pagination token, and optional `reconcileIssues`. `POST /rest/api/3/jql/match` evaluates candidate issue IDs against JQL without requiring a search result set; visibility still applies. The older `/rest/api/3/search` resource is marked deprecated/removal in current docs ([issue search APIs](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/)).

**Recommendation.** Duplicate detection should be layered:

1. Existing stored issue ID (strongest).
2. A provider-origin marker in an allowed issue property or dedicated custom field (only if the OAuth client can query it; Atlassian notes issue-property JQL constraints for 3LO).
3. Exact project + issue type + normalized summary and a bounded time window, presented as candidates rather than an automatic match.
4. Never deduplicate solely by title across projects.

If create returns a timeout, run an exact candidate search before retrying; if multiple candidates exist, emit `duplicate_review_required`.

### Rovo MCP: capabilities and gaps

**Verified-current.** Atlassian's cloud-hosted Rovo MCP server connects Atlassian Cloud products and secures actions with OAuth 2.1 or configured API-token authentication while enforcing the connected user's existing permissions ([Rovo MCP overview](https://developer.atlassian.com/cloud/rovo-mcp/), [authentication](https://developer.atlassian.com/cloud/rovo-mcp/guides/authentication-and-authorization/)). The current getting-started guide uses an authv2 endpoint (`https://mcp.atlassian.com/v1/mcp/authv2`) and OAuth setup ([getting started](https://developer.atlassian.com/cloud/rovo-mcp/guides/getting-started/)).

The stable tool set includes resource discovery, user info, Jira issue get/search/create/edit/transition. The preview v2 endpoint (`https://mcp.atlassian.com/v1/mcp/preview`) adds dynamic `discover`/`execute`; tenant/toolset-dependent operations include comments, issue links, worklogs, transitions, attachments, project metadata, versions and assignable-user lookup ([preview tools](https://developer.atlassian.com/cloud/rovo-mcp/preview/tools/), [Rovo changelog](https://developer.atlassian.com/cloud/rovo-mcp/changelog/)).

| Rovo use                        | Fit for OAT                         | Gap/guardrail                                                                                             |
| ------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Interactive issue lookup/search | Good                                | Tool visibility and fields vary by authorization; verify returned IDs and key aliases.                    |
| Guided create/edit              | Good with confirmation              | Dynamic required custom fields and ADF errors still need metadata-aware handling.                         |
| Transition                      | Opt-in only                         | Workflow path and resolution semantics remain tenant-specific; do not infer from natural-language status. |
| Comment/summary                 | Useful informational path           | Preview/dynamic operation; comments are remote-only and should be best-effort with receipt.               |
| Changelog/revisions             | Incomplete as a guaranteed contract | Use REST changelog for reconciliation.                                                                    |
| Archive/delete                  | Not a dependable core contract      | Keep destructive operations on REST with explicit confirmation/admin checks.                              |
| Sprints/components/versions     | Dynamic/tenant dependent            | Probe capability; use Agile/REST fallback.                                                                |
| Data Center                     | Not applicable                      | Rovo MCP is cloud-hosted; do not send on-prem URLs to it.                                                 |

**Recommendation.** At adapter startup, probe the Rovo catalog and record available tool names/version. Use MCP as an interactive transport only when the requested capability is present and the operation is low-risk. Keep REST v3 as the canonical fallback for deterministic automation, changelog, archive/delete, metadata and full-fidelity fields. A missing MCP tool is `unsupported_capability`, not a prompt to guess a tool name.

### CLI tooling (`acli`)

**Verified-current local inspection.** The installed binary is `/opt/homebrew/bin/acli`, version `1.3.18-stable`; it warns that `1.3.30-stable` is available. Top-level Jira commands include auth, board, dashboard, field, filter, project, sprint and workitem. Work-item subcommands include archive, assign, comment, create/create-bulk, delete, edit, link, search, transition, unarchive, view and watcher. Commands accept `--json` in most read/write paths. Official command references: [create](https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-create/), [search](https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-search/), [edit](https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-edit/), [transition](https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-transition/), [work-item command index](https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem/).

Observed help capabilities:

- `jira workitem create`: project key, issue type, summary, description (plain text or ADF), labels, parent, assignee, `--from-json`/`--generate-json`, `--json`.
- `create-bulk`: JSON/CSV input, up to the command's documented batch behavior, `--ignore-errors`, `--yes`.
- `view`/`search`: selectable fields, `*all`/`*navigable`, JQL/filter, pagination, JSON/CSV.
- `edit`: summary, description (plain text or ADF), labels, assignee/type and JSON input; no direct priority or arbitrary custom-field flag in the inspected help.
- `transition`: status selection, JQL/filter and JSON output; assign/archive/delete/unarchive support batch filters and confirmation flags.
- `jira field`, `project` and `sprint` commands exist, but field/project/sprint availability depends on Jira Cloud permissions and product edition.

**Recommendation.** Treat `acli` as an optional human ergonomics and fallback transport, not the adapter's schema authority. Pin or minimum-version-check it, invoke with `--json`, capture stdout/stderr/exit code and parse defensively. Its docs were last updated earlier than the local binary warning, and no stable machine-readable schema contract is advertised. Prefer REST for custom fields, priority IDs, metadata, changelog and archive semantics. Never assume `acli` is present on a deployment host; return `tool_unavailable` and continue with MCP/REST where configured.

### Authentication, identity privacy and permissions

**Verified-current.** Cloud REST supports OAuth 2.0 3LO, Forge/Connect app auth and basic auth with an email plus API token; passwords are deprecated. OAuth 3LO obtains a cloud ID from Atlassian accessible resources and sends requests to `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/...`. OAuth scopes constrain the maximum operation, while the acting user's project/issue permissions still apply ([REST authentication](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/), [OAuth 2.0 3LO](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/), [basic auth/API tokens](https://developer.atlassian.com/cloud/jira/service-desk/basic-auth-for-rest-apis/)).

Rovo MCP's primary auth is OAuth 2.1. API-token or service-account modes require organization-admin enablement and are still constrained by the token owner/service account permissions ([API-token configuration](https://developer.atlassian.com/cloud/rovo-mcp/guides/configuring-authentication-via-api-token/)).

Atlassian's privacy migration uses `accountId` as the durable user identifier; usernames, user keys and email addresses are not canonical ([user privacy migration](https://developer.atlassian.com/cloud/jira/platform/deprecation-notice-user-privacy-api-migration-guide/)).

**Recommendation.** Keep credentials in MCP configuration, keychain or environment-backed secret storage; never write tokens to OAT templates, project state or Git. Scope an OAuth client to read plus the explicit write operations required. Store `accountId` only as informational remote metadata; do not make assignee/reporter a sync field. Distinguish 401/expired token from 403/project permission denial and guide the user to re-authenticate or request access. For multi-site accounts, persist cloud ID and verify the selected site before every write.

### Internal-skills Jira/ACLI case study

This is repository prior art, not Jira API documentation. It is useful because it shows how the organization currently wraps ACLI and where that policy is stricter than a generic provider adapter.

**Current merged behavior (verified 2026-08-30).** The canonical checkout is `/Users/tstang/Code/vox/internal-skills`, repository `voxmedia/internal-skills`, clean `main` at `d546c03b35341de79644bc723f6c4f442b314b6f`. The relevant canonical sources are `[skills/jira-acli/SKILL.md](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli/SKILL.md)`, `[skills/jira-acli-create-ticket/SKILL.md](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli-create-ticket/SKILL.md)`, `[skills/jira-acli-bulk-create-tickets/SKILL.md](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli-bulk-create-tickets/SKILL.md)`, the executable `[execute-bulk.mjs](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli-bulk-create-tickets/scripts/execute-bulk.mjs)`, and `[rules/jira-cloud-routing.mdc](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/rules/jira-cloud-routing.mdc)`. Generated `plugins/internal-skills/` views are not authoring sources per that repository's [AGENTS.md](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/AGENTS.md).

The merged skill family:

- Routes Jira Cloud requests through ACLI, explicitly excludes Data Center and browser workflows, and requires `command -v acli` plus `acli jira auth status` before work. Missing credentials are reported by variable name only; tokens are piped to login rather than put in arguments or output ([`jira-acli` lines 16-56](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli/SKILL.md#L16-L56)).
- Discovers project keys, work-item types, statuses, transitions, required fields and custom fields instead of hardcoding them; requires previews and explicit confirmation before create/edit/transition/assignment/comment/delete. It captures stdout, stderr and exit status, uses `--json` when available, and rejects default `--ignore-errors` ([`jira-acli` lines 58-118](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli/SKILL.md#L58-L118)).
- Keeps one-ticket creation distinct from bulk creation. Autonomous follow-ups are allowed only with explicit task-level Jira-write authority, one concrete ticket at a time, an `agent-reported` label, duplicate search and no automatic create retry ([`jira-acli-create-ticket` lines 49-70 and 174-216](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli-create-ticket/SKILL.md#L49-L70)).
- Treats ACLI generated JSON as the live schema. Custom fields go in `additionalAttributes`, and descriptions preserve ADF requirements; unknown IDs/values are a stop condition ([`jira-acli-create-ticket` lines 137-152](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli-create-ticket/SKILL.md#L137-L152)).
- Requires interactive review for bulk creation, stable row numbers, canonical plan JSON outside the repository, explicit confirmation, native `create-bulk`, persisted state and no non-interactive/scheduled execution ([`jira-acli-bulk-create-tickets` lines 10-50 and 97-171](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli-bulk-create-tickets/SKILL.md#L10-L50)).

The executable on `main` is narrower than those policy guardrails: `execute-bulk.mjs` builds child payloads with the persisted Epic's numeric `id` as `parentIssueId`, wraps a string description in one paragraph of ADF, and persists uncertainty without a remainder or individual-fallback helper. These are observed code paths at the `d546c03` commit, not claims about all ACLI versions; the open PR proposes changing them ([`execute-bulk.mjs` lines 95-154](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli-bulk-create-tickets/scripts/execute-bulk.mjs#L95-L154), [lines 226-375](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli-bulk-create-tickets/scripts/execute-bulk.mjs#L226-L375)).

**Open PR behavior (proposed, not merged).** PR [#19](https://github.com/voxmedia/internal-skills/pull/19), “Make Jira bulk Epic-child creation use parent keys and a reviewed recovery path,” targets `main` (`d546c03b35341de79644bc723f6c4f442b314b6f`) from `chore/improve-the-jira-acli-bulk` at head `517d7a36111aaf510a5ec71dc1ebebc9b4eb6937`. `gh pr view` reports the PR open, non-draft, `mergeStateStatus: CLEAN`; required `validate` passed (run `33318850302`, job `99277124153`), while Cursor Bugbot is a separate neutral/commented check. The PR changes 21 files (canonical skills, generated views, helpers, tests and design docs; 5,967 additions/764 deletions according to `gh pr diff`).

The proposed changes are technically relevant to a Jira adapter:

- Parent references become key-first: `parentIssueKey` is preferred; legacy `parentIssueId` is accepted only when it contains a Jira key, and numeric/conflicting values are rejected before state or ACLI mutation. This addresses observed ACLI bulk-parent failures and aligns with Jira's mutable-key/immutable-ID distinction ([PR skill lines 87-125](https://github.com/voxmedia/internal-skills/blob/517d7a36111aaf510a5ec71dc1ebebc9b4eb6937/skills/jira-acli-bulk-create-tickets/SKILL.md#L87-L125), [`lib.mjs` lines 19-58](https://github.com/voxmedia/internal-skills/blob/517d7a36111aaf510a5ec71dc1ebebc9b4eb6937/skills/jira-acli-bulk-create-tickets/scripts/lib.mjs#L19-L58)).
- The helper validates structured ADF and converts supported strings (headings, paragraphs, bullets, links) to ADF while preserving valid documents unchanged ([`lib.mjs` lines 107-175 and 434-500](https://github.com/voxmedia/internal-skills/blob/517d7a36111aaf510a5ec71dc1ebebc9b4eb6937/skills/jira-acli-bulk-create-tickets/scripts/lib.mjs#L107-L175)).
- It binds recovery to SHA-256 plan/state/reconciliation manifests, requires every source row exactly once with exact summaries, writes uncertainty markers before mutation, persists created IDs/keys, and creates remainder plans under a new run ID ([`lib.mjs` lines 246-388](https://github.com/voxmedia/internal-skills/blob/517d7a36111aaf510a5ec71dc1ebebc9b4eb6937/skills/jira-acli-bulk-create-tickets/scripts/lib.mjs#L246-L388)). `prepare-remainder.mjs` is single-parent only; `execute-individual.mjs` requires a separate confirmation and zero-existing reconciliation.
- Error text is sanitized for bearer/token/password/secret/API-key patterns before state persistence ([`lib.mjs` lines 604-636](https://github.com/voxmedia/internal-skills/blob/517d7a36111aaf510a5ec71dc1ebebc9b4eb6937/skills/jira-acli-bulk-create-tickets/scripts/lib.mjs#L604-L636)).

**Review caveat.** Cursor Bugbot left one **High Severity** inline finding on the proposed `execute-individual.mjs`: `writeJsonExclusive` serializes only first-start creation, while `individual-started`/`individual-row-created` are treated as resumable; concurrent invocations can each retain stale in-memory `createdByRow` and submit duplicate Jira tickets ([PR review comment](https://github.com/voxmedia/internal-skills/pull/19#discussion_r3889744485)). The PR's `validate` check is green, but the PR remains open and this finding is unresolved in the inspected state. Do not treat the proposed individual fallback as concurrency-safe until a newer head or review evidence closes it.

**Reusable adapter implications (recommendation).** Adopt the skill family's useful boundaries in OAT/PJM: runtime `acli --version` and auth checks; live project/schema discovery; explicit mutation preview/confirmation; key-valued parent validation; ADF validation; no credential logging; immutable plan/recovery receipts; and no blind retries after uncertain creates. Keep these as provider policy, not assumptions about Jira itself. Preserve the open-PR concurrency warning as a required design test: a Jira adapter's single-flight lock or compare-and-swap receipt must prevent concurrent retries from creating duplicate issues. Keep comments and assignees informational remote-only; an outbound completion-summary annotation requires separate explicit authorization. The internal rule currently routes Cursor Cloud Jira exclusively through ACLI and forbids MCP/REST fallback ([`jira-cloud-routing.mdc` lines 6-25](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/rules/jira-cloud-routing.mdc#L6-L25)); this is a provider policy for that product, not a reason for the OAT core adapter to abandon the REST/Rovo capability matrix in this dossier.

### Normalized OAT mapping

The local [backlog creation command](../../../../../packages/cli/src/commands/backlog/new.ts) validates a one-line title, fixed priority/scope/estimate vocabularies and labels, writes status `open`, sets timestamps, and initializes `associated_issues`/`external_plans`. The [backlog template](../../../../templates/backlog-item.md) records the same local field vocabulary. The mapping below preserves those invariants.

| OAT field                                             | Jira Cloud representation                                                     | Direction and policy                                                      |
| ----------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `id`                                                  | Provider extension containing `issue_id`; `associated_issues.ref` current key | Bidirectional identity link; issue ID wins over key.                      |
| `title`                                               | `fields.summary` (single-line string)                                         | Backlog publish/update; title changes are conflict-sensitive.             |
| Description and acceptance criteria                   | `fields.description` ADF; optionally a structured acceptance section          | OAT retains Markdown; Jira receives converted ADF. Preserve raw hash.     |
| `status` (`open`, `in_progress`, `closed`, `wont_do`) | Status category plus optional resolution                                      | Read normalization; remote transitions opt-in and explicit.               |
| `priority`                                            | Configured Jira priority ID/name                                              | Resolve per project; no name-only assumptions. `none` may be null.        |
| `scope`                                               | Configured issue type (Task/Story/Epic/etc.)                                  | Mapping is tenant configuration; preserve issue type ID.                  |
| `scope_estimate` (`XS`–`XXL`)                         | Optional custom field or OAT-only extension                                   | Do not guess a Jira estimate field; metadata-gate writes.                 |
| `labels`                                              | `fields.labels[]`                                                             | Optional explicit sync; validate single-line values.                      |
| `assignee`                                            | `fields.assignee.accountId`                                                   | Informational remote-only; never overwrite local ownership automatically. |
| `created`, `updated`                                  | Jira `fields.created`, `fields.updated`                                       | Remote revision evidence, not a replacement for OAT file timestamps.      |
| `associated_issues`                                   | Jira issue key/ID and cloud metadata                                          | Existing polymorphic link; support many remote issues per project.        |
| `external_plans`                                      | No direct Jira equivalent                                                     | Keep OAT-only.                                                            |
| OAT project artifacts                                 | Jira issue URL and concise summary/comment                                    | Link and summarize; do not duplicate full specs.                          |
| Components, versions, sprint                          | Jira extension fields                                                         | Optional read/explicit write based on capabilities.                       |
| Comments                                              | Jira comments API/ADF                                                         | Informational remote-only; summary posting is best-effort with receipt.   |

**Status normalization detail.** `open` should accept any configured To do category status; `in_progress` any In progress status; `closed` Done plus a configured closure resolution; `wont_do` Done plus a configured cancellation/duplicate/won't-do resolution. Preserve raw status/resolution IDs and names to avoid loss. If resolution is unavailable, keep terminal category but mark the mapping incomplete and require review before claiming semantic parity.

**Provider extension proposal.** A Jira-specific extension can include `cloud_id`, immutable `issue_id`, current `key`, `aliases`, `project_id`, `issue_type_id`, raw status/priority/resolution IDs, `last_remote_updated`, `last_changelog_cursor`, ADF hash, capability snapshot and `origin` (`manual`, `project:<name>`, `jira:<id>`, `intake`). The [Linear handover](linear-integration-discovery-handover.md) proposes an `origin` field to prevent duplicate creation and trace provenance; implement it provider-neutrally if adopted.

### Adapter capability matrix

Legend: **Core** means required for a useful Jira Cloud adapter; **Optional** means guarded by tenant/product capabilities; **Info** means read or publish-only and not a synchronized OAT field.

| Operation                   | Core/optional                                                | REST v3         | Rovo MCP                      | `acli`                         | Failure semantics                                                |
| --------------------------- | ------------------------------------------------------------ | --------------- | ----------------------------- | ------------------------------ | ---------------------------------------------------------------- |
| Resolve issue by ID/key     | Core                                                         | Yes             | Yes (`getJiraIssue`)          | `view`                         | 404/invisible is non-retryable; key alias may change.            |
| Read configured fields      | Core                                                         | Yes (`fields`)  | Tool-dependent                | `view --fields`                | Missing fields lower confidence; do not infer null vs hidden.    |
| Read create/edit metadata   | Core                                                         | Yes             | Dynamic/uncertain             | Not a dependable contract      | `metadata_stale`/`unsupported_capability`; refresh before write. |
| Create one issue            | Core                                                         | Yes             | Yes                           | Yes                            | Validate required fields; timeout requires duplicate search.     |
| Bulk create                 | Optional                                                     | Yes (limit 50)  | Dynamic                       | `create-bulk`                  | Per-item receipt; partial failure, no blanket retry.             |
| Edit summary/ADF/labels     | Core                                                         | Yes             | Yes                           | Yes                            | Conflict/ADF/field screen errors are reviewable.                 |
| Edit arbitrary custom field | Core for fidelity                                            | Yes             | Dynamic                       | JSON may work but undocumented | Metadata-gate; use REST fallback.                                |
| Read/search JQL             | Core                                                         | Enhanced JQL    | Yes search tool               | `search`                       | Eventual consistency; paginate and preserve token.               |
| Duplicate match/count       | Core                                                         | JQL match/count | Not guaranteed                | Search approximation           | Candidate-only if not exact ID/origin.                           |
| Read changelog              | Core for reconciliation                                      | Yes             | Not guaranteed                | Not guaranteed                 | If forbidden, emit `revision_unknown`.                           |
| Read transitions            | Optional (required only for explicit remote transition mode) | Yes             | Dynamic                       | Status/transition command      | No legal transition => no write.                                 |
| Execute transition          | Optional                                                     | Yes             | Yes                           | Yes                            | Require explicit intent; preserve resolution semantics.          |
| Assignee lookup/update      | Info/optional                                                | Yes             | Dynamic assignable-user tools | Yes                            | Remote-only; 403 does not block core sync.                       |
| Comments                    | Info                                                         | Yes ADF         | Preview/dynamic               | Comment commands               | Best-effort summary; receipt and no local conflict.              |
| Components/versions         | Optional                                                     | Yes             | Dynamic                       | Partial                        | Unsupported per project is normal.                               |
| Sprints                     | Optional Jira Software                                       | Agile REST      | Dynamic                       | Sprint commands                | Product/board permission gate.                                   |
| Archive/delete              | Explicit admin-only                                          | Yes             | Not dependable                | Commands exist                 | Confirmation and policy gate; never implicit.                    |
| Webhooks                    | Deferred                                                     | Yes, renewable  | N/A as receiver               | N/A                            | Future bridge must renew/dedupe/authenticate.                    |

### Three-way reconciliation and offline behavior

#### State model

**Recommendation.** For each linked backlog item maintain:

- **Base (`B`)**: the last accepted pair of local projection and remote snapshot, including immutable issue ID, key alias set, normalized OAT fields, raw Jira IDs, ADF hash, remote `updated`, changelog cursor and adapter version.
- **Local (`L`)**: current markdown frontmatter/body and Git/tree timestamp. The [create command](../../../../../packages/cli/src/commands/backlog/new.ts) writes atomically and regenerates the backlog index, rolling back the item if index generation fails.
- **Remote (`R`)**: a fresh issue read plus metadata/changelog as permitted, with current key and visibility state.

Compute field-level deltas `ΔL = diff(B,L)` and `ΔR = diff(B,R)` after canonicalization (trim title, normalize labels as an ordered set, convert ADF to canonical JSON for hashing, preserve raw values). Apply only disjoint deltas. If both sides changed the same field, produce `needs_review` with the base, local and remote values; do not pick a winner silently.

#### Reconciliation signals and outcomes

| Signal                                                        | Interpretation                              | Action                                                                           |
| ------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| Immutable issue ID unchanged, key changed                     | Move/project-key rename                     | Update alias/current key; no duplicate.                                          |
| Remote `updated` newer, changelog shows only assignee/comment | Remote informational change                 | Refresh remote-only data; no local conflict.                                     |
| Remote `updated` newer, summary/description/labels changed    | Remote sync-field delta                     | Apply only if `ΔL` is empty; otherwise review.                                   |
| Local file changed, remote unchanged                          | Local-owned candidate update                | Publish only fields allowed by policy/metadata.                                  |
| Both changed same field                                       | True conflict                               | Persist conflict receipt; require user decision.                                 |
| 404 after previously visible                                  | Deleted, archived, moved or permission loss | Probe by issue ID and permission; mark `remote_unavailable`, never delete local. |
| Search does not find just-created issue                       | Eventual consistency                        | Read by returned issue ID; retry enhanced JQL with reconcile option.             |
| Create timed out                                              | Unknown commit state                        | Search deterministic candidate; do not blindly retry.                            |
| Changelog inaccessible                                        | Weak revision evidence                      | No destructive overwrite; mark `revision_unknown`.                               |

#### Offline and ephemeral sessions

**Verified-current local constraint.** [Discovery](../discovery.md) states agent sessions are ephemeral and cannot assume a long-running process; the [handover](linear-integration-discovery-handover.md) rejects webhooks for v1.

**Recommendation.** A local create/update should remain valid offline. If a Jira operation is requested without network/auth, write a durable pending operation receipt (intent, deterministic payload hash, local commit/tree, target project/type, retry policy) without pretending that a remote issue exists. On reconnect, preflight metadata and duplicate candidates, then apply or route to review. `associated_issues` should remain empty until the remote create response is accepted; a provisional client operation ID is not a Jira issue ID.

### Technical tradeoffs

| Choice                    | Benefits                                                                                            | Costs and mitigation                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| REST v3 canonical adapter | Complete metadata, fields, transitions, changelog and lifecycle controls; deterministic HTTP errors | OAuth/token plumbing and ADF/JQL complexity; encapsulate in a thin provider module and test against recorded fixtures. |
| Rovo MCP first            | Agent-friendly OAuth, natural-language discovery, no bespoke client in interactive sessions         | Dynamic/preview tool drift, incomplete changelog/archive/custom-field contract; probe and use REST fallback.           |
| `acli` first              | Familiar CLI, JSON output, batch commands and auth UX                                               | Version drift, no full field surface, binary availability; optional fallback only.                                     |
| Full ADF preservation     | Rich formatting and less data loss                                                                  | Larger snapshots/conflict noise; hash canonical ADF and retain Markdown source.                                        |
| Category-based status map | Portable across custom status names                                                                 | Loses workflow nuance/resolution; preserve raw IDs and discover transitions.                                           |
| Manual lifecycle sync     | Fits ephemeral agents, explicit approval and safer writes                                           | Drift between syncs; surface freshness and provide deterministic sync command/receipts.                                |
| Webhook bridge            | Lower latency                                                                                       | Requires durable service, renewal, auth/retry and comment event changes; defer until operating model exists.           |
| Cloud-only adapter        | Matches active discovery and Rovo/acli                                                              | Excludes on-prem customers; keep a separate Data Center provider contract.                                             |

### Data Center distinction

**Verified-current.** Jira Data Center uses on-premise base URLs and different REST paths (commonly `/rest/api/2`). Its basic authentication can use username/password or PAT/OAuth variants depending on deployment; Cloud email/API-token basic auth guidance does not transfer ([Data Center basic auth](https://developer.atlassian.com/server/jira/platform/basic-authentication/)). Data Center search uses offset pagination (`startAt`, `maxResults`) and Data Center app/Forge assumptions differ from Cloud ([Data Center search REST](https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-search/)). Data Center field configuration, screens, schemes and workflows are administrator-controlled ([Data Center issue configuration](https://confluence.atlassian.com/adminjiraserver/configuring-issues-938847082.html)).

Rovo MCP is a cloud-hosted service and cannot be assumed to reach an on-premise Jira URL. The inspected `acli` command family is documented for Jira Cloud and should not be used as a Data Center transport.

**Recommendation.** Reject a Data Center base URL in the Cloud adapter with `unsupported_provider_variant` and route to a separately designed Data Center adapter. Do not silently downgrade `/rest/api/3` calls to `/rest/api/2`; identity, authentication, webhook and permission semantics need independent tests.

### Risks and open questions

1. **Tenant schema drift (high):** Required fields, contexts, screens, issue types and priorities vary. Mitigation: metadata probes, cached fingerprints, typed `metadata_stale` failures.
2. **Workflow ambiguity (high):** A Done category can still be unresolved, and transition IDs differ. Mitigation: configured status/resolution policy, transition discovery and no automatic OAT transitions by default.
3. **Identity/key churn (high):** Moves and project-key edits change keys. Mitigation: persist issue ID/cloud ID, aliases and current-key refresh.
4. **MCP contract drift (medium/high):** Preview and dynamic tools are subject to change and tenant discovery. Mitigation: startup capability probe, versioned capability snapshot, REST fallback.
5. **CLI drift (medium):** Installed `acli` is behind current release and help/docs do not promise a stable JSON schema. Mitigation: minimum-version check, fixture tests, defensive parsing, optional transport.
6. **Eventual consistency (medium):** Enhanced JQL may lag writes. Mitigation: use returned issue ID, `reconcileIssues`, bounded retry and duplicate review.
7. **Permission and privacy (high):** Browse, issue security, field visibility, workflow conditions and account privacy produce partial views. Mitigation: least-privilege scopes, explicit 401/403 distinction, no assignee/reporter sync field.
8. **ADF conversion loss (medium):** Markdown and ADF support differ. Mitigation: preserve source Markdown/raw ADF and report unsupported nodes.
9. **Destructive lifecycle (high):** Delete/archive are irreversible or admin-only. Mitigation: explicit command/approval gates and local tombstones.
10. **No authenticated tenant validation (current blocker):** This dossier cannot verify a real project's custom fields, transitions, Rovo catalog, rate limits or permissions. Implementation must begin with a read-only tenant capability probe before enabling writes.

Open design questions for the next OAT discovery/spec checkpoint:

- Which Jira project(s), issue types and default priority/resolution mappings are approved?
- Is an `origin`/provider-extension field acceptable in the shared backlog template, or should it remain sidecar metadata?
- Should any project opt into OAT-to-Jira transition commands, or is status ownership permanently delegated to GitHub/Jira automation?
- Which fields are sync-authoritative beyond title, description and labels? Is `scope_estimate` OAT-only?
- What is the approved duplicate marker (issue property, custom field, or local-only receipts) under the chosen OAuth model?
- Is Jira Software/sprint integration in scope, and which board is authoritative?
- What offline receipt/queue storage and retry lifecycle fits the existing PJM state model?

## Sources & References

### Repository evidence

- [Remote-PM discovery](../discovery.md) — Cloud target, common fields, open questions and session constraints.
- [Linear integration discovery handover](linear-integration-discovery-handover.md) — dual system of record, backlog↔issue cardinality, lifecycle sync boundaries, provenance and no-webhook v1 policy.
- [Backlog item template](../../../../templates/backlog-item.md) — fixed OAT status/priority/scope/estimate fields and association shape.
- [Project state template](../../../../templates/state.md) — polymorphic `associated_issues` references.
- [Backlog create command](../../../../../packages/cli/src/commands/backlog/new.ts) — input validation, rendering and atomic index rollback behavior.
- [Jira backlog refinement item](../../../../repo/reference/backlog/items/backlog-refinement-jira.md) — prior OAT intent for conversational Jira ticket generation.

### Internal-skills Jira/ACLI prior art

- [Internal-skills AGENTS.md at `d546c03`](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/AGENTS.md) — canonical `skills/` authoring boundary, generated provider views, credential and verification guardrails.
- [Current `jira-acli` skill](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli/SKILL.md#L16-L118), [current create-ticket skill](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli-create-ticket/SKILL.md#L49-L216), and [current bulk skill](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli-bulk-create-tickets/SKILL.md#L10-L233) — merged policy and workflow behavior.
- [Current `execute-bulk.mjs`](https://github.com/voxmedia/internal-skills/blob/d546c03b35341de79644bc723f6c4f442b314b6f/skills/jira-acli-bulk-create-tickets/scripts/execute-bulk.mjs#L95-L375) — executable parent, ADF, state and uncertainty behavior at `main`.
- [Open PR #19](https://github.com/voxmedia/internal-skills/pull/19) and [head skill/recovery diff at `517d7a3`](https://github.com/voxmedia/internal-skills/blob/517d7a36111aaf510a5ec71dc1ebebc9b4eb6937/skills/jira-acli-bulk-create-tickets/SKILL.md#L87-L350) — proposed key-first parent and reviewed recovery behavior; not merged as of 2026-08-30.
- [PR #19 head `lib.mjs`](https://github.com/voxmedia/internal-skills/blob/517d7a36111aaf510a5ec71dc1ebebc9b4eb6937/skills/jira-acli-bulk-create-tickets/scripts/lib.mjs#L19-L636), [validate run](https://github.com/voxmedia/internal-skills/actions/runs/33318850302/job/99277124153), and [unresolved Bugbot finding](https://github.com/voxmedia/internal-skills/pull/19#discussion_r3889744485) — implementation, green CI evidence and concurrency caveat.

### Jira Cloud REST and administration

- [REST API v3 introduction](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [Issue APIs: create, edit, metadata, transitions, changelog, archive/delete](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/)
- [Enhanced JQL issue search and match/count](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/)
- [Issue fields and custom-field metadata](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields/)
- [ADF document structure](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/)
- [Issue comments](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-comments/)
- [Projects](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-projects/)
- [Project components](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-project-components/)
- [Status REST API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-status/)
- [Issue hierarchy deprecation notice](https://developer.atlassian.com/cloud/jira/platform/deprecation-notice-hierarchy-levels/)
- [Project key editing](https://support.atlassian.com/jira-cloud-administration/docs/edit-a-projects-details/)
- [Historical Jira keys](https://support.atlassian.com/migration/kb/migration-of-jiras-historical-keys-for-issues-and-projects/)
- [Issue types](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-types/)
- [Issue type hierarchy](https://support.atlassian.com/jira-cloud-administration/docs/configure-the-issue-type-hierarchy/)
- [Workflow statuses/categories](https://support.atlassian.com/jira-cloud-administration/docs/what-is-a-workflow-status/)
- [Workflow transitions](https://support.atlassian.com/jira-cloud-administration/docs/create-workflow-transitions/)
- [Statuses, priorities and resolutions](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-statuses-priorities-and-resolutions/)
- [Cloud webhooks](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-webhooks/)
- [Comment webhook change notice](https://developer.atlassian.com/cloud/jira/platform/change-notice-removal-of-comments-from-issue-webhooks/)

### Rovo MCP

- [Rovo MCP overview](https://developer.atlassian.com/cloud/rovo-mcp/)
- [Getting started and authv2 endpoint](https://developer.atlassian.com/cloud/rovo-mcp/guides/getting-started/)
- [Supported tools](https://developer.atlassian.com/cloud/rovo-mcp/guides/supported-tools/)
- [Authentication and authorization](https://developer.atlassian.com/cloud/rovo-mcp/guides/authentication-and-authorization/)
- [OAuth 2.1 configuration](https://developer.atlassian.com/cloud/rovo-mcp/guides/configuring-oauth-2-1/)
- [API-token configuration](https://developer.atlassian.com/cloud/rovo-mcp/guides/configuring-authentication-via-api-token/)
- [Preview dynamic tools](https://developer.atlassian.com/cloud/rovo-mcp/preview/tools/)
- [Rovo MCP changelog](https://developer.atlassian.com/cloud/rovo-mcp/changelog/)

### acli and authentication

- [acli installation/version policy](https://developer.atlassian.com/cloud/acli/guides/install-acli/)
- [acli work-item create](https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-create/)
- [acli work-item search](https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-search/)
- [acli work-item edit](https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-edit/)
- [acli work-item transition](https://developer.atlassian.com/cloud/acli/reference/commands/jira-workitem-transition/)
- [Cloud REST authentication](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/)
- [OAuth 2.0 3LO](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/)
- [Cloud basic auth with API token](https://developer.atlassian.com/cloud/jira/service-desk/basic-auth-for-rest-apis/)
- [User privacy/accountId migration](https://developer.atlassian.com/cloud/jira/platform/deprecation-notice-user-privacy-api-migration-guide/)

### Jira Data Center boundary

- [Data Center basic authentication](https://developer.atlassian.com/server/jira/platform/basic-authentication/)
- [Data Center search REST](https://developer.atlassian.com/server/jira/platform/rest/v11003/api-group-search/)
- [Data Center issue configuration](https://confluence.atlassian.com/adminjiraserver/configuring-issues-938847082.html)
