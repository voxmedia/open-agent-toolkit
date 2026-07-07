---
oat_status: draft
oat_ready_for: revalidation
oat_blockers: []
oat_last_updated: 2026-07-06
oat_generated: false
oat_template: false
oat_template_name: design
---

# Design: multi-family-dispatch

> **Status: follow-on discovery/design — implementation happens in a new worktree.**
> This project is **intentionally included on this branch** as follow-on
> discovery/design (and possibly plan) material for continuity after
> `model-dispatch-improvements`. It is **not** part of that project's shipped
> implementation surface, and reviews of the parent PR should treat these files as
> planning artifacts, not stray implementation. Actual implementation will occur later
> in a dedicated worktree.
>
> **Revalidate at kickoff.** The parent has now shipped; its shapes were re-read on
> 2026-07-06 and this design is grounded in them, but the Cursor-CLI facts still derive
> from a stale (2026-06-19) docs snapshot and must be verified against the live binary —
> see the **Revalidation Checklist**.

## Overview

The parent shipped dispatch as an explicit policy — `dispatchPolicy: { mode: managed |
inherit, policy: economy | balanced | high | frontier | uncapped }` alongside the legacy
`dispatchCeiling: { preset, providers: {codex, claude} }` — compiled by one resolver into
provider-specific dispatch args (Codex → effort variants, Claude → Task `model`, with
`fable` topping `CLAUDE_TIER_ORDER`). That contract assumes each provider is a **single
model family** with one ordered axis.

This project extends the contract to **multi-family providers** — a single harness whose
executing model can belong to different families. Cursor (`cursor-agent`) is the first:
one CLI that runs Claude, OpenAI/GPT, Cursor's own Composer, and other families (e.g.
GLM). The spine is **model identity and family-aware dispatch**, not "Cursor ceiling
support"; Cursor is just the first provider that makes the identities below diverge.

**Core goal: switching providers mid-implementation must not break behavior.** The
abstract tier vocabulary (`economy/balanced/high/frontier`) is the portability contract:
a project says "high" and that means something for Claude, for Codex, and for Cursor —
whichever harness is active when a dispatch happens. Resolution is therefore
**per-dispatch** (never cached per-project), and producer identity is **per-artifact**
(different phases may be produced by different harnesses/models).

Two concerns sit on a shared identity foundation, joined at exactly one seam — producer
identity:

- **Implementation cross-model** — _absolute, preference-driven_ ("use X"): choose the
  producer model per task tier. Per-tier model/effort selection already shipped for
  single-family harnesses; the new part is **cross-family routing** and its
  generalization, **cross-harness routing**.
- **Gate cross-model** — _relational, producer-derived_ ("use not-X's-family"): choose a
  reviewer that differs from whoever produced the artifact. A same-family gate is
  redundant with the automatic phase review — going cross-model is the point of gates.

## Model Identity Model

Identity is the organizing concept. Five roles, attached to dispatch **events** so a
gate can know who produced the artifact it reviews:

- **CurrentIdentity** — model/family running the orchestration harness.
- **ProducerIdentity** — model/family used for a specific implementation/fix dispatch.
- **ReviewerIdentity** — model/family selected for a gate/review.
- **DispatchPreference** — the user's preferred default family/model per tier.
- **EscalationProfile** — the ordered allowed targets for higher-risk work.

Load-bearing principle: **gates diversify from `ProducerIdentity`, not
`CurrentIdentity`.** Today these coincide (producer = orchestrator), which is why the
shipped runtime-avoidance works; with cross-model implementation (orchestrate on Opus,
produce on Composer) — and with mid-project harness switches — they diverge, and gate
avoidance keyed on the orchestrator is wrong.

### Producer-Identity Stamp (built here — the parent shipped without it)

The parent's plan predated this decision and shipped **no** stamp; the interface this
design previously assumed does not exist, so the stamp is **phase 1 work in this
project**. It is cheaper than it sounds: the parent's own run already writes per-dispatch
"Dispatch Notes" lines into `implementation.md` orchestration runs (e.g. `Dispatch: p01
implementation used model_axis=inherited, effort_axis=selected:high,
dispatch_ceiling=xhigh`). Those lines record the **selection decision** but not the
**resolved identity** — `inherited` hides which model actually ran. The stamp work is to
formalize these lines into stable, parseable records that include the resolved concrete
identity, plus a reader.

**Provenance is a first-class field.** Producer identity is not binary present/missing:

- `declared` — OAT pinned the target and passed it to the harness. Authoritative
  **only if** the harness rejects bad values rather than silently falling back.
- `observed` — the harness or subagent reported what actually ran (init-event `model`
  field, subagent report echo, or **persisted harness session metadata** — Codex rollout
  JSONL under `~/.codex/sessions` carries machine-readable model + effort fields per
  turn, live-verified 2026-07-07). A cross-check, not proof; agent **prose** self-report
  is never more than `observed`.
- `inferred` — OAT read config or probed current state (`cli-config.json`,
  `--list-models (current)`, orchestrator self-knowledge of its session model).
- `unknown` — no reliable identity.

Reliability by dispatch path: Claude Task with `model` arg, Cursor `--model <slug>`,
and `codex exec --model <model>` are `declared` by construction; Codex pinned variants
declare effort (model is `inferred` from codex config unless `--model` was also
passed, with session metadata as the `observed` cross-check); inherited/unpinned
dispatches are at best `observed`/`inferred`. No harness exposes an ambient identity
env var (live-verified 2026-07-07: Cursor has only `CURSOR_AGENT=1`, Codex only
`CODEX_THREAD_ID`/`CODEX_CI` — no `CURSOR_MODEL`/`CODEX_MODEL`). Two specific failure modes: (1) **silent fallback on invalid
slug** would make a `declared` stamp lie — characterizing this empirically is a
**blocking** kickoff item (if fallback is silent, pre-dispatch validation is mandatory
and the init-event echo becomes the post-dispatch truth check); (2) **mid-session model
switches** of the orchestrator make self-reported identity stale — orchestrator
self-knowledge is never `declared`.

Consumption rules: the **high-confidence path is `declared` corroborated by `observed`**
(the harness/subagent echo matches what OAT requested). `declared` alone qualifies as
high-confidence only for harnesses with _proven_ reject-don't-fallback behavior; for
Cursor, until invalid-`--model` behavior is characterized, uncorroborated `declared` is
treated as medium confidence. On a declared/observed **mismatch**, the observed value
wins for gate purposes (it reflects what actually ran) and the mismatch is flagged
loudly. `observed`/`inferred` alone are usable with lower-confidence logging; on
`unknown`, OAT cannot truthfully claim family diversity and must say so.

## Architecture

Keep the parent's layering (persisted policy → resolver → provider adapters) and add a
shared identity/matrix foundation plus the two concerns.

1. **Model-identity primitive (shared).** Resolves identity per dispatch with strict
   precedence: declaration (launcher/OAT-stamped) → observation (harness/subagent
   report) → inference (config read / probe) → `unknown`. No `CURSOR_MODEL` env var
   exists (`CURSOR_AGENT=1` is presence-only), so Cursor identity must be stamped,
   observed, or probed. The three probe sources were **live-verified 2026-07-07** and
   can **mutually disagree on the same machine at the same time**, so the helper needs a
   documented priority:
   1. `cursor-agent --list-models` `(current)` marker — fastest, slug-shaped, closest
      to dispatch truth (returned `composer-2.5`).
   2. Init-event probe (`cursor-agent -p --output-format stream-json --trust "ok" |
head -1 | jq -r '.model'`) — ~1–3s, returns a **display name**, not a slug
      (returned `Composer 2.5 Fast`).
   3. `~/.cursor/cli-config.json` `.model` — the configured default, which is not
      necessarily the active session model.
      All three are `inferred`-tier provenance; exact-match-or-degrade applies across
      them.

2. **Family classifier (shared).** Maps a model string to a family bucket via a
   pattern-based, extensible map (`claude | openai | composer | glm | …`) with
   degrade-to-`unknown`. The family set is open-ended. This is the one sanctioned,
   tested exception to the ecosystem's "opaque model ids" principle — never a silent
   inference. Note the GPT 5.6 (sol/terra/luna) horizon: if OpenAI ships named models
   with per-model effort, **Codex itself becomes multi-family-ish**, so per-family axis
   shapes live here in the shared foundation, not in Cursor-specific code.

3. **Tier matrix (layered config).** See Data Models. The resolver joins persisted
   policy + the matrix + identity into dispatch args at each dispatch, against the
   active harness.

4. **Resolver + adapters.** Codex → effort variants; Claude → Task `model`; Cursor →
   `--model` slug (flat slugs are the transport format; the matrix and classifier carry
   the semantics).

**Value precedence for a tier's concrete value:** (1) an explicit matrix value at any
config layer wins verbatim — no detection; (2) interactive **prompt-and-persist** fills
a hole (ask once, write the answer into the appropriate config layer — the parent's
unresolved-ceiling pattern); (3) `inherit` mode selects nothing. Detection is never on
the critical path when intent is expressed — this is what makes "use Composer 2.5 as
Balanced even while orchestrating on Opus/GPT" work with zero detection, and what makes
a mid-project switch to Codex re-resolve "balanced" through the Codex column without
breaking.

## Component Design

### Tier Matrix (Layered Config)

The matrix maps abstract tiers to concrete per-provider values, and lives in **layered
config** — not project state — precisely so it survives harness switches and is
editable any time: user defaults (`~/.oat/config.json`) < repo (`.oat/config.json` /
`.oat/config.local.json`) < project-level override. Project state stores only the
abstract policy selection. Illustrative (values are examples, not recommendations):

```yaml
providers:
  cursor:
    {
      economy: 'composer-2.5',
      balanced: 'glm-5.2',
      high: 'gpt-5.5-high',
      frontier: 'fable-5',
    }
  claude:
    {
      economy: 'haiku-4.5',
      balanced: 'sonnet-5',
      high: 'opus-4.8',
      frontier: 'fable-5',
    }
  codex:
    {
      economy: 'gpt-5.4-mini',
      balanced: 'gpt-5.5-medium',
      high: 'gpt-5.5-high',
      frontier: 'gpt-5.5-xhigh',
    }
```

Notes: a tier cell may be **cross-family** (`cursor.frontier: fable-5` is natural — a
harness column has no "native family"); a cell may also be an **ordered route** (floor →
escalation targets) per Concern 2. Existing shipped shapes remain readable: bare
`providers.codex`/`providers.claude` ceiling values stay valid as capped single-axis
input; the matrix extends `providers.*` rather than introducing a third parallel shape.

**Recommended default matrix (adopt-time template).** OAT ships a recommendation the
user **explicitly adopts** (an init command copies it into their chosen config layer) —
not an ambient default that changes behavior when OAT updates it. Adoption validates
every cell against the provider oracles and stamps the recommendation version so drift
is detectable (doctor can note a newer recommendation) without being coercive.

### Validation (native oracles, no curated catalog)

OAT never owns the authoritative model list. Each provider class has a native oracle:
Claude → the closed registry enum (`haiku/sonnet/opus/fable`); Codex → the closed effort
enum + pinned-variant files existing on disk; Cursor → the live `cursor-agent models` /
`--list-models` account catalog. One oracle, reused at five checkpoints:

1. **Adopt-time** — validate the template against the account; warn per cell.
2. **Set-time** — `oat config set` warns on unknown values; if the oracle is
   unavailable (CLI not installed), mark the cell _unvalidated_, not invalid.
3. **Doctor** — a dispatch-matrix check re-validates configured cells, catching drift
   (a model removed from the account/catalog after it was configured). WARN, naming the
   exact cell and config layer.
4. **Preflight** — validates only the cells the run will use; holes trigger
   prompt-and-persist.
5. **Dispatch-time backstop** — cell-naming errors on rejection, plus the subagent
   report echo as an `observed` cross-check on what actually ran.

### Multi-Family Provider Adapter (Cursor)

A `cursorAdapter` in the ceiling registry (`packages/cli/src/providers/ceiling/registry.ts`),
satisfying `bl-c3d8`: `supportsCeiling: true`, `mechanism: 'model-arg'`,
`compileToDispatchArgs → { model }`, dispatched as `cursor-agent -p --model <slug>` (a
fresh headless subprocess per dispatch — so OAT is not bound to the session's family).
Valid values are matrix slugs validated against the availability oracle, not a hardcoded
tier enum. **Verify-on-upgrade: not-applicable** — cross-family Cursor has no total
order (`bl-c3d8` permits documenting N/A).

### Concern 1 — Family-Aware Gate Avoidance

Shipped state: the built-in `cursor-default` target pins **no `--model`**
(`oat-config.ts`), so gates inherit the user's `~/.cursor/cli-config.json` default — the
root cause of "the gate ran the producer's model." Gate resolution already supports an
**ordered preference walk**: `avoid: 'same-runtime' | 'none'` (default `same-runtime`)
filters candidates, then priority order + availability checks pick the winner; users can
already define multiple custom targets, including Cursor targets with pinned models.
That machinery works for native harnesses **only because each native runtime is
single-family** — runtime-avoidance is family-avoidance by accident, and it is
wrong-shaped for Cursor in both directions (it excludes intra-Cursor different-family
targets, and it admits a codex-GPT reviewer for GPT-via-Cursor-produced work).

The upgrade is a small delta on existing machinery, not a new subsystem:

- **Extend the avoid enum** with `same-family` (and optionally `same-model`). The
  candidate walk, priorities, and availability checks are reused as-is; `--avoid none`
  remains the escape hatch.
- **Give avoidance its two missing inputs:** each candidate target's family (derived
  from its pinned `--model` via the classifier; single-family runtimes are free) and
  the **producer's** family (from the stamp, per-artifact — a gate over p02–p03
  diversifies against each phase's producer).
- **Default change, done in the open:** `same-family` becomes the shipped default of
  the existing overridable knob (there is precedent — `same-runtime` is already an
  opinionated default). Note it loudly in release notes; record the **achieved** level
  on every gate outcome (`different-family` / `degraded-to-different-slug` /
  `same-family — no diverse target available` / `unknown-producer`) so degradation is
  auditable, never silent.
- **Confidence follows stamp provenance:** the high-confidence path is
  `declared`+`observed` corroboration; uncorroborated `declared` is medium for Cursor
  until reject-don't-fallback is proven; lower-confidence logging on
  `observed`/`inferred` alone; on `unknown`, run but state that family diversity cannot
  be truthfully claimed.
- **No engineering around single-family accounts.** If no diverse family is available,
  warn and run (flagged). Keep the shipped "no fallback after dispatch" rule: diversity
  selection is pre-dispatch only.

### Concern 2 — Multi-Family Implementation Routing

`DispatchPreference` sets the default/floor producer per tier; `EscalationProfile` is
the ordered route above it. For a multi-family harness a tier's value may be an
**ordered list of targets** (floor → escalation), because families share no total
order — escalation is a **discrete jump** between named points, not `min()` over an
enum. ("Ceiling"/`min()` remain valid for single-axis providers.)

**Escalation triggers reuse existing machinery** (resolved — no new trigger concept):
the plan's **Dispatch Profile** rows choose the starting point in the route per phase,
and the existing fix-loop/retry machinery (`oat_orchestration_retry_limit`) advances
along the route on repeated review failure.

**Cross-harness as the general form.** A tier maps to a dispatch target `(harness,
model, effort)`. The dispatch layer chooses a native subagent when the harness matches
and an exec-command (the existing gate cross-provider-exec plumbing) when it does not —
unifying "Cursor switches `--model`" and "a Claude orchestrator runs `codex exec
gpt-5.5 xhigh`". Bake `(harness, model, effort)` into the data model now; implement
Cursor-native + same-harness first; defer cross-harness-exec for single-family harnesses
(it depends on the target CLI exposing an exec/`-p` entry).

## Data Models

- **Abstract policy** stays in project state (shipped `dispatchPolicy` shape).
- **Tier matrix** lives in layered config, extending `providers.*`: a cell is a bare
  slug, a per-tier map, or an ordered route whose entries are bare slugs (same harness)
  or `(harness, model, effort)` objects.
- **Dispatch events** carry identity: producer stamp (resolved value + provenance),
  reviewer identity, achieved-diversity level. Primary persistence: formalized Dispatch
  Notes in `implementation.md` orchestration runs (exact format at plan time; commit
  trailers remain an alternative).
- Migration safety (inherited from the parent): absent matrix/policy state is never
  silently reinterpreted; existing bare provider ceiling values remain readable.

## API Design

Reuse the parent resolver CLI; add identity/role inputs:

```bash
oat project dispatch-ceiling resolve \
  --provider cursor \
  --role <implementer|reviewer> \
  --preferred <slug-or-tier> \
  --producer-identity <value+provenance, optional> \
  --json
```

- `selection` states which precedence branch produced `selectedValue`
  (`matrix-pinned | prompt-persisted | escalation-target | inherit`), the classified
  family (or `unknown`), and — for reviewers — the diversity decision: producer family
  - provenance, chosen reviewer family, achieved level, what constrained it.
- One internal helper (e.g. `oat internal cursor-current-target`, per `bl-e6fc`) owns
  probe + classify so skills and gate resolution share one implementation.

## Error Handling

- **Identity failure → explicit `unknown`,** honest logs, never a claimed enforced tier
  or claimed diversity.
- **Slug-vs-variant gotcha** (`bl-e6fc`, **live-confirmed 2026-07-07**): on one
  machine simultaneously, `--list-models (current)` reported `composer-2.5` while
  config/display showed the fast variant (`composer-2.5-fast` / `Composer 2.5 Fast`).
  Exact-match-or-degrade; no auto-normalization.
- **Invalid/unavailable `--model`:** empirical characterization is **blocking** (see
  stamp section) — silent fallback corrupts `declared` stamps and mandates
  pre-validation + observed echo.
- **Frontier under any harness:** advisory, not enforced, when the account cannot honor
  it.
- **Gate integrity:** keep "no fallback after dispatch"; diversity selection is
  pre-dispatch only.

## Phasing

1. **Shared foundation** — producer-identity stamp (formalize Dispatch Notes; four-tier
   provenance; reader) + family classifier + layered tier matrix + oracle validation +
   adopt-time recommended template.
2. **Family-aware gate avoidance** — `avoid: same-family`, producer-anchored via the
   stamp, achieved-diversity metadata. Small, shippable first.
3. **Multi-family implementation routing** — DispatchPreference + EscalationProfile
   routes with `(harness, model, effort)` targets, escalation via Dispatch Profile +
   retry hooks. Larger; revisit after GPT 5.6.

## Open Questions (resolve before/at plan)

- **Project-layer matrix location:** a project `config.json` (new file concept) vs
  `state.md` frontmatter (where `oat_dispatch_ceiling` lives today)?
- **Intra-target avoidance representation:** virtual Cursor targets
  (`cursor-composer`/`cursor-gpt`) vs exec targets gaining a model dimension
  (`(target, model) → family`)?
- **Stamp record format:** exact parseable shape of formalized Dispatch Notes lines.
- **Detection without a declaration path:** is probe-only acceptable for Cursor
  identity given latency and the undocumented `(current)` marker?
- **`same-family` default rollout:** ship as default immediately (bug-fix framing for
  multi-family targets) or per-target opt-in for one release?

## Testing Strategy

- Matrix/precedence: layered override order; explicit cell beats prompt-persisted beats
  inherit; cross-family cells; ordered routes select floor then escalation target;
  mid-run provider switch re-resolves the same tier through the new column.
- Stamp: each provenance tier produced by its dispatch path; `inherited` records
  resolved identity; subagent echo mismatch flags; reader parses formalized notes.
- Classifier: representative slugs per family incl. non-big-three (GLM);
  degrade-to-`unknown`; slug-vs-variant exact-match-or-degrade.
- Gates: `same-family` filters correctly both directions (intra-Cursor allowed,
  cross-runtime same-family blocked); producer-anchored per-artifact; achieved level
  recorded; `unknown` producer → honest non-claim; `--avoid none` still works; priority
  walk unchanged.
- Validation: oracle per provider class; unvalidated≠invalid when oracle absent; doctor
  drift check; adopt-time template validation + version stamp.
- Migration/compat: existing bare provider values resolve; absent state never silently
  managed; skill/docs + `pnpm release:validate` (bundled surfaces are shipped).

## Revalidation Checklist (run at kickoff, in the implementation worktree)

- [x] Re-read the shipped `model-dispatch-improvements` code (done 2026-07-06: shapes
      confirmed — `dispatchPolicy {mode, policy}` + legacy ceiling providers; `fable` in
      tier order; **no producer stamp shipped** → stamp is phase 1 here). Re-confirm at
      kickoff against the merged main.
- [x] ~~Re-verify the Cursor CLI probe surface against the live binary~~ (done
      2026-07-07 from a live Cursor session: `(current)` marker exists and is
      slug-shaped; init-event `model` is a display name; cli-config `.model` is the
      default, not the active model; the three sources can disagree simultaneously; no
      `CURSOR_MODEL` env var). **Still outstanding:** whether `--model` accepts slugs
      only or also display names, and the `cursor-agent models` subcommand surface.
- [ ] **Blocking:** characterize invalid/unavailable `--model` behavior empirically
      (error vs silent fallback) — determines whether `declared` stamps need mandatory
      pre-validation + observed echo.
- [ ] Confirm a reliable declaration path exists for Cursor identity; else decide
      probe-only acceptability.
- [ ] Confirm gate avoidance still ships `same-runtime|none` and decide the intra-target
      representation.
- [ ] Settle the remaining open questions (matrix project-layer location, stamp format,
      `same-family` rollout).
- [ ] Re-examine GPT 5.6 (sol/terra/luna): if Codex gains named models × efforts,
      confirm the per-family axis-shape foundation holds.

## References

- Parent (shipped): `.oat/projects/shared/model-dispatch-improvements/` (design,
  summary, and the Dispatch Notes convention in its `implementation.md`)
- Discovery: `discovery.md`
- `bl-c3d8` — third-provider dispatch-ceiling adapter (Cursor)
- `bl-e6fc` — gate same-target/cross-target execution (Cursor probe, declaration-first)
- Adapter registry: `packages/cli/src/providers/ceiling/registry.ts`
- Gate avoidance: `packages/cli/src/commands/gate/index.ts`
- Built-in Cursor target: `packages/cli/src/config/oat-config.ts` (`cursor-default`)
