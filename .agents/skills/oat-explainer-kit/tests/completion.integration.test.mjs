import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../../..',
);

const carriers = Object.fromEntries(
  await Promise.all(
    [
      ['adapter', '.agents/skills/oat-explainer-kit/SKILL.md'],
      ['core', '.agents/skills/explainer-kit/SKILL.md'],
      ['completion', '.agents/skills/oat-project-complete/SKILL.md'],
      [
        'closeout',
        '.agents/skills/oat-project-implement/references/completion-and-closeout.md',
      ],
      ['autonomous', '.agents/skills/oat-project-autonomous/SKILL.md'],
      ['summary', '.agents/skills/oat-project-summary/SKILL.md'],
      ['plan', '.agents/skills/oat-project-plan/SKILL.md'],
      ['waveProgram', '.agents/skills/oat-wave-program/SKILL.md'],
      ['waveExecute', '.agents/skills/oat-wave-execute/SKILL.md'],
    ].map(async ([name, path]) => [
      name,
      await readFile(resolve(repoRoot, path), 'utf8'),
    ]),
  ),
);

function sectionBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex);
  assert.ok(startIndex >= 0, `missing section start: ${start}`);
  assert.ok(endIndex > startIndex, `missing section end: ${end}`);
  return source.slice(startIndex, endIndex);
}

test('adapter and core describe one agent-authored generate flow', () => {
  assert.match(carriers.adapter, /^## Generate$/m);
  assert.match(carriers.adapter, /bundle.*host agent.*verify.*record/is);
  assert.match(carriers.adapter, /`explainer-kit\.manifest\/v2`/);
  assert.match(carriers.core, /^## Run$/m);
  assert.match(carriers.core, /scripts\/bundle\.mjs/);
  assert.match(carriers.core, /scripts\/verify\.mjs/);
  assert.match(carriers.core, /scripts\/record\.mjs/);
});

test('completion and closeout route persisted intent through Generate', () => {
  const completion = sectionBetween(
    carriers.completion,
    '### Step 3.6: Select Final Project Recap',
    '### Step 3.7: Project Log Completion Gate',
  );
  const closeout = sectionBetween(
    carriers.closeout,
    '**Implementation-Tail Project Recap (non-lite only):**',
    '**Autonomous final HiLL approval:**',
  );

  for (const [name, text] of [
    ['completion', completion],
    ['closeout', closeout],
  ]) {
    assert.match(text, /re-read.*persisted.*oat_project_recap/is, name);
    assert.match(text, /§ Generate/, name);
    assert.match(text, /recipe `project-recap`/, name);
    assert.match(text, /`mode: unattended`/, name);
    assert.match(text, /`built`.*`built-needs-review`/s, name);
    assert.match(text, /retry.*`skip\/failed_attempt`/s, name);
    assert.match(
      text,
      /persisted `skip`.*(?:do not|without).*(?:bundle|author)/is,
      name,
    );
  }
});

test('lite closeout never enters the recap subsection', () => {
  assert.match(
    carriers.closeout,
    /This entire project-recap subsection applies only to non-lite workflows\./,
  );
  assert.match(
    carriers.closeout,
    /For\s+lite, do not resolve recap intent, inspect recap runs, invoke\s+`oat-explainer-kit`, run the terminal-outcome guard, or let recap block\s+closeout\./,
  );
});

test('autonomous completion retries once then records failed_attempt', () => {
  assert.match(
    carriers.autonomous,
    /projectRecap.*`generate`.*one retry.*`skip\/failed_attempt`/is,
  );
  assert.doesNotMatch(
    carriers.autonomous,
    /(?:write|record|persist).{0,80}`skip\/capability_probe`/is,
  );
});

test('summary maps manifest v2 and qa result outcomes', () => {
  assert.match(carriers.summary, /`manifest\.json`.*`qa\/result\.json`/s);
  assert.match(carriers.summary, /generated.*`built`/s);
  assert.match(
    carriers.summary,
    /generated — needs review.*`built-needs-review`/s,
  );
  assert.match(carriers.summary, /failed.*cause/s);
});

test('plan project explainer uses Generate and never rolls back the plan', () => {
  const step = sectionBetween(
    carriers.plan,
    '### Step 15.5: Generate the Project Explainer When Selected',
    '### Step 16:',
  );
  assert.match(step, /§ Generate/);
  assert.match(step, /recipe `project-explainer`/);
  assert.match(step, /outcome.*run path/is);
  assert.match(step, /continue.*(?:any|every) outcome/is);
});

test('both program-close callers use Generate and record terminal identity', () => {
  for (const [name, text, start, end] of [
    [
      'oat-wave-program',
      carriers.waveProgram,
      '### Program-close explainer caller',
      '## Integration',
    ],
    [
      'oat-wave-execute',
      carriers.waveExecute,
      '#### Program-close recap explainer caller',
      '## Success Criteria',
    ],
  ]) {
    const section = sectionBetween(text, start, end);
    assert.match(section, /§ Generate/, name);
    assert.match(section, /recipe\s+`program-recap`/, name);
    assert.match(section, /`runId`.*`outcome`.*program ledger/s, name);
  }
});

test('lifecycle carriers contain no retired live vocabulary', () => {
  const retired =
    /probeRecapSeams|authorModulePath|visualCritic|browserSession|planSet|runOatExplainer|built-durable|built-not-durable|finalize-tracked-run|explainers\.publish/;
  for (const [name, content] of Object.entries(carriers)) {
    assert.doesNotMatch(content, retired, name);
  }
});
