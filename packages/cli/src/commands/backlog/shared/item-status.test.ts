import { describe, expect, it } from 'vitest';

import {
  BACKLOG_ITEM_STATUSES,
  TERMINAL_BACKLOG_STATUSES,
  extractBacklogStatus,
  isTerminalBacklogStatus,
  isValidBacklogStatus,
} from './item-status';

describe('backlog item status module', () => {
  it('declares exactly the four canonical statuses in order', () => {
    expect(BACKLOG_ITEM_STATUSES).toEqual([
      'open',
      'in_progress',
      'closed',
      'wont_do',
    ]);
  });

  it('declares the terminal subset as closed and wont_do', () => {
    expect(TERMINAL_BACKLOG_STATUSES).toEqual(['closed', 'wont_do']);
  });

  describe('isValidBacklogStatus', () => {
    it('accepts every canonical status', () => {
      for (const status of BACKLOG_ITEM_STATUSES) {
        expect(isValidBacklogStatus(status)).toBe(true);
      }
    });

    it('rejects out-of-enum values like done', () => {
      expect(isValidBacklogStatus('done')).toBe(false);
      expect(isValidBacklogStatus('')).toBe(false);
      expect(isValidBacklogStatus('OPEN')).toBe(false);
    });
  });

  describe('isTerminalBacklogStatus', () => {
    it('is true for closed and wont_do', () => {
      expect(isTerminalBacklogStatus('closed')).toBe(true);
      expect(isTerminalBacklogStatus('wont_do')).toBe(true);
    });

    it('is false for open, in_progress, and out-of-enum values', () => {
      expect(isTerminalBacklogStatus('open')).toBe(false);
      expect(isTerminalBacklogStatus('in_progress')).toBe(false);
      expect(isTerminalBacklogStatus('done')).toBe(false);
    });
  });

  describe('extractBacklogStatus', () => {
    it('reads a valid status from full item content', () => {
      const content = [
        '---',
        'id: BL-260622-demo',
        'title: Demo',
        'status: in_progress',
        'priority: high',
        '---',
        '',
        '## Description',
        '',
        'Body.',
      ].join('\n');
      expect(extractBacklogStatus(content)).toBe('in_progress');
    });

    it('reads an out-of-enum status value verbatim', () => {
      const content = ['---', 'status: done', '---', ''].join('\n');
      expect(extractBacklogStatus(content)).toBe('done');
    });

    it('strips an inline enum comment from the status line', () => {
      const content = [
        '---',
        'status: closed # open | in_progress | closed | wont_do',
        '---',
        '',
      ].join('\n');
      expect(extractBacklogStatus(content)).toBe('closed');
    });

    it('returns null when the status field is missing', () => {
      const content = ['---', 'id: BL-260622-demo', '---', ''].join('\n');
      expect(extractBacklogStatus(content)).toBeNull();
    });

    it('returns null when there is no frontmatter block', () => {
      expect(extractBacklogStatus('## Just a heading\n')).toBeNull();
    });

    it('reads a status from a bare frontmatter block without fences', () => {
      expect(extractBacklogStatus('status: open')).toBe('open');
    });
  });
});
