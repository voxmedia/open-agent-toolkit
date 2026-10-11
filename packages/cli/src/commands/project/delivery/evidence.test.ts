import { resolve } from 'node:path';

import { appendProjectLog } from '@commands/project/log/append';
import { defaultGitRunner, type GitRunner } from '@commands/project/sync/git';
import type {
  GoalDelivery,
  MilestoneGateCarrier,
} from '@open-agent-toolkit/control-plane';
import { afterEach, describe, expect, it } from 'vitest';
import YAML from 'yaml';

import {
  ARCHIVED_REVIEW_ARTIFACT,
  bookkeepingChain,
  createGoalRepo,
  goalPlan,
  OUTCOME,
  PROJECT_REL,
  registryYaml,
  removeRepo,
  reviewRow,
  type GoalRepo,
} from './__tests__/goal-repo';
import {
  classifyPath,
  evaluateDeliveryReview,
  evaluateGateCarrier,
  evaluateSuccessor,
  type EvidenceScope,
} from './evidence';

const git = defaultGitRunner;

/** The bundled templates the real `oat project log append` instantiates. */
const CANONICAL_ASSETS_ROOT = resolve(
  import.meta.dirname,
  '../../../../../../.oat',
);

/**
 * Append one structural entry through the real project-log writer, exactly as
 * the goal skills do (`oat project log append --structural`): the first append
 * instantiates the bundled template, whose end-of-run synthesis section stays
 * last, so every later entry is inserted before it rather than at the end.
 */
async function appendLogEntry(
  target: GoalRepo,
  ref: string,
  body: string,
): Promise<void> {
  const result = await appendProjectLog(
    {
      repoRoot: target.root,
      home: target.root,
      project: target.projectPath,
      structural: true,
      producer: 'oat-project-pr-progress',
      ref,
      body,
    },
    {
      resolveAssetsRoot: async () => CANONICAL_ASSETS_ROOT,
      now: () => new Date('2026-10-11T12:00:00.000Z'),
    },
  );
  expect(result.status).toBe('appended');
}

function scopeFor(repo: GoalRepo): EvidenceScope {
  return {
    repoRoot: repo.root,
    projectDir: PROJECT_REL,
    evidenceArtifacts: [ARCHIVED_REVIEW_ARTIFACT],
  };
}

/**
 * The paths-only evaluator the A2 negative control names: it accepts any
 * successor whose commits touch only allowlisted paths, without judging what
 * changed inside them.
 */
function pathsOnlyAccepts(
  repo: GoalRepo,
  reviewed: string,
  published: string,
): boolean {
  const paths = repo
    .git(['diff', '--no-renames', '--name-only', reviewed, published])
    .split('\n')
    .filter(Boolean);
  return paths.every((path) => classifyPath(scopeFor(repo), path) !== null);
}

/** The exact-head comparison the bookkeeping-successor contract replaced. */
function exactHeadAccepts(reviewed: string, published: string): boolean {
  return reviewed === published;
}

function stateAt(repo: GoalRepo, commit: string): Record<string, unknown> {
  const content = repo.git(['show', `${commit}:${PROJECT_REL}/state.md`]);
  const block = content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
  return YAML.parse(block) as Record<string, unknown>;
}

function carrier(
  overrides: Partial<MilestoneGateCarrier> = {},
): MilestoneGateCarrier {
  return {
    status: 'allowed',
    resolution: 'no_gate',
    disposition: 'no_gate',
    config_fingerprint: null,
    reviewed_head: null,
    subject: { kind: 'code', scope: ['p01', 'p02'], ref: null },
    decided_at: '2026-10-11T10:00:00Z',
    freshness: 'fresh',
    freshness_reason: null,
    ...overrides,
  };
}

function delivery(
  overrides: Partial<GoalDelivery['members'][number]>,
): GoalDelivery {
  const member: GoalDelivery['members'][number] = {
    url: 'https://github.com/owner/name/pull/7',
    base: null,
    reviewed_head: null,
    observed_head: null,
    observed_base: null,
    status: 'open',
    ...overrides,
  };
  return {
    delivery_id: 'd01',
    milestone: 'm01',
    scope: ['p01', 'p02'],
    endpoint: 'merged',
    kind: 'pr',
    status: 'open',
    superseded_by: null,
    corrects_delivery_id: null,
    covers_scope_of: null,
    lookup: null,
    members: [member],
    integrated_review: {
      artifact: ARCHIVED_REVIEW_ARTIFACT,
      scope: ['p01', 'p02'],
      bound_revisions: [
        { member: 0, base: member.base, head: member.reviewed_head },
      ],
      disposition: 'passed',
    },
    exit_gate: null,
    endpoint_attainment: null,
  };
}

describe('delivery evidence evaluator (bookkeeping-successor freshness, A2)', () => {
  let repo: GoalRepo | undefined;

  afterEach(async () => {
    await removeRepo(repo);
    repo = undefined;
  });

  describe('valid control and positive regression', () => {
    it('accepts head-recording → review → receive/archive → registration with the reviewed SHA unchanged', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);

      const result = await evaluateSuccessor(
        git,
        scopeFor(repo),
        chain.reviewed,
        chain.registered,
      );
      expect(result).toMatchObject({
        fresh: true,
        code: 'bookkeeping-successor',
      });
      expect(result.fresh && result.inspected).toEqual([
        chain.headRecording,
        chain.provided,
        chain.received,
        chain.registered,
      ]);

      // Registration records the revision actually reviewed, not HEAD.
      const registry = stateAt(repo, chain.registered)[
        'oat_deliveries'
      ] as Record<string, unknown>[];
      const [member] = registry[0]!['members'] as Record<string, unknown>[];
      expect(member!['reviewed_head']).toBe(chain.reviewed);
      expect(chain.registered).not.toBe(chain.reviewed);
    });

    it('positive regression: the exact-head comparison rejects the chain the successor evaluator accepts', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);

      expect(exactHeadAccepts(chain.reviewed, chain.registered)).toBe(false);
      const result = await evaluateSuccessor(
        git,
        scopeFor(repo),
        chain.reviewed,
        chain.registered,
      );
      expect(result.fresh).toBe(true);
    });

    it('accepts project-log entries the real writer inserts before the synthesis section', async () => {
      // Found by the p12-t02 real-artifact probe: pr-progress Step 5.5 item 7
      // appends the registration entry after the registration commit, and
      // the old byte-prefix rule judged that insertion a rewrite, staling the
      // delivery it had just registered.
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      await appendLogEntry(repo, 'm01', 'Activated m01 (p01, p02).');
      repo.commitAll('chore(oat): log m01 activation');
      await appendLogEntry(repo, 'd01', 'Registered d01 for m01 (p01, p02).');
      const logged = repo.commitAll('chore(oat): log d01 registration');

      const log = await repo.read('project-log.md');
      expect(log.indexOf('Registered d01')).toBeLessThan(
        log.indexOf('\n## End-of-run synthesis'),
      );
      await expect(
        evaluateSuccessor(git, scopeFor(repo), chain.reviewed, logged),
      ).resolves.toMatchObject({ fresh: true, code: 'bookkeeping-successor' });
    });

    it('rejects a project-log change that edits an entry or the synthesis section', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      await appendLogEntry(repo, 'm01', 'Activated m01 (p01, p02).');
      const opened = repo.commitAll('chore(oat): log m01 activation');
      const original = await repo.read('project-log.md');

      for (const edited of [
        original.replace('Activated m01 (p01, p02).', 'Activated m01 (p01).'),
        // A valid insertion paired with a rewritten synthesis section.
        `${original.replace(
          '\n## End-of-run synthesis',
          '\n### 2026-10-11 · structural · x · d01\n\nLate.\n\n## End-of-run synthesis',
        )}Synthesis rewritten.\n`,
      ]) {
        expect(edited).not.toBe(original);
        await repo.write('project-log.md', edited);
        const published = repo.commitAll('chore(oat): edit the log');
        await expect(
          evaluateSuccessor(git, scopeFor(repo), chain.reviewed, published),
        ).resolves.toMatchObject({
          fresh: false,
          code: 'substantive-change',
        });
        repo.git(['reset', '-q', '--hard', opened]);
      }
    });

    it('treats the identical head as fresh without inspecting anything', async () => {
      repo = await createGoalRepo();
      const head = repo.git(['rev-parse', 'HEAD']);
      await expect(
        evaluateSuccessor(git, scopeFor(repo), head, head),
      ).resolves.toMatchObject({
        fresh: true,
        code: 'identical',
        inspected: [],
      });
    });
  });

  describe('A2 negative controls', () => {
    it('rejects an Outcome change inside allowed plan.md that a paths-only evaluator accepts', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      await repo.write(
        'plan.md',
        goalPlan({
          outcome: `${OUTCOME} and also anything else`,
          reviews: reviewRow(
            'passed',
            ARCHIVED_REVIEW_ARTIFACT,
            chain.reviewed,
          ),
        }),
      );
      const published = repo.commitAll('chore(oat): bookkeeping');

      expect(pathsOnlyAccepts(repo, chain.reviewed, published)).toBe(true);
      const result = await evaluateSuccessor(
        git,
        scopeFor(repo),
        chain.reviewed,
        published,
      );
      expect(result).toMatchObject({
        fresh: false,
        code: 'substantive-change',
        commit: published,
        path: `${PROJECT_REL}/plan.md`,
      });
      expect(result.reason).toContain(
        'approved content changed under "## Outcomes"',
      );
    });

    it('rejects a delivery-authority change inside allowed plan.md that a paths-only evaluator accepts', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      await repo.write(
        'plan.md',
        goalPlan({
          delivery: 'open',
          reviews: reviewRow(
            'passed',
            ARCHIVED_REVIEW_ARTIFACT,
            chain.reviewed,
          ),
        }),
      );
      const published = repo.commitAll('chore(oat): bookkeeping');

      expect(pathsOnlyAccepts(repo, chain.reviewed, published)).toBe(true);
      const result = await evaluateSuccessor(
        git,
        scopeFor(repo),
        chain.reviewed,
        published,
      );
      expect(result).toMatchObject({
        fresh: false,
        code: 'substantive-change',
      });
      expect(result.reason).toContain('"## Delivery"');
    });

    it('rejects a milestone membership change inside allowed plan.md', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      await repo.write(
        'plan.md',
        goalPlan({
          milestones: '| m01 | p01 |\n| m02 | p02, p03 |',
          reviews: reviewRow(
            'passed',
            ARCHIVED_REVIEW_ARTIFACT,
            chain.reviewed,
          ),
        }),
      );
      const published = repo.commitAll('chore(oat): bookkeeping');
      await expect(
        evaluateSuccessor(git, scopeFor(repo), chain.reviewed, published),
      ).resolves.toMatchObject({ fresh: false, code: 'substantive-change' });
    });

    it('rejects a substantive code change followed by its revert', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      await repo.writeRepo('src/app.ts', 'export const value = 3;\n');
      const substantive = repo.commitAll('feat: change');
      await repo.writeRepo('src/app.ts', 'export const value = 2;\n');
      const reverted = repo.commitAll('revert: change');

      // The net tree is unchanged, but the history is not bookkeeping.
      expect(
        repo.git(['diff', '--name-only', chain.registered, reverted]),
      ).toBe('');
      await expect(
        evaluateSuccessor(git, scopeFor(repo), chain.reviewed, reverted),
      ).resolves.toMatchObject({
        fresh: false,
        code: 'disallowed-path',
        commit: substantive,
        path: 'src/app.ts',
      });
    });

    it('rejects a substantive plan change followed by its revert', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      const reviews = reviewRow(
        'passed',
        ARCHIVED_REVIEW_ARTIFACT,
        chain.reviewed,
      );
      await repo.write(
        'plan.md',
        goalPlan({ outcome: 'A different outcome', reviews }),
      );
      const substantive = repo.commitAll('chore(oat): edit outcome');
      await repo.write('plan.md', goalPlan({ reviews }));
      const reverted = repo.commitAll('chore(oat): restore outcome');

      await expect(
        evaluateSuccessor(git, scopeFor(repo), chain.reviewed, reverted),
      ).resolves.toMatchObject({
        fresh: false,
        code: 'substantive-change',
        commit: substantive,
      });
    });

    it('rejects a published head the reviewed revision is not an ancestor of', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      repo.git(['checkout', '-q', '-b', 'other', repo.baseSha]);
      await repo.writeRepo('src/other.ts', 'export const other = 1;\n');
      const unrelated = repo.commitAll('feat: unrelated');

      await expect(
        evaluateSuccessor(git, scopeFor(repo), chain.reviewed, unrelated),
      ).resolves.toMatchObject({ fresh: false, code: 'not-ancestor' });
    });

    it('rejects a changed member base even when the head is the reviewed revision', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      const changed = await evaluateDeliveryReview(
        git,
        scopeFor(repo),
        delivery({
          base: repo.baseSha,
          reviewed_head: chain.reviewed,
          observed_head: chain.reviewed,
          observed_base: chain.headRecording,
        }),
        ['p01', 'p02'],
      );
      expect(changed).toMatchObject({ fresh: false });
      expect(changed.reason).toContain('base-changed');

      const unchanged = await evaluateDeliveryReview(
        git,
        scopeFor(repo),
        delivery({
          base: repo.baseSha,
          reviewed_head: chain.reviewed,
          observed_head: chain.registered,
          observed_base: repo.baseSha,
        }),
        ['p01', 'p02'],
      );
      expect(unchanged).toMatchObject({ fresh: true, reason: null });
    });

    it('refuses an integrated review narrower than the required scope', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      const narrow = await evaluateDeliveryReview(
        git,
        scopeFor(repo),
        delivery({
          base: repo.baseSha,
          reviewed_head: chain.reviewed,
          observed_head: chain.reviewed,
          observed_base: repo.baseSha,
        }),
        ['p01', 'p02', 'p03'],
      );
      expect(narrow.reason).toMatch(/^review-scope-narrow/);
    });
  });

  describe('guard goal-successor-inspection', () => {
    it('fails closed on a missing object', async () => {
      repo = await createGoalRepo();
      const head = repo.git(['rev-parse', 'HEAD']);
      await expect(
        evaluateSuccessor(git, scopeFor(repo), 'f'.repeat(40), head),
      ).resolves.toMatchObject({ fresh: false, code: 'missing-object' });
      await expect(
        evaluateSuccessor(git, scopeFor(repo), head, null),
      ).resolves.toMatchObject({ fresh: false, code: 'missing-revision' });
    });

    it('fails closed when commit inspection fails', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      const failingDiff: GitRunner = {
        run: (args, options) =>
          args[0] === 'diff'
            ? Promise.resolve({
                code: 128,
                stdout: '',
                stderr: 'fatal: bad object',
              })
            : git.run(args, options),
      };
      await expect(
        evaluateSuccessor(
          failingDiff,
          scopeFor(repo),
          chain.reviewed,
          chain.registered,
        ),
      ).resolves.toMatchObject({ fresh: false, code: 'inspection-failed' });

      const throwing: GitRunner = {
        run: () => Promise.reject(new Error('spawn git ENOENT')),
      };
      await expect(
        evaluateSuccessor(
          throwing,
          scopeFor(repo),
          chain.reviewed,
          chain.registered,
        ),
      ).resolves.toMatchObject({ fresh: false, code: 'inspection-failed' });
    });

    it('rejects unknown paths, including another project and unlisted review files', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      for (const path of [
        `${PROJECT_REL}/notes.md`,
        `${PROJECT_REL}/reviews/other-review.md`,
        '.oat/projects/shared/other/state.md',
      ]) {
        await repo.writeRepo(path, 'x\n');
        const published = repo.commitAll(`chore: ${path}`);
        const result = await evaluateSuccessor(
          git,
          scopeFor(repo),
          chain.reviewed,
          published,
        );
        expect(result).toMatchObject({
          fresh: false,
          code: 'disallowed-path',
          path,
        });
        repo.git(['reset', '-q', '--hard', chain.registered]);
      }
    });

    it('rejects a substantive change introduced by a merge commit itself', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      repo.git(['checkout', '-q', '-b', 'side', chain.registered]);
      await repo.write('project-log.md', '# Log\n\n- side note\n');
      repo.commitAll('chore(oat): side log');
      repo.git(['checkout', '-q', 'main']);
      await repo.write(
        'implementation.md',
        (await repo.read('implementation.md')).replace(
          '**Last Updated:** 2026-10-11',
          '**Last Updated:** 2026-10-12',
        ),
      );
      repo.commitAll('chore(oat): main bookkeeping');
      repo.git(['merge', '-q', '--no-ff', '--no-commit', 'side']);
      await repo.writeRepo('src/app.ts', 'export const value = 99;\n');
      repo.git(['add', '-A']);
      repo.git(['commit', '-q', '-m', 'merge side']);
      const merge = repo.git(['rev-parse', 'HEAD']);

      await expect(
        evaluateSuccessor(git, scopeFor(repo), chain.reviewed, merge),
      ).resolves.toMatchObject({
        fresh: false,
        code: 'disallowed-path',
        commit: merge,
        path: 'src/app.ts',
      });
    });

    it('accepts a merge that brings in bookkeeping only', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      repo.git(['checkout', '-q', '-b', 'side', chain.registered]);
      await repo.write('project-log.md', '# Log\n\n- side note\n');
      repo.commitAll('chore(oat): side log');
      repo.git(['checkout', '-q', 'main']);
      await repo.write(
        'implementation.md',
        (await repo.read('implementation.md')).replace(
          '**Last Updated:** 2026-10-11',
          '**Last Updated:** 2026-10-12',
        ),
      );
      repo.commitAll('chore(oat): main bookkeeping');
      repo.git(['merge', '-q', '--no-ff', '-m', 'merge side', 'side']);
      const merge = repo.git(['rev-parse', 'HEAD']);

      await expect(
        evaluateSuccessor(git, scopeFor(repo), chain.reviewed, merge),
      ).resolves.toMatchObject({ fresh: true, code: 'bookkeeping-successor' });
    });

    it('rejects registry and journal edits that rewrite recorded evidence, and accepts progress updates', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      const registered = await repo.read('state.md');
      const journal = await repo.read('implementation.md');
      const cases: [string, string, string][] = [
        [
          'state.md',
          registered.replace(
            'scope: [p01, p02]\n    endpoint',
            'scope: [p01]\n    endpoint',
          ),
          'changed its recorded scope',
        ],
        [
          'state.md',
          registered.replace(
            `reviewed_head: '${chain.reviewed}'`,
            `reviewed_head: '${chain.received}'`,
          ),
          'changed its reviewed_head',
        ],
        [
          'state.md',
          registered.replace(
            'oat_workflow_mode: goal',
            'oat_workflow_mode: goal\noat_skill_gate_overrides: { oat-project-implement: disabled }',
          ),
          'oat_skill_gate_overrides changed',
        ],
        [
          'implementation.md',
          journal.replace('Research recorded.', 'Research rewritten.'),
          'was removed or rewritten',
        ],
        [
          'implementation.md',
          journal.replace(
            '## Phase p03: Ship\n\n**Status:** pending',
            '## Phase p03: Ship\n\n**Status:** extracted\n**Extracted to:** child',
          ),
          'marks a phase extracted',
        ],
      ];
      for (const [file, content, reason] of cases) {
        expect(content).not.toBe(file === 'state.md' ? registered : journal);
        await repo.write(file, content);
        const published = repo.commitAll(`chore(oat): edit ${file}`);
        const result = await evaluateSuccessor(
          git,
          scopeFor(repo),
          chain.reviewed,
          published,
        );
        expect(result).toMatchObject({
          fresh: false,
          code: 'substantive-change',
        });
        expect(result.reason).toContain(reason);
        repo.git(['reset', '-q', '--hard', chain.registered]);
      }

      // Progress and observation updates stay bookkeeping.
      await repo.write(
        'state.md',
        registered
          .replace(
            'observed_head: null',
            `observed_head: '${chain.registered}'`,
          )
          .replace(
            'oat_milestone_status: delivered',
            'oat_milestone_status: delivered\noat_pr_status: open',
          ),
      );
      await repo.write(
        'implementation.md',
        journal.replace('**Total:** 1/3', '**Total:** 2/3'),
      );
      const progress = repo.commitAll('chore(oat): progress');
      await expect(
        evaluateSuccessor(git, scopeFor(repo), chain.reviewed, progress),
      ).resolves.toMatchObject({ fresh: true });
    });
  });

  describe('set-once delivery exit-gate binding (M2)', () => {
    const binding = (
      decidedAt: string,
      reviewedHead = 'null',
      scope = '[p01, p02]',
    ) =>
      `      status: allowed
      resolution: configured
      disposition: passed
      config_fingerprint: null
      reviewed_head: ${reviewedHead}
      subject: { kind: code, scope: ${scope} }
      decided_at: '${decidedAt}'`;

    async function registeredWithBinding(target: GoalRepo) {
      return bookkeepingChain(target, {
        register: (reviewed) =>
          `oat_milestone: m01\noat_milestone_status: delivered\n${registryYaml({
            reviewed,
            base: target.baseSha,
            deliveryExitGate: binding('2026-10-11T10:00:00Z', `'${reviewed}'`),
          })}`,
      });
    }

    it('keeps the registration commit that first sets the binding a bookkeeping successor', async () => {
      repo = await createGoalRepo();
      const chain = await registeredWithBinding(repo);
      expect(await repo.read('state.md')).toContain('    exit_gate:\n');
      await expect(
        evaluateSuccessor(
          git,
          scopeFor(repo),
          chain.reviewed,
          chain.registered,
        ),
      ).resolves.toMatchObject({ fresh: true, code: 'bookkeeping-successor' });
    });

    it('rejects a successor that rewrites the binding with a new decided_at', async () => {
      repo = await createGoalRepo();
      const chain = await registeredWithBinding(repo);
      const registered = await repo.read('state.md');
      const rewritten = registered
        .replace(
          "decided_at: '2026-10-11T10:00:00Z'\n",
          "decided_at: '2026-10-12T09:00:00Z'\n",
        )
        .replace(
          `      reviewed_head: '${chain.reviewed}'\n      subject: { kind: code, scope: [p01, p02] }\n      decided_at: '2026-10-12`,
          `      reviewed_head: '${chain.received}'\n      subject: { kind: code, scope: [p01] }\n      decided_at: '2026-10-12`,
        );
      expect(rewritten).toContain("decided_at: '2026-10-12T09:00:00Z'");
      expect(rewritten).toContain('subject: { kind: code, scope: [p01] }');
      await repo.write('state.md', rewritten);
      const published = repo.commitAll('chore(oat): swap the d01 exit gate');

      const result = await evaluateSuccessor(
        git,
        scopeFor(repo),
        chain.reviewed,
        published,
      );
      expect(result).toMatchObject({
        fresh: false,
        code: 'substantive-change',
        commit: published,
      });
      expect(result.reason).toContain('d01 exit gate binding changed');
    });

    it('rejects a reordered review scope with a swapped binding under the unchanged artifact', async () => {
      repo = await createGoalRepo();
      const chain = await registeredWithBinding(repo);
      const registered = await repo.read('state.md');
      const rewritten = registered
        .replace(
          `artifact: ${ARCHIVED_REVIEW_ARTIFACT}\n      scope: [p01, p02]`,
          `artifact: ${ARCHIVED_REVIEW_ARTIFACT}\n      scope: [p02, p01]`,
        )
        .replace(
          "decided_at: '2026-10-11T10:00:00Z'\n",
          "decided_at: '2026-10-12T09:00:00Z'\n",
        );
      expect(rewritten).toContain('scope: [p02, p01]');
      expect(rewritten).toContain("decided_at: '2026-10-12T09:00:00Z'");
      await repo.write('state.md', rewritten);
      const published = repo.commitAll('chore(oat): reorder scope, swap gate');

      const result = await evaluateSuccessor(
        git,
        scopeFor(repo),
        chain.reviewed,
        published,
      );
      expect(result).toMatchObject({
        fresh: false,
        code: 'substantive-change',
        commit: published,
      });
      expect(result.reason).toContain('d01 exit gate binding changed');
    });

    it('accepts a replacement binding that accompanies new integrated-review evidence', async () => {
      repo = await createGoalRepo();
      const chain = await registeredWithBinding(repo);
      const second = 'reviews/archived/m01-code-review-2.md';
      await repo.write(second, '# m01 re-review\n\nNo findings.\n');
      await repo.write(
        'state.md',
        (await repo.read('state.md'))
          .replace(
            `artifact: ${ARCHIVED_REVIEW_ARTIFACT}`,
            `artifact: ${second}`,
          )
          .replace(
            "decided_at: '2026-10-11T10:00:00Z'\n",
            "decided_at: '2026-10-12T09:00:00Z'\n",
          ),
      );
      const published = repo.commitAll('chore(oat): record the m01 re-review');
      await expect(
        evaluateSuccessor(
          git,
          {
            ...scopeFor(repo),
            evidenceArtifacts: [ARCHIVED_REVIEW_ARTIFACT, second],
          },
          chain.reviewed,
          published,
        ),
      ).resolves.toMatchObject({ fresh: true, code: 'bookkeeping-successor' });
    });
  });

  describe('guard goal-carrier-subject (gate carriers: outcome versus freshness)', () => {
    it('keeps unchanged no_gate and project_disabled carriers fresh with null reviewed heads', async () => {
      await expect(
        evaluateGateCarrier(carrier(), {
          kind: 'code',
          scope: ['p01', 'p02'],
          overrideDisabled: false,
          resolution: 'no_gate',
        }),
      ).resolves.toEqual({
        outcome: 'allowed',
        freshness: 'fresh',
        reason: null,
      });

      await expect(
        evaluateGateCarrier(
          carrier({
            resolution: 'project_disabled',
            disposition: 'project_disabled',
          }),
          {
            kind: 'code',
            scope: ['p01', 'p02'],
            overrideDisabled: true,
            resolution: 'project_disabled',
          },
        ),
      ).resolves.toEqual({
        outcome: 'allowed',
        freshness: 'fresh',
        reason: null,
      });
    });

    it('invalidates the resolution when its subject changes', async () => {
      const result = await evaluateGateCarrier(carrier(), {
        kind: 'code',
        scope: ['p01', 'p02', 'p03'],
      });
      expect(result).toMatchObject({ outcome: 'allowed', freshness: 'stale' });
      expect(result.reason).toMatch(/^subject-changed/);

      await expect(
        evaluateGateCarrier(carrier(), { kind: 'plan', scope: ['p01', 'p02'] }),
      ).resolves.toMatchObject({ freshness: 'stale' });
      await expect(
        evaluateGateCarrier(carrier({ subject: null }), {
          kind: 'code',
          scope: ['p01', 'p02'],
        }),
      ).resolves.toMatchObject({
        freshness: 'stale',
        reason: expect.stringMatching(/^subject-missing/),
      });
    });

    it('invalidates the resolution when the override changes', async () => {
      const disabledNow = await evaluateGateCarrier(carrier(), {
        kind: 'code',
        scope: ['p01', 'p02'],
        overrideDisabled: true,
      });
      expect(disabledNow).toMatchObject({ freshness: 'stale' });
      expect(disabledNow.reason).toMatch(/^override-changed/);

      const enabledNow = await evaluateGateCarrier(
        carrier({
          resolution: 'project_disabled',
          disposition: 'project_disabled',
        }),
        { kind: 'code', scope: ['p01', 'p02'], overrideDisabled: false },
      );
      expect(enabledNow).toMatchObject({ freshness: 'stale' });
      expect(enabledNow.reason).toMatch(/^override-changed/);
    });

    it('invalidates the resolution when the configuration changes', async () => {
      const reconfigured = await evaluateGateCarrier(carrier(), {
        kind: 'code',
        scope: ['p01', 'p02'],
        resolution: 'configured',
      });
      expect(reconfigured).toMatchObject({ freshness: 'stale' });
      expect(reconfigured.reason).toMatch(/^configuration-changed/);

      const fingerprint = await evaluateGateCarrier(
        carrier({ config_fingerprint: 'sha256:aaa' }),
        {
          kind: 'code',
          scope: ['p01', 'p02'],
          configFingerprint: 'sha256:bbb',
        },
      );
      expect(fingerprint).toMatchObject({ freshness: 'stale' });
      expect(fingerprint.reason).toMatch(/^configuration-changed/);
    });

    it('refuses a fabricated reviewed head on an unreviewed resolution', async () => {
      await expect(
        evaluateGateCarrier(carrier({ reviewed_head: 'a'.repeat(40) }), {
          kind: 'code',
          scope: ['p01', 'p02'],
        }),
      ).resolves.toMatchObject({ outcome: 'invalid', freshness: 'stale' });
    });

    it('does not invalidate an approved plan subject through implementation commits', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      const plan = carrier({
        resolution: 'configured',
        disposition: 'passed',
        reviewed_head: repo.baseSha,
        subject: { kind: 'plan', scope: ['p01', 'p02'], ref: 'plan.md' },
      });
      await expect(
        evaluateGateCarrier(
          plan,
          { kind: 'plan', scope: ['p01', 'p02'], resolution: 'configured' },
          { git, scope: scopeFor(repo), publishedHeads: [chain.registered] },
        ),
      ).resolves.toEqual({
        outcome: 'allowed',
        freshness: 'fresh',
        reason: null,
      });
    });

    it('keeps a configured code carrier at its reviewed revision across bookkeeping and stales it on a substantive successor', async () => {
      repo = await createGoalRepo();
      const chain = await bookkeepingChain(repo);
      const configured = carrier({
        resolution: 'configured',
        disposition: 'passed',
        reviewed_head: chain.reviewed,
      });
      const expected = { kind: 'code' as const, scope: ['p01', 'p02'] };
      await expect(
        evaluateGateCarrier(configured, expected, {
          git,
          scope: scopeFor(repo),
          publishedHeads: [chain.registered],
        }),
      ).resolves.toMatchObject({ outcome: 'allowed', freshness: 'fresh' });

      await repo.writeRepo('src/app.ts', 'export const value = 5;\n');
      const substantive = repo.commitAll('feat: after review');
      const stale = await evaluateGateCarrier(configured, expected, {
        git,
        scope: scopeFor(repo),
        publishedHeads: [substantive],
      });
      expect(stale).toMatchObject({ outcome: 'allowed', freshness: 'stale' });
      expect(stale.reason).toMatch(/^disallowed-path/);
    });
  });
});
