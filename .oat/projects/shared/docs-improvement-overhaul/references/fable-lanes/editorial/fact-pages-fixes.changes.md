# Fact pages fixes: change log

Worktree: `/Users/tstang/orca/workspaces/open-agent-toolkit/docs-overhaul-readme-visual`
(`0062ba850`). Source: `corrections/fact-sheet-pages.verify.md`. Nothing
committed. Only the five pages below were edited (plus this log and
`fact-sheet-errata.md`).

## provider-sync/pilot-with-a-team.md

- P1 (blocking): status paragraph rewritten. Plain `oat status --scope project`
  exits 1 for missing, drifted or stray; `--hook` prints one warning line and
  exits 1 only for missing or drifted. Confirmed: `status/index.ts:1247-1259,1586`
  and a scratch run.
- P2 (blocking): "removes a view whose canonical file was deleted" narrowed to
  skills and rules; new "Agents are the exception" paragraph with the manual
  cleanup (Cursor and Claude agent links, Codex toml and `[agents.<name>]`
  table); pointer sentence added after "add, rename, or delete". Confirmed by a
  scratch run.
- W1 (blocking): Codex table cell now says sync turns on `multi_agent`, raises
  `max_depth` to at least 2 and keeps your other settings. Confirmed:
  `config-merge.ts` and a scratch run.
- L1: "Rules, Codex agent files and Cursor's per-model agent variants are
  generated copies". Confirmed: Cursor base agents are symlinks in the run.
- L2: observed-outputs sentence now includes rule copies; Providers link kept.
- L3: fresh-clone caveat upgraded (macOS fresh clone checked; Windows not).
- L4: "can also write in your home directory".
- L5: `git status` shows `.oat/` (which holds the manifest).

## provider-sync/scope-and-surface.md

- P2: design-principle bullet now limits removal to skill and rule views and
  states the agent exception, linking to Manifest and Drift.
- P2: the WARNING callout under "Choosing sync scope" now says sync removes the
  view of a deleted skill or rule and does not clean up after a deleted or
  renamed agent, with a link to the manual steps.

## provider-sync/manifest-and-drift.md

- P2: Mermaid block untouched (it has no "removes it if canonical deleted"
  edge label in this worktree; nothing to preserve or change). The adjacent
  "What re-running `oat sync` does" bullet now says skills and rules are
  removed, agents are not.
- P2: new `> [!WARNING]` callout at the end of Quick Look with the exact error
  text and five manual cleanup steps. The steps were executed in a scratch
  repo: after them `oat sync` and `oat status` exit 0 and nothing is recreated.

## reference/what-oat-writes.md

- 4f: opening paragraph states the removal procedure was run end to end twice
  (original and independent re-run) and returned repo and home to pre-OAT state.
- W2: short-version bullet: `oat init` and `oat sync` use scope `all`;
  `oat tools install <pack>` installs a not-yet-installed pack under the home
  directory (user scope). Confirmed by a scratch run (`Scope: user`).
- W1: intro sentence and Codex provider-table cell corrected (adds
  `[agents.<name>]`, sets `multi_agent = true`, `max_depth` at least 2).
- W7 (nit): manifest "Team choice" bullet: rewrite happens when a sync changes
  a view or runs under a different CLI version. No-op sync byte-identical
  confirmed by a scratch run.
- W8 (nit): step 1 notes the terminal provider selection.
- W3: step 4 names the seven packs and points to the PACK column of
  `oat tools list --scope project`.
- W5: step 5 "does not exist or that Git does not track; otherwise `git rm`
  stops without removing anything".
- W4: step 8 condition inline; otherwise delete only `~/.oat` and what OAT
  installed under `~/.agents`; notes other tools read `~/.agents/skills`.
- W6: history paragraph: deleting the ref removes the ref, not the data.
- W9 (nit): heading renamed "Known surprises in 0.3.14"; the three in-page
  anchors updated to `#known-surprises-in-0314` (no other page linked the old
  anchor; grep confirmed).

## getting-started/quickstart.md

- Q1: first-success section now leads with the terminal prompts (providers,
  optional hook, guided setup), says answer no to guided setup, and "Apart from
  your answers, ... writes only these files"; the trailing paragraph reduced to
  the `--scope project` home-directory sentence. Confirmed: `init/index.ts`
  (source only, no TTY).
- Q2: Provider Sync path: add a skill first; with no skills sync reports
  `No changes required.` Confirmed by a scratch run.
- Q3: Workflows path: Claude Code reads skills only from `.claude/skills/`;
  Cursor, Codex, Copilot and Gemini read `.agents/skills/` directly; enable
  Claude and sync after installing. Docs path: short pointer with the same two
  commands. Confirmed: `nativeRead: true` in cursor/codex/copilot/gemini
  `paths.ts`; scratch run showed no `.claude/` after install and a
  `.claude/skills/oat-project-quick-start` link after enable + sync.
- Q4 (nit): "makes that command fail with an error".

## Checks

- `pnpm exec oxfmt --write` on the five files: exit 0 (re-padded the pilot
  Mixed tools table and the what-oat-writes provider table).
- `pnpm -s docs:validate`: exit 0, no message naming these files.
- `pnpm -s docs:test`: exit 0, 58/58 pass.
- `markdownlint-cli2` on the five files: 0 errors.
