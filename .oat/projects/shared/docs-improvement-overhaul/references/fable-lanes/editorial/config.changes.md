# Config guidance editorial corrections: change log

Worktree: `/Users/tstang/orca/workspaces/open-agent-toolkit/docs-overhaul-readme-visual`.
Nothing was committed, stashed, or reset. Paths below are under `apps/oat-docs/docs/`.
Every hunk sits inside the added guidance section, except the S6 callout conversions noted for `reference/configuration.md` and `remote-project-management.md`.
No headings that other pages link to were renamed. New `###` subheadings exist only inside guidance sections.

## Per file

- **workflows/choose-workflow.md**: Rewrote "Which mode should I choose?". It now has a one-line definition of a mode and an OAT project, a readable table, and a plain explanation that `oat project new` defaults to spec-driven but only creates files. Four "If you ..., choose ..." lines cover the solo bug fix, the team feature, high-risk or regulated work, and an existing plan. The **Recommendation** line is gone.
- **workflows/projects/planning/design-modes.md**: Rewrote "Choosing an interaction mode". It has a readable table, the precedence order in plain sentences, and the rule that quick-start treats `selective` as collaborative. Four if/then lines replace the recommendation. Dropped the vague "autonomous rules can add stop boundaries" (recorded in the ledger).
- **workflows/projects/planning/hill-checkpoints.md**: Rewrote "Choosing checkpoint frequency". It defines a HiLL checkpoint and covers S3: a WARNING callout says the first non-autonomous run uses `workflow.hillCheckpointDefault` without asking and replaces an existing `plan.md` value; after that the `plan.md` value applies and later config changes do not affect the project; and it says what to do. It keeps the autonomous behavior: the setting is ignored, final-only is written when the value is absent, a valid existing value is kept, and checkpoint review runs without waiting. It ends with three if/then lines.
- **workflows/projects/lifecycle.md**: Rewrote "Choosing lifecycle controls". It now defines the four controls (planning checkpoints, implementation checkpoints, artifact loops, gates) and states that the required per-phase and final reviews always run. It gives the decision order with links and four if/then lines. "Extra reviews add latency, not guaranteed independence" became a plain sentence.
- **workflows/projects/reviews/index.md**: Rewrote "Choosing review controls". The table has default, when-to-change and cost columns, and links to each section on the page. It explains the same-session artifact loop, the retry limit, and autonomous auto-review. Five if/then lines replace the recommendation; the "Default rationale ... not established" note was removed.
- **workflows/advanced/workflow-gates.md**: Rewrote "Choosing gate posture" into short subsections:
  - It defines gate, model family, runtime and exec target.
  - It covers user versus shared layer, the `onFailure` table, and the rule that operational failure is never a pass.
  - S6(e) is a WARNING callout on the `same-family` fallback with `diversity.achieved`.
  - It keeps the `--avoid` table, adds target setup and the timeout order, and gives if/then lines for solo, team, high-risk, CI and mixed-provider teams.
  - The "Historical reasons ... not established" note was removed.
- **workflows/advanced/dispatch-ceiling.md**: Rewrote "Choosing policy and ladder ownership":
  - It defines dispatch policy and ladder.
  - S6(d) is a WARNING callout: config policy overrides every project's choice; leave the keys unset.
  - It keeps the policy table, explains why there is no default, and covers the cap-tier reviewer.
  - It has if/then lines for policy and for ladder scope (team, solo trial, single-checkout test).
  - The provider enforcement summary links to Provider Enforcement.
  - "Local config can produce tracked roles" became a concrete sentence.
- **reference/configuration.md**:
  - S6(d): the sentence "Configured policy overrides project state ..." in the legacy-preset paragraph after the `workflow.*` examples became a WARNING callout.
  - Rewrote "Choosing a config layer". It defines the three layers and their precedence and has a readable table. The no-flag default destinations and single-layer keys are in plain sentences. Four if/then lines link to "Choosing the right surface". The environment-alias note is clarified, and "This is practical guidance, not undocumented historical intent" was removed.
- **reference/config-and-local-state.md**: Rewrote "Choose before writing configuration". It names the three layers, explains what `oat config describe` and `oat config dump --json` show, and has two if/then lines.
- **getting-started/tool-packs.md**: Rewrote "Choosing packs and their ownership":
  - It defines tool pack and scope, and keeps the need-to-pack table.
  - It explains plainly that installing does not adopt PJM, with a link to "Install vs. initialize".
  - The scope table is readable, followed by the facts about the user default, core being user-only, `--setup`, additive install versus `oat tools migrate`, and template ownership. This replaces "Project templates remain owner-owned seeds".
  - It has if/then lines.
  - The S6(a) WARNING says what the wipe does and how to restore, including that shared storage is restored with `oat pjm remote storage shared`.
- **docs-tooling/add-docs-to-a-repo.md**: Rewrote "Choosing Markdown or a site framework".
  - S5: dropped "bootstrap offers a leaner path". The MkDocs row now names the concrete differences: `setup-docs.sh` runs `pip install`, and nav sync rewrites the whole `nav:` block.
  - It states the Fumadocs non-interactive default without the rationale note.
  - It has if/then lines for Markdown, Fumadocs (build hooks versus `meta.json`, adding `--check` to CI), MkDocs, and existing docs (`--adopt`, `oat init --setup`, `oat docs migrate` preview).
- **provider-sync/commands.md**: Rewrote "Safe scope for routine refresh". It defines canonical assets, provider views and scope. S6(b) is a WARNING callout. It has if/then lines for repo-only, CI, personal and both.
- **provider-sync/scope-and-surface.md**: Rewrote "Choosing sync scope". It defines the terms and has a readable table. The S4 statement is kept as a clear sentence ("User scope never syncs rules ..."). It adds the S6(b) WARNING callout and if/then lines. The "Default rationale inference" note was removed.
- **provider-sync/config.md**: Split "Choosing providers and strategy" into "Which providers to enable" and "Links or copies". It has readable tables, the precise behavior of the re-enable prompt and warning, and the strategy editing rules. The fact that the OS symlink fallback copies silently is a plain sentence. S6(c) is a WARNING callout on copy churn. It has if/then lines for a Claude-only team, a mixed Claude Code, Cursor and Codex team, and a dropped tool. The "Recommendation (inference)" was removed.
- **provider-sync/instruction-sync.md**: Rewrote "Which instruction strategy should I choose?". It defines a shim, has a readable table, and states the documented reason for the `none` default in plain words, with a link to "Claude Code and AGENTS.md". It has if/then lines. The pre-existing "### Choosing a strategy" is untouched.
- **provider-sync/manifest-and-drift.md**: Rewrote "Choosing a stray disposition". It defines a stray and states the Keep eligibility and collision rule plainly. "Keep cannot hide canonical collisions. Reporting suppression proves neither correctness nor synchronization." was replaced with plain sentences. It has if/then lines.
- **workflows/backlog-and-planning/remote-project-management.md**:
  - S6(f): the replace-mode callout is reworded so it says what happens and what to set.
  - S6(g): the bindings callout now says every binding goes under `.oat/repo/pjm/remote/bindings/`, which is not gitignored, and what to review. The owner-routing fact moved to a plain sentence after the callout.
  - The shared-storage/local-project callout is reworded.
  - "Choosing bindings and policy" was rewritten. It defines binding, intake and publish, then has subsections for the description policy, authority (including preview digest and approval floors), provider overrides, and storage. Each subsection has if/then lines, and the "Recommendation (inference)" was removed.
- **Ledger** (`.oat/projects/shared/docs-improvement-overhaul/references/config-editorial-facts.md`): Appended "Editorial correction pass (2026-10-02)". It records each removed provenance note with its source final, the documented reasons kept, the S4 code evidence, and the dropped design-modes phrase.

## Verification

- `pnpm exec oxfmt --write` on the 17 pages and the ledger: exit 0.
- `markdownlint-cli2` (app-scoped) on the 17 pages: 0 errors.
- `pnpm -s docs:validate`: exit 0. It reported 14 topic paths, 20 README occurrences, nav freshness and routes/anchors validated, and 71 skills current.
- `git diff --check`: clean.

## Not resolved / open

- S6(a) appears only on `tool-packs.md`. The remote page does not mention `pjm init` re-runs, so no callout was added there; the owner can choose whether to add one.
- `workflows/advanced/workflow-gates.md` still has the pre-existing `:::note` release-note block near the top. That block uses a different admonition syntax from the `> [!NOTE]` form documented in `contributing/markdown-features.md`. It is outside scope and was left untouched.
- Resolved during the pass: `oat config unset` with no layer flag removes a `workflow.*` key only from local config (`packages/cli/src/commands/config/index.ts:1577`, `:2935`, `:4102-4128`). The hill-checkpoints callout now tells readers to unset the key from the layer that sets it, for example `--user`.
