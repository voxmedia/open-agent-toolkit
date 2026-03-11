import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import type { CommandContext } from '@app/command-context';
import { ensureDir } from '@fs/io';

import {
  REVIEW_COMMENTS_PAGE_QUERY,
  SEARCH_MERGED_PRS_QUERY,
} from './graphql-queries';
import type {
  CollectOptions,
  CollectionChunk,
  GraphQLPullRequest,
  GraphQLReviewComment,
  GraphQLSearchResult,
  IndexedComment,
  PrReviewComment,
} from './pr-comments.types';

const execFileAsync = promisify(execFile);

const TRIVIAL_BODY_PATTERNS = [
  /^lgtm\.?$/i,
  /^nit\.?$/i,
  /^\+1$/,
  /^:thumbsup:$/,
  /^👍+$/,
  /^looks good\.?$/i,
  /^looks good to me\.?$/i,
  /^ship it\.?$/i,
  /^:shipit:$/,
  /^nice!?$/i,
  /^great!?$/i,
  /^thanks!?$/i,
  /^thank you!?$/i,
];

const KNOWN_BOT_LOGINS = new Set([
  'coderabbitai',
  'copilot',
  'sourcery-ai',
  'vercel',
  'supabase',
  'codacy-production',
  'sonarcloud',
  'codecov',
  'netlify',
  'linear',
  'changeset-bot',
  'renovate',
  'dependabot',
  'snyk-bot',
]);

const TRIVIAL_WORD_THRESHOLD = 5;

const CODE_REFERENCE_PATTERN = /`[^`]+`|[\w/]+\.\w{1,5}:\d+|line \d+/i;

export interface CollectDependencies {
  ghGraphQL: (
    query: string,
    variables: Record<string, unknown>,
  ) => Promise<unknown>;
  resolveCurrentRepo: () => Promise<string>;
}

export const defaultCollectDependencies: CollectDependencies = {
  ghGraphQL: async (query, variables) => {
    const args = ['api', 'graphql', '-f', `query=${query}`];
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'number') {
        args.push('-F', `${key}=${value}`);
      } else {
        args.push('-f', `${key}=${String(value)}`);
      }
    }
    const { stdout } = await execFileAsync('gh', args, {
      maxBuffer: 50 * 1024 * 1024,
    });
    return JSON.parse(stdout);
  },
  resolveCurrentRepo: async () => {
    const { stdout } = await execFileAsync('git', [
      'remote',
      'get-url',
      'origin',
    ]);
    const url = stdout.trim();
    // Handle SSH (git@github.com:owner/name.git) and HTTPS (https://github.com/owner/name.git)
    // Allow dots in repo names (e.g., owner/repo.name)
    const sshMatch = url.match(/git@[^:]+:([^/]+\/[^/]+?)(?:\.git)?$/);
    if (sshMatch?.[1]) return sshMatch[1];
    const httpsMatch = url.match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/);
    if (httpsMatch?.[1]) return httpsMatch[1];
    throw new Error(
      `Could not parse repository owner/name from git remote URL: ${url}`,
    );
  },
};

export async function runCollectComments(
  context: CommandContext,
  options: CollectOptions,
  deps: CollectDependencies = defaultCollectDependencies,
): Promise<void> {
  const { logger } = context;
  const { since, until, outDir, ignoreBots } = options;
  let { repo } = options;

  const untilDate = until ?? new Date().toISOString().slice(0, 10);

  if (!repo) {
    logger.debug('No --repo provided, resolving from git remote…');
    try {
      repo = await deps.resolveCurrentRepo();
      logger.info(`Resolved repository: ${repo}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(
        `--repo not provided and could not resolve current repository: ${message}`,
        { cause: error },
      );
    }
  }

  logger.info(`Collecting PR review comments from ${since} to ${untilDate}...`);

  const repoQualifier = `repo:${repo}`;

  const allComments = await fetchAllComments(
    deps,
    logger,
    repoQualifier,
    since,
    untilDate,
    ignoreBots,
    repo,
  );

  if (allComments.length === 0) {
    logger.warn('No review comments found in the specified date range.');
    if (context.json) {
      logger.json({ status: 'ok', comments: 0, chunks: [] });
    }
    return;
  }

  logger.info(`Found ${allComments.length} review comments.`);

  const indexed = assignIds(allComments);
  const chunks = groupByMonth(indexed);

  await ensureDir(outDir);

  const writtenFiles: string[] = [];
  for (const chunk of chunks) {
    const jsonPath = join(outDir, `${chunk.month}.json`);
    const mdPath = join(outDir, `${chunk.month}.md`);

    await writeFile(jsonPath, `${JSON.stringify(chunk, null, 2)}\n`, 'utf8');
    await writeFile(mdPath, renderMarkdown(chunk), 'utf8');

    writtenFiles.push(jsonPath, mdPath);
    logger.info(`  ${chunk.month}: ${chunk.comments.length} comments`);
  }

  logger.success(
    `Collected ${allComments.length} comments across ${chunks.length} month(s) → ${outDir}`,
  );

  if (context.json) {
    logger.json({
      status: 'ok',
      comments: allComments.length,
      chunks: chunks.map((c) => ({ month: c.month, count: c.comments.length })),
      outputDir: outDir,
      files: writtenFiles,
    });
  }
}

async function fetchAllComments(
  deps: CollectDependencies,
  logger: CommandContext['logger'],
  repoQualifier: string,
  since: string,
  until: string,
  ignoreBots: boolean,
  repo: string | undefined,
): Promise<PrReviewComment[]> {
  const comments: PrReviewComment[] = [];
  let cursor: string | null = null;
  let page = 0;

  const searchQuery = [
    'is:pr',
    'is:merged',
    `merged:${since}..${until}`,
    repoQualifier,
  ]
    .filter(Boolean)
    .join(' ');

  logger.debug(`GraphQL search query: ${searchQuery}`);

  // Parse owner/name for paginating review comments
  const repoParts = repo?.split('/');
  const owner = repoParts?.[0];
  const name = repoParts?.[1];

  while (true) {
    page++;
    logger.debug(`Fetching PR page ${page}...`);

    const variables: Record<string, unknown> = {
      searchQuery,
      first: 25,
    };
    if (cursor) {
      variables.after = cursor;
    }

    const result = (await deps.ghGraphQL(
      SEARCH_MERGED_PRS_QUERY,
      variables,
    )) as { data: GraphQLSearchResult };

    const searchData = result.data.search;

    for (const pr of searchData.nodes) {
      const prComments = await collectPrComments(deps, pr, owner, name);
      const filtered = filterComments(prComments, pr, ignoreBots);
      comments.push(...filtered);
    }

    if (!searchData.pageInfo.hasNextPage) {
      break;
    }
    cursor = searchData.pageInfo.endCursor;
  }

  return comments;
}

async function collectPrComments(
  deps: CollectDependencies,
  pr: GraphQLPullRequest,
  owner: string | undefined,
  name: string | undefined,
): Promise<{ pr: GraphQLPullRequest; comment: GraphQLReviewComment }[]> {
  const results = pr.reviewComments.nodes.map((c) => ({ pr, comment: c }));

  // Paginate if there are more comments
  if (pr.reviewComments.pageInfo.hasNextPage && owner && name) {
    let commentCursor = pr.reviewComments.pageInfo.endCursor;
    while (commentCursor) {
      const pageResult = (await deps.ghGraphQL(REVIEW_COMMENTS_PAGE_QUERY, {
        prNumber: pr.number,
        owner,
        name,
        first: 100,
        after: commentCursor,
      })) as {
        data: {
          repository: {
            pullRequest: {
              reviewComments: GraphQLPullRequest['reviewComments'];
            };
          };
        };
      };

      const page = pageResult.data.repository.pullRequest.reviewComments;
      for (const c of page.nodes) {
        results.push({ pr, comment: c });
      }

      commentCursor = page.pageInfo.hasNextPage
        ? page.pageInfo.endCursor
        : null;
    }
  }

  return results;
}

function isBot(comment: GraphQLReviewComment): boolean {
  const login = comment.author?.login ?? '';
  // Layer 1: GitHub API author type
  if (comment.author?.__typename === 'Bot') return true;
  // Layer 2: Known bot login suffix
  if (login.endsWith('[bot]')) return true;
  // Layer 3: Known service logins
  if (KNOWN_BOT_LOGINS.has(login.toLowerCase())) return true;
  return false;
}

function isTrivialComment(body: string): boolean {
  // Exact pattern matches (emoji-only, known phrases)
  if (TRIVIAL_BODY_PATTERNS.some((p) => p.test(body))) return true;
  // Emoji-only comments (Unicode emoji sequences)
  if (/^\p{Emoji_Presentation}+$/u.test(body)) return true;
  // Short comments under word threshold — unless they reference code
  const wordCount = body.split(/\s+/).length;
  if (wordCount < TRIVIAL_WORD_THRESHOLD && !CODE_REFERENCE_PATTERN.test(body))
    return true;
  return false;
}

function filterComments(
  items: { pr: GraphQLPullRequest; comment: GraphQLReviewComment }[],
  _pr: GraphQLPullRequest,
  ignoreBots: boolean,
): PrReviewComment[] {
  const results: PrReviewComment[] = [];

  for (const { pr, comment } of items) {
    const author = comment.author?.login ?? 'ghost';
    const body = comment.body.trim();

    if (!body) continue;
    if (ignoreBots && isBot(comment)) continue;
    if (isTrivialComment(body)) continue;

    results.push({
      id: comment.id,
      prNumber: pr.number,
      prTitle: pr.title,
      prAuthor: pr.author?.login ?? 'ghost',
      prMergedAt: pr.mergedAt,
      filePath: comment.path,
      line: comment.line,
      author,
      body,
      createdAt: comment.createdAt,
      url: comment.url,
    });
  }

  return results;
}

function assignIds(comments: PrReviewComment[]): IndexedComment[] {
  const sorted = [...comments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return sorted.map((c, i) => ({
    ...c,
    rcId: `RC-${String(i + 1).padStart(3, '0')}`,
  }));
}

function groupByMonth(comments: IndexedComment[]): CollectionChunk[] {
  const groups = new Map<string, IndexedComment[]>();

  for (const c of comments) {
    const month = c.prMergedAt.slice(0, 7); // YYYY-MM from PR merge date
    const existing = groups.get(month);
    if (existing) {
      existing.push(c);
    } else {
      groups.set(month, [c]);
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, monthComments]) => ({ month, comments: monthComments }));
}

function renderMarkdown(chunk: CollectionChunk): string {
  const lines: string[] = [`# Review Comments — ${chunk.month}`, ''];

  for (const c of chunk.comments) {
    lines.push(`## ${c.rcId}: PR #${c.prNumber} — ${c.prTitle}`);
    lines.push('');
    lines.push(`- **Author:** ${c.author}`);
    lines.push(`- **File:** \`${c.filePath}\`${c.line ? `:${c.line}` : ''}`);
    lines.push(`- **Date:** ${c.createdAt.slice(0, 10)}`);
    lines.push(`- **URL:** ${c.url}`);
    lines.push('');
    lines.push('````');
    lines.push(c.body);
    lines.push('````');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}
