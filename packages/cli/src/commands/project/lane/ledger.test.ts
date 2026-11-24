import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  parseLaneLedger,
  readLaneLedger,
  renderLaneLedger,
  writeLaneLedger,
  type LaneLedger,
  type LedgerWriteFs,
} from './ledger';
import { applyLaneUpdate, type LaneUpdateRequest } from './update';

const T0 = new Date('2026-11-22T10:00:00.000Z');

function at(minutes: number): Date {
  return new Date(T0.getTime() + minutes * 60_000);
}

function empty(): LaneLedger {
  return { title: 'Lanes: demo', active: [], closed: [], history: [] };
}

/** Apply updates in order, round-tripping the file text after each. */
function run(...requests: LaneUpdateRequest[]): LaneLedger {
  let ledger = empty();
  requests.forEach((request, index) => {
    ledger = parseLaneLedger(
      renderLaneLedger(applyLaneUpdate(ledger, request, at(index)).ledger),
    );
  });
  return ledger;
}

const create: LaneUpdateRequest = {
  lane: 'l01',
  fields: {
    task: 'task-123',
    thread: 'thread-abc',
    branch: 'lane/l01',
    next: 'wait for the lane to report',
    owner: 'lane',
  },
};

describe('lane ledger', () => {
  it('creates a lane with dispatch d01 open, state dispatched and a history line', () => {
    const ledger = run(create);
    expect(ledger.active).toEqual([
      {
        id: 'l01',
        fields: {
          state: 'dispatched',
          dispatch: 'd01 open',
          next: 'wait for the lane to report',
          owner: 'lane',
          task: 'task-123',
          thread: 'thread-abc',
          branch: 'lane/l01',
          last_observed: '2026-11-22T10:00:00Z',
        },
      },
    ]);
    expect(ledger.history).toEqual([
      {
        id: 'u001',
        text: '2026-11-22T10:00:00Z · l01 d01 · created; d01 opened; branch: lane/l01; next: wait for the lane to report; owner: lane; state dispatched',
      },
    ]);
    expect(ledger.closed).toEqual([]);
  });

  it('renders Active, Closed and History sections a reader can follow', () => {
    const text = renderLaneLedger(applyLaneUpdate(empty(), create, T0).ledger);
    expect(text).toMatch(/^# Lanes: demo\n/);
    expect([...text.matchAll(/^## (.+)$/gm)].map((match) => match[1])).toEqual([
      'Active',
      'Closed',
      'History',
    ]);
    expect(text).toContain(
      '### l01\n\n- state: dispatched\n- dispatch: d01 open\n',
    );
    expect(text).toContain('## Closed\n\n_None._\n');
    expect(text.endsWith('\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
  });

  it('updates a lane in place and appends one history line per update', () => {
    const ledger = run(
      create,
      { lane: 'l01', state: 'running', fields: { observed_model: 'opus' } },
      { lane: 'l01', fields: { next: 'review PR #12', owner: 'orchestrator' } },
    );
    expect(ledger.active).toHaveLength(1);
    expect(ledger.active[0]?.fields).toMatchObject({
      state: 'running',
      next: 'review PR #12',
      owner: 'orchestrator',
      observed_model: 'opus',
      last_observed: '2026-11-22T10:02:00Z',
    });
    expect(ledger.history.map((line) => line.id)).toEqual([
      'u001',
      'u002',
      'u003',
    ]);
    expect(ledger.history[1]?.text).toBe(
      '2026-11-22T10:01:00Z · l01 d01 · observed_model: opus; state dispatched → running',
    );
    expect(ledger.history[2]?.text).toBe(
      '2026-11-22T10:02:00Z · l01 d01 · next: review PR #12; owner: orchestrator',
    );
  });

  it('records a steer as a history line on the open dispatch without changing the block', () => {
    const before = run(create, { lane: 'l01', state: 'running', fields: {} });
    const result = applyLaneUpdate(
      before,
      { lane: 'l01', steer: 'also cover the CSV path', fields: {} },
      at(5),
    );
    expect(result.ledger.history.at(-1)).toEqual({
      id: 'u003',
      text: '2026-11-22T10:05:00Z · l01 d01 · steer: also cover the CSV path',
    });
    expect(result.block.fields.state).toBe('running');
    expect(result.block.fields.dispatch).toBe('d01 open');
  });

  it('refuses a steer once the dispatch has closed', () => {
    const closed = run(create, { lane: 'l01', noReport: true, fields: {} });
    expect(() =>
      applyLaneUpdate(
        closed,
        { lane: 'l01', steer: 'one more thing', fields: {} },
        at(9),
      ),
    ).toThrow(/no open dispatch to steer/);
  });

  it('closes an interrupted turn with no report, then numbers the next dispatch per lane', () => {
    const ledger = run(
      create,
      { lane: 'l01', noReport: true, fields: {} },
      { lane: 'l01', dispatch: true, fields: { next: 'resume the lane' } },
    );
    const block = ledger.active[0];
    expect(block?.fields.dispatch).toBe('d02 open');
    expect(block?.fields.state).toBe('dispatched');
    expect(ledger.history[1]?.text).toBe(
      '2026-11-22T10:01:00Z · l01 d01 · d01 closed with no report; state dispatched → turn-finished',
    );
    expect(ledger.history[2]?.text).toContain('l01 d02 · d02 opened');
  });

  it('refuses a new dispatch while the last one is open', () => {
    expect(() =>
      applyLaneUpdate(
        run(create),
        { lane: 'l01', dispatch: true, fields: {} },
        T0,
      ),
    ).toThrow(/dispatch d01 is still open/);
  });

  it('points the report at lane-reports/<lane>-<dispatch>.md and closes the dispatch', () => {
    const result = applyLaneUpdate(
      run(create),
      { lane: 'l01', report: true, fields: { head: 'abc123' } },
      at(3),
    );
    expect(result.reportPath).toBe('lane-reports/l01-d01.md');
    expect(result.block.fields).toMatchObject({
      dispatch: 'd01 reported',
      report: 'lane-reports/l01-d01.md',
      head: 'abc123',
      state: 'turn-finished',
    });
    expect(() =>
      applyLaneUpdate(
        result.ledger,
        { lane: 'l01', report: true, fields: {} },
        at(4),
      ),
    ).toThrow(/already closed \(reported\)/);
  });

  it('blocks a lane with what it waits on, and clears both when it unblocks', () => {
    const blocked = run(create, {
      lane: 'l01',
      state: 'blocked',
      fields: {
        waiting_on: 'linked-project',
        blocker: 'needs the importer API',
      },
    });
    expect(blocked.active[0]?.fields).toMatchObject({
      state: 'blocked',
      waiting_on: 'linked-project',
      blocker: 'needs the importer API',
    });
    const resumed = applyLaneUpdate(
      blocked,
      { lane: 'l01', state: 'running', fields: {} },
      at(9),
    );
    expect(resumed.block.fields.waiting_on).toBeUndefined();
    expect(resumed.block.fields.blocker).toBeUndefined();
    expect(resumed.changes).toEqual([
      'state blocked → running',
      'waiting_on cleared',
      'blocker cleared',
    ]);
    expect(() =>
      applyLaneUpdate(
        run(create),
        { lane: 'l01', state: 'blocked', fields: {} },
        T0,
      ),
    ).toThrow(/needs --waiting-on/);
    expect(() =>
      applyLaneUpdate(
        run(create),
        { lane: 'l01', state: 'blocked', fields: { waiting_on: 'weather' } },
        T0,
      ),
    ).toThrow(/--waiting-on must be one of/);
  });

  it('moves a merged lane to Closed as one line and refuses to update it again', () => {
    const ledger = run(
      create,
      { lane: 'l02', fields: { branch: 'lane/l02' } },
      {
        lane: 'l01',
        state: 'merged',
        fields: { head: 'abc123' },
      },
    );
    expect(ledger.active.map((block) => block.id)).toEqual(['l02']);
    expect(ledger.closed).toEqual([
      {
        id: 'l01',
        text: 'merged · 2026-11-22T10:02:00Z · branch lane/l01 · head abc123 · report -',
      },
    ]);
    expect(ledger.history.at(-1)?.text).toBe(
      '2026-11-22T10:02:00Z · l01 d01 · head: abc123; state dispatched → merged; closed',
    );
    expect(() =>
      applyLaneUpdate(
        ledger,
        { lane: 'l01', state: 'running', fields: {} },
        at(5),
      ),
    ).toThrow(/Lane l01 is closed/);
  });

  it('supersedes a lane with the lane that replaces it', () => {
    const ledger = run(create, {
      lane: 'l01',
      state: 'superseded',
      fields: { replaced_by: 'l03' },
    });
    expect(ledger.active).toEqual([]);
    expect(ledger.closed[0]).toEqual({
      id: 'l01',
      text: 'superseded by l03 · 2026-11-22T10:01:00Z · branch lane/l01 · head - · report -',
    });
    expect(() =>
      applyLaneUpdate(
        run(create),
        { lane: 'l01', state: 'superseded', fields: {} },
        T0,
      ),
    ).toThrow(/needs --replaced-by/);
    expect(() =>
      applyLaneUpdate(
        run(create),
        { lane: 'l01', fields: { replaced_by: 'l03' } },
        T0,
      ),
    ).toThrow(/only to a superseded lane/);
  });

  it('keeps every history line across updates and closures (append-only)', () => {
    const ledger = run(
      create,
      { lane: 'l01', state: 'running', fields: {} },
      { lane: 'l01', steer: 'skip the docs', fields: {} },
      { lane: 'l01', noReport: true, fields: {} },
      { lane: 'l01', state: 'superseded', fields: { replaced_by: 'l02' } },
      { lane: 'l02', fields: { next: 'redo l01 from its branch' } },
    );
    expect(ledger.history.map((line) => line.id)).toEqual([
      'u001',
      'u002',
      'u003',
      'u004',
      'u005',
      'u006',
    ]);
    expect(ledger.history[2]?.text).toContain('steer: skip the docs');
  });

  it('clears a field given an empty value, and records an update with no change as observed', () => {
    const cleared = applyLaneUpdate(
      run(create),
      { lane: 'l01', fields: { thread: '' } },
      at(1),
    );
    expect(cleared.block.fields.thread).toBeUndefined();
    expect(cleared.changes).toEqual(['thread cleared']);
    const observed = applyLaneUpdate(
      cleared.ledger,
      { lane: 'l01', fields: {} },
      at(2),
    );
    expect(observed.ledger.history.at(-1)?.text).toBe(
      '2026-11-22T10:02:00Z · l01 d01 · observed, no change',
    );
  });

  it('reads a ledger a Markdown formatter rewrote back to the values lane set wrote', () => {
    // Captured from `npx oxfmt` (the repository's pre-commit formatter) run
    // on a rendered ledger on 2026-11-22: it escaped `*` and rewrote `*x*` as
    // `_x_`, leaving the structure intact.
    const formatted = [
      '# Lanes: demo',
      '',
      '## Active',
      '',
      '### l01',
      '',
      '- state: running',
      '- dispatch: d02 open',
      '- next: review PR #12 _after_ CI <green> and fix_the_thing',
      '- paths: docs/a.md, src/\\*.ts',
      '',
      '## Closed',
      '',
      '_None._',
      '',
      '## History',
      '',
      '- u001 · 2026-11-22T10:00:00Z · l01 d01 · created; paths: docs/a.md, src/\\*.ts',
      '',
    ].join('\n');
    const ledger = parseLaneLedger(formatted);
    expect(ledger.active[0]?.fields.paths).toBe('docs/a.md, src/*.ts');
    expect(ledger.active[0]?.fields.next).toBe(
      'review PR #12 _after_ CI <green> and fix_the_thing',
    );
    expect(ledger.history[0]?.text).toContain('paths: docs/a.md, src/*.ts');
  });

  it('round-trips a literal backslash through later updates, keeping the field and its history line', () => {
    const next = "verify with rg 'api\\.v1'";
    const ledger = run(
      { lane: 'l01', fields: { next, owner: 'lane' } },
      { lane: 'l01', fields: { owner: 'orchestrator' } },
    );
    expect(ledger.active[0]?.fields.next).toBe(next);
    expect(ledger.history[0]?.text).toContain(`next: ${next};`);
    expect(renderLaneLedger(ledger)).toContain(
      "- next: verify with rg 'api\\\\.v1'\n",
    );
  });

  it('refuses a lane ID that is not lowercase and zero-padded', () => {
    for (const lane of ['L1', 'l1', 'lane-1']) {
      expect(() => applyLaneUpdate(empty(), { lane, fields: {} }, T0)).toThrow(
        /Lane IDs are a lowercase l/,
      );
    }
  });

  it('refuses a hand-edited ledger it cannot read rather than overwrite it', () => {
    const text = renderLaneLedger(run(create));
    expect(() =>
      parseLaneLedger(text.replace('- owner: lane', '- colour: blue')),
    ).toThrow(/malformed line in ## Active/);
    expect(() =>
      parseLaneLedger(text.replace('- dispatch: d01 open', '- dispatch: soon')),
    ).toThrow(/no valid dispatch line/);
    expect(() =>
      parseLaneLedger(text.replace(/^## History$/m, '## Log')),
    ).toThrow(/no `## History` section/);
  });
});

describe('lane ledger file', () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(
      tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
    );
    tempDirs.length = 0;
  });

  async function projectDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'oat-lanes-'));
    tempDirs.push(dir);
    return dir;
  }

  it('reads an absent ledger as empty', async () => {
    const dir = await projectDir();
    expect(await readLaneLedger(dir, 'demo')).toEqual({
      ledger: empty(),
      exists: false,
    });
  });

  it('writes the ledger whole and leaves no temporary file', async () => {
    const dir = await projectDir();
    const ledger = run(create);
    await writeLaneLedger(dir, ledger);
    expect(await readdir(dir)).toEqual(['lanes.md']);
    expect(await readFile(join(dir, 'lanes.md'), 'utf8')).toBe(
      renderLaneLedger(ledger),
    );
  });

  it('is atomic: a write that fails partway leaves the previous ledger byte-identical and no temporary file', async () => {
    const dir = await projectDir();
    const previous = renderLaneLedger(run(create));
    await writeFile(join(dir, 'lanes.md'), previous, 'utf8');
    const next = run(create, { lane: 'l01', state: 'running', fields: {} });

    // The temporary file is half-written, then the disk fails.
    const partial: LedgerWriteFs = {
      writeFile: async (path, content) => {
        await writeFile(path, content.slice(0, 40), 'utf8');
        throw new Error('ENOSPC: no space left on device');
      },
      rename: async () => {
        throw new Error('rename must not run');
      },
      unlink: async (path) => rm(path),
    };
    await expect(writeLaneLedger(dir, next, partial)).rejects.toThrow(/ENOSPC/);
    expect(await readFile(join(dir, 'lanes.md'), 'utf8')).toBe(previous);
    expect(await readdir(dir)).toEqual(['lanes.md']);

    // The whole file is written, then the replacing rename fails.
    let renamed = false;
    const failingRename: LedgerWriteFs = {
      writeFile: (path, content) => writeFile(path, content, 'utf8'),
      rename: async () => {
        renamed = true;
        throw new Error('EIO: rename failed');
      },
      unlink: async (path) => rm(path),
    };
    await expect(writeLaneLedger(dir, next, failingRename)).rejects.toThrow(
      /EIO/,
    );
    expect(renamed).toBe(true);
    expect(await readFile(join(dir, 'lanes.md'), 'utf8')).toBe(previous);
    expect(await readdir(dir)).toEqual(['lanes.md']);
  });
});
