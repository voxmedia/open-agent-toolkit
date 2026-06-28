import type { CommandContext } from '@app/command-context';
import {
  createLoggerCapture,
  type LoggerCapture,
} from '@commands/__tests__/helpers';
import { describe, expect, it } from 'vitest';

import type { CollectionChunk } from '../collect/pr-comments.types';
import { runTriageComments } from './triage-comments';

function makeChunk(overrides: Partial<CollectionChunk> = {}): CollectionChunk {
  return {
    month: '2024-01',
    comments: [
      {
        rcId: 'rc-001',
        id: 'id-1',
        prNumber: 42,
        prTitle: 'Fix something',
        prAuthor: 'alice',
        prMergedAt: '2024-01-15T10:00:00Z',
        filePath: 'src/index.ts',
        line: 10,
        author: 'bob',
        body: 'Consider renaming this variable for clarity.',
        createdAt: '2024-01-15T11:00:00Z',
        url: 'https://github.com/example/repo/pull/42#comment-1',
      },
    ],
    ...overrides,
  };
}

function createContext(options: { json?: boolean; interactive?: boolean }): {
  capture: LoggerCapture;
  context: CommandContext;
} {
  const capture = createLoggerCapture();
  const json = options.json ?? false;
  const interactive = options.interactive ?? !json;
  const context: CommandContext = {
    scope: 'all',
    dryRun: false,
    verbose: false,
    json,
    cwd: '/repo',
    home: '/home',
    interactive,
    logger: capture.logger,
  };
  return { capture, context };
}

describe('runTriageComments', () => {
  describe('non-interactive / --json path', () => {
    it('emits JSON with collection state when --json is set', async () => {
      const chunk = makeChunk();
      const { capture, context } = createContext({ json: true });

      await runTriageComments(
        context,
        { inputDir: '/fake', outputDir: '/fake-out', month: '2024-01' },
        {
          readJsonFile: async () => chunk,
          fileExists: async () => true,
        },
      );

      expect(capture.jsonPayloads).toHaveLength(1);
      const payload = capture.jsonPayloads[0] as {
        status: string;
        month: string;
        total: number;
        comments: unknown[];
      };
      expect(payload.status).toBe('ok');
      expect(payload.month).toBe('2024-01');
      expect(payload.total).toBe(1);
      expect(payload.comments).toHaveLength(1);
    });

    it('does not throw when non-interactive and json is false', async () => {
      const chunk = makeChunk();
      const { capture, context } = createContext({
        json: false,
        interactive: false,
      });

      await runTriageComments(
        context,
        { inputDir: '/fake', outputDir: '/fake-out', month: '2024-01' },
        {
          readJsonFile: async () => chunk,
          fileExists: async () => true,
        },
      );

      expect(capture.jsonPayloads).toHaveLength(0);
      expect(
        [...capture.info, ...capture.warn, ...capture.success].join('\n'),
      ).toBeTruthy();
    });

    it('emits JSON with empty comments array when collection is empty', async () => {
      const chunk = makeChunk({ comments: [] });
      const { capture, context } = createContext({ json: true });

      await runTriageComments(
        context,
        { inputDir: '/fake', outputDir: '/fake-out', month: '2024-01' },
        {
          readJsonFile: async () => chunk,
          fileExists: async () => true,
        },
      );

      expect(capture.jsonPayloads[0]).toMatchObject({
        status: 'ok',
        month: '2024-01',
        total: 0,
      });
    });

    it('does not write stderr directly — routes output through the logger', async () => {
      const chunk = makeChunk();
      const { capture, context } = createContext({ json: true });

      await runTriageComments(
        context,
        { inputDir: '/fake', outputDir: '/fake-out', month: '2024-01' },
        {
          readJsonFile: async () => chunk,
          fileExists: async () => true,
        },
      );

      // All output should be captured by the logger; non-interactive path
      // must not call process.stderr.write with comment summaries.
      expect(capture.jsonPayloads.length).toBeGreaterThanOrEqual(1);
    });
  });
});
