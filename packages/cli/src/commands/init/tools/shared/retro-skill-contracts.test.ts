import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

function readRepoFile(relativePath: string): string {
  return readFileSync(
    join(import.meta.dirname, '../../../../../../../', relativePath),
    'utf8',
  );
}

const retroSkill = readRepoFile('.agents/skills/oat-project-retro/SKILL.md');
const applyProcedure = readRepoFile(
  '.agents/skills/oat-project-retro/references/apply-procedure.md',
);
const retroQualityBar = readRepoFile(
  '.agents/skills/oat-project-retro/references/retro-quality-bar.md',
);
const evidenceAndLanes = readRepoFile(
  '.agents/skills/oat-project-retro/references/evidence-and-lanes.md',
);
const filingSkill = readRepoFile(
  '.agents/skills/oat-project-retro-file/SKILL.md',
);
const retroTemplate = readRepoFile('.oat/templates/project-retro.md');
const retroDocs = readRepoFile(
  'apps/oat-docs/docs/workflows/projects/retro.md',
);

function readScenarioRow(content: string, scenario: string): string[] {
  const row = content
    .split('\n')
    .find((line) => line.trimStart().startsWith(`| ${scenario} `));

  return (
    row
      ?.split('|')
      .slice(1, -1)
      .map((cell) => cell.trim()) ?? []
  );
}

type ReceiptDecision = 'not-applicable' | 'declined' | 'deferred' | 'entered';
type ReceiptCompletion = 'not-started' | 'normal' | 'failed';
type ReceiptOutcome = 'performed' | 'declined' | 'skipped' | 'deferred';

function deriveReceiptOutcome(input: {
  initialEligible: number;
  decision: ReceiptDecision;
  completion: ReceiptCompletion;
  remainingInitial: number;
}): ReceiptOutcome {
  if (input.initialEligible === 0) return 'skipped';
  if (input.decision === 'declined') return 'declined';
  if (input.decision !== 'entered') return 'deferred';
  if (input.completion !== 'normal') return 'deferred';
  if (input.remainingInitial > 0) return 'deferred';
  return 'performed';
}

describe('retro skill content contracts', () => {
  it('authorizes each skill mandatory formatter and check path', () => {
    for (const content of [retroSkill, filingSkill]) {
      const allowedTools = content.match(/^allowed-tools:\s*(.+)$/m)?.[1] ?? '';

      expect(content).toMatch(
        /Before finishing or committing, format every[\s\S]*?repository's documented write\/fix formatter/i,
      );
      expect(content).toMatch(/Run\s+(?:the\s+)?checks\s+relevant/i);
      expect(allowedTools.split(/,\s*/)).toContain('Bash(pnpm:*)');
    }
  });

  it('recovers interrupted decision application by exact date-independent slug', () => {
    const allowedTools =
      retroSkill.match(/^allowed-tools:\s*(.+)$/m)?.[1] ?? '';

    expect(allowedTools).toMatch(/(?:^|,\s*)Glob(?:,|$)/);
    expect(allowedTools).not.toContain('Bash(ls:*)');
    expect(applyProcedure).toContain('date-independent exact-slug');
    expect(applyProcedure).toMatch(/DR-<6 digits>-/);
    expect(applyProcedure).toContain('Use the granted `Glob` tool');
    expect(applyProcedure).toContain(
      '.oat/repo/reference/decisions/DR-??????-<slug>.md',
    );
    expect(applyProcedure).not.toMatch(
      /\bls\s+\.oat\/repo\/reference\/decisions/,
    );
    expect(applyProcedure).toMatch(
      /zero matches[\s\S]*?create[\s\S]*?exactly one match[\s\S]*?verify[\s\S]*?recover `Applied-ref`[\s\S]*?multiple matches[\s\S]*?ambiguity error[\s\S]*?no write/i,
    );
    expect(applyProcedure).toMatch(
      /verify[\s\S]*?(?:title|proposal)[\s\S]*?context[\s\S]*?decision[\s\S]*?consequences/i,
    );
    expect(applyProcedure).toMatch(
      /exactly one match[\s\S]*?recover[\s\S]*?`Applied-ref`/i,
    );
    expect(applyProcedure).toMatch(
      /every apply type[\s\S]*?post-side-effect recovery/i,
    );
  });

  it('keeps configured non-interactive duplicate filing side-effect free', () => {
    expect(filingSkill).toMatch(
      /non-interactive duplicate[\s\S]*?separate consent/i,
    );
    expect(filingSkill).toMatch(
      /do not\s+strengthen, edit, comment on, or refile/i,
    );
    expect(filingSkill).toMatch(
      /validated\s+existing destination[\s\S]*?link/i,
    );
  });

  it('distinguishes exact duplicates from merely related candidates', () => {
    expect(filingSkill).toMatch(
      /exact duplicate[\s\S]*?merely related|merely related[\s\S]*?exact duplicate/i,
    );
    expect(filingSkill).toMatch(
      /title[\s\S]*?mechanism[\s\S]*?acceptance scope/i,
    );
    expect(filingSkill).toMatch(
      /strengthen[\s\S]*?genuine[\s\S]*?scope[\s\S]*?mechanism match/i,
    );
    expect(filingSkill).toMatch(
      /broaden[\s\S]*?(?:file|create)[\s\S]*?new[\s\S]*?umbrella\s+retitle/i,
    );
  });

  it('requires destination-first durable local filing receipts without implicit push', () => {
    expect(filingSkill).toMatch(
      /destination-first[\s\S]*?commit[\s\S]*?before[\s\S]*?Status:\s*filed/i,
    );
    expect(filingSkill).toMatch(
      /verify[\s\S]*?commit[\s\S]*?contains[\s\S]*?destination/i,
    );
    expect(filingSkill).toMatch(
      /pushed[\s\S]*?unpushed|unpushed[\s\S]*?pushed/i,
    );
    expect(filingSkill).toMatch(
      /push[\s\S]*?separate[\s\S]*?authoriz|separate[\s\S]*?authoriz[\s\S]*?push/i,
    );
    expect(filingSkill).toMatch(/never[\s\S]*?push|must not[\s\S]*?push/i);
    expect(retroTemplate).toContain('Destination-receipt');
    expect(retroTemplate).toContain('Remote-visibility');
  });

  it.each([
    {
      scenario: 'New local',
      expected: [
        'New local',
        'Create backlog item',
        'Separate mutation commit contains path and excludes retro',
        'Filed only after later retro writeback',
      ],
    },
    {
      scenario: 'Strengthened local',
      expected: [
        'Strengthened local',
        'Modify backlog item',
        'Separate mutation commit contains path and excludes retro',
        'Filed only after later retro writeback',
      ],
    },
    {
      scenario: 'Linked local',
      expected: [
        'Linked local',
        'No destination mutation',
        'Recover latest exact-path commit and verify current destination coherence',
        'Retain or set filed only with valid recovered receipt',
      ],
    },
    {
      scenario: 'Failed local commit',
      expected: [
        'Failed local commit',
        'Mutation did not commit',
        'No receipt',
        'Must not be filed',
      ],
    },
    {
      scenario: 'No upstream',
      expected: [
        'No upstream',
        'None',
        'Valid local receipt',
        'Filed with `Remote-visibility: unpushed`',
      ],
    },
    {
      scenario: 'GitHub',
      expected: [
        'GitHub',
        'Create or link issue',
        'Destination URL; local receipt fields are `—`',
        'Filed only with valid URL',
      ],
    },
    {
      scenario: 'Rerun',
      expected: [
        'Rerun',
        'No new mutation',
        'Pre-selection integrity validates destination-type state',
        'Skip only complete valid filed items',
      ],
    },
  ])(
    'defines the $scenario filing-state transition',
    ({ scenario, expected }) => {
      expect(readScenarioRow(filingSkill, scenario)).toEqual(expected);
    },
  );

  it('orders a destination-only receipt commit before retro writeback', () => {
    expect(filingSkill).toMatch(
      /destination commit[\s\S]*?must not contain[\s\S]*?retro/i,
    );
    expect(filingSkill).toContain(
      'git merge-base --is-ancestor "$DESTINATION_COMMIT" "$WRITEBACK_COMMIT"',
    );
    expect(filingSkill).toMatch(
      /destination commit[\s\S]*?predates[\s\S]*?writeback commit/i,
    );
  });

  it('keeps the durable template aligned with mutable filing-state contracts', () => {
    for (const field of [
      'Destination-receipt',
      'Remote-visibility',
      'Disposition-note',
      'Current State',
    ]) {
      expect(retroTemplate).toContain(field);
    }
    expect(filingSkill).toMatch(/destination-first/i);
    expect(retroTemplate).toMatch(/proposal bodies[\s\S]*?stable/i);
    expect(retroTemplate).toMatch(
      /Current State[\s\S]*?only mutable freeform status surface/i,
    );
    expect(retroTemplate).toMatch(
      /GitHub[\s\S]*?Destination-receipt:\s*—[\s\S]*?Remote-visibility:\s*—/i,
    );
  });

  it('does not invent or prompt for incomplete backlog metadata', () => {
    expect(filingSkill).toMatch(
      /non-interactive[\s\S]*?required backlog metadata[\s\S]*?no external write/i,
    );
    expect(filingSkill).toMatch(/do not prompt or invent/i);
    expect(filingSkill).toMatch(
      /leave\s+(?:the\s+)?item\s+unsettled[\s\S]*?report[\s\S]*?missing metadata/i,
    );
  });

  it('defines Disposition-note as the mutable rejection field', () => {
    for (const content of [retroTemplate, applyProcedure, filingSkill]) {
      expect(content).toContain('Disposition-note');
    }
    expect(retroTemplate).toMatch(
      /Consumers may mutate only[\s\S]*?Disposition-note/i,
    );
    expect(applyProcedure).toMatch(
      /proposal bod(?:y|ies)[\s\S]*?(?:stable|immutable)/i,
    );
    expect(filingSkill).toMatch(
      /proposal bod(?:y|ies)[\s\S]*?(?:stable|immutable)/i,
    );
  });

  it('defines exact promotion rollup aggregation', () => {
    for (const content of [retroTemplate, applyProcedure]) {
      expect(content).toMatch(
        /`none`[\s\S]*?no apply items[\s\S]*?`proposed`[\s\S]*?none are settled[\s\S]*?`partial`[\s\S]*?mix of settled and unsettled[\s\S]*?`complete`[\s\S]*?all apply items are settled/i,
      );
      expect(content).toMatch(
        /`proposed` and `approved` are unsettled[\s\S]*?`applied` and `rejected` are settled/i,
      );
    }
  });

  it('requires render provenance and rejects scaffold residue', () => {
    expect(retroSkill).toMatch(/non-null project slug/i);
    expect(retroSkill).toMatch(/UTC generation timestamp/i);
    expect(retroSkill).toMatch(
      /reject[\s\S]*?unreplaced[\s\S]*?scaffold item examples[\s\S]*?placeholders/i,
    );
    expect(retroSkill).toContain('`oat_retro_project`');
    expect(retroSkill).toContain('`oat_retro_generated`');
  });

  it('keeps mutable current state coherent without rewriting proposal bodies', () => {
    for (const content of [retroSkill, retroQualityBar, retroTemplate]) {
      expect(content).toMatch(/## Current State|`Current State`/);
      expect(content).toMatch(
        /register\s+fields[\s\S]*?frontmatter\s+rollups/i,
      );
    }

    expect(retroSkill).toMatch(/generation-time evidence[\s\S]*?live status/i);
    expect(applyProcedure).toMatch(
      /refresh[\s\S]*?`Current State`[\s\S]*?proposal bodies/i,
    );
    expect(filingSkill).toMatch(
      /refresh[\s\S]*?`Current State`[\s\S]*?proposal bodies/i,
    );
    expect(retroTemplate).toMatch(
      /Consumers may replace only the contents of this section/i,
    );
  });

  it('scales retro depth to evidence with concise output by default', () => {
    for (const content of [
      retroSkill,
      retroQualityBar,
      retroTemplate,
      retroDocs,
    ]) {
      expect(content).toMatch(/concise[\s\S]*?default/i);
      expect(content).toMatch(/section[\s\S]*?distinct\s+information/i);
      expect(content).toMatch(/references?[\s\S]*?repeated\s+chronology/i);
      expect(content).toMatch(
        /small project[\s\S]*?core sections?[\s\S]*?brief/i,
      );
      expect(content).toMatch(
        /subsections?[\s\S]*?tables?[\s\S]*?evidence-rich[\s\S]*?improve\s+decisions/i,
      );
    }

    expect(retroSkill).toMatch(/no new[\s\S]*?config surface/i);
  });

  it('defines one unambiguous structural project-log receipt', () => {
    const receiptShape =
      'retro artifact=<path> evidence_used=<csv> evidence_unavailable=<csv> promotions=<number> upstream=<number> apply=<performed|declined|skipped|deferred> filing=<performed|declined|skipped|deferred>';
    const receiptLines = retroSkill
      .split('\n')
      .filter((line) => line.includes(receiptShape));

    expect(receiptLines).toEqual([expect.stringContaining(receiptShape)]);

    for (const key of [
      'artifact',
      'evidence_used',
      'evidence_unavailable',
      'promotions',
      'upstream',
      'apply',
      'filing',
    ]) {
      expect(receiptLines[0]?.match(new RegExp(`${key}=`, 'g'))).toHaveLength(
        1,
      );
    }

    expect(retroSkill).toMatch(/`promotions` is the RP register count/i);
    expect(retroSkill).toMatch(/`upstream` is the UP\s+register count/i);
    expect(retroSkill).toMatch(/`apply` is the apply action outcome/i);
    expect(retroSkill).toMatch(/`filing` is the filing\s+action outcome/i);
    expect(retroSkill).toMatch(
      /final verification[\s\S]*?required keys[\s\S]*?exactly once[\s\S]*?counts are numeric/i,
    );
    expect(retroSkill).not.toMatch(/filing=<number>/);
    expect(retroSkill).toContain(
      'oat project log append --project "$PROJECT_PATH" --structural',
    );
    expect(retroSkill).toContain('--producer oat-project-retro');
    expect(retroSkill).toContain('--ref project-retro');
    expect(retroSkill).toContain('--body "$RECEIPT_BODY"');
    expect(retroSkill).toMatch(
      /source identifiers[\s\S]*?deduplicat[\s\S]*?bytewise ascending[\s\S]*?comma[\s\S]*?no spaces[\s\S]*?none/i,
    );
  });

  it.each([
    ['Initially empty', 0, 'not-applicable', 'not-started', 0, 'skipped'],
    [
      'Interactive action rejection',
      2,
      'declined',
      'not-started',
      2,
      'declined',
    ],
    [
      'Absent non-interactive consent',
      2,
      'deferred',
      'not-started',
      2,
      'deferred',
    ],
    ['Configured apply deferral', 2, 'deferred', 'not-started', 2, 'deferred'],
    ['Action failure', 2, 'entered', 'failed', 1, 'deferred'],
    [
      'Normal completion with remaining work',
      2,
      'entered',
      'normal',
      1,
      'deferred',
    ],
    ['All settled successfully', 2, 'entered', 'normal', 0, 'performed'],
    [
      'Mixed filing lanes partly deferred',
      3,
      'entered',
      'normal',
      1,
      'deferred',
    ],
    ['Mixed filing lanes all settled', 3, 'entered', 'normal', 0, 'performed'],
  ] as const)(
    'derives receipt transition %s from one pre-action snapshot',
    (
      scenario,
      initialEligible,
      decision,
      completion,
      remainingInitial,
      expected,
    ) => {
      const derived = deriveReceiptOutcome({
        initialEligible,
        decision,
        completion,
        remainingInitial,
      });

      expect(derived).toBe(expected);
      expect(readScenarioRow(retroSkill, scenario)).toEqual([
        scenario,
        String(initialEligible),
        decision,
        completion,
        String(remainingInitial),
        expected,
      ]);
    },
  );

  it('samples receipt eligibility once before actions and never from post-action emptiness', () => {
    const normalized = retroSkill.replace(/\s+/g, ' ');

    expect(normalized).toMatch(
      /pre-action eligibility snapshot[\s\S]*?before[\s\S]*?apply[\s\S]*?filing/i,
    );
    expect(normalized).toMatch(
      /never[\s\S]*?recompute[\s\S]*?initial[\s\S]*?post-action/i,
    );
    expect(
      deriveReceiptOutcome({
        initialEligible: 0,
        decision: 'not-applicable',
        completion: 'not-started',
        remainingInitial: 0,
      }),
    ).toBe('skipped');
    expect(
      deriveReceiptOutcome({
        initialEligible: 2,
        decision: 'entered',
        completion: 'normal',
        remainingInitial: 0,
      }),
    ).toBe('performed');

    for (const content of [retroSkill, retroDocs]) {
      const aligned = content.replace(/\s+/g, ' ');
      expect(aligned).toMatch(
        /(?:pre-action eligibility snapshot|before any[\s\S]*?eligibility snapshot)/i,
      );
      expect(aligned).toMatch(
        /(?:never|do not)[\s\S]*?(?:derive|recompute)[\s\S]*?post-action/i,
      );
      expect(aligned).toMatch(
        /all[\s\S]*?settled[\s\S]*?success[\s\S]*?performed/i,
      );
      expect(aligned).toMatch(
        /mixed filing[\s\S]*?(?:remaining|unsettled|deferred)[\s\S]*?deferred/i,
      );
    }
  });

  it('keeps material incidents standalone, anchored, and non-repetitive', () => {
    for (const content of [
      retroSkill,
      evidenceAndLanes,
      retroQualityBar,
      retroTemplate,
      retroDocs,
    ]) {
      const normalized = content.replace(/\s+/g, ' ');

      expect(normalized).toMatch(/stable evidence anchors?/i);
      expect(normalized).toMatch(
        /anchors?[\s\S]*?supplement[\s\S]*?(?:never|not)[\s\S]*?replace[\s\S]*?explanation/i,
      );
    }

    for (const content of [
      retroSkill,
      retroQualityBar,
      retroTemplate,
      retroDocs,
    ]) {
      const normalized = content.replace(/\s+/g, ' ');

      expect(normalized).toMatch(
        /Challenges and Struggles[\s\S]*?what happened[\s\S]*?impact[\s\S]*?response[\s\S]*?result/i,
      );
      expect(normalized).toMatch(
        /Where We Changed Course[\s\S]*?trigger[\s\S]*?changed direction[\s\S]*?outcome/i,
      );
      expect(normalized).toMatch(
        /Domain Learnings[\s\S]*?reusable lessons[\s\S]*?(?:without|not)[\s\S]*?(?:replay|repeat)[\s\S]*?chronology/i,
      );
      expect(normalized).toMatch(
        /Gotchas[\s\S]*?future-facing instructions[\s\S]*?(?:rather than|not)[\s\S]*?incident summaries/i,
      );
    }
  });

  it('inventories evidence at truthful source-level precision', () => {
    for (const content of [
      retroSkill,
      evidenceAndLanes,
      retroQualityBar,
      retroTemplate,
      retroDocs,
    ]) {
      const normalized = content.replace(/\s+/g, ' ');

      expect(normalized).toMatch(/used`?\s*(?:\||or)\s*`?unavailable/i);
      expect(normalized).toMatch(
        /evidence famil(?:y|ies) (?:is|are) partial[\s\S]*?split[\s\S]*?truthful[\s\S]*?source entries/i,
      );
      expect(normalized).toMatch(/do not add a `?partial`? evidence status/i);
      expect(normalized).toMatch(
        /derivative current-run reconnaissance transcripts[\s\S]*?(?:not|never)[\s\S]*?original project-run evidence/i,
      );
    }

    expect(evidenceAndLanes).toMatch(
      /root synthesis[\s\S]*?verifies[\s\S]*?load-bearing[\s\S]*?anchor[\s\S]*?preserv/i,
    );
  });

  it('routes project-log documentation corrections through append-only recovery', () => {
    for (const content of [retroSkill, applyProcedure, retroDocs]) {
      expect(content).toMatch(/canonical path[\s\S]*?project-log\.md/i);
      expect(content).toContain('`oat project log append`');
      expect(content).toMatch(/never[\s\S]*?direct(?:ly)? edit/i);
      expect(content).toMatch(
        /prior[\s\S]*?(?:heading|event)[\s\S]*?being corrected/i,
      );
      expect(content).toMatch(/preserve[\s\S]*?original\s+entry/i);
      expect(content).toMatch(
        /semantic post-side-effect recovery[\s\S]*?before[\s\S]*?append/i,
      );
      expect(content).toMatch(/`Applied-ref`[\s\S]*?only\s+after/i);
      expect(content).toMatch(
        /correction\s+and\s+retro\s+writeback\s+are\s+durably committed/i,
      );
    }

    const recoveryIndex = applyProcedure.indexOf(
      'Perform semantic post-side-effect recovery before appending',
    );
    const correctionAppendIndex = applyProcedure.indexOf(
      'oat project log append --project "$PROJECT_PATH" \\',
    );
    expect(recoveryIndex).toBeGreaterThanOrEqual(0);
    expect(correctionAppendIndex).toBeGreaterThan(recoveryIndex);

    expect(applyProcedure).toMatch(
      /limited to[\s\S]*?project-log[\s\S]*?does\s+not[\s\S]*?(?:new|change)[\s\S]*?RP type/i,
    );
    expect(applyProcedure).toMatch(
      /all other docs[\s\S]*?canonical existing page/i,
    );
    expect(applyProcedure).not.toContain('project-log-correction');
    expect(applyProcedure).toContain('--type feedback');
    expect(applyProcedure).toContain('--scope project');
    expect(applyProcedure).toContain('--area "retro correction $RP_ID"');
    expect(applyProcedure).toContain('--body "$CORRECTION_BODY"');
    expect(applyProcedure).toMatch(
      /stable identity[\s\S]*?RP_ID[\s\S]*?ORIGINAL_ENTRY_ANCHOR/i,
    );
    expect(applyProcedure).toMatch(
      /Applied-ref[\s\S]*?full 40-character correction commit[\s\S]*?exact generated heading/i,
    );
  });

  it.each([
    [
      'Repo-relative POSIX',
      '.oat/projects/shared/demo/project-log.md',
      'route',
    ],
    [
      'Windows separators',
      String.raw`.oat\projects\shared\demo\project-log.md`,
      'route',
    ],
    ['Exact basename', 'project-log.md', 'route'],
    ['Lookalike suffix', 'project-log.md.bak', 'ordinary-docs'],
    ['Prefixed basename', 'my-project-log.md', 'ordinary-docs'],
    ['Nested child', 'project-log.md/child', 'ordinary-docs'],
    ['Ambiguous traversal', '.oat/projects/../demo/project-log.md', 'stop'],
    ['Absolute path', '/tmp/project-log.md', 'stop'],
  ])('defines correction target match: %s', (scenario, target, disposition) => {
    expect(readScenarioRow(applyProcedure, scenario)).toEqual([
      scenario,
      `\`${target}\``,
      disposition,
    ]);
  });

  it.each([
    [
      'Fresh',
      'No exact correction',
      'Append once; commit project log; write back retro in a later commit',
    ],
    [
      'Uncommitted append',
      'One exact uncommitted correction',
      'Do not append; commit the recovered project-log mutation; then write back',
    ],
    [
      'Committed append',
      'One exact committed correction and RP not applied',
      'Do not append; verify full commit, path, and body; then write back',
    ],
    [
      'Append failure',
      'Command fails',
      'No correction commit or writeback; retain prior RP status',
    ],
    [
      'Correction commit failure',
      'Append exists but commit fails',
      'No writeback; retain prior RP status; recover exact append on retry',
    ],
    [
      'Writeback commit failure',
      'Correction commit succeeds but retro commit fails',
      'Preserve correction commit; restore non-applied artifact; retry writeback from recovered receipt',
    ],
    [
      'Ambiguous recovery',
      'Multiple or divergent matches',
      'Stop with no append, commit, or writeback',
    ],
  ])('defines correction transition: %s', (scenario, state, transition) => {
    expect(readScenarioRow(applyProcedure, scenario)).toEqual([
      scenario,
      state,
      transition,
    ]);
  });

  it('keeps final revision contracts on durable shipped surfaces', () => {
    expect(retroSkill).toContain('--producer oat-project-retro');
    expect(retroSkill).toContain('--ref project-retro');
    for (const outcome of ['performed', 'declined', 'skipped', 'deferred']) {
      expect(retroSkill).toContain(outcome);
    }
    expect(retroDocs).toMatch(
      /evidence famil(?:y|ies)[\s\S]*?partial[\s\S]*?truthful\s+source\s+entries/i,
    );
    expect(retroDocs).toMatch(
      /derivative current-run reconnaissance transcripts[\s\S]*?not[\s\S]*?original\s+project-run evidence/i,
    );
    expect(retroDocs).toMatch(/stable evidence anchors/i);
    expect(retroQualityBar).toMatch(
      /Challenges and Struggles[\s\S]*?complete\s+incident\s+narrative/i,
    );
    expect(applyProcedure).toMatch(
      /normalized target[\s\S]*?final\s+path\s+component[\s\S]*?project-log\.md/i,
    );
    expect(applyProcedure).toContain('--type feedback');
    expect(applyProcedure).toMatch(
      /project-log correction route[\s\S]*?repository target commit[\s\S]*?retro-only project-ref writeback\s+commit/i,
    );
  });
});
