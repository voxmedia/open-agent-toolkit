# review-remote helpers

Tested helper modules backing the remote review-provide skills
(`oat-review-provide-remote`, `oat-project-review-provide-remote`):

- `marker-parser` — parse/emit the posted-review HTML-comment marker block.
- `body-builder` — build the posted-review body + verdict mapping; out-of-diff findings section.
- `line-mapper` — map findings to in-diff inline-comment positions (`gh api .../files` patch + `gh pr diff`).
- `narrowing` — re-review scope narrowing with the stale-SHA existence/ancestry guard.
- `project-resolver` — resolve the OAT project from a PR diff (`.oat/projects/*/*/state.md`) + `--project` override.
- `capability-probe` — detect whether `agent-reviews` exposes a posting flow (it does not as of 1.0.2; `gh api` is the path).
- `worktree` — ephemeral, repo-scoped worktree lifecycle for `gh pr checkout`.
- `reviewer-dispatch` — Tier-1 `oat-reviewer` structured-output dispatch wrapper.

## ⚠️ Runtime relationship to the skills (drift risk)

These modules are the **tested reference implementation**, but the skills do
**not** import or call them at runtime. Each `SKILL.md` currently executes
equivalent logic inline via bash / `jq` / `gh`. So CI proves these modules are
correct, but the module code is **not** what runs when a skill fires — the
skill prose is.

**Consequence:** the inline skill logic and these modules can drift apart
without any test failing. When you change review-posting behavior, update
**both** the relevant module here **and** the mirrored step in the two
provide-remote `SKILL.md` files, and keep them in sync. Treat these modules as
the canonical spec for the behavior the skills describe.

**Follow-up:** `bl-a7cd` tracks the proper fix — add an `oat review
provide-remote` CLI command that calls these modules, and rewrite the skills to
invoke it, so the tested code becomes the runtime and drift becomes impossible.
