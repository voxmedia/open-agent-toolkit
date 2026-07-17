# Session Observer Collaboration Log — explainer-kit discovery brainstorm

- Worktree: `/Users/thomas.stang/orca/workspaces/open-agent-toolkit/explainer-kit`
- Date: 2026-07-16
- Peers: Sol = `cursor:9c6c8d28-ab96-4d8e-bde2-33d077e8c781` (Orca `term_a5407eb0-dce1-4eb1-afb7-aab6f11bb4f7`) — sole `discovery.md` writer;
  Fable = `cursor:3b327ac0-f873-4244-9b33-2ab7fec2bb30` (Orca `term_489dfa5d-63d3-4f4e-ac94-4a1930f1960a`) — collaborator, owns this log and the validation record
- Bounded task: explainer-kit discovery brainstorm per `2026-07-16-laptop-handoff.md`
- Channels: Orca orchestration messages (primary coordination) + pinned session-observer watches (transcript evidence)
- Companion record: `2026-07-16-cursor-collab-validation.md` (collab-mechanics validation, Fable-owned)

Append-only. Entries by Fable unless marked otherwise.

### [15:11] protocol — identities pinned

- **What happened:** `whoami` ambiguous for both fresh twin sessions; identities resolved by first-user-message content match. Fable armed pinned `catch-up-then-watch` on Sol; consumed Sol's orientation turn (record 7).
- **Assessment:** works-well
- **Skill implication:** content-based identity exchange is the twin-Cursor bootstrap path; details in validation record.

### [15:16] protocol — initial role assignment

- **What happened:** User (Fable session): Sol = writer, Fable = collaborator; collab log path approved; Fable owns a separate validation record.
- **Assessment:** works-well
- **Skill implication:** none.

### [15:24] protocol — pin exchange completed over Orca

- **What happened:** Sol verified real Orca terminal handles and echoed Fable's exact pin (`cursor:3b327ac0-…`); provided own pin. Direct Orca channel adopted for coordination.
- **Assessment:** works-well
- **Skill implication:** laptop topology provides real Orca handles (handoff open question resolved).

### [15:24] content — Sol's core-boundary finding (msg_111147657c3d)

- **What happened:** Sol's inspection: visual-explainer 0.8.1 external MIT (nicobailon); engineering-explainer + skeptic personal user-scope skills, no provenance metadata; ovm-gdoc-sync Thomas-authored Vault code. Core draft embeds vault/GDoc mechanics inconsistent with the generic boundary. Recommendation: self-contained core, no mandatory skill deps, visual-explainer as optional accelerator with attribution, vault/GDoc connectors out of v1 core.
- **Assessment:** works-well
- **Skill implication:** none; content position, challenged next.

### [15:29] content — Fable's independent verification + refinements (msg_26ab36d3247a)

- **What happened:** Fable re-verified all provenance claims (correct) and found the coupling worse: core draft reads `STOA_VAULT_PATH`/`~/.stoa/config.json` contradicting its own "reads NO config files" claim; ~20 vault/gdoc/ovm references; Step 7 hard-codes `gog` and personal scripts. Agreed with Sol's recommendation plus four refinements: adapt MIT patterns into core with NOTICES.md attribution (drop `visual-explainer:*` command names), inline the adversarial pass (no skeptic dep), explicit absorb/drop call for engineering-explainer patterns, no formal extension framework in v1.
- **Assessment:** works-well
- **Skill implication:** none.

### [15:32] content — user direction: personal kit must keep working (Fable session)

- **What happened:** User: "We need to ship this with a version of Personal Explainer Kit that works. It doesn't need to be in the source code, but it needs to work with whatever is in the source code." Fable relayed to Sol (msg_2ef1be64469a) and amended refinement 4: the seam becomes a hard compatibility requirement — env vars in, stable artifact tree + machine-readable manifest out, pre/post wrapper orchestration, zero vault/gog/stoa references in core.
- **Assessment:** works-well
- **Skill implication:** none.

### [15:27–15:28] protocol — Sol took discovery.md write boundary (msg_b59fbdc81d6b, msg_78d4937b7205)

- **What happened:** User (Sol session) selected the private user-scoped wrapper model over a documented generic core extension contract; Sol announced the `discovery.md` write boundary and recorded only that converged decision. Role correction: Fable owns both collaboration records (this log + validation record); Sol writes neither.
- **Assessment:** works-well
- **Skill implication:** write-boundary announcement over Orca before mutation worked as the serial-mutation rule intends.

### [15:32] gotcha — Fable's freshness claim was stale (msg_67b0c666ed43)

- **What happened:** Fable told the user "neither of us has touched discovery.md" while Sol's still-active buffered turn had already updated it. Sol corrected the record. Sol also confirmed agreement with all four Fable refinements; no formal extension shape recorded as decided.
- **Assessment:** gotcha
- **Skill implication:** with `--quiet-empty` + turn buffering, a healthy silent watcher does NOT prove peer inaction — a peer mid-turn can have already mutated the worktree. Freshness claims about shared files need a worktree check (git status/diff), not just transcript-digest silence. Correction appended here per protocol.

### [15:37] mechanics — Sol's blocking ask failed; runtime closed (Sol records 37–39)

- **What happened:** Sol's `orca orchestration ask --timeout-ms 120000` (blocking, options A/B/C) died when the Orca runtime connection closed before Fable could answer; Sol fell back to a non-blocking `send` (msg_e1f9de936d92). Fable was idle at delivery time; the messages did not wake this session — they were read on the next user-initiated turn.
- **Assessment:** friction
- **Skill implication:** blocking asks between two interactive sidebar sessions are fragile; non-blocking send + buffered-manual read is the reliable pattern. Confirms Fable's tier disclosure: no autonomous wake from Orca messages while idle.

### [15:45] content — decision gate open: Google Docs boundary (msg_4791e266574f / msg_e1f9de936d92)

- **What happened:** Sol asks Fable's independent recommendation: (A) optional gdocs lane in `oat-explainer-kit`, private wrapper keeps vault sync; (B) private wrapper only in v1; (C) generic gdocs lane stays in core. Fable's reply and rationale sent via Orca (msg_792e180312ee); recommendation: **B**, with the manifest seam keeping A available later without core changes.
- **Assessment:** works-well
- **Skill implication:** none; user decision pending.

### [15:44] protocol — power interruption; channel recovery (msg_1df8869c2824)

- **What happened:** A user-side power interruption caused two truncated Fable turns ("continue from where you left off" resumptions). Orca and both terminal handles survived/recovered; Sol confirmed recovery over the channel. Fable's pinned watcher and its background process also survived, heartbeating healthy throughout.
- **Assessment:** works-well
- **Skill implication:** both the Orca channel and a backgrounded session-observer watcher recover across a host power interruption without re-arming; pins stayed valid. Logged in the validation record as durability evidence.

### [15:44] content — DECISION: private-wrapper contract converged (msg_1df8869c2824)

- **What happened:** User confirmed the private-wrapper boundary in Sol's session. Sol is recording in `discovery.md`: stable env/argument inputs; stable artifact tree + machine-readable manifest outputs; private wrapper owns vault/GDocs/companion pre/post behavior (resolves the Google Docs gate as option **B**, matching Fable's recommendation); no plugin registry or mid-workflow hooks absent evidence; in-repo compatibility fixture/check plus external end-to-end wrapper verification before release. Fable does not edit `discovery.md`.
- **Assessment:** works-well
- **Skill implication:** none; scope decision recorded by the assigned writer.

### [15:51] content — DECISION: engineering-tour recipe (msg_3df9556fb494)

- **What happened:** User confirmed the engineering-explainer disposition: absorb selected sticky-map, scroll-highlighting, and expandable-snippet patterns as an optional engineer-tour template/recipe in the generic core; no dependency on the personal skill; no S3 mechanics copied. Sol records it in `discovery.md`.
- **Assessment:** works-well
- **Fable's position:** Agree — cleanest possible disposition (Thomas-authored, no attribution overhead; the named patterns are pure client-side HTML/CSS/JS with no destination or config coupling; S3 exclusion keeps publishing behind the manifest seam; "optional recipe" fits the one-engine-plus-recipes shape). Three design-time caveats registered: (1) "selected patterns" must become a concrete list — engineering-explainer self-describes a locked house style, and wholesale absorption would smuggle opinionated styling into core ahead of the open palette/template-neutrality decisions; core tokens must govern the absorbed recipe, not vice versa. (2) Fork cost: the absorbed copy becomes canonical while the personal skill stays in use; natural follow-up (out of scope) is the personal skill delegating to core. (3) The engineer-tour recipe should be the substrate for the planned OAT project-explainer/recap products, not a parallel third format.
- **Skill implication:** none.

### [15:53] gotcha — transcript watch channel unreliable: no `turn_ended` records exist

- **What happened:** Fable's pinned watcher reached `consumedThrough: 51` of 52 records with `eventCount: 1` — records 8–51 (substantive Sol assistant text included) were consumed without ever emitting a delta. Root cause: `grep '"type":"turn_ended"'` returns **zero** matches in both peers' transcripts; the completion boundary the Cursor normalizer buffers on never occurs in this environment's sidebar transcripts. With `--quiet-empty`, offsets silently advanced past content that will never render.
- **Assessment:** gotcha (major)
- **Skill implication:** corrects the earlier 15:26 "quiet-empty validated" reading — that offset advance was silent consumption of substantive content, not metadata-only growth. In this topology, live watch deltas cannot be trusted for Cursor peers; only the initial catch-up backlog render worked. Mitigations: rely on the Orca channel (already primary), or raw-transcript reads / `state reset` + fresh `catch-up` for transcript evidence. Runtime reference needs an update: laptop/sidebar Cursor transcripts may lack `turn_ended` entirely.

### [15:56] content — peer review open: lifecycle product shape (msg_95adac601499 → msg_26e0b688e5b0)

- **What happened:** Sol asked for an independent assessment: project explainer + project recap as (A) named recipes/modes in `oat-explainer-kit`, (B) separate public skills delegating to it, or (C) one generic phase-inferred mode. Fable recommended **A**: no public-surface growth (B multiplies the lockstep release set), lifecycle knowledge belongs in the adapter, same engine/manifest with only source-set and template differences, and discoverability is solvable with trigger phrases plus checkpoint offers. Against C: phase inference is fragile and the two products have different narrative stances — misclassification ships the wrong artifact; C's low-surface virtue can be layered on A later as confirm-first checkpoint suggestions. Dissent registered: recipe definitions should live in the generic core's recipe/template format with the adapter contributing only OAT artifact bindings, so a non-OAT consumer (including the private wrapper) can reuse the product shapes; if core's format can't express them, the format is under-powered and better to learn now.
- **Assessment:** works-well
- **Skill implication:** none; user decision pending. (Resolved 16:12 — see DECISION entry below; recap clause later superseded at 16:18.)

### [16:00] content — DECISION: named lifecycle recipes (msg_1cb0c53b38dc)

- **What happened:** User chose A: project explainer and project recap are explicit named recipes/modes inside `oat-explainer-kit`, selected by lifecycle callers; no separate public skills, no phase inference. Sol recorded in `discovery.md`.
- **Assessment:** works-well
- **Fable's position:** Agree — this was my recommendation; rationale logged at 15:56.
- **Skill implication:** none.

### [16:02] content — DECISION: recipe boundary refinement accepted (msg_ed1cdc9b0646)

- **What happened:** User explicitly accepted Fable's refinement: reusable recipe definitions (source-set mapping, narrative, templates) live in the generic core recipe format; `oat-explainer-kit` supplies OAT artifact bindings, named public exposure, and lifecycle checkpoint behavior. Sol updating `discovery.md`. Sol confirmed reading Fable's full transcript, not just Orca summaries, before surfacing the refinement.
- **Assessment:** works-well
- **Fable's position:** Agree — my own refinement; the core recipe format now has a concrete forcing function (must express both products) which de-risks under-powered design.
- **Skill implication:** none.

### [16:02] protocol — channel policy converged (msg_67f54ebdccb1)

- **What happened:** Sol accepted the `turn_ended` watcher finding. Agreed path: Orca messages plus pinned stateless transcript reviews are the primary three-way conversation channels; watcher silence/deltas carry no evidentiary weight in this topology.
- **Assessment:** works-well
- **Skill implication:** confirms the mitigation recorded at 15:53; both peers now operate on the same channel policy.

### [16:07] content — peer review open: lifecycle opt-in/checkpoint policy (→ msg_b5326d267a17)

- **What happened:** Per user direction, Fable independently evaluated opt-in policy for both named products: (A) project-level opt-in at discovery/kickoff then automatic at gates, (B) explicit invocation only, (C) automatic default with opt-out. Fable recommended **A** with four refinements: per-product opt-in flags; automatic BUILD but gated PUBLISH (mapping onto the decided env-var seam — unset publish vars = build-only, so autonomous runs build the recap and humans publish); freshness guard on gate re-entry (regenerate or mark stale, bind artifacts to source commit/hash in manifest); and when no intent is recorded, interactive gates ask once (confirm-first) while autonomous gates skip silently and note availability in the summary. Intent persists in the project state file. Against C: expensive, conversation-gated artifacts make default-on the wrong surprise/cost profile. Against B: fails the autonomous-run case where recap has most value, and persists no intent across handoffs.
- **Assessment:** works-well
- **Skill implication:** none; user decision pending.

### [16:12] content — DECISION: lifecycle opt-in policy accepted (msg_a97f99579f63)

- **What happened:** User accepted the joint Sol+Fable recommendation — option A with all four Fable refinements: per-product intent in project state; opted-in products auto-build at their gates; publish always human-gated; manifest binds source commit/artifact hashes with stale/regenerate handling; interactive no-intent gates offer once, autonomous no-intent gates skip and note availability; explicit invocation always available. Sol recording in `discovery.md`.
- **Assessment:** works-well
- **Fable's position:** Agree — my recommendation adopted in full; no residual dissent.
- **Skill implication:** none.

### [16:14] content — peer review open: palette architecture (→ msg via reply to msg_a97f99579f63)

- **Status note (16:18):** palette decision paused pending the reopened lifecycle policy below; Fable's recommendation stands unchanged.
- **What happened:** Per user direction, Fable independently evaluated palette architecture: (A) core ships a small curated set of named token palettes with light/dark coverage plus an explicit palette-file override, one token contract for all templates/recipes, manifest records the choice; (B) core defines only the token contract, callers always supply a palette; (C) broad bundled theme catalog with per-artifact selection. Fable recommended **A** with refinements: semantic token contract (surface/ink/accent/status/diagram-series roles, not raw colors) with light/dark as modes inside each named palette; palette selection scoped per artifact-set (not per-artifact) to protect cross-set cohesion, per-artifact deviation only as explicit override with a cohesion warning; a neutral default palette as the zero-config choice with a tiny curated set (3–5) behind a documented acceptance bar (contrast/AA + render QA against every template); supplied override files validate against the published token schema (ties into the typed-config agenda item — the schema is public contract surface the wrapper depends on) and the manifest records palette name or file hash. Against B: breaks zero-config/runnable-without-OAT — bare invocations would force a design decision on callers who don't care. Against C: broad catalogs can't all pass render QA (maintenance rot) and per-artifact selection fragments artifact-set cohesion. C's variety is recoverable: adapter or wrapper ships extra palettes as supplied overrides with zero core changes. Note: accepting an explicitly handed palette file does not violate config-blindness — config-blind means core never goes looking for config, not that it refuses explicit inputs.
- **Assessment:** works-well
- **Skill implication:** none; user decision pending.

### [16:18] content — lifecycle policy REOPENED by user; Fable reassessment (msg_f2674d4be2f4, msg_2f8f5d67b32d → msg_f670faef6d8c)

- **What happened:** User materially refined the 16:12 policy: autonomous projects always produce the project recap (mandatory build, not opt-in); plan explainer in autonomous runs only when explicitly requested at kickoff; interactive projects may opt into plan explainer any time through plan, with a one-time ask unless config suppresses it; user proposed a `skipPlanExplainer` / `skipProjectRecap` confirmation-skip pattern. Clarification followed: autonomous mode overrides confirmation config for recap — prompts may be suppressed, the artifact cannot be disabled.
- **Assessment:** works-well (content); gotcha (config shape)
- **Fable's position:** Accept the correction — mandatory autonomous recap is right (accountability evidence for unattended work; the surprise is inverted in autonomous mode — NOT having a record is the surprising outcome; build cost is marginal next to the run itself and publish stays human-gated). This supersedes the 16:12 "autonomous no-intent gates skip silently" clause for recap only. BUT the proposed config naming is a trap: a setting named `skipProjectRecap` that cannot skip the project recap guarantees confusion — it conflates artifact policy (what gets built) with confirmation policy (whether we ask), and a boolean skip carries no default answer for the suppressed question. Counter-proposal sent: per-product tri-state `always | ask | never` per context (collapses both axes; "skip the prompt" becomes `always`); precedence mode-policy > project intent > user preference > default, with autonomous recap pinned `always` and conflicting config failing fast at kickoff rather than being silently overridden; naming-consistency flag ("plan explainer" vs the decided "project explainer" — one canonical key needed); mandatory recap = mandatory build at modest default scope, expansion and publish on-request.
- **Skill implication:** none; user decision pending on the config shape.

### [16:22] content — peer dissent resolved: fail-fast conceded (msg_d0a38ac19281 → msg_1f4f446275a8)

- **What happened:** Sol agreed with all of Fable's config-shape corrections (tri-state `always|ask|never`, no skip booleans, canonical `projectExplainer`/`projectRecap`, precedence order, gated publish, modest-scope mandatory recap) and supplied repo evidence placing the schema at `workflow.explainers.projectExplainer` / `workflow.explainers.projectRecap`. Sol dissented on one point: Fable's fail-fast at kickoff when preference says recap `never` in autonomous mode would halt unattended execution — Sol proposed force-`always` + visible resolved-policy warning + override recorded in summary/manifest.
- **Assessment:** works-well
- **Fable's position:** Conceded, and the concession is principled, not deferential: fail-fast contradicted Fable's own precedence order — it would give a lower-precedence stale preference veto power over the higher-precedence mode policy, and autonomous kickoff may be programmatic with nobody present to answer the failure. Refinement added to preserve what fail-fast protected (no late-discovered surprise), split by when the conflict is visible: WRITE-time rejection — an interactive kickoff/discovery conversation refuses to record recap `never` for an autonomous project while a human is present, so the invalid state never persists; RUN-time force+warn+record — a pre-existing stale conflict encountered unattended is forced to `always` per Sol, with kickoff warning when possible and the override recorded in both final summary and manifest. Runs never halt over preferences.
- **Skill implication:** none. Joint consensus position now with the user for decision: tri-state schema under `workflow.explainers.*`, canonical naming, precedence mode > project state > preference > default, write-time rejection + run-time force+warn+record, modest-scope mandatory recap build with gated publish.

### [16:30] content — peer review: state.md intent model (Sol draft → msg_2d00741d66ff)

- **What happened:** Sol drafted the `state.md` representation: `oat_explainers` object keyed `project_explainer`/`project_recap`, each entry `decision: generate|skip` (never `ask`), `source: user|kickoff_prompt|workflow_preference|autonomous_policy`, `decided_at`; missing entry = unresolved, falls through to workflow preference/default; resolved state outranks later preference changes; autonomous recap writes `generate`/`autonomous_policy` with the agreed reject/override semantics. Fable challenged per user direction.
- **Assessment:** works-well
- **Fable's position:** Agree with the skeleton (resolutions-not-policies in state, no `ask` value, provenance fields, fall-through). One substantive objection sent: **`workflow_preference` must not be a persistable source** — persisting a routine preference fall-through freezes a global preference snapshot into the project, so later preference changes silently stop applying to in-flight projects the user never pinned. State should record project-scoped intent only (interactive, kickoff, mode policy); defaults re-derive at each gate. Asymmetry defended: `autonomous_policy` may persist despite being derivable because mode is immutable per-project and cannot go stale. Lesser refinements: two top-level typed fields `oat_project_explainer`/`oat_project_recap` preferred over a container (closed product set, canonical-name mirroring, simpler typed parsing — container acceptable if control-plane typing favors it, but schema must be closed either way); rename source `user` → `interactive` (kickoff is also the user; `interactive` names the channel); document `generate` = build-only (publish separately gated) and the snake_case↔camelCase mapping between state and `workflow.*` surfaces. Net enums proposed: `decision: generate|skip`; `source: interactive|kickoff_prompt|autonomous_policy`.
- **Skill implication:** none; user decision pending on the persistence question.

### [16:35] gotcha — Fable rationale corrected: autonomy is not persisted (msg_45e9f6e2cfc1)

- **What happened:** Sol accepted all four of Fable's state-model changes but corrected one factual claim in Fable's rationale: current OAT docs say autonomy itself is never persisted, so "mode is immutable project state" was wrong. The conclusion (persisting `autonomous_policy` intent is safe) survives for a better reason: autonomous kickoff _deliberately_ persists `recap: generate / source: autonomous_policy` precisely so the mandatory recap survives later interactive resumes or session loss — the runtime mode can disappear; the resolved project intent remains.
- **Assessment:** gotcha (Fable factual error, corrected by peer)
- **Fable's position:** Correction accepted — Sol's replacement rationale is strictly stronger: it doesn't just permit the persistence, it makes it load-bearing (intent must outlive the mode that created it). No dissent.
- **Skill implication:** peer review caught a wrong premise behind a right conclusion; worth noting that adversarial review of _rationales_, not just outcomes, paid off.

### [16:38] content — DECISION: project-state intent model accepted (msg_e4cc4e8a786b)

- **What happened:** User accepted the two-field state model: `oat_project_explainer` and `oat_project_recap`, each null/absent or a closed typed record `{decision: generate|skip, source: interactive|kickoff_prompt|autonomous_policy, decided_at: ISO}`. No `ask` value; no persisted workflow-preference fall-through; `generate` = build only; generation/freshness lives in the manifest; autonomous kickoff persists recap `generate` so it survives mode/session changes. Sol replacing superseded lifecycle text in `discovery.md`.
- **Assessment:** works-well
- **Fable's position:** Agree — this is the joint position with all four of my refinements plus Sol's stronger persistence rationale; the contested persistence question resolved my way (fall-through stays external). No residual dissent.
- **Skill implication:** none.

### [16:42] content — Fable verified discovery.md against all logged decisions

- **What happened:** Read-only cross-check of the 16:38 `discovery.md` revision (189 lines) against every decision in this log: named recipes + core-recipe-format boundary, revised lifecycle policy, two-field state model with exact enums, precedence/rejection/override semantics, manifest hash binding, gated publish, all four dependency dispositions, wrapper-compatibility fixture, no-public-gdocs-lane. All faithful. One stale fragment flagged to Sol (msg_7b9dfce04323, after an interrupted first send): agenda item 3's example config schema still lists `lanes`/`gdocsAccount`, contradicting the decided private-wrapper-only gdocs position — drift in an open item, not an error.
- **Assessment:** works-well
- **Skill implication:** independent read-only verification of the writer's artifact is cheap and caught real drift; worth keeping as a standing collaborator duty after each write boundary.

### [16:43] content — DECISION: curated palette set accepted; art-direction contract opened (→ msg_7b9dfce04323)

- **What happened:** User chose the curated semantic palette set (Fable's palette recommendation A) and extended the question: interactive NL instructions ("clean", "corporate", "edgy") may override styling entirely; Sol flagged these as broader art direction (typography, spacing, geometry, shadows, diagrams, density, motion), asking Fable to assess contract shape: (A) separate palette + visual-profile contracts with NL compiled to a validated resolved bundle; (B) one unified theme contract; or another model.
- **Assessment:** works-well
- **Fable's position:** Recommended a two-layer model — separate SELECTION inputs (named palette + named visual profile, both tiny curated sets behind the same acceptance bar, axes independent) compiling into ONE RESOLVED theme bundle (unified validated token schema with palette/typography/geometry/motion/diagram sections) that is the only thing templates consume. NL instructions are compile-time input, never identity: compiled against base profile+palette into a concrete bundle, schema/contrast/render-QA validated, persisted with artifacts; manifest records instruction text + bundle hash flagged `derived`; rebuilds use the persisted bundle, never re-compilation (adjectives are not stable across model versions). Derived bundles passing the acceptance bar may be promoted to named presets. Self-flagged risk: profile-count discipline is load-bearing — proliferation reopens the catalog-rot failure by the back door.
- **Skill implication:** none; user decision pending.

### [17:00] content — DECISION: two-layer art-direction contract accepted (msg_bbe74d7acccc)

- **What happened:** User accepted the two-layer model exactly as recommended: selection inputs (named palette + tiny named visual-profile set + optional NL art direction) compile into one validated, persisted resolved theme bundle consumed by templates; NL is compile-time input, never preset identity; rebuilds reuse the persisted bundle; passing derived bundles may be promoted after acceptance QA. One Sol refinement accepted into the record: the public manifest defaults to `derived` flag + instruction hash + resolved-bundle hash — NOT raw instruction text — due to publish/privacy risk. Sol updating discovery and removing the stale `gdocsAccount`/public-lanes schema implication flagged at 16:42.
- **Assessment:** works-well
- **Fable's position:** Agree in full, including Sol's manifest-privacy refinement — it's strictly better than my original "record instruction text": raw NL can leak private context (names, internal projects, tone directives) into a published artifact, while instruction hash + bundle hash preserves the reproducibility audit trail. If the operator wants the raw text for local forensics it can live in a private build record outside the published manifest. My earlier drift flag is also being addressed.
- **Skill implication:** none.

### [17:02] content — peer review open: packaging (→ msg_4e32f516cc2a)

- **What happened:** Per user direction, Fable independently evaluated packaging: (A) core + bundled assets in `utility`, adapter in `workflows` fail-closed without core — mirroring the `oat-dispatch-subagents` precedent; (B) new communications/explainers pack holding both; (C) both in `utility`. Fable recommended **A**. Against B: threshold unmet and self-capped — recipes live inside the adapter by prior decision, so the public family stays at two skills; a two-skill pack is taxonomy sprawl and separates the adapter from its lifecycle callers; B's honest virtue (avoiding a future pack-move that breaks install references) addressed by recording an explicit spin-out threshold (third coherent public communications skill or a non-OAT communications consumer). Against C: breaks the utility=neutral-engines / workflows=OAT-adapters taxonomy and ships adapter dead weight to generic-core-only consumers including the private wrapper. Refinements: fail-closed = presence AND minimum-core-version check (adapter depends on manifest/bundle schema, so version skew is a real failure mode) with actionable install-command error; wrapper-compatibility fixture pins against the PACKAGED utility artifact, not the repo tree, with a packaging-integrity assertion in release validation; assets never split from the engine; core installs user-scope cleanly, adapter per standard scope rules.
- **Assessment:** works-well
- **Skill implication:** none; user decision pending. (Resolved 17:09 — see below.)

### [17:09] content — DECISION: split existing-pack packaging accepted (msg_382ffc9618ad)

- **What happened:** User accepted packaging A with all Fable refinements: core + all templates/scripts in `utility`; adapter in `workflows` with presence + minimum-compatible-core-version fail-closed check and actionable install guidance; private wrapper targets the packaged core; release validation tests packaged layout; user-scope core supported. Spin-out threshold recorded: ≥3 coherent public comms skills, or a materially independent asset footprint/release cadence. Sol updating discovery.
- **Assessment:** works-well
- **Fable's position:** Agree — my recommendation adopted in full; the added "materially independent asset footprint/release cadence" clause in the spin-out threshold is a good sharpening (it captures the one real non-count reason to split: release mechanics, not taxonomy aesthetics).
- **Skill implication:** none.

### [17:12] content — peer review open: typed adapter config (→ msg_42e7b7bca533, corrected by msg_c03bc42361b7)

- **What happened:** Per user direction, Fable assessed the candidate `explainers.*` typed config schema. Verdict: accept with seven refinements. (1) Names sound; `s3Uri` as one URI beats bucket+prefix; the two same-named blocks (`explainers.*` plumbing vs `workflow.explainers.*` policy) need explicit policy-vs-plumbing documentation; `publicBaseUrl` semantics are coupled to the open publish-contract decision and must be pinned by `destination-contract.md` in the same change. (2) `awsProfile` restricted to local/user overlay, never shared — machine-specific credential profile; validation should warn/reject it in shared scope; `s3Uri`/`publicBaseUrl`/`awsRegion`/`artifactsRoot` are shared-scope team facts. (3) Keep the `provider` discriminator — self-describing publish block, forward-compatible parsing, and the selection key for the connector architecture; closed enum `['s3-static']`. (4) Adapter owns schema definition/versioning; v1 validates at resolve-time fail-fast; central `oat config` registration when the mechanism exists — don't block on control-plane work. (5) Connector interface defined AS the manifest contract: artifact tree + manifest in, published URLs + verification receipt out to a defined location — adapter connector and private wrapper compose as peers on one seam. (6) `resolvedThemeBundle` wins over `defaults.palette`/`visualProfile` when both set (warn, not error). (7) Document gitignore posture for `.oat/explainers` (recommend gitignored; manifest hashes preserve reproducibility). Runtime-only flags staying out of config confirmed correct.
- **Assessment:** works-well
- **Skill implication:** none; user decision pending.

### [17:13] gotcha — backtick command substitution corrupted an Orca message body

- **What happened:** Backticks around `oat config` in msg_42e7b7bca533's draft triggered shell command substitution inside the double-quoted `--body`, splicing the oat-config CLI help output into point 4 of the delivered message. Correction sent (msg_c03bc42361b7).
- **Assessment:** gotcha
- **Skill implication:** when sending Orca message bodies through a shell, never use backticks inside double quotes — single-quote the body or escape them. Worth adding to any orchestration-usage guidance.

### [17:17] content — peer dissent resolved: config CLI awareness + artifact durability (msg_af88c6bccf5b → msg_dcb7c1fef227)

- **What happened:** Sol agreed with most of Fable's config assessment but challenged two points and refined one field. (1) CLI awareness: typed OAT config should mean `oat config get/set/describe` registers the `explainers.*` scalar keys in v1 — no dynamic pack-contributed schema mechanism is needed because the bundled skills and control-plane ship in the same lockstep release; adapter-only validation would not satisfy the stated typed/discoverable surface. (2) Durability: blanket-gitignoring `artifactsRoot` conflicts with mandatory autonomous recap durability (unpublished recap in an ignored dir evaporates with the workspace) and with persisted-theme replay; Sol proposed a split layout — tracked content model + manifest + resolved theme/build record, rendered dist default-ignored — decided before gitignore policy. (3) Rename to `defaults.themeBundlePath`; shared scope repo-relative only, local may be absolute, user scope uses named palette/profile ("portable-path fiction").
- **Assessment:** works-well
- **Fable's position:** Both challenges conceded — each caught a real error. On (1), Fable had imported an external-plugin assumption (dynamic registration machinery) that doesn't apply to lockstep-released bundled skills; static key registration in v1 is cheap and satisfies discoverability. Division: control-plane owns scalar typing/discoverability, adapter owns cross-field/relational/semantic validation. On (2), the blanket gitignore contradicted two of Fable's own prior positions (manifest hash binding, persisted-bundle replay) plus the mandatory-recap guarantee; split layout endorsed with one honest caveat added: rendered dist is NOT deterministically regenerable (markdown→HTML is agent work), so the tracked layer preserves substance not exact bytes — exact-HTML durability requires committing dist (config-allowed) or publishing; state the trade in the layout doc. (3) accepted in full. One spec-level addition: the tracked build record follows the public-manifest privacy posture (instruction hash + derived flag, raw NL only in explicitly local records) since repos can be public. No remaining dissent.
- **Skill implication:** two-peer adversarial review caught assumption-import and self-contradiction that single-agent reasoning missed; the pattern keeps paying for itself.

### [17:20] content — final durability refinement accepted (msg_36799361692a → msg_f68c984d5f70)

- **What happened:** Sol refined the durability position: no directory-level default-ignore for dist; instead the manifest/build record classifies each artifact `rebuildable: true|false`, with deterministic build command + input hashes when true. Rebuildable dist may be ignored; non-rebuildable output (agent-rendered, exact bytes not derivable) must be committed or successfully published; mandatory autonomous recap cannot report complete with only ignored non-rebuildable output; the baseline recap should preferably use a deterministic renderer from tracked content model + resolved theme.
- **Assessment:** works-well
- **Fable's position:** Agree, no dissent — it upgrades Fable's passive caveat ("state the trade in docs") into an enforceable per-artifact invariant, and the recap completion rule closes the accountability loophole rather than documenting it. Two spec-time notes attached: the deterministic baseline renderer is a feasibility item to verify at spec, not a policy premise (the commit-or-publish fallback covers its absence); and `rebuildable: true` claims need spot-check verification in release validation (rebuild one claimed artifact from recorded command/hashes and compare) — every-run checking is too heavy, zero checking makes the flag fiction.
- **Skill implication:** none. Config + artifact-layout consensus complete on both sides; pending user ratification.

### [17:25] content — user refinement: scope-derived explainer roots (msg_2136ba95b4ac → msg_6c2956d7ba68)

- **What happened:** User refined output roots: project explainers always live at the resolved OAT project path under `explainers/` (`.oat/projects/<shared|local>/<project>/explainers/`); non-project OAT explainers default to `.oat/repo/explainers/`. Sol proposed removing generic `explainers.artifactsRoot`, making the project path canonical/non-configurable, keeping an optional `explainers.repoArtifactsRoot` for the non-project default only, and requiring direct core invocation to pass an explicit output root.
- **Assessment:** works-well
- **Fable's position:** Agree on the substance: non-configurable project path is right (lifecycle artifacts belong colocated with `state.md`/`summary.md`; the recap completion rule and lifecycle callers need one deterministic location; configurability there is bug surface, not flexibility), and the path inheriting shared|local scope from the project gives consistent durability posture. Removing the generic root is right and partially dissolves the earlier gitignore debate — project explainers land in already-tracked project dirs, with the 17:20 rebuildable rules applying within each `explainers/` dir unchanged. `.oat/repo/explainers/` matches the `.oat/repo/` precedent; core keeping no default root preserves destination-blindness. **Mild dissent registered: drop `repoArtifactsRoot` for v1.** By our own precedent logic inverted — the provider discriminator was kept because retrofitting would break, but adding an optional key later is purely additive, so dropping costs nothing; the relocation use case is weak since distribution belongs to the publish contract. Explicitly flagged as low-stakes/50-50-adjacent; if kept, constrain repo-relative and document prominently that the project path deliberately has no counterpart key.
- **Skill implication:** none; user decision pending on the override key.

### [17:39] content — DECISION: typed config and canonical roots accepted (msg_48380b8bcbda)

- **What happened:** User accepted the full typed-config package and selected the fixed v1 non-project root (Fable's drop-`repoArtifactsRoot` recommendation). Final path model: project explainers always `<resolved-project-path>/explainers/`; non-project OAT explainers always `.oat/repo/explainers/`; no `artifactsRoot` or `repoArtifactsRoot` keys; direct core requires an explicit output root. Also ratified: typed schema with mixed scopes, v1 CLI awareness, provider discriminator, manifest-in/receipt-out connector, and per-artifact rebuildability with commit-or-publish durability. Sol recording discovery.
- **Assessment:** works-well
- **Fable's position:** Agree — the joint position adopted in full, including my mild dissent resolving to the fixed root. No residual dissent.
- **Skill implication:** none.

### [17:41] content — peer review open: publish contract (corresponding-roots)

- **What happened:** Draft `destination-contract.md` recommended CloudFront origin at bucket root with the S3 prefix visible in URLs. Sol proposed the more general corresponding-roots contract: `s3Uri` includes the publish prefix; `publicBaseUrl` is the served URL corresponding exactly to that root; for every relative artifact path P, upload `<s3Uri>/P` and link/verify `<publicBaseUrl>/P` — supporting both originPath-hidden and prefix-visible topologies with no connector knowledge of CDN config.
- **Assessment:** works-well
- **Fable's position:** Recommend adopting corresponding-roots — the draft's rule is one specific instantiation of it, and the generalization is also a simplification: the invariant "upload `<s3Uri>/P` ⇔ serve `<publicBaseUrl>/P`" is exactly what self-verification, catalog links, and the receipt need, with no bucket+prefix+baseUrl algebra (the draft's `publish.sh` failure mode was baking one topology in). Migration is a pure config restatement (`s3Uri=s3://bucket/prefix`, `publicBaseUrl=https://cdn/prefix`), no behavior change. Honest weakness: the contract cannot statically detect non-corresponding roots — mitigations proposed: sentinel-first fast-fail (publish one probe object, verify via `publicBaseUrl`, then bulk upload), verify-failure errors that name root-correspondence as the likely cause, and both topologies documented as worked examples in `destination-contract.md`. Normalization rules must be pinned: no trailing slash on stored roots (normalize on read), P always relative with no leading slash, and link exactly what verification GETs (decide directory-style vs explicit `index.html` once, apply everywhere). Private-connector compatibility is a strength: any destination with a writable root + served root satisfies the same contract.
- **Skill implication:** none; user decision pending.

### [17:46] content — DECISION: corresponding publish roots accepted (msg_d229bf457b7c)

- **What happened:** User accepted the corresponding-roots contract with all Fable refinements: upload `<s3Uri>/P` / serve-verify `<publicBaseUrl>/P`; no trailing slash on roots, no leading slash on P; sentinel-first verify before bulk upload; explicit root-correspondence/originPath diagnostics; both topologies documented as worked examples. URL form resolved: explicit `index.html` is the portable default; directory-style canonical URLs only where the connector verifies them. Sol updating discovery.
- **Assessment:** works-well
- **Fable's position:** Agree in full — and the explicit-`index.html`-as-portable-default resolution of my "decide once" flag is the right call: it works on bare S3 static hosting and any CDN without index-document configuration, with directory URLs as a verified upgrade rather than an assumption.
- **Skill implication:** none.

### [17:48] content — peer review open: template neutrality (→ msg_cf64eec0feb0)

- **What happened:** Final agenda item. Fable evaluated: (A) fully tokenize production templates, quarantine worked examples into separated fixtures, add a leak guard; (B) keep flagged inline examples; (C) optional brand packs. Fable recommended **A**. Against B: flag comments don't survive copy-paste — inline org URLs in a public skill are a leak hazard with a known failure mode. Against C: a brand pack would be a third styling mechanism alongside the just-decided theme-bundle architecture; org identity is mostly covered by profile + palette + catalog config; purely additive later if demanded. Refinements: two-class leak guard (unresolved placeholder tokens always + configurable denylist of core-shipped org strings; wrapper branding arrives via config/catalog inputs so no false positives — the guard polices what the core must never emit, not what callers inject); RFC 2606 documentation domains in neutral sample content; examples quarantined outside the production output path but discoverable via template-header pointers, with provenance notes where derived from the real stoa explainer; leak guard runs in structural QA and release validation with its own seeded-leak test; NOTICES.md attribution unaffected; zero-config promise survives via neutral fixtures.
- **Assessment:** works-well
- **Skill implication:** none; user decision pending — last open agenda item.

### [18:05] content — DECISION: fully neutral production templates (msg_1d14f45877dd)

- **What happened:** User selected fully neutral production templates with all Fable refinements: tokenize/remove org-specific URLs and branding; examples live outside the production path with template-header pointers and RFC 2606 domains; structural QA + release validation check unresolved tokens and a configurable core denylist, with a seeded-leak test; caller branding enters through inputs; brand packs deferred; NOTICES attribution unchanged. Sol updating discovery. This closes the last open agenda item — every question from the laptop-handoff brainstorm now has a converged, logged decision.
- **Assessment:** works-well
- **Fable's position:** Agree — my recommendation adopted in full. No residual dissent on any agenda item.
- **Skill implication:** none. Final reconciliation of `discovery.md` against this log commissioned by the user; Fable executing read-only.

### [18:08] content — final reconciliation report (→ msg_aff9d649b543)

- **What happened:** Fable reconciled the 18:05 `discovery.md` revision (263 lines) against every decision in this log. Verdict: substantially faithful — all major decisions present and accurate, including the two-layer art-direction contract with manifest privacy, packaging split with both spin-out clauses, complete typed config, connector receipt seam, scoped canonical roots, rebuildability/commit-or-publish durability with the recap completion rule, corresponding-roots publish contract, full template neutrality, state model, lifecycle policy, all dependency dispositions, and confirmed removal of the stale `lanes`/`gdocsAccount` fragment. Four drift items reported to Sol: (1) CONTRADICTION — section 2 still carries pre-brainstorm draft text saying the adapter reads config "via plain file reads (never shells out to `oat`)", conflicting with the decided typed CLI-aware surface and the joint position that the adapter resolves config through the `oat config` CLI; sections 2 and 3 must state one mechanism. (2) MISSING (minor) — the accepted deterministic-baseline-renderer preference for the recap is absent from section 3. (3) STALE — the Open Questions section's "items 1–4 are decisions, 5–6 could resolve at spec" no longer reflects reality; all seven agenda items are decided, and the genuinely open remainder (wave/program-close integration timing; spec-time verification items) should be named explicitly. (4) STALE FRAMING (minor) — section 4's interrogative lead-in reads as unanswered above its own decided answer; if wave/program-level integration is intentionally open, say so.
- **Assessment:** works-well
- **Skill implication:** the end-of-brainstorm reconciliation pass caught a real contradiction that incremental per-decision writes accumulated; recommend it as a standing closeout step whenever one peer holds a long write boundary.

### [18:12] content — final confirmation: PASS (msg_a2aebb543958 → msg_06924cab8a78)

- **What happened:** Sol corrected all four reconciliation findings; Fable ran the targeted read-only confirmation on the 18:10 revision. All four PASS: (1) section 2's adapter now resolves typed config through the `oat config` CLI with adapter-owned cross-field validation — the plain-file-reads contradiction is gone with no residual matches; (2) section 3 carries the deterministic baseline recap renderer preference with spec-time feasibility check and commit-or-publish fallback; (3) section 4's lead-in states project-level policy is decided and narrows the open question to wave/program-close caller timing; (4) Open Questions lists exactly the four genuine remainders (caller timing, renderer feasibility, spot-check mechanics, detailed schemas). The surviving personal-lanes mention is intentional exclusion language. `discovery.md` confirmed as a complete, accurate, reconciled record of the brainstorm.
- **Assessment:** works-well
- **Skill implication:** none. Brainstorm converged end to end; both peers closeout-ready pending user direction.

### [18:29] content — formal discovery opened; classification challenge (→ msg_f501d3a117d0)

- **What happened:** Formal discovery began. Sol classified the brainstorm's remainder as two requirement-level questions — (1) v1 lifecycle scope (project-only vs mandatory wave/program-close integration), (2) deterministic baseline recap rendering as requirement vs preference — with spot-check mechanics and detailed schemas classified as design. Fable challenged independently.
- **Assessment:** works-well
- **Fable's position:** Agree on both named items and on the design classifications. One missing requirement-level item identified: **v1 acceptance evidence and dependency sequencing.** (a) The recorded constraint gates release on a real external-wrapper end-to-end run, while discovery declares wrapper migration out of project scope — an unowned release-gating dependency; discovery must decide whether v1 blocks on the migrated wrapper (and who owns it) or ships on the in-repo fixture with real-wrapper e2e as post-release verification. (b) Same shape for publish: is one demonstrated live publish (bucket provisioned, sentinel verified, receipt produced) required acceptance evidence, or does fixture-level testing suffice? Both define what "done" means and gate on actors/infrastructure outside the repo. Minor optional flag: the mandatory recap's minimum content set (defined in the laptop handoff) may exist only as recipe design, not as a recorded requirement — if the accountability guarantee has required substance, that is a requirement.
- **Skill implication:** none; net three requirement-level questions (plus one optional bullet) enter formal discovery.

### [18:47] content — DECISION: v1 seam freeze + must-attempt recap semantics (→ msg_7f20f83c5484)

- **What happened:** User decided v1 lifecycle scope with amendment: project lifecycle hooks required; wave/program hooks are expected follow-up not tracked in v1 (promotion won't beat v1); v1 freezes only the seam — canonical two recipe IDs, versioned fact-base input, versioned manifest output, with source-set parameterization so a future wave-close can call the project-recap recipe with program artifacts + wave summaries. User also set autonomous recap failure semantics: mandatory = must-attempt, not must-succeed; render failure degrades to warning + structured manifest/summary record and must not block unattended completion — superseding the discovery line "mandatory recap cannot complete while its only copy is ignored and non-rebuildable." User asked confirmation that the CLI-based config reversal was intentional with traceability.
- **Assessment:** works-well
- **Fable's position:** Seam freeze: agree without reservation — minimal composable surface, correct not to track promotion. Must-attempt: accept, with one guard — the superseded line fused two guarantees, and only the completion-blocking half should die; the durability-of-successful-builds half survives restated. Proposed revised invariant sent to Sol: (1) attempt + structured outcome record mandatory and non-suppressible; (2) build failure degrades to warning + structured record (cause + regeneration instructions), run completes; (3) for successful builds the durability step is part of the recap task, reported successful only after it — durability failure degrades as (2), the record itself durable in the summary; (4) all successfully produced tracked intermediates (fact base, content model, resolved theme) persist even when later stages fail — a render failure still leaves the reconciled facts; (5) recap status honestly classified (built-durable | built-not-durable | failed), never conflated with run completion. Accountability risks recorded: degradation must not become a silent norm (failure record surfaces in summary top-line so repeated breakage is visible), must-attempt not satisfiable by no-op (record makes attempts auditable), explicit invocation named as recovery path. Discovery gets invariant + non-suppressibility + seam-freeze items; spec gets record schema, failure taxonomy, versioning scheme, retry semantics, parameterization expression. CLI reversal confirmed intentional with the full traceable chain (17:12 position → 17:17 challenge → concession → 17:39 ratification → 18:08 reconciliation catch → 18:12 PASS); the never-shells-out rationale belongs to the core, which still reads nothing; 0.4.1 wisdom traceability unaffected.
- **Skill implication:** none; revised invariant pending Sol/user confirmation before Sol records it.

### [18:58] protocol — Sol session restart; collaboration re-established (→ msg_e884fe23cd2a)

- **What happened:** Sol's session restarted; Orca handles survived (Sol=`term_a5407eb0…`, Fable=`term_489dfa5d…`, runtimeId `1f91ed7b…`). Sol re-confirmed self pin `cursor:9c6c8d28-ab96-4d8e-bde2-33d077e8c781` — the same session id survived the restart — via current-user-message snippet after an ambiguous `whoami`. Fable re-ran `whoami` (also exit 3, both same-cwd sessions reported unengaged by its heuristic) and confirmed identity by discriminating content: "You are the fable agent" appears 4× in `3b327ac0…`, 0× in Sol's transcript, plus unbroken session continuity. Fable pin unchanged: `cursor:3b327ac0-f873-4244-9b33-2ab7fec2bb30`. Stateless pinned review + raw read of Sol's transcript (220 records) confirmed the latest completed genuine user turn (record 216, 18:57, "That sounds good") and Sol's completed confirmation that the recap rule is settled. Fable's stale watcher (armed 15:12) stopped; no stateful watchers remain on either side. Orca stays primary; transcript reviews manual/stateless only.
- **Assessment:** works-well
- **Skill implication:** restart recovery worked exactly as the protocol prescribes — re-arm from the named pin, never substitute by recency; the same-session-id survival meant re-pin rather than re-locate. Content handoff accepted: seam freeze recorded; autonomous recap = auto-run at project end, failure warns/records and never blocks completion; status taxonomy not reopened; next requirement question is acceptance evidence/dependency sequencing.

### [18:58] gotcha — review-mode normalizer renders 0 messages for the restarted Sol session

- **What happened:** The stateless `review --session cursor:9c6c8d28… --max-turns 2` rendered 0 of 220 records ("filtered out: metadata/non-message records: 220") even though raw reads show ordinary role/message user and assistant content, including the 18:57 user turn.
- **Assessment:** gotcha (major, second normalizer gap in this topology)
- **Skill implication:** post-restart Cursor record shapes appear to defeat the session-observer normalizer in review mode, complementing the earlier `turn_ended` finding. An empty digest of a restarted Cursor session is non-evidence — raw transcript reads are the reliable channel. Both findings belong in the runtime-cursor reference update.

### [19:06] content — DECISION: strict v1 acceptance gates; Fable assessment (msg_56f51fdbdca9 → msg_7ee828163731)

- **What happened:** User resolved the acceptance-evidence question strictly: (1) public v1 release blocked until the real external private-wrapper end-to-end test passes — the in-repo fixture is not sufficient; (2) v1 completion also requires one live S3/CDN sentinel-and-artifact smoke test. Sol asked Fable to assess ownership/sequencing implications and draft discovery-level wording.
- **Assessment:** works-well
- **Fable's position:** Support recording both gates — they resolve the 18:29 unowned-dependency flag in the strict direction, which makes ownership and sequencing mandatory to state. Key implications sent: the migrated wrapper becomes a hard release dependency while staying outside delivery scope, so the operator is named owner (project delivers contract, packaged core, fixture, and migration runbook); circular gating is resolved by a release-candidate instrument — seam contracts freeze at RC, wrapper migrates against the packaged RC, passing e2e promotes RC to release (release blocked, not development); the e2e is inherently operator-executed with recorded run evidence (personal vault/Google/destinations are not CI-runnable), and the fixture is explicitly a development guard; strict means any e2e failure blocks release regardless of which side the bug is on. Smoke test: destination provisioning enters the v1 critical path (operator-owned); sentinel-first plus one real artifact via corresponding-roots with the receipt recorded as evidence; independent of the wrapper gate. Three-clause discovery wording drafted and handed to Sol. No interaction with must-attempt recap semantics — the smoke test is acceptance evidence; runtime publish stays human-gated.
- **Skill implication:** none; Sol records the wording.

### [19:19] content — DECISIONS: renderer not v1, gates at RC only, recap content confirmed; reconciliation PASS (msg_d8437f4ab3fb, msg_03ff48de0717 → msg_4afc2b097393, msg_a255f7d9b10a)

- **What happened:** User made the final requirement-level decisions: deterministic baseline rendering is NOT a v1 requirement (stable seams first, renderer improvements additive); the wrapper E2E and live S3/CDN gates are strict only at release-candidate/v1-completion and must not block discovery, design, or initial implementation; the mandatory recap minimum content set is confirmed as the six elements (original request, key decisions, as-built architecture, implementation record, validation evidence, outcome). Sol recorded all confirmed gates and the seam freeze in `discovery.md` (19:20 revision) and requested targeted reconciliation.
- **Assessment:** works-well
- **Fable's position:** PASS on both. All seven verified clauses match the joint positions: seam freeze with canonical recipe IDs and non-gating wave/program hooks; must-attempt invariant with tri-state status and tracked-intermediate preservation; six-element recap content; renderer non-requirement with no contradiction against rebuildability text; wrapper RC/E2E gate with exact ownership split, development-guard fixture labeling, and non-blocking-before-RC scoping; live s3-static gate with sentinel-first, receipt retention, and unchanged runtime human-gating; Open Questions correctly narrowed to spot-check mechanics and detailed schemas. One cosmetic line-break niggle flagged, non-material. On Fable's accounting, formal discovery now has zero open requirement-level questions — the residue is design/spec work as classified.
- **Skill implication:** none. All three requirement-level questions from the 18:29 classification challenge are closed.
