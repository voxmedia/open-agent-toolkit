import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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
const completionSkill = await readFile(completionSkillPath, 'utf8');
const lifecycleContract = await readFile(lifecycleContractPath, 'utf8');
const closeoutReference = await readFile(closeoutReferencePath, 'utf8');
const adapterSkill = await readFile(adapterSkillPath, 'utf8');
const authorCallback = await readFile(authorCallbackPath, 'utf8');

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
        '**Implementation-Tail Project Recap:**',
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

test('author guidance carries briefs, evidence, artistic inputs, and expansion policy', () => {
  assert.match(adapterSkill, /`references\/author-callback\.md`/);
  assert.match(
    adapterSkill,
    /construct exactly\s+one provider-neutral author seam in both modes/,
  );
  assert.match(authorCallback, /`explainer-kit\.author-request\/v2`/);
  assert.match(authorCallback, /`brief`/);
  assert.match(authorCallback, /`briefRef`/);
  assert.match(authorCallback, /`factBase`/);
  assert.match(authorCallback, /`theme`/);
  assert.match(authorCallback, /`shell`/);
  assert.match(authorCallback, /`proposedArtifacts`/);
  assert.match(authorCallback, /`profileId`/);
  assert.match(authorCallback, /both interactive and unattended modes/);
  assert.match(
    lifecycleContract,
    /Every adapter run in both interactive and unattended modes must provide exactly\s+one provider-neutral author seam/,
  );
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
    /When recap intent resolves to `skip`, or generation produces no valid final recap, leave `SELECTED_PROJECT_RECAP_RUN` empty and complete without a recap/,
  );
  assert.match(
    completionSkill,
    /Never add `--project-recap-run` when `SELECTED_PROJECT_RECAP_RUN` is empty/,
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
    /For `IS_SHARED_PROJECT="false"`, never export a tracked project recap and never construct or pass `--project-recap-run`/,
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
