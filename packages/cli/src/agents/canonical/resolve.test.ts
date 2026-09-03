import {
  lstatSync,
  mkdtempSync,
  mkdirSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveCanonicalRole } from './resolve';

function writeRole(root: string, role: string, version = '1.2.3'): string {
  const path = join(root, 'agents', `${role}.md`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `---\nname: ${role}\nversion: ${version}\ndescription: Test role\n---\n\n# ${role}\n`,
  );
  return path;
}

describe('resolveCanonicalRole', () => {
  it('uses loaded, user, then project order and returns identity without content', () => {
    const root = mkdtempSync(join(tmpdir(), 'oat-canonical-role-'));
    try {
      const loadedRoot = join(root, 'loaded', '.agents');
      const skillDir = join(loadedRoot, 'skills', 'consumer');
      const userRoot = join(root, 'user', '.agents');
      const projectRoot = join(root, 'project', '.agents');
      mkdirSync(skillDir, { recursive: true });
      writeRole(userRoot, 'oat-reviewer', '2.0.0');
      writeRole(projectRoot, 'oat-reviewer', '3.0.0');

      const user = resolveCanonicalRole({
        dependency: 'workflows',
        canonicalRole: 'oat-reviewer',
        skillDir,
        userCanonicalRoot: userRoot,
        projectCanonicalRoot: projectRoot,
      });
      expect(user).toMatchObject({
        status: 'resolved',
        canonicalRole: 'oat-reviewer',
        tier: 'user',
        validation: 'direct-canonical',
        canonicalPath: '<user>/agents/oat-reviewer.md',
        selectedPath: '<user>/agents/oat-reviewer.md',
        roleVersion: '2.0.0',
      });
      expect(JSON.stringify(user)).not.toContain('# oat-reviewer');
      expect(user.status === 'resolved' && user.contentDigest).toMatch(
        /^sha256:[a-f0-9]{64}$/,
      );

      writeRole(loadedRoot, 'oat-reviewer', '1.0.0');
      expect(
        resolveCanonicalRole({
          dependency: 'workflows',
          canonicalRole: 'oat-reviewer',
          skillDir,
          userCanonicalRoot: userRoot,
          projectCanonicalRoot: projectRoot,
        }),
      ).toMatchObject({ status: 'resolved', tier: 'loaded' });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('accepts only an exact canonical symlink and records redacted misses', () => {
    const root = mkdtempSync(join(tmpdir(), 'oat-canonical-link-'));
    try {
      const providerRoot = join(root, 'user', '.cursor');
      const canonicalRoot = join(root, 'user', '.agents');
      const projectRoot = join(root, 'project', '.agents');
      const skillDir = join(providerRoot, 'skills', 'consumer');
      const canonical = writeRole(canonicalRoot, 'oat-reviewer');
      const selected = join(providerRoot, 'agents', 'oat-reviewer.md');
      mkdirSync(dirname(selected), { recursive: true });
      mkdirSync(skillDir, { recursive: true });
      symlinkSync(canonical, selected);

      const resolved = resolveCanonicalRole({
        dependency: 'workflows',
        canonicalRole: 'oat-reviewer',
        skillDir,
        userCanonicalRoot: canonicalRoot,
        projectCanonicalRoot: projectRoot,
      });
      expect(resolved).toMatchObject({
        status: 'resolved',
        tier: 'loaded',
        validation: 'exact-canonical-symlink',
        selectedPath: '<loaded>/agents/oat-reviewer.md',
        canonicalPath: '<user>/agents/oat-reviewer.md',
      });
      expect(lstatSync(selected).isSymbolicLink()).toBe(true);
      expect(realpathSync(selected)).toBe(realpathSync(canonical));

      rmSync(selected);
      writeFileSync(selected, '# same-looking copy\n');
      const copyMiss = resolveCanonicalRole({
        dependency: 'workflows',
        canonicalRole: 'oat-reviewer',
        skillDir,
        userCanonicalRoot: canonicalRoot,
        projectCanonicalRoot: projectRoot,
      });
      expect(copyMiss).toMatchObject({ status: 'resolved', tier: 'user' });
      expect(
        copyMiss.status === 'resolved' && copyMiss.candidateMisses[0],
      ).toEqual({
        tier: 'loaded',
        candidate: '<loaded>/agents/oat-reviewer.md',
        outcome: 'noncanonical-copy',
      });
      expect(JSON.stringify(copyMiss)).not.toContain(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails closed per dependency with actionable recovery', () => {
    const root = mkdtempSync(join(tmpdir(), 'oat-canonical-missing-'));
    try {
      const skillDir = join(root, 'loaded', '.agents', 'skills', 'consumer');
      mkdirSync(skillDir, { recursive: true });
      const missing = resolveCanonicalRole({
        dependency: 'research',
        canonicalRole: 'skeptical-evaluator',
        skillDir,
        userCanonicalRoot: join(root, 'user', '.agents'),
        projectCanonicalRoot: join(root, 'project', '.agents'),
      });
      expect(missing).toEqual({
        status: 'missing',
        dependency: 'research',
        canonicalRole: 'skeptical-evaluator',
        candidateMisses: [
          {
            tier: 'loaded',
            candidate: '<loaded>/agents/skeptical-evaluator.md',
            outcome: 'missing',
          },
          {
            tier: 'user',
            candidate: '<user>/agents/skeptical-evaluator.md',
            outcome: 'missing',
          },
          {
            tier: 'project',
            candidate: '<project>/agents/skeptical-evaluator.md',
            outcome: 'missing',
          },
        ],
        recovery: [
          {
            command: 'oat tools install research --scope <user|project>',
          },
          {
            command: 'oat tools update --pack research --scope <user|project>',
          },
        ],
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
