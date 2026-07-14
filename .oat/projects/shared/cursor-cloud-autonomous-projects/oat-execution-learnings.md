---
oat_generated: false
oat_append_only: true
---

# Autonomous Execution Learnings

Append-only observations from autonomous execution and environment verification.

## 2026-07-13T21:16:00Z - environment-limited - User-scope skill loading probe

**Observation:** Created the uniquely named probe
`~/.agents/skills/oat-user-scope-probe-20260713-2116/SKILL.md`. The source CLI
command `pnpm run cli:source -- tools list --scope user --json` discovered it as
a user-scope custom skill at version `1.0.0` with status `not-bundled`. The
current Cursor Cloud agent's startup-provided available-skills surface was
created before the probe and offered no in-session refresh mechanism. A fresh
cloud run was explicitly unavailable for this task, so direct model
auto-surfacing from `~/.agents/skills/` could not be verified.

**Impact:** OAT-level canonical user-scope discovery is verified, but Cursor
Cloud's direct loading of a newly added canonical user-scope skill is not.
Treating the latter as proven would overstate the evidence.

**Recommendation:** Activate the planned contingency in p02-t03: in Cursor
Cloud, resolve and read the selected user-scope skill and companion assets by
absolute path as the primary mechanism. Provider auto-surfacing remains a
convenience only until a fresh-run probe verifies it. Keep user scope as the
execution source under the user-always-wins precedence rule.

## 2026-07-13T23:08:00Z - code-follow-up - Selection-only gate routing

**Observation:** The p04 readiness check must prove priority-ordered,
different-family routing for OpenAI and Claude producers, but the OAT gate CLI
has no non-executing selection surface. `oat gate target list --json` reports
the ordered registry and availability, while `oat gate cross-provider-exec`
crosses the accepted-launch boundary and therefore cannot safely be used as a
readiness probe.

**Impact:** The environment script currently mirrors the gate selector over the
read-only, priority-sorted target list. Its family classifier is explicitly
pinned in lockstep to
`packages/cli/src/providers/identity/family.ts`, but this remains duplicated
selection logic that can drift from the CLI.

**Recommendation:** Add a read-only `--select-only` (or equivalent dry-run)
mode to the OAT gate command. It should accept producer identity and avoidance
options, run real availability checks, return the selected target plus diversity
metadata, and never launch the provider command. Replace the environment-side
selection mirror once that CLI surface ships.

## 2026-07-13T23:09:00Z - agent-instruction/code-follow-up - Literal availability probes

**Observation:** The user-reviewed reference config's six
`availabilityCommand` strings use plain `grep -q '<model-slug>'`. Model slugs
contain dots, so grep interprets them as regex wildcards rather than literal
characters.

**Impact:** A sufficiently similar catalog line could produce a false-positive
availability result. Phase 4 intentionally did not alter
`.cursor/oat-user-config.json` because byte fidelity to the reviewed reference
is a task requirement.

**Recommendation:** Update the canonical reference config to use
`grep -Fq -- '<model-slug>'` (or exact parsed model IDs), then advance the seed
revision and recopy it into the environment repository. Add an authoring
instruction or validation rule requiring literal matching for opaque provider
model identifiers.

**Disposition (2026-07-14):** Resolved in the approved pre-ship seed revision.
All six canonical probes now use `grep -Fq --`, and the environment seed is
byte-identical to the revised reference. No numeric seed-version bump is needed:
env PR #5 has not shipped, so there is no deployed HOME to migrate.

## 2026-07-14T01:58:00Z - code-follow-up - Gate-inventory drift enforcement

**Observation:** `.agents/docs/autonomy-contract.md`'s exhaustiveness claim is
protected only by a recorded scan-baseline SHA and reviewer diligence. The p01
review cycle already observed within-phase drift (37 new phrase-match lines
after inventory authorship). No CI test asserts inventory coverage at HEAD, and
no authoring guidance requires an inventory row when a lifecycle prompt
changes.

**Impact:** A future skill change adding an interactive prompt passes all
existing checks while silently breaking the inventory's exhaustiveness — the
lookup table autonomous runs depend on for prompt resolution.

**Recommendation:** (1) Add a CLI contract test automating the p01-t01 scan:
run the broadened-phrase rg scan across the 15 skill roots, parse the inventory
table, fail on any unmapped prompt site (match file + gate ID, not line
numbers). Precedent: existing prose-contract suites in
`packages/cli/src/validation/skills.test.ts`. (2) Add authoring guidance to
`create-oat-skill` and the contract doc: prompt changes require a same-commit
inventory row change.

## 2026-07-14T02:20:00Z - decision - Coexistence with orchestration-run-log (PR #146)

**Observation:** PR #146 designs `orchestration-run-log`: a CLI-owned,
append-only per-project `project-log.md` (single-writer `oat project log
append/check/synthesize/rollup`, structural + judgment entry classes, hard
roll-up-before-archive gate, repo-level ledger). It shares the substrate of our
FR11/FR14 learnings mechanism (append-only categorized project log →
summary-time synthesis) but differs in writer model (CLI vs hand-authored),
taxonomy, lifecycle scope (any project vs autonomous runs), and enforcement
(tested hard gate vs conditional prose). Both projects amend
`oat-project-summary` and add an observations-style section to `summary.md`.
Neither project's artifacts reference the other.

**Impact:** Shipping both as-is creates double-logging ambiguity for agents,
a same-file collision risk in the summary skill when their p03-t02 lands, and
asymmetric durability (their log gets a hard pre-archive gate; our learnings
file has only soft synthesis).

**Recommendation (staged; no changes now — their implementation is
unstarted, ours is shipped):** When orchestration-run-log lands: (1)
coordinate the `oat-project-summary` edits — learnings synthesis stays its own
section, `## Workflow Observations` excludes autonomous-learnings content,
cross-reference one line; (2) adopt their enforcement pattern — verify
learnings synthesis before an autonomous project's log is sealed into the
gitignored archive; (3) file a v2 evaluation for migrating learnings writes
onto the `oat project log` substrate (extended taxonomy or `learning` entry
class) with FR14 as a filtered consumer, decided on production evidence; (4)
feed two suggestions upstream to their project: a secret-redaction entry
contract, and the Observation/Impact/Recommendation body shape for high-value
judgment entries. Full comparison recorded in the project log 2026-07-14.
