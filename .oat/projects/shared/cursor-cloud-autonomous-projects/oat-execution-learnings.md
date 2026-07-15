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

## 2026-07-14T03:40:00Z - gotcha - Live install-repos.sh verification stripped VM git credentials

**Observation:** During the seed-revision verification, running provisioning
logic against the live environment stripped the platform-injected git
credentials and `[user]` identity from `/agent/repos/*/.git/config` (the boot
script's repo-config loop rewrites remotes to canonical tokenless URLs,
expecting the platform to re-inject tokens at VM start). Subsequent pushes
failed with "could not read Username"; `gh` auth was also absent. Recovered by
restoring the committed identity from git history and authenticating pushes
via the `GITHUB_PACKAGES_TOKEN` secret through a one-shot credential helper.

**Impact:** Mid-session credential loss; ~10 minutes recovery. Would strand
pushes entirely in an environment without a repo-scoped fallback secret.

**Recommendation:** (1) Harness/verification runs of `install-repos.sh` must
never execute the repo-config loop against `/agent/repos` — the committed
harness already isolates via fixtures; add an explicit guard to the script
itself (skip or warn when a target repo's remote already carries injected
credentials, or gate the loop behind a boot-context marker). (2) Add this
failure mode to the cloud-env README troubleshooting section.

## 2026-07-14T12:50:00Z - documentation-gap - Cursor rules lack per-task tier classification; one-family convention implicit

**Observation:** Operator's dispatch model: one family of agents per project;
the orchestrator classifies each task to the appropriate model within that
family (ceiling = cap, not mandate); reviews always run at the configured
ceiling; cross-model independence comes from configured gates. Checked against
`oat-project-implement/references/dispatch-and-dry-run.md`: reviews-at-ceiling
and gates-as-configured are stated verbatim, and Codex/Claude rules carry
explicit preferred-effort/model scope-classification tables — but the Cursor
provider rules have no per-task classification step (opaque strings +
resolver call only), and the one-family-per-project convention is stated
nowhere; it is emergent from single-harness providers and breaks on Cursor's
multi-family catalog. Observed consequence in this run: every phase
implementer was pinned to the frontier resolution instead of classifying
docs/config work to lower tiers (operator corrected 2026-07-14).

**Impact:** Cursor-run projects over-dispatch execution work at ceiling and
have no instruction-level guardrail keeping execution within the selected
family; the seeded cursor ladder's deliberately multi-family cells (availability
resilience) can hand a cross-family implementer to a single-family project,
conflating the execution ladder with the gate layer's cross-family role.

**Recommendation:** (1) Add a per-task tier-classification step to the Cursor
rules mirroring the Codex scope table, mapped to ladder tiers (economy/
balanced/high/frontier), with ceiling-as-cap semantics restated. (2) State the
family-coherence convention explicitly in the dispatch references: execution
stays within the project's selected family; cross-family is the province of
gates and explicitly configured review routes. (3) Revisit the cloud seed's
cursor ladder cells: consider single-family (Sol) execution cells with
Fable/Grok confined to gate execTargets — discuss before changing; the
multi-family cells were a deliberate availability-resilience choice.

## 2026-07-14T13:00:00Z - candidate-skill-content - Gate diversity keys on stamped executor; unknown-producer degrades softly

**Observation:** Verified in `packages/cli/src/commands/gate/index.ts`:
`oat gate review` resolves producer identity from implementation.md dispatch
stamps filtered to implementer/fix roles (exact scope → latest stamp; range/
final scopes → aggregated family union), never from the orchestrator's
selected model. Fable-orchestrator + Sol-implementer projects therefore select
the Fable gate correctly, and mixed-family execution histories aggregate to
avoid every producing family (Grok tertiary covers the two-family case). But
when stamps carry `producer=unknown`, avoidance degrades to same-runtime, and
in an all-cursor registry falls through to the top-priority target with
`achieved=unknown-producer` + warning — potentially same-family as the actual
producer, with no hard stop.

**Impact:** The FR3 cross-family guarantee rests on stamp bookkeeping quality;
in autonomous runs a silent diversity loss would go unnoticed until summary.

**Recommendation:** Hardening candidate: under `OAT_AUTONOMOUS=1`, a code-scope
gate review resolving `unknown-producer` should fail closed (boundary stop)
instead of warn-and-proceed, or at minimum require the explicit
`--producer-identity` override. Also a docs candidate: state in the dispatch
references that gate diversity is executor-derived (stamps), orchestrator
identity is invisible to gate selection.

## 2026-07-15T00:12:51Z - workflow-improvement - Downstream vendored-copy reviews are a free canonical audit channel

**Observation:** Cursor Bugbot reviewed a downstream repository that vendors
canonical OAT lifecycle skills and agent instructions, then reported five
findings that all reproduced in the canonical sources. The downstream context
surfaced completion-ordering, timestamp-format, template-fence, and
cross-step-artifact contract defects without requiring a separate canonical
review dispatch.

**Impact:** Vendored-copy review creates useful independent coverage at no
additional canonical review cost. Ignoring those reports because they originate
downstream would leave defects in the source of truth and every future vendor
refresh.

**Recommendation:** Treat downstream vendored-copy findings as a free canonical
audit channel: verify each report against the canonical source, fix it there,
record the external provenance, and regenerate provider or vendored views.
Avoid patching only the downstream copy when the canonical file is defective.

## 2026-07-15T00:35:00Z - decision - Org orchestration rule resolves selection-philosophy layering

**Observation:** Operator shared the org-level `alwaysApply` "Agent
orchestration" rule (internal-skills repo). Its taxonomy aligns with OAT's
dispatch substrate: task shapes = OAT baseline role classes verbatim; relative
tiers = OAT dispatch-policy tiers (naming nit: rule "economical" vs OAT config
"economy"); its five required dispatch fields are a subset of OAT's caller
request contract.

**Impact:** Two previously-logged open items resolve. (1) The Cursor
per-task tier-classification gap (2026-07-14 entry) narrows to mechanics only:
the org rule owns "lowest reliable tier" selection philosophy; OAT's Cursor
provider rules need only the mechanical mapping (classified tier → configured
ladder cell → resolver `--candidate-model`). Do not duplicate selection
philosophy into OAT docs. (2) The family-coherence question closes: the org
rule is deliberately model-agnostic and the operator accepts cross-family
execution; multi-family ladder cells stand; family enforcement remains where
it lives — gate/review diversity via stamped executor identity.

**Recommendation:** Remaining OAT-side follow-ups: add the mechanical
tier→cell→resolver hook to the Cursor provider rules (docs); consider one
paragraph in `oat-dispatch-subagents` selection guidance adopting the org
rule's stricter catalog-gap behavior ("a missing lower tier does not justify
an equivalent frontier child; prefer retain-in-root when output is not
mechanically verifiable") — currently OAT biases to nearest-available-tier
dispatch. Align "economical"/"economy" naming on one side.
