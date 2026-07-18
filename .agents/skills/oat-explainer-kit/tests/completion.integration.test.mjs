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
const completionSkill = await readFile(completionSkillPath, 'utf8');

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
