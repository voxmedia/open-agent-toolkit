# Orchestration log

## 2026-10-02 — Follow-up publication and throughput

- PR47 merged at14:14:03Z while the helper held. Root preserved its checkout and created a new Orca-managed Mini worktree `/Users/tstang/orca/workspaces/orc/parsed-cli-help-guidance`, branch `parsed-cli-help-guidance`, base15d1e0513bb3266cb2710eb74cdeb0b11477619d. Display/app host remains laptop; execution host is Mini. Registration is verified, not a standalone helper chat.
- Same parent-attached GPT-6.1 Sol/high helper added parsed-contract/FIFO guidance and the new PR-scoped1.3.5 bump. Root reviewed, committed491d1ab58fe5514d141820eb2ce077f5a0c1555a and opened draft [Orc PR51](https://github.com/tkstang/orc/pull/51). Verified open/draft/exact head; CI had no results at that read. Full validation executed608 tests with11 skipped; lint/format passed; typecheck10 tasks and build6 tasks were cached. No merge, install or deployment.
- Orc initialization ends in `oat sync --scope all`. Root authorized a temporary invocation-local wrapper changing only that exact argv to project scope, avoiding user provider writes for this bounded helper. Project scope observed, wrapper removed, only its generated manifest-version scalar restored; no tracked init or global PATH changes.
- User flagged slow throughput. Avoid further custom receipt expansion and duplicated phase gates; retain required conservation/review evidence and parallelize file-disjoint authoring. This is not permission to omit acceptance criteria or call provisional QA complete.

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

### Post-merge installation on both hosts

- User merged Orc PR #46 and explicitly requested installation on both Macs. Verified merged commit `bbb5a11cd8c5588d5a13d999a4f53ccc584df7b0`; fast-forwarded both clean primary Orc checkouts to that revision.
- Dry runs found one stale skill on the Mini and four on the laptop. Ran the standard skills installer on each host without force or pruning. Final dry runs reported all seven current; independent recursive comparisons verified all seven installed skill trees match source on both machines. `orca-orchestration` is version `1.3.3`.
- Laptop SSH installation copied the skills successfully but its provider-sync subprocess failed with `spawn oat ENOENT`. A login-shell lookup located the existing `oat` under the host's user pnpm directory. Retried the installer with only that invocation's PATH adjusted; installation and provider sync then exited zero. No global shell configuration changed.
- Mini provider sync required no changes. Laptop sync updated managed Codex configuration and reported restart-required visibility. Installed files and sync are verified; fresh provider-session catalog acceptance is not claimed. Both primary Orc checkouts remained clean.

### Preserving a peer's unsent input

- Before requesting design review, relay `terminal read` reported a nonempty draft in Fable's pane even though the visible tail showed an empty prompt. Treat the draft field conservatively; do not assume the screen tail proves there is no human input.
- Root asked the user to submit or clear that draft and withheld the peer send. No control-key clearing, extra Enter, or duplicate prompt was sent. The draft's substance was separately confirmed by the user in root's conversation; that confirms the design choice, not permission to manipulate the peer's input buffer.
- Existing draft-protection behavior is working as a safety boundary. This observation alone does not establish a new Orc bug or justify another PR.

### Resumed panes and autonomous planning

- After the interruption/disk incident, the old Fable terminal handle reported exited. Fresh worktree inventory found the resumed same Claude session (`3483d7f2-3893-40d6-96b6-0a84dc51d773`) at `term_f32007f0-f26b-4f65-9c4e-51d17d13ce56`; root's return address changed to `term_71bcc5f9-76bd-4673-aa39-3e26fb55c713`. Relay/runtime and Mini execution host remained the same. Re-discover process incarnations rather than reusing dead terminal handles.
- Root supplied the new return address and received direct Fable review messages. Sends reported accepted and turn_started; this is observed submission, not proof of review completion. Later actual reviews supplied completion evidence.
- User explicitly selected High policy and autonomous design/plan collaboration. Remaining benign pane drafts were continuation/review instructions already within that authority; root appended a clearly attributed peer request without clearing text. This is not a general license to submit unrelated or consequential human drafts.
- On resume, df reported 24 GiB available, not the earlier 2.3 GiB peer snapshot. No cleanup performed by this session. Only planning artifacts and review bookkeeping changed.

### Draft-safe peer delivery and independent browser surfaces

- Root native CUA controls Zen on the Mini; Fable's Orca relay computer-use controls the laptop. Different process IDs and application sets establish separate displays. Final Fable Zen control is user-approved but still needs dedicated-window/reachability proof at execution; no laptop browser was driven during phase 1.
- A nonempty human draft remains in Fable's pane. Root does not append, clear or submit it. Structured Orca messages enqueue without touching that draft, but this legacy terminal-only recipient is not durable after terminal closure and enqueue is not consumption or a wake guarantee. Optional submit/clear request was sent asynchronously; local implementation is not waiting on it.
- A bounded native mechanical-recon helper and GPT-6.1 Sol medium documentation worker prepared separate Orc worktree /Users/tstang/orca/workspaces/orc/docs-qa-orchestration-guidance on the Mini. Root verified the five-file guidance diff and opened draft PR [tkstang/orc#47](https://github.com/tkstang/orc/pull/47), head69fa78ae5411cf4c5f4da81c89e7a7380f3d220c. The changes cover display-host identity, draft preservation and recipient-lifetime limits; no terminal-close fault test is claimed.
- Orca CLI worktree registration is verified; a standalone provider session/chat is not claimed for the parent-attached native helper. Checks passed with type/build cache replay disclosed. PR47 is not merged or installed; the prior PR46 installation on both hosts remains the current installed state.

### User override: send directly rather than stopping on a draft signal

- On 2026-10-02 the user corrected root: "I didn’t have unsent text if this happens again just send it" and explicitly asked to record this in this log. For this authorized Codex/Fable collaboration, a reported draft alone must not cause another submit/clear question or lifecycle stop: send the attributed peer request directly, without clearing input or duplicating an accepted request.
- Historical evidence stays qualified: the relay reported a draft, while the user disputed having unsent text; Fable subsequently reported that an earlier human draft prevented its queued request reaching it. An adapter draft field is not independent proof of who entered the text, its current UI state, or whether a queued message was consumed.
- On resume the actual pane read omitted the draft field. Root sent directly using the pinned laptop relay and exact Mini-hosted peer terminal, request 66d8973c-6ee0-410e-8e65-c0f641e78bd7. The receipt proves input_accepted only, not turn_started. Do not resend on that warning or equate acceptance with review completion.
- Fable's actual map review arrived via the user and supplied independent completion evidence. The prior STOP remains historical; communication resumes and R1/R2 corrections proceed without another user checkpoint. This override authorizes peer-review prompts, not clearing text, executing unrelated consequential commands, or changing the execution host.

- A bounded GPT-6.1 Sol/high native helper refined this distinction in the existing separate Orc worktree. Root reviewed its four-file diff, committed and pushed3b7e1c55f89bf6b520969c5092f92519e1076860 to draft [tkstang/orc#47](https://github.com/tkstang/orc/pull/47). Full post-commit worktree validation passed; type/build cache replay is disclosed in implementation.md. Remote branch and GitHub API confirm the head. Not merged or installed; no fresh-provider acceptance claimed. The historical phrase “human draft” above is not a verified authorship finding and is superseded by this qualified evidence.

### Parsed CLI help and FIFO acknowledgment

- On this relay/runtime, `orca orchestration check --help` unexpectedly returned a consuming Delivery rather than help. Use `orca agent-context --json` to inspect parsed command contracts instead of assuming a help flag is read-only. This is a dated observed gotcha, not a general diagnosis of Orca internals.
- Root had already read all three rows via peek and processed them durably. The supported schema names `orchestration check --ack <delivery_id>`, not an `orchestration ack` command. Root acknowledged exactly `delivery_2f474fdba537` after complete batch processing; the result confirmed that acknowledgment and an empty next batch. No unseen mail was acknowledged.
- For the new format-boundary question, the queued message and direct inbox nudge were distinct actions. Input acceptance was not promoted to turn-start evidence; Fable's actual inbox reply supplied independent response evidence.
