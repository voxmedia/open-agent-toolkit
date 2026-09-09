# Source context for recon rework

This is a planning evidence map, not a new audit or a passed plan review.
Paths in the tables are relative to this repository. Anchors were inspected at
`5d2bddf48a31bae92a8c18e28806731b2651efb8` on 2026-09-09 and must be re-anchored
if the implementation base changes.

## Input precedence

1. Thomas's clarified intent and drafting authorization in this session,
   synthesized in discovery.md.
2. Current repository source and governing decisions, subject to the explicitly
   requested decision change.
3. The scoped compatibility findings from the Codex critique and source inventories.
4. Earlier triage/audit/proposal text as historical evidence only.

The original wave-7 proposal contains superseded sections and later amendments.
It is not the implementation contract. In particular, do not restore automatic
consequential routing for adversarial passes or justify cheap quick compilation
with nonexistent later semantic review.

## Confirmed chronology

- W1–W6 and the metadata.version migration landed before this project.
- The baseline recon skill is 1.1.1; the installed 1.1.0 skill differed in version
  frontmatter, not the substantive run-wide routing rules.
- A prior recon run classified compile as default implementation and propagated
  that stronger selection to every map/gather lane.
- The audit identified the run-wide maximum and homogeneous-run contract.
- Codex rejected a standalone prose-only tier because it retained that maximum,
  omitted modes, and lacked a versioned compatibility design.
- Thomas clarified that cheap extraction/checking/challenge is the core intent;
  compilation only escalates when real reconciliation needs judgment.
- Thomas confirmed approved per-wave selection as the guarantee.
- Thomas explicitly chose a separate quick project with drafted design/plan and
  review deferred until handoff. This project is not blocked on triage approval.

## Source map

| Surface                                       | Verified baseline anchor                                                     | Planning implication                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Recon purpose and caller boundary             | `.agents/skills/recon/SKILL.md:14-28`                                        | Already evidence-oriented; make cost intent explicit                   |
| Run-wide maximum and single target            | `.agents/skills/recon/SKILL.md:114-171`                                      | Main policy change                                                     |
| Source/authority preflight                    | `.agents/skills/recon/SKILL.md:94-111`                                       | Preserve read-only/strict guarantees                                   |
| Profile topology                              | `.agents/skills/recon/references/profiles.md:8-58`                           | Quick has no semantic worker; standard/thorough retain required passes |
| Existing approval contract                    | `.agents/skills/recon/references/packet-contract.md:91-116`                  | Intended execution, not proof of actual launch                         |
| Immutable normalized graph                    | `.agents/skills/recon/references/packet-contract.md:41-75`                   | One validation boundary remains                                        |
| Ten modes and five classes                    | `.agents/skills/recon/scripts/lib/contracts.mjs:44-62`                       | Exhaustive policy coverage                                             |
| Execution keys, fingerprint projection, waves | `.agents/skills/recon/scripts/lib/contracts.mjs:223-397`                     | Reuse projection; version closed field sets                            |
| Global schema gate                            | `.agents/skills/recon/scripts/lib/contracts.mjs:1936-1968`                   | Replace with kind/version dispatch, not global v2-only                 |
| Approved lane validation                      | `.agents/skills/recon/scripts/validate-packet.mjs:682-790`                   | Legacy conditional waves skip lane-outcome checks                      |
| Required pass derivation                      | `.agents/skills/recon/scripts/validate-packet.mjs:793-846`                   | Conditional flags cannot suppress required profile work                |
| Approval hash recomputation                   | `.agents/skills/recon/scripts/validate-packet.mjs:1922-1942`                 | Verify original wire approval before normalization                     |
| Final composition                             | `.agents/skills/recon/scripts/validate-packet.mjs:2050-2085`                 | Integrate routing before final assurance derivation                    |
| Renderer boundary                             | `.agents/skills/recon/scripts/render-packet.mjs:255-360`                     | Consume validated graph; retain atomic publication                     |
| Worker modes and uncertainty                  | `.agents/skills/recon/references/worker-contract.md:23-71`                   | Cheap scoped challenge fits existing leaf contract                     |
| Canonical role                                | `.agents/agents/recon-worker.md:17-24`                                       | Keep worker authority and output contract explicit                     |
| Caller judgment                               | `.agents/skills/subagent-orchestration/SKILL.md:29-44`                       | Preserve root accountability                                           |
| Broad classification wording                  | `.agents/skills/subagent-orchestration/SKILL.md:46-72`                       | Clarify task interpretation without weakening consequential floors     |
| Generic wave homogeneity                      | `.agents/skills/oat-dispatch-subagents/SKILL.md:413-432`                     | Existing dependency already separates unlike wave targets              |
| CLI prose pins                                | `packages/cli/src/validation/skills.test.ts:6341-6496`, `:8405-8422`         | Preserve active-provider loading; replace obsolete single-target pins  |
| Bundle consistency                            | `packages/cli/src/commands/init/tools/shared/bundle-consistency.test.ts:458` | Include new runtime helper/library                                     |
| Public docs                                   | `apps/oat-docs/docs/workflows/skills/recon.md:46-76`                         | Synchronize approval and output explanation                            |

## Governing decisions

- `DR-260831-approval-bound-homogeneous.md:17`: requires one model/effort
  across the run; must be superseded.
- `DR-260904-remove-dispatch-receipt-chain.md:17-21`: preserve receipt removal;
  amend both its singular-target Decision paragraph and reaffirmation of the
  homogeneous-run decision.
- `DR-260719-separate-recon-authority-from.md:17-21`: preserve independent
  authority and capability axes.
- `DR-260719-keep-final-judgment.md:17-21`: workers return evidence; the primary
  reviewer reopens sources and owns final judgment.
- `DR-260719-full-reviewers-are-not-recon.md`: relevant boundary when reviewing
  shared classification changes; full reviewers must not inherit cheap-worker defaults.

No new decision has been finalized in this drafting run. Task p01-t01 owns the
record through the installed decision workflow after review/readiness.

## Tests and producers

Current Node suites:
`integrity-contracts.test.mjs`, `packet-validation.test.mjs`,
`render-packet.test.mjs`, `review-brief.test.mjs`,
`skill-contract.test.mjs`, `workflow.integration.test.mjs`.

Fixtures live in `tests/fixtures/packet-fixture.mjs`; the workflow harness is
`tests/helpers/fake-recon-run.mjs`. That harness is test-only; it is not a
native launcher. Use production routing helpers in the new tests so a fake
implementation cannot validate itself.

`create-review-brief.mjs` and `reconcile-ledger.mjs` emit evidence kinds v1.
The proposed manifest-only version change deliberately keeps those formats
unchanged. Test the mixed kind/version composition explicitly.

There is no production native controller/launcher under recon/scripts. The
controller is the skill executed by the host agent. Actual-launch evidence must
not be fabricated to satisfy packet validation.

## Baseline environment observations

- Worktree started clean on branch `recon-rework`.
- `SKIP_S3_ARCHIVE_SYNC=1 pnpm run worktree:init` completed successfully; no
  tracked bootstrap changes. Remote archive copying was irrelevant to planning.
- Bootstrap inherited a stale pointer to nonexistent
  `.oat/projects/shared/agent-provider-root`; the normal scaffold repointed this
  checkout only. No existing project was absorbed or retired.
- Scaffold commit: `dca0c54bfbe209107cd5bf8911319303112367b7`.
- PJM adoption is declared. PJM doctor returned warn/exit 1 for existing completed
  ledger references to still-open backlog items. Those warnings are outside this
  project's drafting scope and were not repaired.
- No shared/local/user dispatch configuration or gate settings were changed.
- Canonical skill versions use metadata.version; the root AGENTS.md still has an
  older top-level wording. Follow the shipped migration convention rather than
  reintroducing aliases.

## Historical local inputs

These pointers aid provenance but are not needed to understand or execute the
draft contract:

- `/Users/tstang/Downloads/backlog-triage-2026-09.md` — tool-free session export.
- `/Users/tstang/Downloads/recon-routing-audit.md` — factual root-cause audit;
  its compile-review rationale and consequential-default proposals are withdrawn.
- `/Users/tstang/Downloads/wave-7-codex-review.md` — use Lane A and relevant
  approval/version notes; unrelated recap/wave lanes are excluded.
- `/Users/tstang/Downloads/wave-7-proposal-draft.md` — mixed historical/current
  draft; this project's discovery/design/plan supersede it for recon.
- `repo-improve-wave/.oat/repo/pjm/triage/2026-09-08-post-program-triage.md`
  on branch `backlog-triage-2026-09` — proposed triage owned by the other session.
- Fable session: Claude Code `605305a6-995c-45ad-b818-a5532d6dc5ec`, recorded cwd
  `/Users/tstang/orca/workspaces/open-agent-toolkit/repo-improve-wave`.

Do not silently inspect unrelated sessions, contact the peer, cherry-pick triage,
or make cross-worktree changes as part of implementation.
