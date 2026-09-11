import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkTerminalOutcome } from '../scripts/check-terminal-outcome.mjs';

const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);
const completionSkillPath = resolve(
  repoRoot,
  '.agents/skills/oat-project-complete/SKILL.md',
);
const lifecycleContractPath = resolve(
  repoRoot,
  '.agents/skills/oat-explainer-kit/references/lifecycle-contract.md',
);
const closeoutReferencePath = resolve(
  repoRoot,
  '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
);
const adapterSkillPath = resolve(
  repoRoot,
  '.agents/skills/oat-explainer-kit/SKILL.md',
);
const authorCallbackPath = resolve(
  repoRoot,
  '.agents/skills/oat-explainer-kit/references/author-callback.md',
);
const visualReviewCallbackPath = resolve(
  repoRoot,
  '.agents/skills/oat-explainer-kit/references/visual-review-callback.md',
);
const completionSkill = await readFile(completionSkillPath, 'utf8');
const lifecycleContract = await readFile(lifecycleContractPath, 'utf8');
const closeoutReference = await readFile(closeoutReferencePath, 'utf8');
const adapterSkill = await readFile(adapterSkillPath, 'utf8');
const authorCallback = await readFile(authorCallbackPath, 'utf8');
const visualReviewCallback = await readFile(visualReviewCallbackPath, 'utf8');

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  assert.ok(startIndex >= 0, `missing section start: ${start}`);
  assert.ok(endIndex > startIndex, `missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

test('resolves recap intent before one batched completion prompt and persists either answer', () => {
  const resolveIndex = completionSkill.indexOf(
    'Resolve `projectRecap` intent before presenting the batched completion prompt.',
  );
  const questionsIndex = completionSkill.indexOf(
    '**Questions to ask (in a single prompt):**',
  );

  assert.ok(resolveIndex >= 0, 'completion must resolve projectRecap intent');
  assert.ok(
    questionsIndex > resolveIndex,
    'intent resolution must precede the one batched prompt',
  );
  assert.match(
    completionSkill,
    /When resolution returns `needsPrompt: true`, add exactly one project-recap question to that same batched prompt/,
  );
  assert.match(
    completionSkill,
    /Persist either `generate` or `skip` as the returned `interactive` record before continuing/,
  );
  assert.match(
    completionSkill,
    /A valid persisted `oat_project_recap` decision prevents another prompt/,
  );
});

test('reuses only a fresh recap or invokes the adapter once and selects the final recap', () => {
  const summaryIndex = completionSkill.indexOf('### Step 3.5: Summary Gate');
  const recapIndex = completionSkill.indexOf(
    '### Step 3.6: Select Final Project Recap',
  );
  const mutationIndex = completionSkill.indexOf(
    '### Step 5: Set Lifecycle Complete',
  );

  assert.ok(
    recapIndex > summaryIndex,
    'recap selection follows summary refresh',
  );
  assert.ok(
    mutationIndex > recapIndex,
    'recap selection precedes lifecycle mutation',
  );
  assert.match(
    completionSkill,
    /A fresh `project-recap` manifest for the current completed implementation is reused without invoking the adapter again/,
  );
  assert.match(
    completionSkill,
    /invoke `scripts\/run\.mjs#runOatExplainer` exactly once with recipe `project-recap`/,
  );
  assert.match(
    completionSkill,
    /Set `SELECTED_PROJECT_RECAP_RUN` only to the final selected `project-recap` run/,
  );
  assert.match(
    completionSkill,
    /An incomplete, stale, wrong-project, or `project-explainer` manifest is never selected as the final recap/,
  );
});

test('both lifecycle recap callers require author, critic, and unattended mode', () => {
  const callers = [
    {
      name: 'project completion',
      text: sectionBetween(
        completionSkill,
        '### Step 3.6: Select Final Project Recap',
        '### Step 3.7: Project Log Completion Gate',
      ),
    },
    {
      name: 'implementation tail',
      text: sectionBetween(
        closeoutReference,
        '**Implementation-Tail Project Recap (non-lite only):**',
        '**Autonomous final HiLL approval:**',
      ),
    },
  ];

  for (const { name, text } of callers) {
    assert.match(
      text,
      /brief-aware/,
      `${name} must require a brief-aware seam`,
    );
    assert.match(text, /`author`/, `${name} must name the author callback`);
    assert.match(
      text,
      /`authorModulePath`/,
      `${name} must name the author module entry point`,
    );
    assert.match(text, /`critic`/, `${name} must name the critic callback`);
    assert.match(
      text,
      /`criticModulePath`/,
      `${name} must name the critic module entry point`,
    );
    assert.match(
      text,
      /`mode: unattended`/,
      `${name} must declare unattended lifecycle mode`,
    );
  }
});

test('both lifecycle recap callers probe seams before attempting a recap', () => {
  const callers = [
    {
      name: 'project completion',
      invocation: 'invoke `scripts/run.mjs#runOatExplainer`',
      text: sectionBetween(
        completionSkill,
        '### Step 3.6: Select Final Project Recap',
        '### Step 3.7: Project Log Completion Gate',
      ),
    },
    {
      name: 'implementation tail',
      invocation: 'Invoke the `oat-explainer-kit` adapter first',
      text: sectionBetween(
        closeoutReference,
        '**Implementation-Tail Project Recap (non-lite only):**',
        '**Autonomous final HiLL approval:**',
      ),
    },
  ];

  for (const { name, invocation, text } of callers) {
    assert.match(
      text,
      /probe-recap-seams\.mjs#probeRecapSeams/,
      `${name} must probe seam availability`,
    );
    assert.match(
      text,
      /pass the\s+result to autonomous intent resolution as\s+`seamProbe`/i,
      `${name} must hand the probe result to the resolver as seamProbe`,
    );
    assert.match(
      text,
      /accepts a\s+`seamProbe` only for autonomous\s+`projectRecap`/,
      `${name} must scope the probe handoff to autonomous resolution`,
    );
    assert.match(
      text,
      /all five required seams — author, fact critic, browser session,\s+visual critic, and set planner/,
      `${name} must probe all five unattended seams`,
    );
    assert.match(
      text,
      /E_SET_PLANNER_REQUIRED/,
      `${name} must detect a missing set planner pre-flight`,
    );
    assert.match(
      text,
      /Autonomous resolution then returns a recordable\s+`skip` with source `capability_probe`/,
      `${name} must record a probe-driven skip in autonomy`,
    );
    assert.match(
      text,
      /is unchanged: (?:a\s+recorded interactive `generate`|the decision recorded at the batched prompt governs)/,
      `${name} must leave interactive resolution unchanged`,
    );
    assert.match(
      text,
      /Never convert a\s+?configured-but-invalid seam, or a run that failed after a\s+?passing probe, into a\s+?skip; that run stays `failed`\./,
      `${name} must keep invalid seams and failed runs out of the skip path`,
    );
    assert.match(
      text,
      /pass its recorded source as\s+`--skip-reason`/,
      `${name} must carry the skip reason into the guard`,
    );

    // The probe decides the skip pre-flight, so no caller may reach it from a
    // failed adapter invocation. The invocation anchor must exist, otherwise
    // this ordering assertion would pass vacuously.
    const probeIndex = text.indexOf('probeRecapSeams');
    const invokeIndex = text.indexOf(invocation);
    assert.ok(probeIndex >= 0, `${name} must name the probe (anchor missing)`);
    assert.ok(
      invokeIndex >= 0,
      `${name} must name its adapter invocation (anchor "${invocation}" missing)`,
    );
    assert.ok(
      probeIndex < invokeIndex,
      `${name} must probe before invoking the adapter`,
    );
  }
});

test('the lite carve-out keeps the whole recap subsection out of lite closeout', () => {
  assert.match(
    closeoutReference,
    /This entire project-recap subsection applies only to non-lite workflows\. For\s+lite, do not resolve recap intent, inspect recap runs, invoke\s+`oat-explainer-kit`, run the terminal-outcome guard, or let recap block\s+closeout\. The lite contract sets `PROJECT_RECAP_REACHABLE=false` and proceeds\s+from the required reviews through its stored optional steps to `pr` and\s+sequence completion\./,
  );
  assert.match(
    closeoutReference,
    /\*\*Implementation-Tail Project Recap \(non-lite only\):\*\*/,
  );
});

test('the terminal-outcome guard accepts a probe-driven skip with its reason', () => {
  assert.deepEqual(
    checkTerminalOutcome({ intent: 'skip', reason: 'capability_probe' }),
    { ok: true, intent: 'skip', outcome: null, reason: 'capability_probe' },
  );
  assert.deepEqual(checkTerminalOutcome({ intent: 'skip' }), {
    ok: true,
    intent: 'skip',
    outcome: null,
    reason: null,
  });

  // A generated recap still needs a terminal outcome, so a reason cannot be
  // used to talk the guard out of missing evidence.
  for (const invalid of [
    { intent: 'generate', reason: 'capability_probe' },
    {
      intent: 'generate',
      outcome: 'built-durable',
      reason: 'capability_probe',
    },
    { intent: 'skip', reason: 'seams-unavailable' },
  ]) {
    assert.throws(
      () => checkTerminalOutcome(invalid),
      (error) => error?.code === 'E_RECAP_OUTCOME',
    );
  }
});

test('completion states the authored richness outcome the seam is judged on', () => {
  const recapSection = sectionBetween(
    completionSkill,
    '### Step 3.6: Select Final Project Recap',
    '### Step 3.7: Project Log Completion Gate',
  );

  assert.match(recapSection, /derive its output from the\s+request/);
  assert.match(recapSection, /`floor\.requiredNarrative`/);
  assert.match(recapSection, /ground each claim in the supplied `factBase`/);
  for (const warning of [
    'guideline-narrative-coverage-missing',
    'guideline-structured-depth-missing',
    'guideline-architecture-diagram-missing',
  ]) {
    assert.match(recapSection, new RegExp(warning), warning);
  }
});

test('author guidance carries briefs, evidence, artistic inputs, and expansion policy', () => {
  assert.match(adapterSkill, /`references\/author-callback\.md`/);
  assert.match(
    adapterSkill,
    /Construct exactly\s+one provider-neutral author seam in both modes/,
  );
  assert.match(authorCallback, /`explainer-kit\.author-request\/v2`/);
  assert.match(authorCallback, /`brief`/);
  assert.match(authorCallback, /`briefRef`/);
  assert.match(authorCallback, /`factBase`/);
  assert.match(authorCallback, /`theme`/);
  assert.match(authorCallback, /`shell`/);
  assert.match(authorCallback, /`proposedArtifacts`/);
  assert.match(authorCallback, /`plannedArtifact`/);
  assert.match(
    authorCallback,
    /Interactive invocations use the same author\s+contract/,
  );
  assert.match(
    lifecycleContract,
    /Every adapter run in both interactive and unattended modes must provide exactly\s+one provider-neutral author seam/,
  );
});

test('adapter guidance exposes first-class browser and visual-review providers', () => {
  for (const input of [
    'browserSession',
    'browserSessionModulePath',
    'visualCritic',
    'visualCriticModulePath',
  ]) {
    const pattern = new RegExp(`\`${input}\``);
    assert.match(adapterSkill, pattern);
    assert.match(lifecycleContract, pattern);
    assert.match(visualReviewCallback, pattern);
  }
  assert.match(visualReviewCallback, /canonical 320, 768, and 1440\s+widths/);
  assert.match(visualReviewCallback, /launched `Browser` instance/);
  assert.match(visualReviewCallback, /rejected by unattended\s+project-recap/);
  assert.match(
    visualReviewCallback,
    /request's exact `requestId` and `requestHash`/,
  );
  assert.match(visualReviewCallback, /produces `built-needs-review`/);
  assert.match(lifecycleContract, /distinct\s+callback identities/);
});

test('passes only the selected shared-project recap to archive and supports no-recap completion', () => {
  assert.match(completionSkill, /ARCHIVE_ARGS=\("\$PROJECT_PATH"\)/);
  assert.match(
    completionSkill,
    /ARCHIVE_ARGS\+=\("--project-recap-run" "\$SELECTED_PROJECT_RECAP_RUN"\)/,
  );
  assert.match(
    completionSkill,
    /SELECTED_PROJECT_RECAP_RUN must be project-relative/,
  );
  assert.match(
    completionSkill,
    /When recap intent resolves to `skip`, leave `SELECTED_PROJECT_RECAP_RUN` empty\s+and complete without a recap/,
  );
  assert.match(
    completionSkill,
    /Never add `--project-recap-run` when `SELECTED_PROJECT_RECAP_RUN` is empty/,
  );
});

test('documents bounded correction, compact terminal evidence, and publication denial', () => {
  assert.match(
    lifecycleContract,
    /at most one correction and one final review/,
  );
  assert.match(
    lifecycleContract,
    /`terminal-evidence\.json`.*run identity.*manifest hash.*bounded `stage`\/`kind` reason tuples.*evidence disposition/s,
  );
  assert.match(
    lifecycleContract,
    /Flagged, failed,\s+superseded, and `built-not-durable` runs are never publishable/,
  );
  assert.match(
    lifecycleContract,
    /review-clean `built-durable`.*explicit human publication gate/s,
  );
});

test('excludes project explainers from durable completion references', () => {
  assert.match(
    completionSkill,
    /`project-explainer` runs are active-project working artifacts, not durable post-completion reference products/,
  );
  assert.match(
    completionSkill,
    /Do not export, re-attest, or add archive-aware PR or summary reference links for a `project-explainer` run/,
  );
});

test('keeps local-project recaps untracked and built-not-durable without publish evidence', () => {
  assert.match(
    completionSkill,
    /For `IS_DURABLE_PROJECT="false"`, never export a tracked project recap and never construct or pass `--project-recap-run`/,
  );
  assert.match(
    completionSkill,
    /A local-scope recap remains `built-not-durable` unless its manifest already contains independently verified publish evidence/,
  );
  assert.match(
    completionSkill,
    /Do not treat local filesystem presence as durability/,
  );
});

test('consumes the archive JSON export report as the final recap location', () => {
  assert.match(
    completionSkill,
    /oat project archive .*--json/,
    'archive must return its machine-readable export report',
  );
  assert.match(
    completionSkill,
    /projectRecapExport\.sourceRunRoot/,
    'completion must consume the reported source run root',
  );
  assert.match(
    completionSkill,
    /projectRecapExport\.exportRoot/,
    'completion must consume the reported tracked export root',
  );
  assert.match(
    completionSkill,
    /projectRecapExport\.manifest\.relativePath/,
    'completion must consume the reported exported manifest path',
  );
  assert.match(
    completionSkill,
    /Do not infer or reconstruct the recap export root/,
  );
});

test('uses lifecycle bookkeeping then exported recap attestation as two commits', () => {
  const archiveIndex = completionSkill.indexOf(
    '### Step 8: Archive Project (Conditional)',
  );
  const bookkeepingIndex = completionSkill.indexOf(
    '### Step 10: Commit + Push Bookkeeping (Required)',
  );
  const attestationIndex = completionSkill.indexOf(
    '### Step 10.5: Re-attest Final Project Recap',
  );
  const evidenceIndex = completionSkill.indexOf(
    '### Step 10.6: Commit Evidence + Push',
  );

  assert.ok(archiveIndex >= 0, 'archive step must exist');
  assert.ok(bookkeepingIndex > archiveIndex, 'bookkeeping follows archive');
  assert.ok(
    attestationIndex > bookkeepingIndex,
    'attestation follows bookkeeping commit',
  );
  assert.ok(
    evidenceIndex > attestationIndex,
    'evidence commit follows attestation',
  );
  assert.match(completionSkill, /commitMode: `completion-bookkeeping`/);
  assert.match(completionSkill, /relocatedFrom: `sourceRunRoot`/);
  assert.match(
    completionSkill,
    /The lifecycle bookkeeping commit is the artifact commit/,
  );
  assert.match(
    completionSkill,
    /Commit only the exported `manifest\.json` and `build-record\.json` as the evidence update/,
  );
  assert.match(completionSkill, /Push once after both commits exist/);
  assert.match(
    lifecycleContract,
    /Archive completion is exactly two commits: the lifecycle bookkeeping commit, then the exported recap evidence commit/,
  );
});

test('skips attestation and evidence commits for complete terminal-evidence plans', () => {
  assert.match(
    completionSkill,
    /When the finalization plan is `complete` with `built-needs-review` or `failed`,\s+preserve that exact outcome/i,
  );
  assert.match(completionSkill, /skip.*attestation.*evidence commit/i);
  assert.match(
    completionSkill,
    /verifyTrackedRunFinalization.*must not promote.*`built-durable`/is,
  );
});

test('supersedes active-path evidence with exported immutable path evidence', () => {
  assert.match(
    completionSkill,
    /Submit only immutable paths under `projectRecapExport\.exportRoot` as commit evidence/,
  );
  assert.match(completionSkill, /supersedes the prior active-path evidence/);
  assert.match(
    completionSkill,
    /Never submit the gitignored archive path as commit evidence/,
  );
  assert.match(
    lifecycleContract,
    /The exported-path evidence supersedes the selected run's prior active-path evidence/,
  );
});

test('warns on failed exported attestation without failing completion', () => {
  assert.match(
    completionSkill,
    /A failed exported recap attestation does not fail project completion/,
  );
  assert.match(completionSkill, /report `built-not-durable`/);
  assert.match(
    completionSkill,
    /commit the warning-bearing `manifest\.json` and `build-record\.json`/,
  );
  assert.match(
    lifecycleContract,
    /Failure to verify the exported commit evidence is non-blocking/,
  );
});

// The seam is caller-owned by design: the executing agent authors, and nothing
// in the shipped core or adapter generates prose. What these tests verify is the
// outcome that premise depends on — that an author holding no prewritten recap,
// working only from the request the pipeline hands it, produces a rich recap,
// and that a thin one is caught.
test('rewrites summary and PR recap links to the tracked export root', () => {
  assert.match(
    completionSkill,
    /Rewrite recap links in the tracked summary export and the PR description body from `projectRecapExport\.exportRoot`/,
  );
  assert.match(
    completionSkill,
    /Use the current head branch for the blob URL while the PR is open/,
  );
  assert.match(completionSkill, /Never link to `\.oat\/projects\/archived\/`/);
  assert.match(
    lifecycleContract,
    /Post-archive summary and PR recap links target `projectRecapExport\.exportRoot`/,
  );
});
