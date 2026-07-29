import { describe, expect, it } from 'vitest';

import {
  formatDispatchNotices,
  terminalReviewerNoticeForTarget,
  terminalReviewerNoticesForMatrix,
} from './dispatch-notices';

describe('terminal reviewer dispatch notices', () => {
  it.each(['fable', 'claude-fable-5-thinking-high'])(
    'creates an advisory for the effective Fable target %s',
    (target) => {
      expect(terminalReviewerNoticeForTarget(target)).toEqual({
        code: 'terminal-reviewer-eligibility',
        level: 'advisory',
        message: expect.stringMatching(
          new RegExp(
            `${target}.*model access.*organization.*retention policy`,
            'i',
          ),
        ),
      });
    },
  );

  it.each(['opus', 'gpt-5.6-sol-high', 'custom-frontier-reviewer'])(
    'does not create a Fable advisory for %s',
    (target) => {
      expect(terminalReviewerNoticeForTarget(target)).toBeNull();
    },
  );

  it('derives the terminal reviewer from effective Frontier cells', () => {
    expect(
      terminalReviewerNoticesForMatrix({
        claude: {
          frontier: { candidates: ['opus', 'fable'] },
        },
        cursor: {
          frontier: {
            candidates: ['gpt-5.6-sol-max', 'claude-fable-5-thinking-high'],
          },
        },
      }),
    ).toEqual([
      expect.objectContaining({
        message: expect.stringContaining('fable'),
      }),
      expect.objectContaining({
        message: expect.stringContaining('claude-fable-5-thinking-high'),
      }),
    ]);
  });

  it('formats structured notices without adding policy claims', () => {
    const notice = terminalReviewerNoticeForTarget('fable');
    expect(notice).not.toBeNull();

    const output = formatDispatchNotices([notice!]);
    expect(output).toContain('[advisory] terminal-reviewer-eligibility:');
    expect(output).not.toContain('eligible');
    expect(output).not.toContain('compliant');
  });
});
