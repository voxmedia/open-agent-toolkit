---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-02
oat_generated: false
---

# Discovery: known-strays-config

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Add a project-scoped way to configure known provider strays so OAT does not
report or prompt for intentionally local provider files. The concrete example is
`.cursor/skills/cloud-environment-setup`, which is expected to exist only in
Cursor and should not be adopted into canonical OAT skills.

## Clarifying Questions

No blocking clarification is needed. The user selected quick workflow mode and
gave a representative known stray path.

## Solution Space

_Include this section only when the request is exploratory or multiple viable approaches exist. For well-understood requests with an obvious approach, omit or replace with a single sentence stating the chosen direction._

This is a bounded provider-sync ergonomics change. The chosen direction is to
make stray suppression explicit in sync config instead of relying on
provider-specific exceptions or Git ignore state.

### Approach 1: Sync Config Known Strays _(Recommended)_

**Description:** Add a structured config field to `.oat/sync/config.json` for
paths that are intentionally unmanaged provider-view files. Provider sync status
and adoption prompts filter those entries out before reporting strays.
**When this is the right choice:** Use when a file is intentionally local to a
provider but still lives under a provider directory that OAT scans for strays.
**Tradeoffs:** Requires users to maintain a small allowlist when local provider
files are intentional.

### Approach 2: Provider-Specific Exception

**Description:** Hard-code the Cursor path or Cursor-only behavior in stray
detection.
**When this is the right choice:** Only appropriate for a one-off compatibility
patch with no reusable semantics.
**Tradeoffs:** Does not generalize to future intentional provider-local files
and duplicates policy in provider-specific code.

### Approach 3: Rely on Git Ignore

**Description:** Ask users to ignore intentional provider files through
`.gitignore` or `.git/info/exclude`.
**When this is the right choice:** Works for files that can cleanly be excluded
from Git and do not need OAT-specific intent recorded.
**Tradeoffs:** This already exists for ignored provider files, but it does not
help when the file should remain visible to Git or when intent should be
documented in OAT config.

### Chosen Direction

**Approach:** Sync config known strays.
**Rationale:** The behavior is shared provider-sync policy, not a Cursor-only
special case. Config makes the local intent auditable and keeps adoption prompts
focused on actionable unmanaged files.
**User validated:** Yes - the user selected quick workflow after the
recommended config-level approach was presented.

## Options Considered

### Config Shape

**Description:** Add a concise sync-config field, tentatively named
`knownStrays`, containing provider paths to suppress from stray reporting and
adoption prompts.

**Pros:**

- Keeps intentional provider-local files documented in the same config surface
  that controls provider sync.
- Can apply consistently to `oat status` and `oat init` stray handling.

**Cons:**

- Exact matching is simple and predictable but less flexible than glob support.
- Glob support is more ergonomic for repeated patterns but needs clearer
  validation and path-boundary semantics.

**Chosen:** Exact provider-path entries first, unless repo inspection shows an
existing config pattern for path globs that can be reused safely.

**Summary:** Implement the smallest explicit allowlist that solves the known
stray workflow while preserving unrelated stray detection.

## Key Decisions

1. **Workflow:** Use quick workflow mode for a bounded provider-sync CLI/config
   feature.
2. **Policy Location:** Treat known strays as shared provider-sync policy, not a
   Cursor-specific branch.
3. **Behavior:** Known strays should not count toward stray summaries, should
   not trigger adoption prompts, and should not cause project status to look
   actionable when all other managed files are in sync.

## Constraints

- Preserve detection and adoption behavior for unrelated unmanaged provider
  files.
- Cover both project status reporting and init/adoption surfaces if both use
  stray detection.
- Document the config shape in provider-sync docs.
- Because provider-sync docs and CLI behavior are shipped functionality, include
  the required lockstep public package version bump and `pnpm release:validate`
  before finishing.

## Success Criteria

- A configured known stray such as `.cursor/skills/cloud-environment-setup` is
  omitted from `oat status --scope project` stray output and prompts.
- Unconfigured strays still report normally and remain adoptable.
- Tests cover at least one suppressed stray and one unsuppressed stray.
- Provider-sync docs describe the config field and example usage.
- Release validation passes for the shipped CLI/docs change.

## Out of Scope

- Do not hard-code `.cursor/skills/cloud-environment-setup` as a special case.
- Do not duplicate full provider-sync schema details into AGENTS.md.
- Do not change provider sync strategy, manifest semantics, or canonical skill
  schemas beyond the known-stray filter.

## Deferred Ideas

- Broader provider-local file categories - defer until there are repeated use
  cases beyond known strays.
- Interactive config-edit commands for known strays - defer unless manual JSON
  editing proves too clumsy.

## Open Questions

- **Config Matching:** Should the first implementation support only exact
  provider paths, or also scoped globs if an existing path-matching helper makes
  that low-risk?
- **JSON Shape:** Should known strays be top-level under sync config or nested
  per provider? Prefer the shape that best matches existing config schema and
  docs conventions.

## Assumptions

- `.oat/sync/config.json` is the right project-scoped home because this is
  provider-sync behavior.
- Existing status/init stray paths can share one helper so suppression behavior
  stays consistent.

## Risks

- **Over-suppression:** A broad matcher could hide actionable unmanaged files.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Prefer exact path matching initially or add focused
    tests for non-matching sibling paths.
- **Surface drift:** `oat status` and `oat init` could diverge if filtering is
  duplicated.
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Centralize filtering in shared config/detection code
    and test both command surfaces where practical.

## Next Steps

Use this discovery artifact to drive the next workflow step:

- **Spec-driven mode:** continue to `oat-project-design` (which confirms
  requirements and produces both `spec.md` and `design.md`).
- **Spec-driven mode → formalize-only:** use `oat-project-spec` standalone
  if you want a formalized requirements artifact but aren't ready to
  design yet.
- Confirm requirements, then proceed directly to `plan.md`.
