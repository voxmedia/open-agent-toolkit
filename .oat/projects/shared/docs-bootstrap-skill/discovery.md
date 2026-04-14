---
oat_status: in_progress
oat_ready_for: null
oat_blockers: []
oat_last_updated: 2026-04-05
oat_generated: false
---

# Discovery: docs-bootstrap-skill

## Phase Guardrails (Discovery)

Discovery is for requirements and decisions, not implementation details.

- Prefer outcomes and constraints over concrete deliverables (no specific scripts, file paths, or function names).
- If an implementation detail comes up, capture it as an **Open Question** for design (or a constraint), not as a deliverable list.

## Initial Request

Create a docs bootstrap skill that uses the OAT docs CLI to initialize a project with documentation. The skill:

1. Interactively walks users through `oat docs init` with more detail and support than the raw CLI
2. Detects monorepo vs single-package and adapts the flow accordingly
3. After scaffolding, verifies the build works and resolves issues
4. Educates users on how docs work: index.md as content maps, the `## Contents` contract
5. Explains that `oat-project-document` auto-populates docs during OAT workflows
6. Points out agent instructions scaffolded in the docs app directory
7. Explains `oat docs analyze` + `oat docs apply` for bootstrapping documentation content

Two framework paths: Fumadocs (full educational walkthrough) and MkDocs (thinner — setup, verify, shared concepts).

**Additionally in scope:** CLI fixes to `oat docs init` that were identified through hands-on testing.

## Clarifying Questions

### Question 1: Framework Support Depth

**Q:** Should the skill support both Fumadocs and MkDocs?
**A:** Yes, both supported. Fumadocs gets the full educational treatment. MkDocs is thinner — setup, verify build, then shared concepts (index.md contract, analyze/apply). MkDocs can note where it needs more elaboration later.
**Decision:** Both frameworks in scope. Fumadocs is primary; MkDocs is functional but leaner on framework-specific education.

### Question 2: Scaffolded Content Expectations

**Q:** The scaffolded content is docs-app-centric rather than project-centric — is that a problem?
**A:** No, that's expected. Scaffold content should teach you how the docs work. `oat docs analyze` is what populates project-specific documentation afterward.
**Decision:** Scaffold content stays docs-app-focused. The skill explains this and guides users to analyze/apply for project content.

## Solution Space

### Approach: Guided Wrapper Skill (Chosen)

**Description:** The skill acts as an interactive guided wrapper around `oat docs init`. It runs the CLI command itself but pre-populates answers with intelligent defaults after asking the user more contextual questions. After init, it runs builds, resolves issues, then transitions into an educational walkthrough.

**Flow:** Preflight detection → interactive config gathering → run `oat docs init` with flags → install deps + verify build → educational walkthrough (index.md, agent instructions, analyze/apply)

**Rationale:** Full control over UX pacing. Can insert educational content at exactly the right moments. Low maintenance cost since it calls the CLI with flags rather than reimplementing logic.

**User validated:** Yes

## Friction Points from Hands-On Testing

### Round 1: Non-Monorepo Fumadocs (from real repo)

Captured from PR #13 bootstrapping + 8 fix commits over ~4 hours.

#### FP-1: OAT CLI dependency missing from scaffold

**Problem:** Scaffold wired `oat docs generate-index` into prebuild/predev scripts but didn't include `@open-agent-toolkit/cli` as a devDependency. CI broke because the binary wasn't available.

**Resolution:** Add `@open-agent-toolkit/cli` as a devDependency so CI gets it via `pnpm install`. The intermediate attempts (removing from prebuild, `|| true` wrapping) were wrong turns.

**CLI fix needed:** Scaffold template should include `@open-agent-toolkit/cli` in devDependencies by default.

#### FP-2: `@types/node` missing in scaffold

**Problem:** `@types/node` was available locally via hoisting but missing in CI isolated installs. TypeScript/Next.js build failed.

**CLI fix needed:** Scaffold template should include `@types/node` in devDependencies.

#### FP-3: `.oat/` gitignore confusion

**Problem:** Scaffold initially added `.oat/` to docs app `.gitignore`, but `.oat/config.json` needs to be tracked for OAT context.

**CLI fix needed:** Scaffold should create `<app>/.oat/config.json` as tracked and set up `.gitignore` to exclude `.oat/*` except `!.oat/config.json`.

#### FP-4: Dual `.oat/config.json` path confusion

**Problem:** Non-monorepo needs config at both root (`.oat/config.json`) and docs app level (`<app>/.oat/config.json`) with different relative paths to the same files. Error-prone.

**CLI fix needed:** Either resolve paths automatically from root config, or scaffold both configs with clear documentation about their relationship.

### Round 2: Cross-Repo Testing (Monorepo + Single-Package + Existing Docs)

#### FP-5: Index generation broken after init

**Problem:** `.oat/config.json` points to `<app>/index.md` but that file isn't created. AGENTS docs section points to `<app>/docs/index.md`. Internal inconsistency. The `predev`/`prebuild` hook uses `|| true` so failure is silent.

**CLI fix needed:** Either generate the index file during init, or fail loudly with remediation steps. Fix path inconsistency between config and AGENTS.md.

#### FP-6: Single-package repo setup incomplete

**Problem:** In non-monorepo, scaffold creates `<app>/` as subdirectory but root `pnpm install` doesn't install it. No workspace wiring, no guidance.

**CLI fix needed:** Either create/update workspace wiring, or print explicit next steps (`cd <app> && pnpm install && pnpm build`).

#### FP-7: No preflight checks

**Problem:** Init happily overwrites existing docs setup without checking for:

- Existing `.oat/config.json` documentation config
- Existing docs app or docs-related root scripts
- Existing AGENTS docs section

**CLI fix needed:** Detect existing setup and ask whether to replace, scaffold alongside, or abort.

#### FP-8: No monorepo integration guidance

**Problem:** If root scripts or filters assume app name `docs` and user picks a different name, nothing warns them about what to update.

**CLI/Skill fix needed:** Detect root script assumptions and surface what needs updating.

#### FP-9: Doesn't detect local OAT packages

**Problem:** If repo already contains workspace copies of docs-config/docs-theme/docs-transforms, scaffold pulls published `@open-agent-toolkit/*` packages instead of wiring to local workspace packages.

**CLI fix needed:** Detect local OAT packages and offer to wire to them via `workspace:*`.

#### FP-10: First-build tsconfig rewrite churn

**Problem:** Next.js rewrites `tsconfig.json` on first build because scaffold doesn't preseed Next-compatible settings.

**CLI fix needed:** Preseed tsconfig with Next.js-compatible settings so first build is clean.

### Round 3: Nested standalone docs app in non-monorepo (captured 2026-04-10)

**Scenario:** A non-monorepo parent repo gets a docs app scaffolded as a nested subdirectory. Both the parent and the scaffolded docs app have their own `pnpm-lock.yaml` — this is intentional because the docs app should be installable and buildable independently.

#### FP-11: `createDocsConfig()` blocks passthrough of Next.js config fields (Turbopack root, etc.)

**Problem:** `next build` in a nested standalone docs app emits the Turbopack multiple-lockfile warning:

> Next.js inferred your workspace root, but it may not be correct. We detected multiple lockfiles...

The canonical fix is to set `turbopack.root` in `next.config.js` to pin the workspace root to the docs app directory. But because the scaffolded `next.config.js` delegates to `@open-agent-toolkit/docs-config`'s `createDocsConfig()`, there's no way to get that field into the final Next config.

**Root cause:** `createDocsConfig()` in `packages/docs-config/src/next-config.ts` takes a narrow options shape (`title`, `description`, `logo`, `basePath`) and builds a fresh Next config object:

```ts
export function createDocsConfig(options: DocsConfigOptions): NextConfig {
  const baseConfig: NextConfig = {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
    reactStrictMode: true,
    ...(options.basePath ? { basePath: options.basePath } : {}),
  };
  const withMDX = createMDX();
  return withMDX(baseConfig);
}
```

Callers cannot add or override `turbopack`, `experimental`, `webpack`, `env`, or any other Next config fields. Attempts to set `turbopack.root` in the caller's `next.config.js` have no effect because the wrapper returns its own baseline config and doesn't merge anything from the caller.

**Observed workaround:** Replace the `createDocsConfig()` wrapper entirely with an explicit `createMDX()` call plus a hand-written Next config object, then set `turbopack.root` to the docs package directory. After that the warning disappeared and the build stayed green — but the user is now off the supported wrapper path.

**Reproduction:**

1. In a non-monorepo parent repo with its own `pnpm-lock.yaml`, scaffold a docs app as a nested subdirectory via `oat docs init`
2. Run `pnpm install` and `pnpm build` inside the scaffolded docs app (which generates its own lockfile)
3. Observe the Turbopack multiple-lockfiles warning
4. Try to suppress it by passing `turbopack: { root: __dirname }` through `createDocsConfig()`
5. Observe the setting is silently dropped because the wrapper doesn't merge caller fields

**Fix needed in `@open-agent-toolkit/docs-config`:**

1. **Extend `DocsConfigOptions` to accept an optional Next.js config passthrough.** Deep-merge caller-provided fields over the base config before wrapping with `createMDX()`. At minimum `turbopack`, `experimental`, `webpack`, `env`, and arbitrary top-level Next config fields should be mergeable.
2. **Prefer a merge strategy that lets callers override base defaults** (e.g., `reactStrictMode`, `images`) while still getting sensible Fumadocs static-export defaults.

**Fix needed in the docs init scaffold:**

1. **Set `turbopack.root` to the docs app directory by default for the nested standalone case.** Detect this case as "parent has its own `pnpm-lock.yaml` and target dir is a subdirectory that will get its own lockfile" or simply as "non-monorepo shape with a target subdirectory."
2. **Update the Fumadocs `next.config.js.template`** to show the passthrough pattern so users know how to add their own Next config overrides.

**Skill implication:** The Build Verifier should recognize the Turbopack multiple-lockfile warning as a known issue and surface it with a focused remediation pointer rather than letting the user hunt for the cause.

**Separate observation (not a friction point):** An `expo/tsconfig.base` warning was observed in the same session but traced to missing root Expo dependencies in the parent checkout — unrelated to the docs scaffold.

#### FP-12: Fumadocs scaffold has no coherent site-title story

**Problem:** The scaffolded Fumadocs docs app has three unrelated bugs that together leave the user with no clean way to set a display title. Found during hands-on bootstrapping and confirmed by runtime verification of `node_modules/@open-agent-toolkit/docs-theme/dist/docs-layout.js`.

**Sub-finding A — `humanizeAppName` double-title:** `scaffold.ts` derives the display title as `humanizeAppName(options.appName) + ' Documentation'`. This produces bad results in the common cases:

- App name `documentation` → display title `"Documentation Documentation"`
- App name `cyclone-app-docs` → display title `"Cyclone App-docs Documentation"` (broken title-casing around the `-docs` suffix)
- App name `docs` → display title `"Docs Documentation"`

The scaffolder conflates the package name (used for pnpm filtering, e.g., `pnpm --filter documentation dev`) with the product/project name (used for the display title). There is no separate prompt or flag for the product name.

**Sub-finding B — `createDocsConfig.title` is dead code:** `@open-agent-toolkit/docs-config`'s `createDocsConfig(options)` accepts a `title` field in its `DocsConfigOptions` type, but the returned Next config never references `options.title`. The `baseConfig` only uses `options.basePath`. Any caller setting `title` believes it is configuring something; it is configuring nothing. The scaffolded `next.config.js.template` passes `title: '{{SITE_NAME}}'` which is silently discarded.

**Sub-finding C — No page metadata anywhere in the scaffold:** Runtime inspection of the compiled `DocsLayout` from `@open-agent-toolkit/docs-theme` confirms it only forwards `branding.title` into Fumadocs navigation chrome. It does not create Next.js page metadata. The scaffolded `app/layout.tsx` does not export `metadata`, does not set a `<title>` tag, and has no SEO / browser-tab title mechanism at all. Even after fixing sub-findings A and B, the browser tab will show Next.js's default fallback rather than the site title.

**Root cause:** Three disconnected gaps in how "title" flows through the scaffold:

1. `scaffold.ts` — derives the display title from the wrong input (package name), with no separate prompt for product name
2. `packages/docs-config/src/next-config.ts` — `DocsConfigOptions.title` is accepted but unused
3. `packages/cli/assets/templates/docs-app-fuma/app/layout.tsx` — no `export const metadata` declaration

**Observed workaround (for the already-scaffolded app):**

1. Manually edit `app/layout.tsx` to set `DocsLayout.branding.title` to the real product name
2. Manually edit `docs/index.md` frontmatter `title:` and the `# ...` H1
3. Manually edit `docs/getting-started.md` body text referencing the site name
4. Manually edit `docs/contributing.md` H1 `# Contributing to ...`
5. Remove the dead `title` plumbing from `next.config.js`
6. Live with no browser-tab title (or add `export const metadata` manually)

**Unified fix (CLI + packages):**

1. **Add a "Site name" prompt** to `oat docs init` (and corresponding `--site-name` / `--title` flag) representing the product/project name. Default to the humanized repo name (e.g., `cyclone-app` → `Cyclone App`) rather than humanizing the app name. In monorepos this is distinct from the docs package name; in single-package repos the repo-name default usually matches.
2. **Remove or make functional the `title` parameter in `createDocsConfig`.** Either delete it from `DocsConfigOptions` (breaking change) or use it to populate sensible defaults when callers pass through `export const metadata` to Next.js. Aligns with the FP-11 passthrough fix.
3. **Add `export const metadata = { title: '{{SITE_NAME}}', description: '{{SITE_DESCRIPTION}}' }`** to the scaffolded `app/layout.tsx.template`. This gives the scaffolded app a proper browser-tab title and SEO metadata by default.
4. **Ensure `{{SITE_NAME}}` is set once and flows to all four user-visible locations** (layout branding, layout metadata, docs/index.md frontmatter + H1, docs/getting-started.md body, docs/contributing.md H1).

**Skill implication:** The bootstrap skill's Input Gathering step must prompt for _both_ a package/app name and a separate site/display name, explain what each controls, and recommend sensible defaults derived from the repo name. Even once the CLI fix lands, the skill should show the user a coherence check — "your display title will be X, your package will be Y, your description is Z — does that look right?" — before running the scaffold.

#### FP-13: Scaffolded template content has inaccuracies and footguns

**Problem:** During post-bootstrap audit of a real scaffolded non-monorepo docs app, multiple content-level issues were found in the Fumadocs template files. Individually minor; collectively they undermine the "first-time contributor can read the docs app and understand what to do" goal.

**Sub-finding A — Empty `description:` frontmatter on sibling pages:**

`packages/cli/assets/templates/docs-app-fuma/docs/contributing.md:3` and `.../docs/getting-started.md:3` have `description: ''` hardcoded. Only `docs/index.md:3` uses the templated `{{SITE_DESCRIPTION}}`. Fumadocs uses the description field for search previews, social cards, and sibling link summaries — empty descriptions leave those features broken for the two scaffolded sibling pages. The sibling pages don't need site-description templating; they should have sensible static defaults that describe their own page purpose.

**Sub-finding B — `getting-started.md` install/run/build commands have no working-directory context:**

`packages/cli/assets/templates/docs-app-fuma/docs/getting-started.md:15-33` shows bare commands:

```
pnpm install
pnpm dev
pnpm build
```

No `cd` step, no `--filter` flag, no indication of what directory the reader is supposed to be in. This works if the reader happens to already be inside the docs app directory, but breaks for:

- **Nested non-monorepo** — reader is at the parent repo root and runs `pnpm install` there, which either silently does the wrong thing or installs unrelated deps
- **Monorepo** — reader needs `pnpm --filter <docs-app-name> install/dev/build` from the repo root, or an explicit `cd apps/<docs-app-name>`

**Sub-finding C — `contributing.md` docs:lint claim is false when lint=none:**

`packages/cli/assets/templates/docs-app-fuma/docs/contributing.md:31` says:

> 3. Run Markdown formatting and linting as configured for this docs app.

But `package.json.template:13` renders `docs:lint` as `{{DOCS_LINT_SCRIPT}}`, which becomes `"echo 'docs lint disabled'"` when the user picks lint=none (the default). The contributing doc makes a blanket claim that's false for the default scaffold. The template is static; it doesn't branch on the user's lint/format choices.

**Sub-finding D — Root-level generated `index.md` has no "do not hand-edit" warning:**

`package.json.template:8,10` wire the `predev` and `prebuild` scripts to run `{{GENERATE_INDEX_CMD}}` (e.g., `oat docs generate-index --docs-dir docs --output index.md`), which generates an `index.md` at the docs app root — **separate from** the hand-authored `docs/index.md`. The root-level file is tracked in git but rewritten on every build/dev. A new contributor has no way to tell these two `index.md` files apart: the first is the authored content map, the second is a machine-shaped footgun. Hand-edits to the generated file are silently clobbered on the next build. There is no warning in `contributing.md`, no header comment in the generated output, and no mention in `getting-started.md`.

**Fix options (template-level):**

1. **Sub-finding A:** Replace `description: ''` in the two sibling pages with static defaults that describe each page's purpose (e.g., `'Set up the local environment and preview the docs site.'` and `'Authoring conventions and navigation rules for this docs site.'`). No templating needed — these descriptions are about the page, not the site.
2. **Sub-finding B:** Update `getting-started.md` install/run/build section to show the commands in context of the repo shape. Either branch the template on shape, or show both forms with a clear "if you're in a monorepo, use X; if you're in a nested standalone docs app, use Y" framing.
3. **Sub-finding C:** Either narrow the contributing claim unconditionally (drop "and linting") or template it based on the lint/format choices (`{{DOCS_LINT_INSTRUCTION}}` that expands to the right instruction).
4. **Sub-finding D:** Add a "Generated files" section to `contributing.md` calling out the root-level `index.md`, and have `oat docs generate-index` emit a header comment like `<!-- generated by oat docs generate-index; do not hand-edit. Source: docs/index.md -->` at the top of its output.

**Skill implication:** The Educational Walkthrough should explain the two-`index.md` situation explicitly (source under `docs/` vs. generated at docs app root), since this is one of the most confusing aspects of the scaffold for a first-time contributor. Even if the template is fixed, the teaching moment is valuable because the skill's users are the ones bootstrapping these apps and will be asked about them by their teammates.

#### FP-15: No dedicated AGENTS.md is scaffolded inside the docs app

**Problem:** `oat docs init` upserts a short `## Documentation` section into the **root** `AGENTS.md` (e.g., 4 lines: docs root, framework, index file). It does **not** create or scaffold an `AGENTS.md` inside the docs app directory itself. The result is that any agent working inside the docs app has nothing to read for orientation — no explanation of the navigation contract, no description of conventions, no warning about the two-`index.md` footgun, no pointer to `oat docs analyze` / `oat docs apply` / `oat-project-document`.

The scaffolded `docs/contributing.md` contains some agent guidance as its final section, but it is buried inside a contributor-focused document and is scoped to "nav contract + source file preference." It does not stand in for a full docs-app AGENTS.md.

**Reproduction:**

1. Run `oat docs init` in any repo
2. Check the scaffolded docs app directory for `AGENTS.md` — it does not exist
3. Check the Fumadocs template directory `packages/cli/assets/templates/docs-app-fuma/` — no `AGENTS.md.template`
4. Check `packages/cli/assets/templates/docs-app-mkdocs/` — no `AGENTS.md.template`

**Canonical-example gap:** This repo's own docs app at `apps/oat-docs/` also has no `AGENTS.md`. A contributor looking at the canonical example to copy the convention finds nothing. This compounds the CLI gap — there is no working reference implementation to point at.

**Audience and scope discipline (key distinction):** The scaffolded `AGENTS.md` is for agents working _in_ the docs app after it exists — not agents bootstrapping it. Setup content becomes stale the moment setup is done; ongoing-work content stays relevant. The litmus test for any candidate content: _would this instruction be just as relevant to an agent six months after scaffold as it is the day after?_

- **Belongs in AGENTS.md** (ongoing): Navigation contract, content conventions, the two-`index.md` footgun, how to add/restructure/audit content, when to use which tool, what-not-to-do rules that govern every edit.
- **Does NOT belong in AGENTS.md** (setup/one-time): How to install dependencies, how the scaffold was originally created, first-run build commands, what files were generated during `oat docs init`, version-upgrade playbooks. These belong in `contributing.md`, `getting-started.md`, or the bootstrap skill's Educational Walkthrough.

**Proposed organizing principle — task framing:** Organize AGENTS.md around _tasks an agent would actually do_ rather than concepts. This is self-filtering: task framing forces every section to start with "when…" which means every sentence after it is about acting in an already-working docs app.

**What the scaffolded AGENTS.md should contain (task-framed):**

1. **Purpose and scope** — What this docs app is for, who reads it, how it relates to the rest of the repo. One paragraph maximum.
2. **When you need to add a new page** — Create the `.md` file under `docs/`, add frontmatter (`title`, `description`), update the nearest `index.md`'s `## Contents` section to link the new page, run `oat docs nav sync` if relevant. The navigation contract requires every directory to have an `index.md` with a `## Contents` section that lists siblings and child directories.
3. **When you need to restructure navigation** — The `## Contents` section of each `index.md` is the authoritative local map. Reorder, retitle, or regroup there; do not edit generated nav files. Generated artifacts (e.g., root-level `index.md`, mkdocs `nav:`) are rewritten by `oat docs nav sync` / `oat docs generate-index`.
4. **When you need to audit or bulk-edit docs** — Use `oat docs analyze` for a read-only audit against the navigation contract; review its findings; use `oat docs apply` to execute approved recommendations on a branch with a PR. Do not bypass the analyze/apply flow for sweeping changes.
5. **When you're unsure where content belongs** — Start at `docs/index.md`'s `## Contents` section and follow links. Every directory's `index.md` is its discovery entry point. If the content doesn't fit any existing section, it probably needs a new `index.md` at its directory level.
6. **When you need project-level documentation updates** — Use the `oat-project-document` skill during OAT workflows; it reads project artifacts and proposes evidence-backed doc updates. Don't hand-write project-derived docs bypassing that flow.
7. **What not to do** — Don't hand-edit the generated root-level `index.md` (it's rewritten on every build); don't invent new navigation conventions outside the `## Contents` contract; don't bypass `oat docs apply` for bulk content changes; don't create an `overview.md` (deprecated in favor of `index.md`).
8. **Reference** — Pointers to `contributing.md` (authoring conventions and Markdown features), `getting-started.md` (first-run setup), and the root `AGENTS.md` (repo-wide context).

**Fix needed (CLI + template + example repo):**

1. **Add `AGENTS.md.template`** to both `packages/cli/assets/templates/docs-app-fuma/` and `.../docs-app-mkdocs/`. Templated fields: `{{SITE_NAME}}`, `{{SITE_DESCRIPTION}}`, `{{APP_DIR}}`, `{{REPO_NAME}}`, and the generated-index command reference. Content is framework-agnostic mostly, with a small framework-specific block for Fumadocs (mention `DocsLayout`, `createMDX`, `docs-theme` branding) and MkDocs (mention `mkdocs.yml`, Material theme plugins).
2. **Add the template to the scaffold file list** in `scaffold.ts` so `scaffoldDocsApp` creates it alongside the other files.
3. **Do not conflate with the root AGENTS.md section.** The root section stays as-is (4-line pointer for repo-wide agents). The nested `AGENTS.md` is docs-app-scoped and much richer. The two are complementary: root tells any agent "docs live here"; nested tells agents working in the docs app "here's how to work here."
4. **Add `apps/oat-docs/AGENTS.md`** to this repo as the canonical example implementation. Use it as the reference when writing the template. (Nice side effect: future `oat docs analyze` runs against `apps/oat-docs/` will have an AGENTS.md to cite.)

**Skill implication:** The Educational Walkthrough and the scaffolded `AGENTS.md` serve **different audiences at different times**:

- **Walkthrough** — "here's what just happened and why" (setup-time, one-time narration of the scaffold output, consumed during bootstrap)
- **AGENTS.md** — "here's how to work in this docs app going forward" (runtime, ongoing task-framed reference, consumed every time an agent edits the docs)

Some overlap is fine (the navigation contract concept, tool pointers like `oat docs analyze` / `oat docs apply`) but the **framing differs**: the Walkthrough explains _why_ the scaffolded structure exists; AGENTS.md tells agents _what to do_ when they encounter specific tasks. Full derivation of the Walkthrough from AGENTS.md is _not_ the right move — it would pollute AGENTS.md with setup context (making it stale fast) or strip setup context out of the Walkthrough (making bootstrap confusing). Partial sharing of concepts is fine.

The Walkthrough should:

1. Point out the scaffolded `AGENTS.md` as its own section — "here's the file that tells future agents how to work in your docs app"
2. Give a one-sentence summary of its purpose (task-framed reference for ongoing docs-app work) without narrating its full contents
3. Explicitly flag the audience difference so the user doesn't confuse it with `contributing.md`, `getting-started.md`, or the Walkthrough itself

#### FP-14: Post-bootstrap config verification is not part of the scaffold flow

**Problem:** `oat docs init` writes a `documentation` section into `.oat/config.json` (root, tooling, index) and stops there. After the scaffold succeeds, there is no step that:

1. **Reads back** what was written and shows it to the user
2. **Verifies** each referenced path actually exists on disk (catches drift from manual edits like the Turbopack workaround or the title patches)
3. **Explains** what each field is used for by downstream tools (`oat-project-document`, `oat docs analyze`, `oat docs apply`, project-completion gates)
4. **Asks** about `requireForProjectCompletion` opt-in — the one field not auto-derived, and a real decision that depends on how strict the team wants docs sync to be
5. **Handles the nested non-monorepo case** where there's potentially a second `.oat/config.json` inside the docs app directory with different path semantics (related to FP-4 from Round 1)

The result is that first-time users have a `.oat/config.json` they didn't write, don't understand, and can't adjust confidently. This is fine for users who never touch the config again, but the moment they run `oat docs analyze` or `oat-project-document` and hit a path error, they're stuck.

**Fix needed:** This is primarily a **skill-level** concern, not a CLI fix. The bootstrap skill should add a Post-Scaffold Inspector step that does all five jobs above and hands the findings to the Educational Walkthrough as teaching material. The CLI could also gain an `oat docs config check` command that runs just the read-back + verification, so the skill can delegate.

**Skill implication:** Adds a distinct component (Post-Scaffold Inspector) to the skill pipeline between Build Verifier and Educational Walkthrough. The Inspector output becomes the opening material for the Walkthrough so the teaching is grounded in the user's actual config state.

#### FP-16: Scaffolded `docs/index.md` `## Contents` uses extension-less links (agent-hostile)

**Discovered:** 2026-04-14, during p06-t03 smoke test.

**Problem:** The CLI scaffold template at `.oat/templates/docs-app-fuma/docs/index.md:12-13` (source; bundled into `packages/cli/assets/templates/docs-app-fuma/docs/index.md` by `packages/cli/scripts/bundle-assets.sh`) writes `## Contents` links in extension-less form:

```markdown
- [Getting Started](getting-started) - ...
- [Contributing](contributing) - ...
```

This diverges from two established conventions in the same repo:

1. **Live docs convention.** `apps/oat-docs/docs/index.md` uses `.md`-suffixed links throughout (`[Quickstart](quickstart.md)`, `[Provider Sync](provider-sync/index.md)`, etc.). The live docs have been edited by hand to this form because it's what humans and agents gravitate toward.
2. **Build pipeline support.** `packages/docs-transforms/src/remark-links.ts` is a remark plugin that explicitly strips `.md` and converts `dir/index.md` → `dir` at build time for Fumadocs routing. The test suite covers both forms. So `.md`-suffixed authored links route correctly; the transform handles the normalization.

**Why it matters for agents:** An AI agent grepping `## Contents` for "what's linked from here?" needs to follow each link to inspect the target file. With extension-less links, the agent has to infer that `[getting-started](getting-started)` means `docs/getting-started.md` — which works when the convention is stable, but breaks as soon as someone renames, moves, or introduces a subdirectory. With `.md`-suffixed links, the agent can open the file directly with zero inference. `oat docs analyze` already treats `## Contents` as the authoritative local map; agents depending on that map work more reliably when the links are grep-able paths.

**Why it matters for humans:** Hand-editing the scaffold output produces files that diverge from the rendered example (the CLI says one thing; the actual docs you're modeling after say another). This is exactly the kind of "the scaffold and the canonical example disagree" footgun that FP-13 is supposed to eliminate.

**Fix needed:** Two-track:

1. **CLI scaffold template fix (upstream).** One-line edit to `packages/cli/assets/templates/docs-app-fuma/docs/index.md` so `## Contents` uses `.md`-suffixed links from the start. Same change pattern as FP-13 template-content patches.
2. **Skill-level bridge patch (FP-16).** Add to the skill's scaffold-integrity patches in Step 3d — detect extension-less links in the scaffolded `docs/index.md` `## Contents` post-scaffold and rewrite them to `.md`-suffixed. Gated by a capability check that skips when the CLI template has been fixed upstream (same self-ratcheting pattern as FP-11 / FP-12 / FP-13).

**Related guidance updates:**

- **AGENTS.md bridge template.** "When you need to add a new page" should explicitly call out `.md`-suffixed links in `## Contents` and explain that the build pipeline handles Fumadocs routing normalization. "What not to do" should add a bullet forbidding extension-less links in authored `## Contents`.
- **Walkthrough Section C.** Drop any framing that suggests extension-less is the authored convention — it was based on the broken scaffold, not the real practice. Show `.md`-suffixed as the single correct form; mention the `remark-links` transform handles Fumadocs routing.
- **Related finding — `.md` vs `.mdx` default.** Fumadocs compiles both; prefer `.md` for plain content because it's friendlier to linting, grep, and agent tooling. Reach for `.mdx` only when embedding JSX components. Update AGENTS.md template "When you need to add a new page" step 1 and SKILL.md Walkthrough Section E.

**Skill implication:** Adds a new FP-16 sub-section to the scaffold-integrity patches in Step 3d, a new entry in Capability Detection (3b), frontmatter description update (add FP-16 to the list of covered gaps), and guidance updates across AGENTS.md template + Walkthrough Sections C and E.

## Key Decisions

1. **Approach:** Guided wrapper skill that calls `oat docs init` with flags rather than reimplementing scaffold logic.
2. **Framework scope:** Both Fumadocs and MkDocs supported; Fumadocs primary with full education, MkDocs functional but leaner.
3. **CLI fixes in scope:** Friction points FP-1 through FP-10 are CLI bugs/improvements that should be fixed alongside the skill, not just worked around.
4. **Content expectations:** Scaffold content is docs-app-focused by design. The skill explains this and guides to analyze/apply for project content.
5. **Package naming:** All references use `@open-agent-toolkit/*` (not legacy `@tkstang/*`).

## Constraints

- Skill calls the CLI rather than reimplementing scaffold logic — changes to scaffold behavior should be CLI fixes
- Must work for repos that don't have OAT installed globally (devDependency strategy)
- CI runners and repo-specific workflow issues are out of scope for the skill

## Success Criteria

- User can run the skill in a monorepo or single-package repo and get a working docs site on first build
- No silent failures — every error has a clear remediation
- User understands the index.md contract, agent instructions, and how to populate docs after bootstrap
- Preflight checks prevent accidental overwrites of existing docs setup
- All 10 friction points are resolved (in CLI, skill, or both)

## Out of Scope

- CI runner configuration (repo-specific)
- Project-specific content in scaffolded docs (that's what analyze/apply does)
- Deep MkDocs educational content (noted as future enhancement)

## Deferred Ideas

- MkDocs framework-specific deep education — label as "needs elaboration" in the skill
- Auto-running `oat docs analyze` + `oat docs apply` as part of bootstrap (could be offered as optional final step)

## Open Questions

- **Ideal guided flow sequence:** Preflight → config gathering → scaffold → install → verify build → education → (optional) analyze/apply. Does this match user expectations?
- **Error recovery:** If build fails after scaffold, should the skill attempt auto-fix or present the error and guide the user?
- **Existing docs coexistence:** When preflight detects existing docs, what are the valid coexistence patterns? (replace, second app, abort — anything else?)

## Assumptions

- Users have pnpm available (required by the monorepo tooling)
- Users are running the skill from the repo root
- The OAT CLI is available either globally or will be installed as part of the flow

## Risks

- **CLI fix scope creep:** 15 friction points is substantial work alongside the skill
  - **Likelihood:** Medium
  - **Impact:** Medium
  - **Mitigation Ideas:** Prioritize fixes that block the skill flow; defer nice-to-haves
  - **Status:** FP-1..FP-10 resolved via PR #27 (`4d66f0d`). FP-11..FP-16 still open:
    - FP-11: `createDocsConfig` Next config passthrough + scaffold `turbopack.root` for nested standalone apps
    - FP-12: Incoherent site-title story across scaffold / docs-config / layout metadata
    - FP-13: Scaffolded template content inaccuracies and footguns (4 sub-findings)
    - FP-14: Post-bootstrap config verification missing (skill-level, not CLI)
    - FP-15: No dedicated `AGENTS.md` scaffolded inside the docs app (CLI + canonical-example gap in `apps/oat-docs/`)
    - FP-16: Scaffolded `docs/index.md` `## Contents` uses extension-less links (agent-hostile; CLI template fix + skill bridge patch)

## Blockers

- **Blocked on CLI fixes:** FP-1 through FP-10 need to be resolved in `oat docs init` before the skill can be accurately tested and designed. A separate project (`docs-init-fixes`) has been created to track that work.
- Resume this project after CLI fixes land and the user can test clean bootstrapping flows.

## Next Steps

- Complete `docs-init-fixes` project (CLI improvements)
- User re-tests bootstrapping with fixed CLI in both repo shapes
- Resume this project's discovery with clean feedback
- Decide on design depth (straight to plan vs lightweight design)
- Build the skill against the improved CLI
