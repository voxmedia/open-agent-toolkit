---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-07-16
oat_generated: false
---

# Discovery: explainer-kit

## Initial Request

Adopt and evolve the **explainer-kit skill family** — a refactor of the
operator's `oat-explainer-kit` 0.4.1 (personal skill, laptop user scope) into
a generic core + two wrappers — and brainstorm its future in the OAT
ecosystem: packaging as a pack skill, config schema, palette system, and
integration with the wave/program-close lifecycle. Drafts of all three skills
are COMPLETE and attached under `references/skill-drafts/`; this project
starts from working material, not a blank page.

## What the kit is

A guided, gated pipeline that turns a project's federated sources (repo docs,
OAT project artifacts, live `gh` PR state, session context) into a published
visual explainer set: reconciled cited fact base → adversarial critic loop →
markdown-draft human gate → self-contained HTML built on shared shells →
structural + render QA → publish (S3 mirror + self-verify). Codifies a real
production run; the operational wisdom is the asset.

## The agreed refactor (operator-confirmed; drafts implement it)

1. **`explainer-kit` (core, v1.0.0)** — destination-blind engine. Interface =
   nine `EXPLAINER_*` env vars ONLY (slug, artifacts root, s3 bucket/prefix,
   public base URL, auth mode, lanes, gdocs account, optional caller-supplied
   fact base that skips the federation step). Reads NO config files; runs
   anywhere, including with zero OAT presence. Optional lanes carried in
   core, activated by vars: `companion-notes` (personal-vault hub/links
   ceremony; vault path resolved via `STOA_VAULT_PATH` → `~/.stoa/config.json`)
   and `gdocs` (gog mechanics + post-passes).
2. **`oat-explainer-kit` (wrapper, v1.0.0)** — reads the `explainers` block
   from `.oat/config.json` (+ `.local` overlay) via plain file reads (never
   shells out to `oat`), maps to vars, invokes core. What wave-close calls,
   typically also passing `EXPLAINER_FACT_BASE`.
3. **`personal-explainer-kit` (wrapper, v1.0.0)** — interactive; named
   presets stored in its skill dir (`work-voxops`, `personal-oat` examples
   ship). Covers run-anywhere personal + work use with no repo context.

Design principles locked with the operator: the vault is an authoring
surface, not a destination ("the vault is where I think; publish targets are
where audiences read"); core must survive with no `.oat` config anywhere;
every line of 0.4.1's operational wisdom traces into exactly one draft
(verified — nothing dropped).

## Validation already done

The engine's output shape was validated on a real deliverable this week: a
15-slide program explainer for the stoa repo-improvement program (5 waves,
48 plans), built from the kit's shells by an opus builder against a
reconciled fact base, structural QA clean. Published as a private preview;
S3/CloudFront publish pending operator bucket setup
(`tkstang-open-agent-toolkit`, prefix `explainers/`, CloudFront + OAC on the
existing private bucket — policy scoped to the prefix).

## Brainstorm agenda (why this project exists)

1. **Palette system.** The kit ships exactly ONE palette ("Executive light",
   a single `:root` token set all components consume). The stoa deck needed
   dark and derived it ad hoc. Proposal to explore: palettes as first-class
   token presets (light/dark pairs; selectable per run via var or preset;
   possibly per-subject accent variation) — the token architecture already
   supports it. What's the right lever shape, and do shells ship N palettes
   or a palette-file contract?
2. **Packaging.** Does `explainer-kit` (+ wrappers) ship as an OAT pack skill
   (`oat tools install …`)? Which pack (utility? a new "comms" pack)? How do
   presets/config examples travel? The core's zero-OAT-dependency requirement
   must survive packaging.
3. **Config schema.** Should the `.oat/config.json` `explainers` block become
   a typed, documented OAT config surface (validation, `oat config`
   awareness) rather than a convention the wrapper reads? Schema:
   `{artifactsRoot, publish:{s3Bucket,s3Prefix,publicBaseUrl,auth}, lanes,
gdocsAccount}`.
4. **Lifecycle integration.** The stoa program is upstreaming
   `oat-wave-execute`/`oat-wave-program` (promotion packet imminent). Should
   wave-close/program-close (and possibly `oat-project-complete`) gain an
   optional "generate explainer" step that calls the wrapper with
   `EXPLAINER_FACT_BASE` pointed at the already-reconciled records? What's
   the right opt-in lever?
5. **Publish mechanics.** Open question from drafting: `publish.sh`
   self-verifies at `${publicBaseUrl}/${prefix}/…`, assuming the CDN origin
   is the bucket ROOT. Decide the contract (recommend: origin at root,
   prefix visible in URLs) and document it in
   `references/destination-contract.md`.
6. **Template neutrality.** Shells retain voxops example URLs as worked
   starting points (flagged, intentional). Keep as-is, or tokenize fully?

## Constraints

- The three drafts in `references/skill-drafts/` are the starting point —
  evolve, don't restart. Traceability of 0.4.1's wisdom is the quality bar.
- Core keeps zero config-file reads and zero OAT dependency.
- `oat-explainer-kit` 0.4.1 stays untouched on the operator's machines until
  the operator installs the new set (install runbook exists in
  `references/skill-drafts/MIGRATION.md`; the operator's other agent handles
  installation separately — not this project's job).
- Templates' component vocabulary and the render-QA gotchas are
  battle-tested; changes there need explicit justification.

## Open Questions

The brainstorm agenda above IS the open-question list; items 1–4 are
decisions for this project, items 5–6 are small and could resolve at spec.

## Source Material

- `references/skill-drafts/` — the three complete skill packages + MIGRATION.md
- Original: `~/.claude/skills/oat-explainer-kit/` 0.4.1 (on the LAPTOP — thomas.stang; not present on this machine)
- Operator context: the stoa program explainer run (private artifact) proved
  the pipeline end-to-end minus the S3 publish leg
