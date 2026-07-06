---
oat_status: complete
oat_ready_for: oat-project-plan
oat_blockers: []
oat_last_updated: 2026-07-06
oat_generated: false
---

# Discovery: multi-family-dispatch

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

> Note: several grounded code references appear below (registry paths, the gate
> avoidance default, the built-in Cursor target). They are recorded as _evidence for
> decisions_, not as a deliverable list, and must be re-verified at kickoff — see
> `design.md` Revalidation Checklist.

## Initial Request

`model-dispatch-improvements` reframed OAT dispatch as an explicit policy
(`Economy / Balanced / High / Frontier / Uncapped / Inherit Host Defaults`) compiled by
one resolver into provider-specific dispatch args, with adapters for Codex (effort
variants) and Claude (Task `model` arg). That contract assumes each provider is a
**single model family** with one ordered axis.

This project extends the contract to **multi-family providers** — a single provider
(harness) whose executing model can belong to different families. Cursor (`cursor-agent`)
is the first: one CLI that can run Claude models, OpenAI/GPT models, and Cursor's own
Composer models. The request is explicitly to reframe the work around **model identity
and family-aware dispatch**, not "Cursor ceiling support." Tracked by backlog items
`bl-c3d8` (third-provider dispatch-ceiling adapter) and `bl-e6fc` (gate cross-target
execution).

The concrete pains that motivated it:

1. A Cursor dispatch ceiling currently resolves to `advisory` because no adapter is
   registered for Cursor — the ceiling records intent but is never enforced.
2. When a user runs Cursor on a given model, gate reviews inherit that same model, so a
   "gate" ends up reviewing the producer's own model — no independence.

## Clarifying Questions

### Question 1: Relationship to `model-dispatch-improvements`

**Q:** Should multi-family / Cursor complexity extend the parent project, or be kept separate?
**A:** Keep it separate. The parent stays scoped to provider-neutral, single-axis dispatch policy (Codex effort, Claude model). Do not backflow Cursor/multi-family semantics into it.
**Decision:** Separate project. The **only** thing that lands in the parent is a minimal, semantics-free **producer-identity stamp** on dispatch events (decision "B" — see Question 8). That stamp is the interface between the two projects and lets the parent ship now while this project is revisited after GPT 5.6.

### Question 2: Reframe — identity, not "Cursor ceiling support"

**Q:** Is this "add a Cursor adapter," or something broader?
**A:** Broader. Distinguish model identities clearly: the model running the orchestration harness, the model that produced a given implementation/fix, and the model selected for a gate/review. Model identity should attach to dispatch **events**, because gates need to know who produced the artifact they review.
**Decision:** Make model identity the spine. Name five roles: `CurrentIdentity` (orchestration harness), `ProducerIdentity` (a given implementation/fix dispatch), `ReviewerIdentity` (a gate/review), `DispatchPreference` (user's preferred default family/model for implementation), `EscalationProfile` (ordered allowed targets for higher-risk work). Cursor is the first provider that makes these identities diverge.

### Question 3: Two concerns — cross-model for implementation vs cross-model for gates

**Q:** Are "cross-model implementation" and "cross-model gates" the same feature?
**A:** No — they are different kinds of decision and must be separated.
**Decision:** Two distinct concerns joined only at producer identity:

- **Implementation cross-model** is _absolute_ and _preference-driven_ ("use X"): the user/policy picks the producer model per task tier. Opt-in optimization/routing. (Note: selecting model/effort per tier already exists today for single-family harnesses — claude→sonnet/opus, codex→medium/high/xhigh. The genuinely new part is _cross-family_ routing under one harness.)
- **Gate cross-model** is _relational_ and _producer-derived_ ("use not-X's-family"): the reviewer is chosen by avoiding whatever produced the artifact. Always-on independence invariant, because a same-family gate is redundant with the automatic phase review.

### Question 4: Does explicit user intent or detection win?

**Q:** If a user says "use Composer 2.5 for Balanced even when I'm running GPT/Opus," should that depend on detecting the current family?
**A:** No. Explicit user intent must win. Detection is only a fallback/default generator.
**Decision:** Precedence for a policy rung's concrete value: (1) explicit user-pinned value wins verbatim, no detection; (2) family-detected default only when unpinned; (3) inherit (select nothing) when the policy mode is inherit. The dispatch provider need not equal the orchestrator provider.

### Question 5: How to represent cross-family preferred/ceiling

**Q:** Is a cross-family cap a `min(preferred, ceiling)` operation?
**A:** No. Composer and GPT/Claude families do not share a total order, so `min()` and "escalate up the rungs" are undefined across families.
**Decision:** For multi-family harnesses, drop "ceiling" as the primitive and model it as an explicit **ordered route / profile**: a default/floor plus allowed escalation targets, with escalation as a **discrete jump** between named points. "Ceiling" + `min()` remain valid only for single-axis providers.

### Question 6: What does gate "diversity" mean, and is it always on?

**Q:** Different slug, different family, or configurable? And required or opt-in?
**A:** Always cross-model, ideally cross-family — Claude should never review Claude, GPT never review GPT. `gpt-5.5-xhigh` reviewed by `gpt-5.5-medium` is technically a different target but not real independence. If the account only has one family, configuring a cross-model gate is pointless — that is on the user.
**Decision:** Gate diversity target is **different family**, always on by default. `different-slug` is only an insufficient floor. No graceful-degradation ladder is built for single-family accounts: if no diverse family is available, warn and run (flagged non-independent) — do not engineer around a single-family environment.

### Question 7: Why do gates work today but break under Cursor?

**Q:** Don't the gate mechanics already do cross-model for Claude/GPT?
**A:** Yes — for the native harnesses. Cross-family gates work today because a gate can be defined to run via a different binary (`codex exec` / `claude -p`), and each binary is single-family. Cursor is different: you want to stay on `cursor-agent` and pass a different `--model`.
**Decision:** Two grounded facts frame the fix. (a) `commands/gate/index.ts` already defaults cross-provider avoidance to `same-runtime` and filters targets whose runtime equals the current runtime — so for native single-family runtimes, runtime-avoidance is family-avoidance _by accident_. (b) Cursor is the first runtime where runtime ≠ family, breaking that coincidence in both directions (a cursor-GPT producer avoided at runtime level can still get a codex-GPT reviewer = same family). The gate fix therefore adds a **new axis: intra-target model variation** — diversity by `--model` within one exec target, not only by switching exec targets — which requires the family classifier.

### Question 8: Producer identity must persist on dispatch events

**Q:** Where does "who produced this" live so a gate (possibly in another session) can read it?
**A:** It must be stamped at production time; gates read the stamp rather than guessing.
**Decision:** Adopt declaration-over-introspection (the `bl-e6fc` principle) one layer up: producer identity is **stamped onto dispatch events** durably. The parent project ships a minimal, semantics-free version of this stamp now (records the producer model/family string, no policy logic); this project consumes it. Without persisted producer identity, producer-anchored gate diversity does not survive a session boundary.

### Question 9: Availability vs semantics; the config shape

**Q:** Can `cursor-agent models` / `--list-models` define what Economy/Balanced/High/Frontier mean?
**A:** No. A live model list only validates what is _available_ locally. OAT still needs its own curated classification and rung mapping. Separately, users need a way to say which models/effort they want per task tier — likely harness-specific default config trees plus per-project override configs.
**Decision:** Separate **availability** (live query, validation only) from **semantics** (curated). The config surface is a **per-harness default tree** (tier → model/effort, or an ordered route) with layered **per-project overrides** (harness default < project override < local/user). That tree _is_ the curated semantic catalog for the harness; the live model list only checks that the tree's slugs are available.

### Question 10: Future-proofing for GPT 5.6-style families

**Q:** Is Cursor forever a flat slug list?
**A:** Not necessarily. If OpenAI introduces sol/terra/luna or families with their own effort levels, the flat-slug assumption breaks.
**Decision:** Use flat slugs as the **transport format** to `cursor-agent --model`, but keep an internal **semantic catalog** mapping `slug → provider family → rung/effort shape`. Structure per-family values so a family can later declare its own axis shape (bare slug now, `{model, effort}` later) without a schema break — the same "one resolver, multiple axis shapes" pattern the parent already uses across Codex and Claude. Revisit after GPT 5.6 releases.

### Question 11: Cross-harness implementation

**Q:** Should implementation be able to dispatch a _different harness_ (e.g., a Claude orchestrator using `codex exec gpt-5.5 xhigh` for its High tier)?
**A:** Worth designing through that lens. Cursor does cross-family natively (switch `--model`); single-family harnesses would do it by switching the binary, the way gates already do. Possibly a separate concern.
**Decision:** Treat it as the **general form** of implementation routing, not a separate feature: a tier maps to a dispatch target `(harness, model, effort)`, and the dispatch layer chooses a native subagent when the harness matches and an exec-command (the existing gate cross-provider-exec plumbing) when it does not. Bake `(harness, model, effort)` into the routing data model now; implement Cursor-native + same-harness first; defer cross-harness-exec for single-family harnesses to a later phase (it depends on the target CLI exposing an exec/`-p` entry).

### Question 12: Project structure

**Q:** One project or two?
**A:** One project — the concerns are separable but share the same foundation (family classifier + semantic catalog), and splitting would fragment ownership of the catalog.
**Decision:** One project, three phases: (1) shared foundation — family classifier + harness-tree/catalog + consume the producer stamp; (2) family-aware gate avoidance (small, shippable first); (3) multi-family implementation routing (larger, revisit post-GPT-5.6).

## Solution Space

### Approach 1: Model-identity layer + family-aware dispatch _(Recommended, chosen)_

**Description:** Introduce a shared model-identity primitive (Current/Producer/Reviewer identities + a family classifier + a curated harness-tree catalog), then layer two consumers on it: family-aware gate avoidance and multi-family implementation routing. Cursor is the first instantiation; the spine is provider-neutral.

**When this is the right choice:** When the goal is durable, provider-neutral family-aware dispatch and independent gates — not a one-off Cursor port.

**Tradeoffs:** Larger than a bare adapter; introduces a family classifier that deliberately (and only here, as a tested heuristic) breaks the ecosystem's "opaque model ids" principle; depends on a reliable producer-identity stamp.

### Approach 2: Cursor ceiling adapter only (advanced/manual slugs)

**Description:** Register a Cursor adapter that accepts explicit, user-named model slugs via advanced/manual selection; no detection, no presets for Cursor. Satisfies `bl-c3d8`'s acceptance criteria and removes the "unsupported" state.

**When this is the right choice:** If the only goal were to make Cursor `enforced` and the user always names exact slugs.

**Tradeoffs:** Does not deliver family-aware presets, producer-anchored gates, or cross-family routing — i.e., it leaves the actual pains (gate independence under Cursor, "Balanced under Cursor") unsolved. Kept as the minimal fallback / first slice inside Approach 1.

### Approach 3: Backflow multi-family into `model-dispatch-improvements`

**Description:** Extend the parent project to handle Cursor and multi-family directly.

**When this is the right choice:** Never chosen — rejected.

**Tradeoffs:** Couples a hard, still-evolving problem (multi-family, GPT 5.6 uncertainty) to a bounded cleanup that is ready to ship, and violates the "keep the parent single-axis" constraint.

### Chosen Direction

**Approach:** Approach 1, delivered as one project in three phases, with Approach 2 as the first, minimal slice.
**Rationale:** It solves the real pains (gate independence under Cursor; family-aware "Balanced"), keeps the parent clean, and future-proofs for GPT 5.6 via the semantic catalog.
**User validated:** Yes — the user confirmed the two-concern split, the one-project/three-phase structure, decision "B," and the always-cross-family gate rule across the discovery conversation.

## Options Considered

### Option A: Producer-identity source — declaration vs probe

**Description:** How OAT learns the current/producer model. Declaration = a launcher-stamped value (preferred). Probe = read `cursor-agent --output-format json` init event `model` field (a display name, not a slug) or `cursor-agent --list-models` `(current)` marker.

**Pros (declaration):** Reliable, cheap, survives session boundaries. Matches `bl-e6fc`.
**Cons (probe):** `(current)` marker is undocumented; ~1.5–3s latency per probe; init `model` is a display name needing normalization; slug-vs-variant gotcha (`composer-2.5` reported vs `composer-2.5-fast` dispatched); no `CURSOR_MODEL` env var exists.

**Chosen:** Declaration-first, probe as best-effort fallback, explicit `unknown` otherwise. Automatic cross-model gates degrade to the manual-pin fix when identity is unavailable.

### Option B: Gate diversity level — slug vs family vs configurable

**Description:** How different a reviewer must be from the producer.

**Pros/Cons:** `different-slug` is weak (same family grading itself); `different-family` is real independence; fully-configurable-with-no-default reproduces today's bug by default.

**Chosen:** `different-family` default, always on; record the _achieved_ level as structured metadata on the gate outcome (`different-family` / `degraded-to-different-slug` / `none-available`) so degradation is auditable, not silent; explicit gate config overrides.

### Option C: Cross-harness implementation now vs deferred

**Description:** Build cross-harness exec for single-family harnesses now, or later.

**Chosen:** Model the data as `(harness, model, effort)` now; implement Cursor-native + same-harness first; defer cross-harness-exec (single-family harnesses invoking another harness) to a later phase. Reuses the gate cross-provider-exec plumbing when built.

## Key Decisions

1. **Separate project; parent stays single-axis.** Only a minimal, semantics-free producer-identity stamp lands in `model-dispatch-improvements` (decision "B").
2. **Model identity is the spine.** Current / Producer / Reviewer identities + DispatchPreference + EscalationProfile; identity attaches to dispatch events.
3. **Two separated concerns.** Implementation cross-model (absolute, preference-driven, opt-in) vs gate cross-model (relational, producer-derived, always-on), joined only at producer identity.
4. **Explicit intent > detection > inherit.** Detection is a default generator, never on the critical path when the user pinned a value.
5. **Ordered route, not `min(preferred, ceiling)`** for multi-family; escalation is a discrete jump. "Ceiling"/`min()` stays for single-axis providers only.
6. **Gate diversity = different family, always on;** structured achieved-diversity metadata; single-family account is the user's problem (warn, no degrade ladder).
7. **Gate diversity gains a new axis:** intra-target `--model` variation, not only exec-target switching.
8. **Availability vs semantics separated;** curated per-harness tree (tier → model/effort/route) + layered project overrides is the semantic catalog. Live model lists validate availability only.
9. **Flat slugs are transport; internal semantic catalog** maps slug → family → rung/effort shape. Future-proof for GPT 5.6 per-family effort.
10. **Cross-harness implementation is the general form:** tier → `(harness, model, effort)` target; reuse gate exec plumbing; Cursor-native first, cross-harness-exec later.
11. **One project, three phases:** shared foundation → gate avoidance → implementation routing.
12. **Family classification is an explicit, tested heuristic** that intentionally and locally overrides the "opaque model ids" principle — never a silent inference.

## Constraints

- Do not backflow multi-family semantics into `model-dispatch-improvements`; the parent's only addition is the semantics-free producer-identity stamp.
- Explicit user intent always wins over detection.
- Gate diversity is on by default and targets a different family; never silently pass a same-family review.
- Curated semantics own tier meaning; live model lists are availability checks only.
- Producer identity must be persisted on dispatch events to survive session boundaries.
- Reuse the existing exec-target / cross-provider-exec plumbing rather than inventing parallel dispatch machinery.
- Honor the ecosystem's model-id opacity everywhere except the one explicit family classifier.
- Do not weaken gates: keep the shipped "no fallback after dispatch" rule (diversity selection is pre-dispatch only).

## Out of Scope

- Cross-harness-exec implementation for single-family harnesses (later phase / follow-on; depends on the target CLI exposing an exec/`-p` entry).
- A complete GPT 5.6 (sol/terra/luna) semantic catalog by name until the provider exposes concrete values; only leave room for it.
- Graceful-degradation machinery for single-family / single-provider accounts.
- Claude effort pinned variants (inherited out-of-scope from the parent).
- Any change to the parent's policy semantics beyond consuming its producer-identity stamp.

## Success Criteria

- Cursor resolves as an `enforced` (not `advisory`) dispatch provider via a registered adapter, with correct dispatch args.
- Gate reviews under Cursor select a different-family reviewer than the producer by default, with the achieved diversity level recorded; the current same-model-inheritance behavior is reproduced in a test and fixed.
- A user can pin a per-tier model for a harness (e.g., Composer 2.5 as Balanced) and have it used verbatim regardless of the orchestrator's family — no detection required.
- Cross-family implementation routes (floor + escalation targets) are expressible as ordered routes and dispatch correctly.
- The routing data model expresses `(harness, model, effort)` targets so cross-harness-exec can be added later without a schema break.
- Detection is declaration-first with an honest `unknown` fallback; nothing claims an enforced tier it could not verify.
- The semantic catalog (slug → family → rung) is curated and owns tier meaning; live model lists are used only to validate availability.

## Deferred Ideas

- Cross-harness-exec implementation for single-family harnesses (Claude orchestrator dispatching `codex exec`, etc.).
- Concrete GPT 5.6 sol/terra/luna rung/effort catalog entries once the provider exposes them.
- Per-phase plan tagging as an escalation trigger (see Open Questions).

## Open Questions

- **Escalation trigger:** Does "escalate when it needs it" reuse the existing implicit escalation (repeated review-failure bumps the implementer) or a new per-phase plan tag? Resolve before planning.
- **Producer-identity persistence location:** commit trailer vs `implementation.md` dispatch log vs state — where is the stamp written and read?
- **Intra-target avoidance representation:** multiple virtual Cursor targets (`cursor-composer` / `cursor-gpt` / `cursor-claude`) that avoidance ranges over, vs exec targets gaining a model dimension so avoidance reasons over `(target, model) → family`.
- **Harness-tree home:** is the per-harness tree config structure built in this project, or as a generalization that extends the parent's config model?
- **Cursor detection reliability without a declaration path:** if no launcher can stamp the current model, is probe-only acceptable given latency and the undocumented `(current)` marker?

## Assumptions

- The parent ships a minimal producer-identity stamp this project can consume.
- Family classification via a curated `slug → family` map is acceptable as the one sanctioned exception to model-id opacity.
- Every OAT→Cursor dispatch is a fresh `cursor-agent -p --model <slug>` subprocess, so OAT is not bound to the session's family and can dispatch a different model per phase/gate.
- The Cursor CLI facts here derive from a stale (2026-06-19) docs snapshot and must be re-verified against the live binary at kickoff.

## Risks

- **Detection unreliability.** Automatic cross-model gates depend on a trustworthy producer identity; only declaration is reliable, probes are fragile.
  - **Likelihood:** Medium · **Impact:** High
  - **Mitigation:** Declaration-first; degrade to the manual-pin gate fix; honest `unknown`.
- **Silent loss of gate independence.** Degrading to same-family/same-slug without surfacing would mask non-independent reviews.
  - **Likelihood:** Medium · **Impact:** High
  - **Mitigation:** Record achieved diversity level as structured metadata; never silently pass a same-family review.
- **GPT 5.6 changes the axis model.** OpenAI-via-Cursor gaining per-model effort would break a flat-slug assumption.
  - **Likelihood:** Medium · **Impact:** Medium
  - **Mitigation:** Flat slugs as transport + semantic catalog abstraction + explicit kickoff revalidation.
- **Scope creep via cross-harness.** The `(harness, model, effort)` generalization could balloon.
  - **Likelihood:** Medium · **Impact:** Medium
  - **Mitigation:** Phase it — data model now, Cursor-native first, cross-harness-exec later.
- **Parent/child drift.** This design grounds in the parent's _intended_ contract, not shipped code.
  - **Likelihood:** Medium · **Impact:** Medium
  - **Mitigation:** Revalidation Checklist re-reads the shipped parent at kickoff.

## Next Steps

- **Quick mode → finalize lightweight design:** sign off the revised `design.md` (identity spine, two concerns, harness-tree catalog, cross-harness generalization, three phases).
- **Quick mode → straight to plan:** generate `plan.md` once the design is signed off.
- **At kickoff:** run the design's Revalidation Checklist first — re-read shipped `model-dispatch-improvements`, and empirically re-verify the Cursor CLI surface — before writing or executing the plan.
