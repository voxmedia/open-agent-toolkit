import { describe, expect, it } from 'vitest';
import { runInteractiveStaleTriage } from './artifacts';

describe('interactive stale triage', () => {
  it('archives and deletes selected candidates', async () => {
    const result = await runInteractiveStaleTriage(
      [
        { target: '.oat/repo/reviews/a.md', referenced: false },
        { target: '.oat/repo/reviews/b.md', referenced: true },
        { target: '.oat/repo/reviews/c.md', referenced: false },
      ],
      { interactive: true },
      {
        selectManyOrEmpty: async (message) => {
          if (message.includes('archive')) {
            return ['.oat/repo/reviews/a.md'];
          }
          return ['.oat/repo/reviews/b.md', '.oat/repo/reviews/c.md'];
        },
        confirmAction: async () => true,
      },
    );

    expect(result).toEqual({
      keep: [],
      archive: ['.oat/repo/reviews/a.md'],
      delete: ['.oat/repo/reviews/b.md', '.oat/repo/reviews/c.md'],
    });
  });

  it('keeps referenced delete targets when confirmation is declined', async () => {
    const result = await runInteractiveStaleTriage(
      [
        { target: '.oat/repo/reviews/a.md', referenced: false },
        { target: '.oat/repo/reviews/b.md', referenced: true },
        { target: '.oat/repo/reviews/c.md', referenced: false },
      ],
      { interactive: true },
      {
        selectManyOrEmpty: async (message) => {
          if (message.includes('archive')) {
            return ['.oat/repo/reviews/a.md'];
          }
          return ['.oat/repo/reviews/b.md', '.oat/repo/reviews/c.md'];
        },
        confirmAction: async () => false,
      },
    );

    expect(result).toEqual({
      keep: ['.oat/repo/reviews/b.md'],
      archive: ['.oat/repo/reviews/a.md'],
      delete: ['.oat/repo/reviews/c.md'],
    });
  });
});
