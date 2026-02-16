import { basename } from 'node:path';
import type { DriftReport, DriftState } from '@drift/drift.types';
import type { SyncPlan } from '@engine/engine.types';
import type { ProviderAdapter } from '@providers/shared/adapter.types';
import chalk from 'chalk';
import { stripAnsi } from './ansi';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface DoctorCheck {
  name: string;
  description: string;
  status: CheckStatus;
  message: string;
  fix?: string;
}

function visualPadEnd(value: string, width: number): string {
  const visibleLength = stripAnsi(value).length;
  if (visibleLength >= width) {
    return value;
  }
  return `${value}${' '.repeat(width - visibleLength)}`;
}

function stateLabel(state: DriftState): string {
  if (state.status === 'drifted') {
    return `drifted:${state.reason}`;
  }
  return state.status;
}

function stateMarker(state: DriftState): string {
  if (state.status === 'in_sync') {
    return chalk.green('✓');
  }
  if (state.status === 'missing') {
    return chalk.red('✗');
  }
  return chalk.yellow('⚠');
}

function stateDetail(state: DriftState): string {
  if (state.status === 'drifted') {
    return state.reason;
  }
  if (state.status === 'missing') {
    return 'provider entry missing';
  }
  if (state.status === 'stray') {
    return 'provider entry is unmanaged';
  }
  return '';
}

export function formatStatusTable(reports: DriftReport[]): string {
  if (reports.length === 0) {
    return 'No managed entries found.';
  }

  const rows = reports.map((report) => ({
    provider: report.provider,
    name: report.canonical
      ? basename(report.canonical)
      : basename(report.providerPath),
    state: `${stateMarker(report.state)} ${stateLabel(report.state)}`,
    detail: stateDetail(report.state),
  }));

  const providerWidth = Math.max(
    'Provider'.length,
    ...rows.map((row) => row.provider.length),
  );
  const nameWidth = Math.max(
    'Name'.length,
    ...rows.map((row) => row.name.length),
  );
  const stateWidth = Math.max(
    'State'.length,
    ...reports.map((report) => `${stateLabel(report.state)}`.length + 2),
  );

  const header = [
    'Provider'.padEnd(providerWidth),
    'Name'.padEnd(nameWidth),
    'State'.padEnd(stateWidth),
    'Detail',
  ].join('  ');
  const divider = [
    '-'.repeat(providerWidth),
    '-'.repeat(nameWidth),
    '-'.repeat(stateWidth),
    '------',
  ].join('  ');

  const lines = rows.map((row) =>
    [
      row.provider.padEnd(providerWidth),
      row.name.padEnd(nameWidth),
      visualPadEnd(row.state, stateWidth),
      row.detail,
    ].join('  '),
  );

  return [header, divider, ...lines].join('\n');
}

export function formatSyncPlan(plan: SyncPlan, applied: boolean): string {
  const heading = applied ? 'Sync plan (applied)' : 'Sync plan (dry-run)';
  const entries = [...plan.entries, ...plan.removals];
  if (entries.length === 0) {
    return `${heading}\nNo changes required.`;
  }

  const lines = entries.map((entry) => {
    const operation = colorSyncOperation(entry.operation);
    const detail = `${operation} ${entry.provider}/${entry.canonical.name}`;
    return `- ${detail} (${entry.reason})`;
  });

  return `${heading}\n\n${lines.join('\n')}`;
}

function colorSyncOperation(operation: string): string {
  if (operation === 'create_symlink' || operation === 'create_copy') {
    return chalk.green(operation);
  }

  if (operation === 'update_symlink' || operation === 'update_copy') {
    return chalk.yellow(operation);
  }

  if (operation === 'remove') {
    return chalk.red(operation);
  }

  return chalk.gray(operation);
}

function checkMarker(status: CheckStatus): string {
  if (status === 'pass') {
    return chalk.green('✓');
  }
  if (status === 'warn') {
    return chalk.yellow('⚠');
  }
  return chalk.red('✗');
}

export function formatDoctorResults(checks: DoctorCheck[]): string {
  if (checks.length === 0) {
    return 'No doctor checks configured.';
  }

  const lines: string[] = [];
  for (const check of checks) {
    lines.push(`${checkMarker(check.status)} ${check.name} - ${check.message}`);
    if (check.fix) {
      lines.push(`  Fix: ${check.fix}`);
    }
  }
  return lines.join('\n');
}

export function formatProviderDetails(
  adapter: ProviderAdapter,
  detected: boolean,
  version?: string,
): string {
  const projectTypes = adapter.projectMappings
    .map((mapping) => mapping.contentType)
    .join(', ');
  const userTypes = adapter.userMappings
    .map((mapping) => mapping.contentType)
    .join(', ');

  return [
    `${adapter.displayName} (${adapter.name})`,
    `Detected: ${detected ? chalk.green('yes') : chalk.red('no')}`,
    `Default strategy: ${adapter.defaultStrategy}`,
    `Project mappings: ${projectTypes || 'none'}`,
    `User mappings: ${userTypes || 'none'}`,
    `Version: ${version ?? 'unknown'}`,
  ].join('\n');
}
