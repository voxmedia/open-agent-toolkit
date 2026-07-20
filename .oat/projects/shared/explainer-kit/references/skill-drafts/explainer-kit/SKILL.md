---
name: explainer-kit
description: Use when producing a clear, team-facing visual explainer set for a project — architecture/systems/status diagrams, a deck, an HTML explainer, and optional comment-able Google Docs — grounded in a reconciled fact base, adversarially verified, and published to an S3-backed static site. Destination-blind engine: reads NO config files; the caller (or a wrapper skill) supplies EXPLAINER_* environment variables. Unset publish vars = build-only. Runs as a guided, draft-first, gated conversation; reconciles federated/contradictory sources (OAT project, vault project, docs dir, live gh PR/issue state, session context) into one cited fact base before building. Ships with HTML shells, a publish script, and a build/verify workflow template.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Skill, Workflow, Agent, Task
user-invocable: true
version: 1.0.0
---

# Explainer Kit

Produce a **clear, team-facing visual explainer set** for a project and publish it where the team can use it — rendered HTML on an S3-backed static site, comment-able text in Google Docs, optionally sourced from notes in a personal Obsidian vault. Every artifact is **grounded in a reconciled, cited fact base and verified** before it goes out.

This is a **kit**: the steps orchestrate the work; the bundled files (`templates/`, `scripts/`, `references/`) carry the reusable pieces that are tedious to re-derive and easy to get subtly wrong.

## Resolution — this skill reads NO config

The engine is **destination-blind**. It reads no config files. All wiring arrives as **environment variables / invocation args**, supplied by the caller or a wrapper skill (`oat-explainer-kit` reads `.oat/config.json`; `personal-explainer-kit` uses interactive presets). **Unset publish vars ⇒ a build-only run** — artifacts are built and verified locally, nothing is published. That is also the cheapest smoke test.

### Environment contract

| Variable                    | Required            | Purpose                                                                                                                                                 |
| --------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPLAINER_SLUG`            | **yes**             | kebab-case initiative slug; used in every artifact path                                                                                                 |
| `EXPLAINER_ARTIFACTS_ROOT`  | **yes**             | the local dir that **is** the publish layout (the mirror)                                                                                               |
| `EXPLAINER_S3_BUCKET`       | publish lane        | destination S3 bucket. **Unset ⇒ build-only, no publish**                                                                                               |
| `EXPLAINER_S3_PREFIX`       | optional            | key prefix inside the bucket (default: bucket root)                                                                                                     |
| `EXPLAINER_PUBLIC_BASE_URL` | publish lane        | public URL the set renders at; base for absolute cross-links + self-verify                                                                              |
| `EXPLAINER_AUTH`            | publish lane        | `sso` \| `profile[:name]` (default `sso`)                                                                                                               |
| `EXPLAINER_LANES`           | optional            | comma list: `companion-notes`, `gdocs` (default: none)                                                                                                  |
| `EXPLAINER_GDOCS_ACCOUNT`   | iff `gdocs` lane on | Google account for `gog`                                                                                                                                |
| `EXPLAINER_FACT_BASE`       | optional            | path to a caller-supplied, pre-reconciled fact base. When set, **skip** Step 2 federation/reconciliation and run only a light verification pass over it |

The publish vars (`EXPLAINER_S3_BUCKET` / `EXPLAINER_S3_PREFIX` / `EXPLAINER_PUBLIC_BASE_URL` / `EXPLAINER_AUTH`) travel together — set all four to publish, leave `EXPLAINER_S3_BUCKET` unset for a build-only run.

## When to use

A project's state needs to be **legible at a glance** — a migration, a system, a multi-lane effort — and you want a cohesive, published, cross-linked set. For a single throwaway diagram, use `visual-explainer:generate-web-diagram` directly.

## North star (the bar every artifact must clear)

Audience is the **whole team, including non-deeply-technical people**. A reader glances and immediately gets: **(1) where we are, (2) what each part/lane is doing, (3) what's next, (4) what the rollout / end-state looks like.** **Clarity beats completeness. No jargon** — define any unavoidable term inline. Lead with visuals; **same terminology and same numbers everywhere.** **The bar: a non-engineer skims it once and no sentence needs re-reading.** Prefer bullets/tables to dense prose for anything enumerable (lists, decisions, PRs).

## How this runs — guided, draft-first, gated

Run this as a **conversation**: propose and confirm, don't charge ahead. **Verification is woven through every stage, not one gate**: fact-base critic loop → markdown-draft review → build-time structural check → render QA → cross-set cohesion sweep → the user's own pre-publish pass. Hard **human gates** before: the companion-notes writes, the markdown→HTML step, the Google Docs, and the publish. Use **dynamic workflows** (`Workflow`) for the parallelizable work.

---

## Step 0 — Orient: source + session context

**Start from what's in front of you.** Check the **current session** first — if there's an obvious subject you've been working, **infer the source and propose direction**; a cold session → ask.

**The source is almost always a _federation_, not one file** — e.g. program/reference docs + several git worktrees (the lanes) + **live `gh` PR/issue/merge state across repos** + a coordination/alignment doc + a session log, often handed off as a "context packet" that points at all of them. Source types to expect, frequently several at once:

- an **OAT project** (`.oat/projects/.../<slug>/`) → `discovery.md`, `design.md`, `plan.md`, `state.md`, `summary.md`, `research/*`;
- a **vault project** (`02 - Projects/<X>/`) → its hub + notes;
- a **directory / set of documents**;
- **live CLI state** — `gh pr list/view`, `gh issue`, lane `state.md`s — usually the **freshest and most authoritative** status;
- **inferred session context**.

**Federated + contradictory sources are the norm, and resolving the disagreement _is_ the work.** A dated STATUS snapshot will conflict with live PR/merge state and with each lane's own state — **live state wins**; flag what you can't resolve as "needs confirmation." **Re-read the live/authoritative sources right before building and again before publishing** — status drifts daily; the snapshot you read at Step 0 is likely stale by Step 8.

Ground every claim; cite `file:line` / PR / doc; never invent.

## Step 1 — Scope & shape (agree first)

Propose and get sign-off on: the **artifact set**, the **companion-notes placement** (Step 3, if that lane is on), the **slug** (`EXPLAINER_SLUG`, kebab-case), and which pieces become **Google Docs**. Default set: **hub · architecture/systems diagram · status/"where we're at" lane view · rollout/next-steps · bird's-eye deck · (optional) Google Doc(s)**.

## Step 2 — Reconcile a cited fact base (the core step) ▸ workflow + critic

This is the **biggest phase** and the one a naive run skips. Do **not** build artifacts from raw source — builders would each re-derive facts and **drift** (exactly the contradiction class per-artifact verify shouldn't have to catch).

**If `EXPLAINER_FACT_BASE` is set, SKIP the federation + reconciliation below.** The caller has already reconciled a fact base (e.g. an OAT wave/program close hands one in). Run only a **light verification pass** over it — confirm it is internally consistent and current against live state — then proceed to Step 4. Do not re-federate the raw sources.

Otherwise:

1. **Synthesize one fact base.** Run a workflow that reads the federated sources and produces a **single cited fact base** — every load-bearing claim tied to `file:line` / PR / doc, contradictions resolved (**live state wins**), unresolved items flagged "needs confirmation."
2. **Adversarial critic loop on the fact base** (not per-artifact — the heavy adversarial work belongs _here_). Fan out skeptics to surface internal contradictions and **stale-snapshot-vs-live-PR** conflicts before any artifact exists. (On the real run this surfaced ~40 issues.)
3. **Keep an overrides / answers file.** When the user confirms a correction that _overrides the source_ (a reversed decision, a corrected number, a person/fact), record it. **Tell the verifiers about it** and treat later "contradicts source" findings on overridden facts as **noise** — source-grounded skeptics will otherwise re-flag the user's own confirmed overrides as errors.

Every artifact (and draft) is grounded in this **reconciled fact base**, with the raw sources as backing.

## Step 3 — Companion-notes lane (optional) ▸ GATE before writing

**Only when `companion-notes` is in `EXPLAINER_LANES`.** When the lane is off, artifacts simply live at `EXPLAINER_ARTIFACTS_ROOT` and no vault ceremony happens — skip to Step 4.

The vault is the user's **personal** Obsidian vault — an **authoring** surface, not a sharing surface. **Resolve the vault path** from `STOA_VAULT_PATH`, falling back to `vaultPath` in `~/.stoa/config.json` — **never a hardcoded path.** **Read the conventions first:** `stoa vault conventions --json` and `--path="02 - Projects/"` _(if the `stoa` CLI is present)_; **fallback if it isn't: Read `02 - Projects/AGENTS.md` (sha-pinned) + `CLAUDE.md` + `Projects MOC.md` directly, and open an existing `02 - Projects/<X>/` as a worked template.**

Every note: standard frontmatter (`created`, `tags`, `type`, `status`); **closed tag taxonomy** (`work`/`personal`/`engineering`/`topic`/`repo`/`project`/`capture`/`action`/`meta`; `project/<slug>`, `repo/<org>/<repo>`); callouts limited to `contradiction`/`gap`/`stale`/`key-insight`.

- **Scenario A — create one:** check for a scaffold (`write-to-vault` / a `stoa`/OVM command) first → propose folder/slug/tags/hub outline → confirm → create `02 - Projects/<Project>/` with `AGENTS.md`+`CLAUDE.md` (mirror the template) and a **hub note** (`title`, `type: project`, `status: active`, `created`, `tags`, `project_slug`, `stoa_pattern: project`; sections **Current Status · Overview · Documents · Key Decisions · Open Questions · Related**) → **update `Projects MOC` in the same change.**
- **Scenario B — reuse:** read the hub + frontmatter; match its slug/tags/conventions; **append/extend** (don't restructure the user's notes); update its `Documents` section + the MOC.

**Built artifacts live at `EXPLAINER_ARTIFACTS_ROOT`, mirroring the publish layout** (`diagrams/<slug>/<key>/index.html`, `explainers/<slug>/index.html`, …). With this lane on, point `EXPLAINER_ARTIFACTS_ROOT` at the vault project's `artifacts/` dir so the vault holds the local source of truth; publishing is a **clean mirror** of that tree (no rename/move step). The **"Published Links"** note (Step 9) lives in this project folder too.

## Step 4 — Draft the content in Markdown ▸ GATE: human review

**Author each artifact's content as a Markdown draft first**, grounded in the fact base — then get the user's review. Corrections are cheap on Markdown (framing, tone, a reversed decision, a number, an added item); they are expensive once rendered across a 7-artifact HTML set. **HTML is a near-mechanical render of approved drafts** — so don't render, then re-render after every correction. Almost every substantive change lands here.

**Run a ruthless plain-language edit on the drafts** — a _distinct_ editor pass (a model rarely trims its own voice when only asked to "review for clarity"). Bar: a busy non-engineer reads once. Cut every word that doesn't change the meaning; kill LLM tells — throat-clearing ("it's worth noting", "importantly"), hedges ("arguably", "essentially", "fairly"), em-dash pile-ups, nested parentheticals, "not just X but Y", forced triplets — and use short sentences, active voice, concrete nouns. Turn anything **enumerable into bullets or a table** (reads better, and in a Google Doc people can comment on the exact item). Make PR/issue references real links — `[#589](https://github.com/<org>/<repo>/pull/589)`, never bare `#589`. Keep every fact + citation. _(Scale the pass to the set: for a 1–2 artifact set the `clarity-jargon` verify lens can carry it; reserve the full editor pass for substantial sets.)_

## Step 5 — Build the artifacts (dynamic workflows)

Render the **approved drafts** to self-contained HTML — `Workflow`, one builder per artifact, **writing into the nested layout** under `EXPLAINER_ARTIFACTS_ROOT` (so the local tree _is_ the publish layout). See **`templates/workflow-build-verify.js`**.

- Build on **`templates/house-style.html`** for prose / status / explainer pages, or **`templates/deck-shell.html`** for slide decks. Full-bleed diagrams may need their own page layout but **keep the `:root` palette + components**.
- Builders get: the **fact base**, the **house/deck shell**, the **north-star bar**, the **exact nested output path**. Return structured `{path, builtSummary, couldNotVerify[]}`.
- Build-time check each file: **self-contained** (inline CSS/JS, no CDN/Mermaid), tag balance, **absolute** cross-links (base `EXPLAINER_PUBLIC_BASE_URL`) + GitHub blob links.
- Unknown-size discovery → **loop until two consecutive rounds find nothing new.** `log()` anything scoped out.

## Step 6 — Verify: structural + render QA (required) ▸ GATE

Claim-verification already happened on the fact base + drafts. Here, add the lenses claim-checks **miss** — they pass pages with real visual defects.

- **Structural:** self-containment, tag balance, no external deps, `grep` for root-relative links / bare repo paths / Mermaid.
- **Render QA — actually load the page.** `file://` is blocked in headless/Playwright → serve over a local HTTP server **rooted at the artifacts dir** (`python3 -m http.server --directory <artifacts-root>`) so the vault path's spaces stay out of the URL. The MCP screenshot tool times out (~5s) on long SVG pages and infinite CSS animations block a stable frame → use a **JS layout probe** (`getBoundingClientRect`, `scrollWidth/clientWidth`, `innerText`) and inject `*{animation:none;transition:none}` before any screenshot. **Check inner-container overflow, not just page overflow** — a diagram inside `overflow-x:auto` can hide its last step while `document.documentElement` looks fine. Check H1/screen-reader readability (e.g. `<br>` with no surrounding whitespace mis-reads). **`scripts/render-qa.sh`** does the scaffolding — static structural checks across every file, serves the artifacts dir over local HTTP, and prints the layout-probe + animation-disable snippets to run in the loaded browser (the visual load itself stays a main-loop / MCP step).
- **Cross-set cohesion sweep:** identical terminology + numbers; no deck-vs-diagram contradictions; "needs confirmation" flags consistent.
- Review findings with the user, then their own pre-publish pass.

## Step 7 — Google Docs lane (ovm-gdoc-sync) — optional ▸ GATE

**Only when `gdocs` is in `EXPLAINER_LANES`** (a wrapper activates it; the mechanics live here). Comment-able text docs are **vault notes synced to Google Docs** via `gog` (account `EXPLAINER_GDOCS_ACCOUNT`, required for this lane; confirm before writing).

- **Author for structure, not walls.** Put enumerable content (PR lists, decisions, owners, sources) in real Markdown **bullet lists / tables**, one idea per line — not semicolon-separated clauses in a paragraph (those render as a wall and can't be commented on per item). gog merges adjacent lines that lack a blank line between them, so keep blank lines + list markers; make PR/issue refs links (`.../pull/589`).
- **First create:** `zsh -ic 'gog drive upload <export.md> --convert-to doc --account "$EXPLAINER_GDOCS_ACCOUNT" --json'` → capture the Doc ID → write the `## Google Doc Sync` block into the note → _now_ the wrapper works.
- **Update:** `~/bin/sync-note-to-gdoc.sh "<note>"` (it requires an existing sync block + Doc ID, and errors otherwise).
- **Bullets + blockquotes still need the two post-passes on every push.** The `ovm-gdoc-sync` flow and the wrapper run them automatically (`fix-gdoc-bullet-glyphs.mjs`, `fix-gdoc-blockquotes.mjs`) — but a **bare `gog docs write` / first-create does NOT auto-normalize**, so don't ship dash-glyph bullets / flattened blockquotes.
- **The doc is private by default** (created under the account, invisible to the team) → **share it with the team / org domain for comment access** — a manual user step. Externally-owned docs → **pull-only reference**.

## Step 8 — Publish to the static site ▸ GATE

**Only when the publish vars are set** (`EXPLAINER_S3_BUCKET` + `EXPLAINER_PUBLIC_BASE_URL` + `EXPLAINER_AUTH`); otherwise this is a build-only run and you stop after Step 6. Detail in **`references/destination-contract.md`**. For `EXPLAINER_AUTH=sso`, `aws sso login` if creds are stale (**no auto-retry** on an expired-SSO error); for `profile[:name]`, plain aws CLI → **read the destination's `README.md`/`AGENTS.md`** if it publishes one → publish with **`scripts/publish.sh`**: by default it **mirrors the artifacts dir** (`find <root> -name index.html`, key = `EXPLAINER_S3_PREFIX` + path-relative-to-root) so adding a diagram can't silently go unpublished, sets `--content-type text/html`, and **runs the verify `curl`** (against `EXPLAINER_PUBLIC_BASE_URL`) at the end to catch a silent SSO failure or wrong content-type.

## Step 9 — Cross-link + Published Links

- Hub links every artifact; cross-link related diagrams. **Absolute** URLs (base `EXPLAINER_PUBLIC_BASE_URL`) + **GitHub blob links** for repo files (see the contract).
- When the companion-notes lane is on: a vault **"Published Links"** note listing every (shared) Google Doc URL + every published visual URL; one-line pointer from the project hub note.

---

## Reference — skills inventory

`visual-explainer:generate-web-diagram` (diagrams) · `visual-explainer:generate-slides` (decks) · `visual-explainer:generate-visual-plan` (rollout plans) · `engineering-explainer` (deep HTML explainer; also S3 upload) · `visual-explainer:fact-check` · `ovm-gdoc-sync` (vault note ↔ gdoc; post-passes via its flow/wrapper) · `skeptic` (adversarial refutation) · `Workflow` (dynamic fan-out).

## What's in the kit

- **`templates/house-style.html`** — base shell for prose/status/explainer pages (palette + sticky-TOC/scrollspy + cards/callouts/badges/table/shape-block, status-pill vocab, before→during→after + lane-card primitives).
- **`templates/deck-shell.html`** — slide-deck shell (one slide/viewport, keyboard nav) on the same palette.
- **`scripts/publish.sh`** — destination-blind mirror-the-artifacts-dir publish + self-verify (reads `EXPLAINER_*`).
- **`scripts/render-qa.sh`** — static structural checks + local HTTP server + the browser layout-probe/animation-disable snippets (Step 6).
- **`templates/workflow-build-verify.js`** — `Workflow`: build from the fact base into the nested layout, then structural+render verify, then cohesion sweep.
- **`templates/catalog.json`** — initiative catalog (absolute URLs + a `base_url`; `${EXPLAINER_PUBLIC_BASE_URL}` is substituted at build; includes Google Docs).
- **`references/destination-contract.md`** — generic layout rules (typed folders, index.html-per-dir, absolute links, content-type text/html), link gotchas, catalog schema, verify.

## Notes

- Codifies a real run (Identity Store Split + Voxstar Transition). Adapt slugs, lane colors, and the artifact list per project.
- Decks/diagrams keep the `:root` palette + components but may use their own page layout.
- The named webfonts (Source Serif Pro / Inter / JetBrains Mono) aren't loaded — they fall back to system fonts (harmless).
- **This is the engine.** Wrappers (`oat-explainer-kit`, `personal-explainer-kit`) or a direct caller supply the `EXPLAINER_*` vars, then invoke this skill. It reads no config of its own.
- The bundled `templates/workflow-build-verify.js`, `house-style.html`, and `deck-shell.html` still carry example `open-agent-toolkit.voxops.net` URLs — they are worked starting points; substitute your `EXPLAINER_PUBLIC_BASE_URL` when you adapt them.
