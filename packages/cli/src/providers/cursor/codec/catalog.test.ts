import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CURSOR_MODEL_PIN_MAPPINGS,
  findCursorModelPinMapping,
  SUPPORTED_CURSOR_ROLE_TARGETS,
} from './catalog';

const APPROVED_G01_MAPPINGS = [
  ['composer-2.5', 'composer-2.5[fast=true]'],
  ['composer-2.5-fast', 'composer-2.5[fast=true]'],
  ['claude-sonnet-5-thinking-high', 'claude-sonnet-5[effort=high]'],
  ['claude-sonnet-5-high', 'claude-sonnet-5[effort=high]'],
  ['claude-sonnet-5-5-low', 'claude-sonnet-5-5-low'],
  ['claude-sonnet-5-5-medium', 'claude-sonnet-5-5-medium'],
  ['claude-sonnet-5-5-high', 'claude-sonnet-5-5-high'],
  ['claude-sonnet-5-5-xhigh', 'claude-sonnet-5-5-xhigh'],
  ['claude-sonnet-5-5-max', 'claude-sonnet-5-5-max'],
  ['claude-opus-5-5-low', 'claude-opus-5-5[effort=low]'],
  ['claude-opus-5-5-medium', 'claude-opus-5-5[effort=medium]'],
  ['claude-opus-5-5-high', 'claude-opus-5-5[effort=high]'],
  ['claude-opus-5-5-xhigh', 'claude-opus-5-5[effort=xhigh]'],
  ['claude-opus-5-5-max', 'claude-opus-5-5[effort=max]'],
  ['gpt-5.6-luna-high', 'gpt-5.6-luna[reasoning=high]'],
  ['gpt-5.6-luna-xhigh', 'gpt-5.6-luna[reasoning=xhigh]'],
  ['cursor-grok-4.5-high', 'grok-4.5[effort=high,fast=false]'],
  ['cursor-grok-4.5-high-fast', 'grok-4.5[effort=high,fast=true]'],
  ['cursor-grok-4.6-low', 'grok-4.6[effort=low,fast=false]'],
  ['cursor-grok-4.6-medium', 'grok-4.6[effort=medium,fast=false]'],
  ['cursor-grok-4.6-high', 'grok-4.6[effort=high,fast=false]'],
  ['cursor-grok-4.6-xhigh', 'grok-4.6[effort=xhigh,fast=false]'],
  ['gpt-5.6-terra-high', 'gpt-5.6-terra[reasoning=high]'],
  ['gpt-5.6-sol-medium', 'gpt-5.6-sol[reasoning=medium]'],
  ['gpt-5.6-sol-high', 'gpt-5.6-sol[reasoning=high]'],
  ['claude-fable-5-thinking-high', 'claude-fable-5[effort=high]'],
  ['claude-fable-5-thinking-xhigh', 'claude-fable-5[effort=xhigh]'],
  ['claude-fable-5-xhigh', 'claude-fable-5[effort=xhigh]'],
  ['claude-fable-5-1-thinking-low', 'claude-fable-5-1[effort=low]'],
  ['claude-fable-5-1-thinking-medium', 'claude-fable-5-1[effort=medium]'],
  ['claude-fable-5-1-thinking-high', 'claude-fable-5-1[effort=high]'],
  ['claude-fable-5-1-thinking-xhigh', 'claude-fable-5-1[effort=xhigh]'],
  ['claude-fable-5-1-thinking-max', 'claude-fable-5-1[effort=max]'],
  ['gpt-5.6-sol-xhigh', 'gpt-5.6-sol[reasoning=xhigh]'],
  ['gpt-5.6-sol-max', 'gpt-5.6-sol[reasoning=max]'],
] as const;

describe('cursor model pin catalogue', () => {
  it('copies every approved g01 ladder-to-frontmatter mapping exactly', () => {
    expect(
      CURSOR_MODEL_PIN_MAPPINGS.map(
        ({ ladderModelId, frontmatterModel }) =>
          [ladderModelId, frontmatterModel] as const,
      ),
    ).toEqual(APPROVED_G01_MAPPINGS);
  });

  it('requires mapping-specific approval for bracket and exact-ID selectors', () => {
    for (const mapping of CURSOR_MODEL_PIN_MAPPINGS) {
      expect(mapping.gateEvidence).toMatchObject({
        gate: 'g01',
        disposition: 'approved',
      });
      expect(mapping.gateEvidence.probeName).not.toBe('');
      if (mapping.syntaxFamily === 'explicit-model-id') {
        expect(mapping.frontmatterModel).toBe(mapping.ladderModelId);
        expect(mapping.gateEvidence.probeRecord).toBeDefined();
      } else {
        expect(mapping.frontmatterModel).toMatch(/\[[^\]]+\]$/);
        expect(mapping.frontmatterModel).not.toBe(mapping.ladderModelId);
      }
    }
  });

  it('keeps each probe record consistent with the mapping it approves', () => {
    for (const mapping of CURSOR_MODEL_PIN_MAPPINGS) {
      const { probeRecord } = mapping.gateEvidence;
      if (!probeRecord) {
        continue;
      }

      // A mapping edited without re-probing must fail rather than inherit an
      // approval that never covered the new selector.
      expect(probeRecord.submittedSelector).toBe(mapping.frontmatterModel);
      expect(probeRecord.resolvedModel).toBe(mapping.ladderModelId);
      expect(probeRecord.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(probeRecord.evidencePath).not.toBe('');
    }
  });

  it('requires native probe evidence for probed mappings without recycling retired generations', () => {
    const probed = CURSOR_MODEL_PIN_MAPPINGS.filter(({ gateEvidence }) =>
      gateEvidence.probeName.startsWith('zz-pin-probe-'),
    );

    expect(probed).toHaveLength(20);
    expect(probed.map(({ ladderModelId }) => ladderModelId)).toEqual([
      'claude-sonnet-5-thinking-high',
      ...['low', 'medium', 'high', 'xhigh', 'max'].map(
        (effort) => `claude-sonnet-5-5-${effort}`,
      ),
      ...['low', 'medium', 'high', 'xhigh', 'max'].map(
        (effort) => `claude-opus-5-5-${effort}`,
      ),
      ...['low', 'medium', 'high', 'xhigh'].map(
        (effort) => `cursor-grok-4.6-${effort}`,
      ),
      ...['low', 'medium', 'high', 'xhigh', 'max'].map(
        (effort) => `claude-fable-5-1-thinking-${effort}`,
      ),
    ]);
    expect(
      findCursorModelPinMapping('claude-opus-5-thinking-high'),
    ).toBeUndefined();
    expect(
      findCursorModelPinMapping('claude-opus-4-8-thinking-xhigh'),
    ).toBeUndefined();
    for (const mapping of probed) {
      expect(mapping.gateEvidence.probeRecord).toBeDefined();
    }
  });

  it('matches the Opus 5.5 mappings to the captured native desktop observations', () => {
    const records = readFileSync(
      new URL('./__fixtures__/opus55-cursor-pin-probe.jsonl', import.meta.url),
      'utf8',
    )
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            agent: string;
            submitted_selector: string;
            subagent_start_model: string;
            shell_model: string;
            stop_model: string;
            cursor_version: string;
            shell_command: string;
          },
      );
    expect(records).toHaveLength(8);
    const nativeEvents = readFileSync(
      new URL(
        './__fixtures__/opus55-cursor-pin-probe-events.jsonl',
        import.meta.url,
      ),
      'utf8',
    )
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            hook_event_name: string;
            tool_name?: string;
            subagent_type?: string;
            call_ref?: string;
            model: string;
            subagent_model?: string;
            shell_command?: string;
            status?: string;
          },
      );
    expect(nativeEvents).toHaveLength(32);
    for (const record of records) {
      const events = nativeEvents.filter(
        (event) =>
          event.subagent_type === record.agent ||
          event.shell_command === record.shell_command,
      );
      expect(
        events.map(({ hook_event_name, tool_name }) =>
          tool_name ? `${hook_event_name}:${tool_name}` : hook_event_name,
        ),
      ).toEqual([
        'preToolUse:Task',
        'subagentStart',
        'preToolUse:Shell',
        'subagentStop',
      ]);
      const [task, start, shell, stop] = events;
      expect(task.call_ref).toBe(start.call_ref);
      expect(stop.call_ref).toBe(start.call_ref);
      expect(start.subagent_model).toBe(record.subagent_start_model);
      expect(start.model).toBe(record.subagent_start_model);
      expect(shell.model).toBe(record.shell_model);
      expect(stop.model).toBe(record.stop_model);
      expect(stop.status).toBe('completed');
    }
    for (const effort of ['low', 'medium', 'high', 'xhigh', 'max']) {
      const mapping = findCursorModelPinMapping(`claude-opus-5-5-${effort}`);
      const captured = records.find(
        ({ agent }) => agent === `zz-pin-probe-opus55-${effort}`,
      );
      expect(captured).toMatchObject({
        submitted_selector: mapping?.frontmatterModel,
        subagent_start_model: mapping?.ladderModelId,
        shell_model: mapping?.ladderModelId,
        stop_model: mapping?.ladderModelId,
        cursor_version: '3.20.14',
        shell_command: `echo PIN-PROBE zz-pin-probe-opus55-${effort}`,
      });
    }
    expect(
      records.find(({ agent }) => agent === 'zz-pin-probe-sonnet5-high'),
    ).toMatchObject({
      submitted_selector: 'claude-sonnet-5[effort=high]',
      subagent_start_model: 'claude-sonnet-5-thinking-high',
      shell_model: 'claude-sonnet-5-thinking-high',
      stop_model: 'claude-sonnet-5-thinking-high',
    });
    expect(
      records.find(({ agent }) => agent === 'zz-pin-probe-bogus-family'),
    ).toMatchObject({
      submitted_selector: 'claude-opus-9[effort=high]',
      subagent_start_model: 'cursor-grok-4.6-high-fast',
    });
    expect(
      records.find(({ agent }) => agent === 'zz-pin-probe-bogus-effort'),
    ).toMatchObject({
      submitted_selector: 'claude-opus-5-5[effort=ultra]',
      subagent_start_model: 'claude-opus-5-5-medium',
    });
  });

  it('matches the Grok 4.6 and Fable 5.1 mappings to the captured native desktop observations', () => {
    type ProbeRecord = {
      agent: string;
      round: number;
      submitted_selector: string;
      subagent_start_model: string;
      shell_model: string;
      stop_model: string;
      cursor_version: string;
      shell_command: string;
    };
    type NativeEvent = {
      hook_event_name: string;
      tool_name?: string;
      subagent_type?: string;
      call_ref?: string;
      model: string;
      subagent_model?: string;
      shell_command?: string;
      status?: string;
    };
    const readJsonl = <T>(name: string): T[] =>
      readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as T);
    const records = readJsonl<ProbeRecord>('cursor-pin-probe-2026-09-25.jsonl');
    const nativeEvents = readJsonl<NativeEvent>(
      'cursor-pin-probe-2026-09-25-events.jsonl',
    );
    expect(records).toHaveLength(28);
    expect(nativeEvents).toHaveLength(112);
    for (const record of records) {
      const events = nativeEvents.filter(
        (event) =>
          event.subagent_type === record.agent ||
          event.shell_command === record.shell_command,
      );
      expect(
        events.map(({ hook_event_name, tool_name }) =>
          tool_name ? `${hook_event_name}:${tool_name}` : hook_event_name,
        ),
      ).toEqual([
        'preToolUse:Task',
        'subagentStart',
        'preToolUse:Shell',
        'subagentStop',
      ]);
      const [task, start, shell, stop] = events;
      expect(task.call_ref).toBe(start.call_ref);
      expect(stop.call_ref).toBe(start.call_ref);
      expect(start.subagent_model).toBe(record.subagent_start_model);
      expect(start.model).toBe(record.subagent_start_model);
      expect(shell.model).toBe(record.shell_model);
      expect(stop.model).toBe(record.stop_model);
      expect(stop.status).toBe('completed');
      expect(record.cursor_version).toBe('3.21.18');
    }
    const byAgent = (agent: string) =>
      records.find((record) => record.agent === agent);
    const expectResolved = (agent: string, ladderModelId: string) => {
      const mapping = findCursorModelPinMapping(ladderModelId);
      expect(mapping?.gateEvidence.probeName).toBe(agent);
      expect(byAgent(agent)).toMatchObject({
        submitted_selector: mapping?.frontmatterModel,
        subagent_start_model: ladderModelId,
        shell_model: ladderModelId,
        stop_model: ladderModelId,
        shell_command: `echo PIN-PROBE ${agent}`,
      });
    };
    for (const effort of ['low', 'medium', 'high', 'xhigh']) {
      expectResolved(
        `zz-pin-probe-grok46-${effort}`,
        `cursor-grok-4.6-${effort}`,
      );
    }
    for (const effort of ['low', 'medium', 'high', 'xhigh', 'max']) {
      expectResolved(
        `zz-pin-probe-fable51-${effort}`,
        `claude-fable-5-1-thinking-${effort}`,
      );
    }
    // Controls make the subject rows interpretable: known mappings reproduce,
    // while an unknown family and unknown efforts fall back instead of echoing
    // the request.
    expect(byAgent('zz-pin-probe-ctl-pos-sonnet5-high')).toMatchObject({
      subagent_start_model: 'claude-sonnet-5-thinking-high',
    });
    expect(byAgent('zz-pin-probe-ctl-pos-grok45-high')).toMatchObject({
      subagent_start_model: 'cursor-grok-4.5-high',
    });
    expect(byAgent('zz-pin-probe-ctl-neg-opus9')).toMatchObject({
      submitted_selector: 'claude-opus-9[effort=high]',
      subagent_start_model: 'grok-4.7-high-fast',
    });
    expect(byAgent('zz-pin-probe-ctl-neg-fable51-ultra')).toMatchObject({
      submitted_selector: 'claude-fable-5-1[effort=ultra]',
      subagent_start_model: 'claude-fable-5-1-thinking-high',
    });
    // Grok 4.7 ignores every bracket selector and lands on the same account
    // default as the unknown family, so no Grok 4.7 mapping is approved.
    const grok47Bracket = records.filter(({ submitted_selector }) =>
      /^grok-4[.-]7\[/.test(submitted_selector),
    );
    expect(grok47Bracket).toHaveLength(8);
    for (const record of grok47Bracket) {
      expect(record.subagent_start_model).toBe('grok-4.7-high-fast');
    }
    for (const effort of ['low', 'medium', 'high', 'xhigh']) {
      expect(findCursorModelPinMapping(`grok-4.7-${effort}`)).toBeUndefined();
    }
  });

  it('matches Sonnet 5.5 exact pins to native desktop evidence and excludes failed bracket selectors', () => {
    type ProbeRecord = {
      agent: string;
      round: number;
      submitted_selector: string;
      subagent_start_model: string;
      shell_model: string;
      stop_model: string;
      cursor_version: string;
      shell_command: string;
    };
    type NativeEvent = {
      hook_event_name: string;
      tool_name?: string;
      subagent_type?: string;
      call_ref: string;
      model: string;
      subagent_model?: string;
      shell_command?: string;
      status?: string;
      round: number;
      model_override_present?: boolean;
      session_ref?: string;
      child_session_ref?: string;
    };
    const readJsonl = <T>(name: string): T[] =>
      readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as T);
    const records = readJsonl<ProbeRecord>('cursor-pin-probe-2026-10-01.jsonl');
    const nativeEvents = readJsonl<NativeEvent>(
      'cursor-pin-probe-2026-10-01-events.jsonl',
    );
    expect(records).toHaveLength(16);
    expect(nativeEvents).toHaveLength(64);
    for (const record of records) {
      const events = nativeEvents.filter(
        (event) =>
          event.round === record.round &&
          (event.subagent_type === record.agent ||
            event.shell_command === record.shell_command),
      );
      expect(
        events.map(({ hook_event_name, tool_name }) =>
          tool_name ? `${hook_event_name}:${tool_name}` : hook_event_name,
        ),
      ).toEqual([
        'preToolUse:Task',
        'subagentStart',
        'preToolUse:Shell',
        'subagentStop',
      ]);
      const [task, start, shell, stop] = events;
      expect(task.model_override_present).toBe(false);
      expect(start.call_ref).toBe(task.call_ref);
      expect(shell.call_ref).toBe(task.call_ref);
      expect(stop.call_ref).toBe(task.call_ref);
      expect(stop.child_session_ref).toBe(shell.session_ref);
      expect(start.subagent_model).toBe(record.subagent_start_model);
      expect(start.model).toBe(record.subagent_start_model);
      expect(shell.model).toBe(record.shell_model);
      expect(stop.model).toBe(record.stop_model);
      expect(stop.status).toBe('completed');
      expect(record.cursor_version).toBe('3.22.12');
    }
    const byAgent = (agent: string) =>
      records.find((record) => record.agent === agent);
    for (const effort of ['low', 'medium', 'high', 'xhigh', 'max']) {
      const mapping = findCursorModelPinMapping(`claude-sonnet-5-5-${effort}`);
      const exact = byAgent(`zz-pin-probe-sonnet55-flat-${effort}`)!;
      expect(exact).toMatchObject({
        submitted_selector: `claude-sonnet-5-5-${effort}`,
        subagent_start_model: `claude-sonnet-5-5-${effort}`,
        shell_model: `claude-sonnet-5-5-${effort}`,
        stop_model: `claude-sonnet-5-5-${effort}`,
        round: 2,
      });
      expect(mapping?.syntaxFamily).toBe('explicit-model-id');
      expect(mapping?.gateEvidence.probeName).toBe(exact.agent);
      expect(mapping?.frontmatterModel).toBe(exact.submitted_selector);
      expect(mapping?.ladderModelId).toBe(exact.subagent_start_model);
      expect(mapping?.gateEvidence.probeRecord).toMatchObject({
        submittedSelector: exact.submitted_selector,
        resolvedModel: exact.subagent_start_model,
        verifiedAt: '2026-10-01',
        evidencePath:
          'packages/cli/src/providers/cursor/codec/__fixtures__/cursor-pin-probe-2026-10-01.jsonl',
      });
      const bracket = byAgent(`zz-pin-probe-sonnet55-${effort}`)!;
      expect(bracket).toMatchObject({
        submitted_selector: `claude-sonnet-5-5[effort=${effort}]`,
        subagent_start_model: 'grok-4.7-high-fast',
        shell_model: 'grok-4.7-high-fast',
        stop_model: 'grok-4.7-high-fast',
        round: 1,
      });
      expect(
        CURSOR_MODEL_PIN_MAPPINGS.some(
          ({ frontmatterModel }) =>
            frontmatterModel === bracket.submitted_selector,
        ),
      ).toBe(false);
    }
    for (const prefix of ['zz-pin-probe-ctl', 'zz-pin-probe-flat-ctl']) {
      expect(byAgent(`${prefix}-pos-opus55-low`)).toMatchObject({
        subagent_start_model: 'claude-opus-5-5-low',
        shell_model: 'claude-opus-5-5-low',
        stop_model: 'claude-opus-5-5-low',
      });
      for (const suffix of ['neg-sonnet55-ultra', 'neg-unknown']) {
        const negative = byAgent(`${prefix}-${suffix}`)!;
        expect(negative).toMatchObject({
          subagent_start_model: 'grok-4.7-high-fast',
          shell_model: 'grok-4.7-high-fast',
          stop_model: 'grok-4.7-high-fast',
        });
        expect(
          findCursorModelPinMapping(negative.submitted_selector),
        ).toBeUndefined();
      }
    }
  });

  it('keeps approved aliases materializable outside the supported catalogue', () => {
    const supported = new Set(
      SUPPORTED_CURSOR_ROLE_TARGETS.map(({ ladderModelId }) => ladderModelId),
    );

    expect(supported).not.toContain('claude-sonnet-5-high');
    expect(findCursorModelPinMapping('claude-sonnet-5-high')).toMatchObject({
      frontmatterModel: 'claude-sonnet-5[effort=high]',
      catalogue: false,
    });
    expect(supported).not.toContain('composer-2.5-fast');
    expect(supported).not.toContain('cursor-grok-4.5-high-fast');
    expect(supported).not.toContain('claude-fable-5-xhigh');
    expect(SUPPORTED_CURSOR_ROLE_TARGETS).toHaveLength(31);
  });

  it('materializes every Cursor candidate in the bundled recommendation', () => {
    const recommendation = JSON.parse(
      readFileSync(
        join(process.cwd(), 'config', 'dispatch-matrix-recommendation.json'),
        'utf8',
      ),
    ) as {
      version: string;
      providers: {
        cursor: Record<string, { candidates: string[] }>;
      };
    };

    expect(recommendation.version).toBe('2026-10-01.1');
    const candidates = Object.values(recommendation.providers.cursor).flatMap(
      ({ candidates: tierCandidates }) => tierCandidates,
    );
    expect(candidates).toHaveLength(16);
    for (const candidate of candidates) {
      expect(
        findCursorModelPinMapping(candidate),
        `materialized recommendation candidate ${candidate}`,
      ).toMatchObject({
        ladderModelId: candidate,
        catalogue: true,
        gateEvidence: {
          gate: 'g01',
          disposition: 'approved',
        },
      });
    }
  });

  it('contains unique ladder ids', () => {
    const ids = CURSOR_MODEL_PIN_MAPPINGS.map(
      ({ ladderModelId }) => ladderModelId,
    );
    expect(new Set(ids)).toHaveLength(ids.length);
  });
});
