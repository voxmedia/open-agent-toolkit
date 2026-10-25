import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// `oat_orchestration_retry_limit` is a project state.md frontmatter key, as the
// canonical Auto Artifact-Review Loop says; `oat config get` reports it unknown.
// Analysis skills must point at the real source and keep the default.
test('analysis review loops read the retry bound from project state, not config', () => {
  for (const path of [
    '../SKILL.md',
    '../../oat-agent-instructions-analyze/SKILL.md',
  ]) {
    const text = readFileSync(new URL(path, import.meta.url), 'utf8').replace(
      /\s+/g,
      ' ',
    );
    const step = text.match(/2\. Resolve the retry bound.*?(?= 3\. )/);
    assert.ok(step, `${path} states the retry-bound source`);
    assert.match(step[0], /`oat_orchestration_retry_limit`/, path);
    assert.match(step[0], /`state\.md` frontmatter/, path);
    assert.match(step[0], /not an `oat config` key/, path);
    assert.match(step[0], /default to `2`/i, path);
  }
});
