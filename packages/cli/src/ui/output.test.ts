import { join } from 'node:path';
import chalk from 'chalk';
import { describe, expect, it } from 'vitest';
import type { DriftReport } from '../drift/drift.types';
import type { SyncPlan } from '../engine/engine.types';
import type { ProviderAdapter } from '../providers/shared/adapter.types';
import { stripAnsi } from './ansi';
import {
  formatDoctorResults,
  formatProviderDetails,
  formatStatusTable,
  formatSyncPlan,
} from './output';

describe('output formatters', () => {
  it('formatStatusTable renders aligned table with status markers', () => {
    const reports: DriftReport[] = [
      {
        canonical: '.agents/skills/alpha',
        provider: 'claude',
        providerPath: '.claude/skills/alpha',
        state: { status: 'in_sync' },
      },
      {
        canonical: '.agents/skills/bravo',
        provider: 'cursor',
        providerPath: '.cursor/skills/bravo',
        state: { status: 'drifted', reason: 'modified' },
      },
    ];

    const output = formatStatusTable(reports);

    expect(output).toContain('Provider');
    expect(output).toContain('State');
    expect(output).toContain('✓ in_sync');
    expect(output).toContain('⚠ drifted:modified');
  });

  it('formatSyncPlan renders operation list with reasons', () => {
    const plan: SyncPlan = {
      scope: 'project',
      entries: [
        {
          canonical: {
            name: 'alpha',
            type: 'skill',
            canonicalPath: '.agents/skills/alpha',
          },
          provider: 'claude',
          providerPath: '.claude/skills/alpha',
          operation: 'create_symlink',
          strategy: 'symlink',
          reason: 'provider path does not exist',
        },
      ],
      removals: [],
    };

    const output = formatSyncPlan(plan, false);

    expect(output).toContain('create_symlink');
    expect(output).toContain('provider path does not exist');
  });

  it('formatSyncPlan applies semantic colors by operation type', () => {
    const previousLevel = chalk.level;
    chalk.level = 1;
    try {
      const plan: SyncPlan = {
        scope: 'project',
        entries: [
          {
            canonical: {
              name: 'alpha',
              type: 'skill',
              canonicalPath: '.agents/skills/alpha',
            },
            provider: 'claude',
            providerPath: '.claude/skills/alpha',
            operation: 'create_symlink',
            strategy: 'symlink',
            reason: 'provider path does not exist',
          },
          {
            canonical: {
              name: 'beta',
              type: 'skill',
              canonicalPath: '.agents/skills/beta',
            },
            provider: 'claude',
            providerPath: '.claude/skills/beta',
            operation: 'update_symlink',
            strategy: 'symlink',
            reason: 'provider path is not a symlink',
          },
        ],
        removals: [
          {
            canonical: {
              name: 'gamma',
              type: 'skill',
              canonicalPath: '.agents/skills/gamma',
            },
            provider: 'claude',
            providerPath: '.claude/skills/gamma',
            operation: 'remove',
            strategy: 'symlink',
            reason: 'canonical entry no longer exists',
          },
        ],
      };

      const output = formatSyncPlan(plan, false);
      expect(output).toContain('\u001B[');
      const plain = stripAnsi(output);
      expect(plain).toContain('create_symlink');
      expect(plain).toContain('update_symlink');
      expect(plain).toContain('remove');
    } finally {
      chalk.level = previousLevel;
    }
  });

  it('formatSyncPlan indicates dry-run vs applied', () => {
    const plan: SyncPlan = { scope: 'project', entries: [], removals: [] };

    const dryRunOutput = formatSyncPlan(plan, false);
    const appliedOutput = formatSyncPlan(plan, true);

    expect(dryRunOutput).toContain('dry-run');
    expect(appliedOutput).toContain('applied');
  });

  it('formatDoctorResults renders pass/warn/fail with fixes', () => {
    const output = formatDoctorResults([
      {
        name: 'canonical_directory',
        description: 'Check canonical directories',
        status: 'pass',
        message: '.agents/skills exists',
      },
      {
        name: 'provider_install',
        description: 'Check provider install',
        status: 'warn',
        message: 'Cursor not detected',
        fix: 'Install Cursor CLI',
      },
      {
        name: 'write_permissions',
        description: 'Check write permissions',
        status: 'fail',
        message: 'Cannot write to provider directory',
        fix: 'Adjust directory permissions',
      },
    ]);

    expect(output).toContain('✓ canonical_directory');
    expect(output).toContain('⚠ provider_install');
    expect(output).toContain('✗ write_permissions');
    expect(output).toContain('Fix: Install Cursor CLI');
  });

  it('formatProviderDetails renders provider inspection', () => {
    const adapter: ProviderAdapter = {
      name: 'claude',
      displayName: 'Claude Code',
      defaultStrategy: 'symlink',
      projectMappings: [
        {
          contentType: 'skill',
          canonicalDir: '.agents/skills',
          providerDir: '.claude/skills',
          nativeRead: false,
        },
      ],
      userMappings: [
        {
          contentType: 'skill',
          canonicalDir: '.agents/skills',
          providerDir: join('~', '.claude', 'skills'),
          nativeRead: false,
        },
      ],
      detect: async () => true,
    };

    const output = formatProviderDetails(adapter, true, '1.2.3');

    expect(output).toContain('Claude Code (claude)');
    expect(output).toContain('Detected: yes');
    expect(output).toContain('Default strategy: symlink');
    expect(output).toContain('Version: 1.2.3');
  });

  it('formatStatusTable keeps columns aligned when chalk colors are enabled', () => {
    const previousLevel = chalk.level;
    chalk.level = 1;
    try {
      const reports: DriftReport[] = [
        {
          canonical: '.agents/skills/alpha',
          provider: 'claude',
          providerPath: '.claude/skills/alpha',
          state: { status: 'in_sync' },
        },
        {
          canonical: '.agents/skills/bravo',
          provider: 'cursor',
          providerPath: '.cursor/skills/bravo',
          state: { status: 'drifted', reason: 'modified' },
        },
      ];

      const lines = formatStatusTable(reports)
        .split('\n')
        .slice(2)
        .map((line) => stripAnsi(line));

      const stateIndexRow1 = lines[0]?.indexOf('in_sync') ?? -1;
      const stateIndexRow2 = lines[1]?.indexOf('drifted:modified') ?? -1;

      expect(stateIndexRow1).toBeGreaterThan(0);
      expect(stateIndexRow1).toBe(stateIndexRow2);
    } finally {
      chalk.level = previousLevel;
    }
  });
});
