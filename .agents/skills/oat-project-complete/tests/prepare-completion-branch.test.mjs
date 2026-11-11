import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(
  new URL('../scripts/prepare-completion-branch.mjs', import.meta.url),
);
const cli = fileURLToPath(
  new URL('../../../../packages/cli/dist/index.js', import.meta.url),
);
const originalUrl = 'https://github.com/example/project/pull/17';
// Synthetic values at the external gh boundary. Schema provenance: read-only
// gh pr view https://github.com/voxmedia/open-agent-toolkit/pull/419 on
// 2026-11-11, --json url,number,state,baseRefName,headRefName,headRefOid:
// {"baseRefName":"main","headRefName":"chore/complete-goal-delivery-freshness",
// "headRefOid":"cc3a209aafbcc926062722ea8ec576d07b98cc12","number":419,
// "state":"MERGED","url":"https://github.com/voxmedia/open-agent-toolkit/pull/419"}.
// Raw capture: .oat/analysis/complete-after-merge-p02/gh-schema.json.
// Git repositories, state files, branch switching and the shipped parser are real.
function fixture(scope = 'shared') {
  const temp = mkdtempSync('/private/tmp/oat-completion-p02-');
  const repo = join(temp, 'repo');
  const remote = join(temp, 'remote.git');
  const bin = join(temp, 'bin');
  mkdirSync(repo);
  mkdirSync(bin);
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: repo,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  execFileSync('git', ['init', '--bare', remote], { stdio: 'ignore' });
  git('init', '-b', 'release');
  git('config', 'user.email', 'probe@example.com');
  git('config', 'user.name', 'Completion probe');
  git('config', 'core.hooksPath', '/dev/null');
  git('remote', 'add', 'origin', remote);
  writeFileSync(
    join(repo, '.gitignore'),
    '.oat/projects/local/\n.oat/projects/synced/*/\n',
  );
  const projectRelative = `.oat/projects/${scope}/probe`;
  const project = join(repo, projectRelative);
  mkdirSync(project, { recursive: true });
  const state = `---\noat_workflow_mode: goal\noat_pr_status: open\noat_pr_url: ${originalUrl}\noat_deliveries: [] # bookkeeping must not enter coverage\n---\n# Probe\n`;
  writeFileSync(join(project, 'state.md'), state);
  writeFileSync(join(project, 'plan.md'), '# Approved project\n');
  if (scope === 'synced') {
    writeFileSync(
      `${project}.json`,
      `${JSON.stringify({
        schemaVersion: 1,
        slug: 'probe',
        scope: 'synced',
        ref: 'refs/oat/projects/probe',
        remote: 'origin',
        status: 'active',
        createdAt: '2026-11-11T00:00:00Z',
        completedAt: null,
      })}\n`,
    );
    git(
      'worktree',
      'add',
      '--orphan',
      '-b',
      'project-probe',
      `${project}-owner`,
    );
    // Keep the actual retained worktree at the expected ignored project path.
    rmSync(project, { recursive: true });
    git('worktree', 'move', `${project}-owner`, project);
    execFileSync('git', [
      '-C',
      project,
      'config',
      'user.email',
      'probe@example.com',
    ]);
    writeFileSync(join(project, 'state.md'), state);
    writeFileSync(join(project, 'plan.md'), '# Approved project\n');
    execFileSync('git', ['-C', project, 'add', '.']);
    execFileSync('git', ['-C', project, 'commit', '-m', 'Retained project'], {
      stdio: 'ignore',
    });
    git(
      'update-ref',
      'refs/oat/projects/probe',
      execFileSync('git', ['-C', project, 'rev-parse', 'HEAD'], {
        encoding: 'utf8',
      }).trim(),
    );
  }
  git('add', '.');
  git('commit', '-m', 'Initial inputs');
  git('switch', '-c', 'feature');
  writeFileSync(join(repo, 'feature.txt'), 'Delivered code\n');
  git('add', 'feature.txt');
  git('commit', '-m', 'Delivery');
  const originalHead = git('rev-parse', 'HEAD');
  git('switch', 'release');
  git('merge', '--squash', 'feature');
  git('commit', '-m', 'Squash delivery');
  writeFileSync(
    join(repo, 'upstream.txt'),
    'New upstream work after delivery\n',
  );
  git('add', 'upstream.txt');
  git('commit', '-m', 'Updated base');
  const base = git('rev-parse', 'HEAD');
  git('push', '-u', 'origin', 'release');
  git('switch', 'feature');
  const log = join(temp, 'gh-calls.jsonl');
  writeFileSync(
    join(bin, 'gh'),
    `#!/usr/bin/env node\nconst fs=require('node:fs'); const a=process.argv.slice(2); fs.appendFileSync(process.env.P02_GH_LOG,JSON.stringify(a)+'\\n'); if(process.env.P02_GH_FAIL==='true') process.exit(1); if(a[0]==='repo') console.log(JSON.stringify({nameWithOwner:'example/project'})); else if(a[1]==='view') console.log(process.env.P02_GH_PR); else if(a[1]==='list') console.log(process.env.P02_GH_FOLLOWUPS||'[]'); else if(a[1]==='create') console.log('https://github.com/example/project/pull/18'); else if(a[1]==='edit') {} else process.exit(9);\n`,
    { mode: 0o755 },
  );
  const env = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    P02_GH_LOG: log,
    P02_GH_PR: JSON.stringify({
      url: originalUrl,
      number: 17,
      state: 'MERGED',
      baseRefName: 'release',
      headRefName: 'feature',
      headRefOid: originalHead,
    }),
  };
  const invoke = (extra = [], overrides = {}) =>
    spawnSync(
      process.execPath,
      [
        script,
        '--action',
        'prepare',
        '--project-path',
        projectRelative,
        '--scope',
        scope,
        '--pr-url',
        originalUrl,
        '--authority',
        'Approved brief covers bookkeeping publication',
        ...extra,
      ],
      { cwd: repo, env: { ...env, ...overrides }, encoding: 'utf8' },
    );
  return {
    temp,
    repo,
    project,
    projectRelative,
    state,
    git,
    base,
    env,
    log,
    invoke,
    cleanup: () => rmSync(temp, { recursive: true, force: true }),
  };
}

function success(result) {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

function refused(result, code) {
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stderr).code, code);
}

test('stale-open negative control: old path stays on feature; live merged path starts at updated base and commits only completion', () => {
  const f = fixture();
  try {
    // Execute the pre-fix Step 2 decision from 515f630e64becdbc87a6d2cd49b46026590bee32
    // and ordinary current-branch commit. This is the actual old shell decision.
    const oldDecision = execFileSync(
      'bash',
      [
        '-c',
        'oat_pr_status=open; WAS_PR_OPEN_AT_START=false; if [[ "$oat_pr_status" == open ]]; then WAS_PR_OPEN_AT_START=true; fi; printf "%s" "$WAS_PR_OPEN_AT_START"',
      ],
      { encoding: 'utf8' },
    );
    assert.equal(oldDecision, 'true');
    assert.equal(f.git('branch', '--show-current'), 'feature');
    writeFileSync(join(f.project, 'summary.md'), '# Completion\n');
    f.git('add', `${f.projectRelative}/summary.md`);
    f.git('commit', '-m', 'Old current-branch completion');
    assert.notEqual(f.git('merge-base', f.base, 'HEAD'), f.base);
    refused(f.invoke(), 'E_DIVERGENT_COMPLETION');
    // Preserve old failure on its branch; return to the exact merged head.
    f.git('branch', 'old-completion-control');
    f.git('switch', '--detach', JSON.parse(f.env.P02_GH_PR).headRefOid);
    const prepared = success(f.invoke());
    assert.equal(prepared.observedStatus, 'merged');
    assert.equal(prepared.wasOpen, false);
    assert.equal(prepared.baseBranch, 'release');
    assert.equal(prepared.baseHead, f.base);
    assert.equal(f.git('rev-parse', 'HEAD'), f.base);
    assert.equal(
      readFileSync(join(f.repo, 'upstream.txt'), 'utf8'),
      'New upstream work after delivery\n',
    );
    writeFileSync(
      join(f.project, 'state.md'),
      f.state.replace('oat_pr_status: open', 'oat_pr_status: merged'),
    );
    writeFileSync(join(f.project, 'summary.md'), '# Completion\n');
    const check = spawnSync(
      process.execPath,
      [cli, 'project', 'check-state', f.project, '--json'],
      { encoding: 'utf8' },
    );
    assert.equal(check.status, 0, check.stderr);
    f.git(
      'add',
      `${f.projectRelative}/state.md`,
      `${f.projectRelative}/summary.md`,
    );
    f.git('commit', '-m', 'Completion only');
    assert.equal(f.git('merge-base', f.base, 'HEAD'), f.base);
    assert.deepEqual(
      f.git('diff', '--name-only', `${f.base}..HEAD`).split('\n'),
      [`${f.projectRelative}/state.md`, `${f.projectRelative}/summary.md`],
    );
    const state = readFileSync(join(f.project, 'state.md'), 'utf8');
    assert.match(state, /oat_pr_status: merged/);
    assert.match(state, /oat_deliveries: \[\]/);
    assert.match(state, /pull\/17/);
    const reused = success(f.invoke());
    assert.equal(reused.branch, prepared.branch);
    assert.equal(f.git('rev-list', '--count', `${f.base}..HEAD`), '1');
    const skill = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
    const explicitPush = skill
      .slice(skill.indexOf('For a prepared follow-up outside'))
      .match(/```bash\n([\s\S]*?)\n```/)[1];
    const pushed = spawnSync('bash', ['-c', explicitPush], {
      cwd: f.repo,
      encoding: 'utf8',
      env: {
        ...f.env,
        COMPLETION_FOLLOWUP: 'true',
        COMPLETION_BRANCH: prepared.branch,
        PROJECT_SCOPE: 'shared',
        SHOULD_ARCHIVE: 'true',
      },
    });
    assert.equal(pushed.status, 0, pushed.stderr);
    assert.equal(f.git('rev-parse', '@{u}'), f.git('rev-parse', 'HEAD'));

    const calls = readFileSync(f.log, 'utf8')
      .trim()
      .split('\n')
      .map(JSON.parse);
    assert.ok(calls.every((args) => !['edit', 'create'].includes(args[1])));
  } finally {
    f.cleanup();
  }
});

test('live open and no-tracked-PR controls preserve current branch and bytes without observing a fictitious status', () => {
  const f = fixture();
  try {
    const before = f.git('rev-parse', 'HEAD');
    const open = success(
      f.invoke([], {
        P02_GH_PR: JSON.stringify({
          ...JSON.parse(f.env.P02_GH_PR),
          state: 'OPEN',
        }),
      }),
    );
    assert.equal(open.observedStatus, 'open');
    assert.equal(open.wasOpen, true);
    assert.equal(open.followup, false);
    const none = success(f.invoke(['--pr-url', ''], { P02_GH_FAIL: 'true' }));
    assert.equal(none.observedStatus, '');
    assert.equal(none.observedAt, '');
    assert.equal(none.wasOpen, false);
    assert.equal(f.git('rev-parse', 'HEAD'), before);
    assert.equal(readFileSync(join(f.project, 'state.md'), 'utf8'), f.state);
  } finally {
    f.cleanup();
  }
});

test('failed observation and missing explicit authority stop before state/branch writes', () => {
  const f = fixture();
  try {
    const before = f.git('rev-parse', 'HEAD');
    refused(f.invoke([], { P02_GH_FAIL: 'true' }), 'E_COMPLETION_PREPARE');
    refused(f.invoke(['--authority', '']), 'E_FOLLOWUP_AUTHORITY');
    assert.equal(f.git('rev-parse', 'HEAD'), before);
    assert.equal(f.git('branch', '--show-current'), 'feature');
    assert.equal(readFileSync(join(f.project, 'state.md'), 'utf8'), f.state);
  } finally {
    f.cleanup();
  }
});

test('real status-shell output composes with observation for null and open PRs', () => {
  const f = fixture();
  try {
    writeFileSync(
      join(f.temp, 'bin', 'oat'),
      `#!/bin/sh\nexec node "${cli}" "$@"\n`,
      { mode: 0o755 },
    );
    const skill = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
    const section = skill.slice(
      skill.indexOf('### Step 1.75:'),
      skill.indexOf('### Step 2:'),
    );
    const blocks = [...section.matchAll(/```bash\n([\s\S]*?)\n```/g)].map(
      (match) => match[1],
    );
    const report =
      '\nprintf "%s|%s|%s" "$ORIGINAL_PR_URL" "$OBSERVED_PR_STATUS" "$PR_STATUS_OBSERVED_AT"';
    const env = {
      ...f.env,
      SKILL_DIR: fileURLToPath(new URL('..', import.meta.url)),
      PROJECT_PATH: f.projectRelative,
      ACTIVE_PROJECT_PATH: f.projectRelative,
    };
    writeFileSync(
      join(f.project, 'state.md'),
      f.state
        .replace('oat_pr_status: open', 'oat_pr_status: null')
        .replace(originalUrl, 'null'),
    );
    for (const block of [
      blocks[0],
      `eval "$(oat project status --project-path "$PROJECT_PATH" --shell oat_pr_url=project.prUrl)"\n${blocks[1]}`,
    ]) {
      const result = spawnSync('bash', ['-c', block + report], {
        cwd: f.repo,
        env,
        encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, '||');
    }
    assert.equal(readFileSync(f.log, { encoding: 'utf8', flag: 'a+' }), '');
    writeFileSync(join(f.project, 'state.md'), f.state);
    const open = spawnSync('bash', ['-c', blocks[0] + report], {
      cwd: f.repo,
      env: {
        ...env,
        P02_GH_PR: JSON.stringify({
          ...JSON.parse(f.env.P02_GH_PR),
          state: 'OPEN',
        }),
      },
      encoding: 'utf8',
    });
    assert.equal(open.status, 0, open.stderr);
    assert.match(open.stdout, /\|open\|\d{4}-/);
  } finally {
    f.cleanup();
  }
});

for (const change of ['missing', 'different']) {
  test(`synced parent record ${change} on updated base refuses before switching`, () => {
    const f = fixture('synced');
    try {
      const originalRecord = readFileSync(`${f.project}.json`, 'utf8');
      f.git('switch', 'release');
      if (change === 'missing') f.git('rm', `${f.projectRelative}.json`);
      else {
        writeFileSync(
          `${f.project}.json`,
          originalRecord.replace('active', 'complete'),
        );
        f.git('add', `${f.projectRelative}.json`);
      }
      f.git('commit', '-m', 'Changed base discovery record');
      f.git('push', 'origin', 'release');
      f.git('switch', 'feature');
      refused(f.invoke(), 'E_COMPLETION_INPUTS');
      assert.equal(f.git('branch', '--show-current'), 'feature');
      assert.equal(readFileSync(`${f.project}.json`, 'utf8'), originalRecord);
    } finally {
      f.cleanup();
    }
  });
}

test('dirty and divergent shared inputs remain intact and refuse preparation', () => {
  const f = fixture();
  try {
    writeFileSync(join(f.project, 'state.md'), `${f.state}\nUncommitted\n`);
    refused(f.invoke(), 'E_DIRTY_COMPLETION');
    assert.match(
      readFileSync(join(f.project, 'state.md'), 'utf8'),
      /Uncommitted/,
    );
    f.git('add', `${f.projectRelative}/state.md`);
    f.git('commit', '-m', 'Unmerged project edits');
    refused(f.invoke(), 'E_DIVERGENT_COMPLETION');
    assert.match(
      readFileSync(join(f.project, 'state.md'), 'utf8'),
      /Uncommitted/,
    );
  } finally {
    f.cleanup();
  }
});

for (const scope of ['local', 'synced']) {
  test(`${scope} retained owner and bytes survive parent fresh-base preparation`, () => {
    const f = fixture(scope);
    try {
      const prepared = success(f.invoke());
      assert.equal(prepared.baseHead, f.base);
      assert.equal(prepared.followup, true);
      assert.equal(readFileSync(join(f.project, 'state.md'), 'utf8'), f.state);
      assert.equal(f.git('ls-files', '--', f.projectRelative), '');
      if (scope === 'synced')
        assert.equal(
          execFileSync('git', ['-C', f.project, 'rev-parse', 'HEAD'], {
            encoding: 'utf8',
          }).trim(),
          f.git('rev-parse', 'refs/oat/projects/probe'),
        );
    } finally {
      f.cleanup();
    }
  });
}

test('resume reuses observed open follow-up; archive resume needs no retired project and cannot duplicate a closed follow-up', () => {
  const f = fixture('local');
  try {
    const prepared = success(f.invoke());
    const followup = {
      url: 'https://github.com/example/project/pull/18',
      state: 'OPEN',
      headRefName: prepared.branch,
      baseRefName: 'release',
    };
    const reused = success(
      f.invoke([], { P02_GH_FOLLOWUPS: JSON.stringify([followup]) }),
    );
    assert.equal(reused.followupPrUrl, followup.url);
    assert.equal(reused.branch, prepared.branch);
    rmSync(f.project, { recursive: true });
    const resumed = success(
      f.invoke(['--action', 'resume', '--authority', ''], {
        P02_GH_FOLLOWUPS: JSON.stringify([followup]),
      }),
    );
    assert.equal(resumed.followupPrUrl, followup.url);
    refused(
      f.invoke(['--action', 'resume'], {
        P02_GH_FOLLOWUPS: JSON.stringify([{ ...followup, state: 'MERGED' }]),
      }),
      'E_COMPLETION_RESUME',
    );
    assert.equal(f.git('branch', '--show-current'), prepared.branch);
  } finally {
    f.cleanup();
  }
});

test('shared inputs missing from the updated base stop without silently retiring the local project', () => {
  const f = fixture();
  try {
    f.git('switch', 'release');
    f.git('rm', '-r', f.projectRelative);
    f.git('commit', '-m', 'Retire project on base');
    f.git('push');
    f.git('switch', 'feature');
    refused(f.invoke(), 'E_COMPLETION_INPUTS');
    assert.equal(f.git('branch', '--show-current'), 'feature');
    assert.equal(readFileSync(join(f.project, 'state.md'), 'utf8'), f.state);
  } finally {
    f.cleanup();
  }
});

test('shipped Step 11 creates/reuses a separate bookkeeping PR and its body sync targets only the follow-up', () => {
  const f = fixture();
  try {
    const prepared = success(f.invoke());
    const skill = readFileSync(new URL('../SKILL.md', import.meta.url), 'utf8');
    const step11 = skill.slice(
      skill.indexOf('### Step 11: Open PR'),
      skill.indexOf('### Step 11.5:'),
    );
    const createBlock = step11.match(/```bash\n([\s\S]*?)\n```/)[1];
    const body = join(f.temp, 'body.md');
    writeFileSync(body, '# Completion bookkeeping\n');
    const env = {
      ...f.env,
      COMPLETION_FOLLOWUP: 'true',
      BASE_BRANCH: 'release',
      ACTIVE_PROJECT_PATH: f.projectRelative,
      PROJECT_SCOPE: 'shared',
      ORIGINAL_PR_URL: originalUrl,
      COMPLETION_BRANCH_SCRIPT: script,
      COMPLETION_FOLLOWUP_AUTHORITY: 'Existing approved brief',
      TMP_BODY: body,
    };
    const created = spawnSync('bash', ['-c', createBlock], {
      cwd: f.repo,
      env,
      encoding: 'utf8',
    });
    assert.equal(created.status, 0, created.stderr);
    const followup = {
      url: 'https://github.com/example/project/pull/18',
      state: 'OPEN',
      headRefName: prepared.branch,
      baseRefName: 'release',
    };
    const reused = spawnSync('bash', ['-c', createBlock], {
      cwd: f.repo,
      env: { ...env, P02_GH_FOLLOWUPS: JSON.stringify([followup]) },
      encoding: 'utf8',
    });
    assert.equal(reused.status, 0, reused.stderr);
    const selectTarget = skill
      .match(/   PR_REF="\$\{ORIGINAL_PR_URL[\s\S]*?\n   ```/)[0]
      .replace(/\n   ```$/, '');
    const syncGate = skill
      .slice(skill.indexOf('### Step 11.5:'))
      .match(/```bash\n([\s\S]*?)\n```/)[1];
    const sync = spawnSync(
      'bash',
      [
        '-c',
        `${syncGate}\nif [[ "$SHOULD_SYNC_PR" == "true" ]]; then\n${selectTarget}\ngh pr edit "$PR_REF" --body-file "$TMP_BODY"\nfi`,
      ],
      {
        cwd: f.repo,
        env: {
          ...env,
          FOLLOWUP_PR_URL: followup.url,
          FOLLOWUP_PR_STATUS: 'open',
          WAS_PR_OPEN_AT_START: 'false',
          IS_DURABLE_PROJECT: 'true',
          SHOULD_ARCHIVE: 'true',
        },
        encoding: 'utf8',
      },
    );
    assert.equal(sync.status, 0, sync.stderr);
    for (const [controls, expected] of [
      [{ COMPLETION_FOLLOWUP: 'false', WAS_PR_OPEN_AT_START: 'true' }, 'true'],
      [
        { COMPLETION_FOLLOWUP: 'false', WAS_PR_OPEN_AT_START: 'false' },
        'false',
      ],
      [
        {
          COMPLETION_FOLLOWUP: 'true',
          FOLLOWUP_PR_STATUS: 'open',
          NEW_FOLLOWUP_CREATED: 'true',
        },
        'false',
      ],
    ]) {
      const gate = spawnSync(
        'bash',
        ['-c', `${syncGate}\nprintf '%s' "$SHOULD_SYNC_PR"`],
        {
          cwd: f.repo,
          env: {
            ...env,
            IS_DURABLE_PROJECT: 'true',
            SHOULD_ARCHIVE: 'true',
            ...controls,
          },
          encoding: 'utf8',
        },
      );
      assert.equal(gate.status, 0, gate.stderr);
      assert.equal(gate.stdout, expected);
    }
    const calls = readFileSync(f.log, 'utf8')
      .trim()
      .split('\n')
      .map(JSON.parse);
    assert.equal(calls.filter((args) => args[1] === 'create').length, 1);
    assert.deepEqual(
      calls.filter((args) => args[1] === 'edit').map((args) => args[2]),
      [followup.url],
    );
    assert.equal(readFileSync(join(f.project, 'state.md'), 'utf8'), f.state);
  } finally {
    f.cleanup();
  }
});

test('synced dirty retained owner refuses preparation without replacing its work', () => {
  const f = fixture('synced');
  try {
    writeFileSync(
      join(f.project, 'state.md'),
      `${f.state}\nRetained owner edits\n`,
    );
    refused(f.invoke(), 'E_DIRTY_COMPLETION');
    assert.match(
      readFileSync(join(f.project, 'state.md'), 'utf8'),
      /Retained owner edits/,
    );
    assert.equal(f.git('branch', '--show-current'), 'feature');
  } finally {
    f.cleanup();
  }
});
