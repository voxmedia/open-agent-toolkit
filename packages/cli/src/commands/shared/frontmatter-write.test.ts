import { describe, expect, it } from 'vitest';

import {
  removeFrontmatterField,
  replaceFrontmatter,
  upsertFrontmatterField,
} from './frontmatter-write';

describe('upsertFrontmatterField', () => {
  it('adds a new field when missing', () => {
    const input = 'oat_phase: plan\noat_phase_status: complete';

    const result = upsertFrontmatterField(
      input,
      'oat_execution_mode',
      'single-thread',
      true,
    );

    expect(result.changed).toBe(true);
    expect(result.added).toBe(true);
    expect(result.nextBlock).toContain('oat_execution_mode: single-thread');
  });

  it('updates an existing field when overwrite is true', () => {
    const input =
      'oat_execution_mode: single-thread\noat_phase: implement\noat_phase_status: in_progress';

    const result = upsertFrontmatterField(
      input,
      'oat_execution_mode',
      'subagent-driven',
      true,
    );

    expect(result.changed).toBe(true);
    expect(result.added).toBe(false);
    expect(result.nextBlock).toContain('oat_execution_mode: subagent-driven');
    expect(result.nextBlock).not.toContain('oat_execution_mode: single-thread');
  });

  it('keeps an existing field when overwrite is false', () => {
    const input = 'oat_execution_mode: single-thread\noat_phase: plan';

    const result = upsertFrontmatterField(
      input,
      'oat_execution_mode',
      'subagent-driven',
      false,
    );

    expect(result.changed).toBe(false);
    expect(result.added).toBe(false);
    expect(result.nextBlock).toContain('oat_execution_mode: single-thread');
    expect(result.nextBlock).not.toContain('subagent-driven');
  });

  it('preserves inline comments when updating a field', () => {
    const input =
      'oat_execution_mode: single-thread  # Current mode\noat_phase: implement';

    const result = upsertFrontmatterField(
      input,
      'oat_execution_mode',
      'subagent-driven',
      true,
    );

    expect(result.nextBlock).toContain(
      'oat_execution_mode: subagent-driven  # Current mode',
    );
  });
});

describe('replaceFrontmatter', () => {
  it('replaces only the frontmatter block', () => {
    const content =
      '---\noat_phase: plan\noat_phase_status: complete\n---\n\n# Project State\n';

    const nextBlock =
      'oat_phase: implement\noat_phase_status: in_progress\noat_execution_mode: single-thread';

    const result = replaceFrontmatter(content, nextBlock);

    expect(result).toContain('oat_phase: implement');
    expect(result).toContain('oat_execution_mode: single-thread');
    expect(result).toContain('\n# Project State\n');
    expect(result).not.toContain('oat_phase: plan');
  });
});

describe('removeFrontmatterField', () => {
  it('removes the requested field and keeps other fields', () => {
    const input =
      'oat_lifecycle: paused\noat_pause_timestamp: 2026-02-22T00:00:00.000Z\noat_phase: implement';

    const result = removeFrontmatterField(input, 'oat_pause_timestamp');

    expect(result).toContain('oat_lifecycle: paused');
    expect(result).toContain('oat_phase: implement');
    expect(result).not.toContain('oat_pause_timestamp:');
  });
});
