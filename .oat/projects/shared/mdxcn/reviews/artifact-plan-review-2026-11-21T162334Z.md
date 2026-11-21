---
oat_generated: true
oat_generated_at: 2026-11-21T16:23:34Z
oat_review_scope: plan
oat_review_type: artifact
oat_review_invocation: gate
oat_project: .oat/projects/shared/mdxcn
oat_gate_headless: true
oat_gate_run_id: 23f8980a-e7fd-46f5-b533-dc1c9d19bd06
oat_gate_target: codex-6-sol-xhigh
oat_gate_runtime: codex
oat_invocation_model: gpt-6.1-sol
oat_invocation_reasoning_effort: xhigh
oat_invocation_source: exec-target-config
---

# Artifact Review: plan

**Reviewed:** 2026-11-21T16:23:34Z
**Scope:** The current mdxcn implementation plan, including its parallel phase boundaries and verification sequence.
**Files reviewed:** 5 project artifacts, plus the repository sources and upstream references cited below.
**Revision:** `2b41627f184ee2556978b80397489b4d7fc3e063`
**Integration base:** `76c224abfb1f63e452fd2388a545cae8971a61b3` (`origin/main`, fetched for this review).
**Commits:** Not applicable; artifact review.

**Dispatch audit (policy view):** `Dispatch: scope=plan action=review role=reviewer producer=unknown provenance=unknown model_axis=selected:gpt-6.1-sol effort_axis=selected:high dispatch_policy=high dispatch_ceiling=high target=oat-reviewer-gpt-6-1-sol-high`

The resolver report is schema version 1 and records the project policy. The gate invocation fields above are copied from the request and describe the configured gate invocation. Runtime identity remains not-reported. The gate-provided route helper returned `inline`: its provider runtime marker matches Codex, and model evidence is unavailable. The returned CLI root matched `OAT_GATE_CLI_ROOT`; no replacement reviewer was launched.

## Summary

The plan maps the requested fences, shared packages, scaffold wiring, and contributing guidance into bounded tasks. Two issues need correction before implementation: the static server component port omits removal of upstream React context, and an earlier task requires a release gate to pass before its version-bump prerequisite. Blocking findings are H1 and M1.

Findings by severity: 0 critical, 1 high, 1 medium, 0 low

## Review Scope

- Project: `.oat/projects/shared/mdxcn`.
- Type and scope: `artifact plan`, explicitly requested by the gate.
- Workflow mode: `quick`.
- Artifacts read: `plan.md`, `discovery.md`, `design.md`, `implementation.md`, and `state.md`.
- Requirements sources: discovery and the approved lightweight design.
- Spec and import reference: absent; not required for this workflow.
- State reports `design / complete`; this does not override the gate's explicit request to review the populated plan.
- The implementation journal is scaffolded. This review assesses planned work and does not claim completed implementation or a code-review range.
- No Dispatch Profile is declared; that is permitted. The p01/p02 write sets are disjoint, and their cross-package contract is deferred to p03.
- No newer `origin/main` commits touch the planned paths since the branch base.
- Existing uncommitted docs-app spike edits and `pnpm-lock.yaml` were context only. The project artifacts were committed and unchanged when reviewed.

## Findings

### Critical

None

### High

- **H1 — Remove upstream React context as part of the server component port** (`.oat/projects/shared/mdxcn/plan.md:319`)
  - **Requirement:** Discovery requires static server-rendered figures; design explicitly specifies server components and removal of the client boundary.
  - **Issue:** p02-t01 says to port the frame by removing `"use client"` and motion, but leaves its context architecture unaddressed. The proposed source contains `React.createContext`, a provider, and `React.useContext` in `GraphBody` and `GraphFrame`. See the [upstream frame](https://github.com/shadcn-labs/mdxcn/blob/main/registry/default/graph-frame/graph-frame.tsx) and the spike copy at `apps/oat-docs/registry/default/graph-frame/graph-frame.tsx:70`, `:94`, and `:283`. The design's assertion at `design.md:179` that removing state/effect hooks makes these components server-compatible overlooks context.
  - **Impact:** Following the listed port steps leaves a module that fails in the Next.js server component graph. Ordinary `renderToStaticMarkup` unit tests use a different React export and can pass. This violates the accepted server component design and delays discovery until the integrated docs build.
  - **Reproduction:** With the installed React 19.2.4, Node's `react-server` condition exposes neither `createContext` nor `useContext`; the ordinary condition exposes both. [Next.js documents the server component restriction](https://nextjs.org/docs/messages/context-in-server-component).
  - **Fix:** Amend p02-t01 and the corresponding design note to replace frame context with explicit props or a fixed default in the OAT copies, and update its consumers. Verify the adapted frame in the server component environment as well as with the already planned standalone Next.js build. Adding a client boundary would change the accepted design.

### Medium

- **M1 — Place the version bump before the first required release-validation pass** (`.oat/projects/shared/mdxcn/plan.md:866`)
  - **Issue:** p04-t03 runs `pnpm release:validate` and requires every command to pass, but p04-t04 is the first task that bumps the five public package versions. By p04-t03, preceding tasks have already committed shipped package changes.
  - **Cause:** `tools/release/validate-public-packages.ts:120` calls `findLockstepVersionBumpErrors` after detecting committed package changes. That function rejects packages still at their merge-base versions (`:104`). Both this branch and the fetched main currently use 0.3.50 for all five packages.
  - **Impact:** The p04-t03 exit condition cannot be met in the specified order. Its chained command stops at release validation before running the package-contract test, preventing clean task completion.
  - **Reproduction:** A read-only call to the actual validator with one planned package marked changed and the real current/base versions returned the lockstep-bump error. With all five versions advanced to 0.3.51, the same function returned no errors. These are simulated task states, not a claim that the unimplemented package changes were built or tested.
  - **Fix:** Move the lockstep bump before the p04-t03 validation, or defer this release-validation invocation to p04-t04 while retaining p04-t03's focused build and contract checks. Keep the final committed-tree gate sequence.

### Low

None

## Spec/Design Alignment

### Requirements Coverage

| Requirement                                                                                | Planned coverage        | Assessment                                           |
| ------------------------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------- |
| Eight named fences, meta, raw terminal body, source positions and existing transforms      | p01-t01 through p01-t03 | Covered                                              |
| Static figures, prose isolation, tree indent fix, inline code and namespaced CSS           | p02-t01 through p02-t04 | Partial: H1 addresses the omitted context adaptation |
| Fence/component parity and replay against real Fumadocs compilation                        | p03-t01                 | Covered                                              |
| Framework-scoped unknown-fence checker                                                     | p03-t02                 | Covered                                              |
| Default scaffold wiring and fresh app build using branch packages and CLI                  | p03-t03                 | Covered                                              |
| OAT adoption, additional real page and visual checks                                       | p03-t04                 | Covered                                              |
| Scaffold contributing pages, bootstrap/analyze guidance and durable authoring instructions | p04-t01 through p04-t03 | Covered                                              |
| Attribution, packed assets, skill bumps, lockstep versions and CI gates                    | p04-t02 through p04-t04 | Partial: M1 corrects the dependency order            |

### Extra Work

None identified. The capture replay, name-list contract, and release checks have concrete consumers in the accepted design and repository requirements.

## Verification Commands

Executed read-only on macOS arm64 with Node v26.11.1, pnpm 10.13.1, and the checkout's installed React 19.2.4. The pinned project Node version is 22.23.4; no full build or implementation-suite pass is claimed. The tested source revision is the Revision above; pre-existing uncommitted spike edits remained present and were not included in either focused probe.

The server condition check returned `createContext: undefined`, `useContext: undefined`, and `createElement: function`. The ordinary-condition control returned functions for all three:

```bash
pnpm --filter @open-agent-toolkit/docs-theme exec node --conditions=react-server --input-type=module -e 'import * as React from "react"; console.log(JSON.stringify({createContext: typeof React.createContext, useContext: typeof React.useContext, createElement: typeof React.createElement}));'
pnpm --filter @open-agent-toolkit/docs-theme exec node --input-type=module -e 'import * as React from "react"; console.log(JSON.stringify({createContext: typeof React.createContext, useContext: typeof React.useContext, createElement: typeof React.createElement}));'
```

The version-order probe returned one lockstep error before the simulated bump and an empty error list after it:

```bash
pnpm exec node --import tsx --input-type=module <<'JS'
import {findLockstepVersionBumpErrors} from './tools/release/validate-public-packages.ts';
import {getPublicPackageContracts} from './packages/cli/src/release/public-package-contract.ts';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const states=getPublicPackageContracts().map(contract=>({
  contract,
  changedSinceBase:contract.workspaceDir==='packages/docs-theme',
  currentVersion:JSON.parse(readFileSync(contract.workspaceDir+'/package.json','utf8')).version,
  baseVersion:JSON.parse(execFileSync('git',[
    'show','origin/main:'+contract.workspaceDir+'/package.json'
  ],{encoding:'utf8'})).version
}));
console.log(JSON.stringify({
  beforeBump:findLockstepVersionBumpErrors(states),
  afterBump:findLockstepVersionBumpErrors(states.map(s=>({
    ...s,currentVersion:'0.3.51'
  })))
},null,2));
JS
```

An initial `tsx -e` variant of the version probe failed because its CJS transform could not load the module's top-level await. The ESM command above completed successfully and supplies the reported evidence.

## Recommended Next Step

Run `oat-project-review-receive` to disposition H1 and M1 against the accepted discovery/design requirements, then correct and re-review the plan before implementation.
