# Orchestration log

## 2026-10-01 — Docs IA collaboration

### Confirmed topology

- The user views Orca on the laptop; Codex and Fable execute on the Mac mini in this worktree.
- The laptop-owned runtime is `5c02600b-ff8e-43e8-8747-3cab54da4bda`, reporting app version `1.4.216`.
- The Mini-local runtime is `549769de-ddb1-4f3c-906f-469c3f04dbe6`, reporting app version `1.4.200`. It is a different inventory, not evidence that the user's panes are absent.

### Friction and recovery

- The tool shell lacked the controlling session's Orca environment and relay PATH entry. Both login and non-login tool shells resolved `/usr/local/bin/orca` to the Mini-local app.
- Exact-cwd process inspection found the actual Codex and Claude processes. An output allowlist recovered only their PATH and non-secret Orca identity fields; no unfiltered environment or credentials were displayed.
- Both processes had `/Users/tstang/.orca-relay/bin` first on PATH. Explicitly invoking its `orca` reached the laptop-owned runtime and returned both sibling panes with the same tab/worktree identity and SSH execution host.
- Correct executable selection must precede terminal discovery. Empty inventory, a matching filesystem path, and a successful status response do not establish that the correct runtime answered.
- The local app UI inspection was also the wrong surface. The user's screenshot correctly showed both agents in the laptop app.

### What worked

- Reading executable-matched native guidance and pinning the exact runtime/worktree/terminal identities.
- Reading the peer pane before sending; its output confirmed Fable 5.1 high and an idle prompt.
- Sending one bounded IA brief through the relay with submission observation returned both `input_accepted` and `turn_started`. This proves a turn started, not completion or consensus.
- Bounded Luna xhigh reconnaissance compared docs entrypoints and returned file references without editing files.

### Skill refresh

- User authorized updating Orc skills. Installed from the clean `orc` refresh worktree at commit `2bb1117` on the Mini.
- Before: four stale skills, one missing, two current. After: all seven current; recursive comparison of `orca-orchestration` matched source.
- Provider sync succeeded and reported restart-required visibility for changed provider assets, plus OAT manifest version skew (`0.3.10` manifest, `0.3.9` invoked). Installation is verified; fresh-session catalog acceptance and laptop installation are not claimed.

### Follow-up

- Add a narrowly scoped Orc guidance update for tool-shell relay/environment loss, safe recovery, and the distinction between runtime inventory and pane existence.
- Keep the existing broad ADE guidance refresh independent; do not duplicate or overwrite its work.
- Continue recording delivery and reply evidence, failures, and refinements as IA collaboration proceeds.

### User-directed refinement

- Preflight must identify the machine hosting the app immediately, separately from the execution host and the answering runtime. The user explicitly confirmed laptop app / Mini sessions.
- Fable received the return-address command and acknowledged the counterproposal, but requested direct human confirmation in its own pane before peer sends. Parent continues bounded readback; do not treat root-to-peer text as an independently authenticated human message.

### Worker startup failure

- A supervised GPT-6.1 Sol high worker was created in `/Users/tstang/orca/workspaces/orc/orca-app-host-preflight` through the correct laptop-owned runtime.
- Run `run_9f2fb5b05ddb`, task `task_6a72dadfc268`, initial dispatch `ctx_d15b14ac172b`.
- Native startup returned `outcome_unknown` / `turn_start_unobserved`, with input accepted and residual resources preserved.
- Bounded terminal read showed a Codex update menu received the injected submission. It ran the updater from `0.159.3` to `0.160.0`, printed success and restart instructions, then returned to the shell. This was not worker execution or an intentionally selected update step.
- Preserve this as a concrete readiness-detection gotcha. Inspect before retrying; absence of a turn-start signal alone does not justify duplicate workers. Here the returned shell and restart message establish that the initial agent exited.

### Peer communication resolution

- The user explicitly authorized direct communication in Fable's pane. Peer replies then arrived at the root session via `terminal send` and were treated as attributed advisory input, not new human authorization.
- Codex and Fable converged on the IA proposal recorded in `ia-consensus.md`. This is agent consensus awaiting user review, not approval to implement.

### Second startup failure and native fallback

- The initial dispatch was stopped and released before retrying the same bounded assignment.
- Retry dispatch `ctx_c98367e3ad04` created a visible Codex 0.160.0 prompt but timed out at `agent_readiness`; no assignment text was delivered.
- Release closed the agent terminal and captured its archive, but process-stop verification failed with `kill EPERM`, leaving `release_unknown`.
- After `worker-show`, a fresh documented `worker-release` retry returned `retained`, reason `identity_unproven`, and `processAction: none`. Do not claim the process was stopped or resource cleanup completed. Do not escalate to an unscoped process kill.
- A native Codex helper, `/root/orca_skill_refinement`, was then dispatched with the fixed GPT-6.1 Sol high agent role to work in the already-created Orc worktree. This is a parent-attached helper, not a successful supervised Orca worker or a verified standalone pane. It owns only the narrow skill refinement and draft PR, preserving unrelated setup output.
- Root retains the residual Orca cleanup concern. No failed dispatch is credited with executing the task.

### Narrow follow-up publication

- The native GPT-6.1 Sol high helper completed the narrow four-file guidance patch in the Mini execution-host worktree `/Users/tstang/orca/workspaces/orc/orca-app-host-preflight`, branch `orca-app-host-preflight`.
- Root independently reviewed the diff against this session's observations. The patch separates app/session/runtime identity, pins the verified executable, uses safe pre-output environment filtering only when necessary, and preserves readiness/release uncertainty.
- The broad ADE refresh was already merged as Orc PR #45 on the worker's base; this patch does not duplicate that pending work.
- Draft PR: [tkstang/orc#46](https://github.com/tkstang/orc/pull/46), commit `dce47635206257400f3a2719d5cb447a3d90b592`. Root verified the open/draft state, exact head, and four intended changed paths. CI was in progress at this checkpoint, not reported green.
- The helper reports formatting, prose-coherence tests, forced typecheck/build, lint, tests, link/version checks, and normal commit/push hooks passing. These are repository checks, not a new live relay/readiness/release acceptance run.
- Unrelated setup output in `.oat/sync/manifest.json` remains unstaged in the Orc worktree. No merge, installation of this new patch, deployment, or residual worker cleanup occurred.
- Helper identity is `/root/orca_skill_refinement`; a separate provider session UUID was not available to root at this checkpoint. Native parent-attached execution is known; independent pane/session visibility is not claimed.
