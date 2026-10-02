import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve('.');
const baselineOnly = process.argv.includes('--baseline');
const archiveHead = baselineOnly
  ? '2588944d1718c49f26ea7d180653cc1024118636'
  : 'HEAD';
const scratch = mkdtempSync(join(tmpdir(), 'oat-docs-pristine-consumers-'));
try {
  const archive = execFileSync('git', ['archive', archiveHead], {
    maxBuffer: 100 * 1024 * 1024,
  });
  const extract = spawnSync('tar', ['-x', '-C', scratch], { input: archive });
  assert.equal(extract.status, 0, extract.stderr.toString());
  const diff = execFileSync('git', ['diff', '--binary'], {
    maxBuffer: 100 * 1024 * 1024,
  });
  if (diff.length && !baselineOnly) {
    const apply = spawnSync('git', ['apply', '-'], {
      cwd: scratch,
      input: diff,
    });
    assert.equal(apply.status, 0, apply.stderr.toString());
  }
  rmSync(join(scratch, '.oat/projects'), { recursive: true, force: true });
  const dependencies = ['node_modules', 'apps/oat-docs/node_modules'];
  for (const entry of readdirSync(join(root, 'packages')))
    if (existsSync(join(root, 'packages', entry, 'node_modules')))
      dependencies.push(`packages/${entry}/node_modules`);
  for (const path of dependencies)
    symlinkSync(join(root, path), join(scratch, path), 'dir');
  function outputPaths() {
    const found = [];
    const app = join(scratch, 'apps/oat-docs');
    for (const path of ['.source', 'out', '.next', '.oat-fumadocs-nav.json'])
      if (existsSync(join(app, path))) found.push(path);
    function scan(directory) {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) scan(path);
        else if (entry.name === 'meta.json') found.push(path);
      }
    }
    scan(join(app, 'docs'));
    return found;
  }
  assert.equal(existsSync(join(scratch, '.oat/projects')), false);
  assert.deepEqual(outputPaths(), []);
  const command = ['--filter', 'oat-docs', 'check'];
  const result = spawnSync('pnpm', command, {
    cwd: scratch,
    encoding: 'utf8',
    env: { ...process.env, OAT_AUTONOMOUS: '1', OAT_NON_INTERACTIVE: '1' },
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(outputPaths(), []);
  assert.equal(existsSync(join(scratch, '.oat/projects')), false);
  let guardedBaseline;
  if (baselineOnly) {
    const probe = `import {validateTopicMap, validateHostedReadmes} from ${JSON.stringify(join(root, 'apps/oat-docs/scripts/validate.ts'))};
const root = process.argv[1];
const outcomes = [];
for (const [name, operation, expected] of [
  ['topic', () => validateTopicMap(root+'/apps/oat-docs/docs',root+'/.agents/skills/oat-docs/SKILL.md'), /unresolved source link/],
  ['hosted', () => validateHostedReadmes(root+'/apps/oat-docs/docs',[root+'/README.md']), /unresolved.*hosted route/],
]) {
  try { await operation(); throw new Error('Bad baseline accepted'); }
  catch(error) { if(!expected.test(error.message)) throw error; outcomes.push({name,outcome:'rejected',error:error.message}); }
}
console.log(JSON.stringify(outcomes));`;
    const guarded = spawnSync(
      process.execPath,
      ['--import', 'tsx', '--input-type=module', '-e', probe, scratch],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          TSX_TSCONFIG_PATH: join(
            root,
            'apps/oat-docs/tsconfig.docs-tools.json',
          ),
        },
      },
    );
    assert.equal(guarded.status, 0, guarded.stdout + guarded.stderr);
    guardedBaseline = JSON.parse(guarded.stdout);
  }
  process.stdout.write(
    `${JSON.stringify(
      {
        head: execFileSync('git', ['rev-parse', 'HEAD'], {
          encoding: 'utf8',
        }).trim(),
        archiveSource: archiveHead,
        source: baselineOnly
          ? 'Pre-t03 committed archive: stale live topic and README targets are accepted by the original check'
          : 'Committed source archive plus current tracked task diff',
        guardedBaseline,
        prerequisite:
          'Existing installed dependencies and built upstream workspace dependencies linked read-only from the owned worktree; no fresh install/build claim.',
        scratch,
        command: ['pnpm', ...command],
        exit: result.status,
        projectDirectoryAbsentBeforeAndAfter: true,
        generatedDocsOutputAbsentBeforeAndAfter: true,
        output: result.stdout + result.stderr,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
