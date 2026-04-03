import { writeFile } from 'node:fs/promises';

import { chromium } from '@playwright/test';

interface LinkSource {
  source: string;
  text: string;
}

interface LinkRecord {
  url: string;
  sources: LinkSource[];
}

interface PageRecord {
  finalUrl: string | null;
  fragments: Set<string>;
  status: number | null;
  url: string;
}

interface CheckResult {
  finalUrl: string | null;
  ok: boolean;
  reason: string | null;
  status: number | null;
}

interface BrokenLink {
  reason: string | null;
  sources: LinkSource[];
  status: number | null;
  type:
    | 'external'
    | 'internal-fragment'
    | 'internal-page'
    | 'internal-resource';
  url: string;
}

interface LinkCheckReport {
  broken: BrokenLink[];
  brokenCount: number;
  crawledPages: number;
  discoveredLinks: number;
  startUrl: string;
}

interface CliOptions {
  checkExternal: boolean;
  json: boolean;
  maxPages: number;
  output?: string;
  timeoutMs: number;
  url: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    checkExternal: true,
    json: false,
    maxPages: 400,
    timeoutMs: 20_000,
    url: 'https://voxmedia.github.io/open-agent-toolkit/',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--no-external') {
      options.checkExternal = false;
      continue;
    }
    if (arg === '--url') {
      options.url = argv[index + 1] ?? options.url;
      index += 1;
      continue;
    }
    if (arg === '--output') {
      options.output = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === '--max-pages') {
      options.maxPages =
        Number.parseInt(argv[index + 1] ?? '', 10) || options.maxPages;
      index += 1;
      continue;
    }
    if (arg === '--timeout-ms') {
      options.timeoutMs =
        Number.parseInt(argv[index + 1] ?? '', 10) || options.timeoutMs;
      index += 1;
      continue;
    }
    if (!arg.startsWith('--')) {
      options.url = arg;
    }
  }

  return options;
}

function normalizeNoHash(raw: string, base?: string): string {
  const url = new URL(raw, base);
  url.hash = '';
  return url.href;
}

function isHttp(url: URL): boolean {
  return url.protocol === 'http:' || url.protocol === 'https:';
}

function isInternalDocsPage(url: URL, start: URL, prefix: string): boolean {
  if (!isHttp(url)) return false;
  if (url.origin !== start.origin) return false;
  if (!url.pathname.startsWith(prefix)) return false;

  const last = url.pathname.split('/').pop() ?? '';
  return !/\.[a-zA-Z0-9]+$/.test(last);
}

function addLink(
  links: Map<string, LinkRecord>,
  targetUrl: URL,
  sourceUrl: string,
  text: string,
): void {
  const existing = links.get(targetUrl.href) ?? {
    url: targetUrl.href,
    sources: [],
  };
  if (existing.sources.length < 10) {
    existing.sources.push({
      source: sourceUrl,
      text: text.slice(0, 120),
    });
  }
  links.set(targetUrl.href, existing);
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const start = new URL(options.url);
  const prefix = start.pathname.endsWith('/')
    ? start.pathname
    : `${start.pathname}/`;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const crawlQueue = [start.href];
  const queued = new Set([start.href]);
  const crawled = new Set<string>();
  const pageData = new Map<string, PageRecord>();
  const links = new Map<string, LinkRecord>();
  const fetchCache = new Map<string, CheckResult>();

  async function crawlOne(url: string): Promise<void> {
    let response;
    try {
      response = await page.goto(url, {
        timeout: options.timeoutMs,
        waitUntil: 'domcontentloaded',
      });
    } catch {
      pageData.set(url, {
        finalUrl: null,
        fragments: new Set(),
        status: null,
        url,
      });
      return;
    }

    const finalUrl = page.url();
    const status = response?.status() ?? null;
    const fragments = await page
      .locator('[id], a[name]')
      .evaluateAll((nodes) => {
        const values = new Set<string>();
        for (const node of nodes) {
          const id = node.getAttribute('id');
          const name = node.getAttribute('name');
          if (id) values.add(id);
          if (name) values.add(name);
        }
        return [...values];
      });

    const pageKey = normalizeNoHash(finalUrl);
    pageData.set(pageKey, {
      finalUrl,
      fragments: new Set(fragments),
      status,
      url: pageKey,
    });

    const anchors = await page.locator('a[href]').evaluateAll((nodes) =>
      nodes.map((node) => ({
        href: node.getAttribute('href') || '',
        text: (node.textContent || '')
          .trim()
          .replace(/\s+/g, ' ')
          .slice(0, 120),
      })),
    );

    for (const anchor of anchors) {
      const href = anchor.href.trim();
      if (
        !href ||
        href.startsWith('data:') ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      ) {
        continue;
      }

      let target;
      try {
        target = new URL(href, finalUrl);
      } catch {
        continue;
      }

      if (!isHttp(target)) continue;
      addLink(links, target, pageKey, anchor.text);

      const targetPage = new URL(target.href);
      targetPage.hash = '';
      if (
        isInternalDocsPage(targetPage, start, prefix) &&
        !queued.has(targetPage.href) &&
        !crawled.has(targetPage.href) &&
        queued.size < options.maxPages
      ) {
        queued.add(targetPage.href);
        crawlQueue.push(targetPage.href);
      }
    }
  }

  async function fetchCheck(url: URL): Promise<CheckResult> {
    const key = url.href;
    const cached = fetchCache.get(key);
    if (cached) return cached;

    let result: CheckResult;
    try {
      let response = await fetch(key, {
        headers: { 'user-agent': 'oat-link-checker/1.0' },
        method: 'HEAD',
        redirect: 'follow',
      });
      if (response.status === 403 || response.status === 405) {
        response = await fetch(key, {
          headers: { 'user-agent': 'oat-link-checker/1.0' },
          method: 'GET',
          redirect: 'follow',
        });
      }

      result = {
        finalUrl: response.url,
        ok: response.ok,
        reason: response.ok ? null : `HTTP ${response.status}`,
        status: response.status,
      };
    } catch (error) {
      result = {
        finalUrl: null,
        ok: false,
        reason: String(error),
        status: null,
      };
    }

    fetchCache.set(key, result);
    return result;
  }

  while (crawlQueue.length && crawled.size < options.maxPages) {
    const next = crawlQueue.shift();
    if (!next || crawled.has(next)) continue;
    crawled.add(next);
    await crawlOne(next);
  }

  const broken: BrokenLink[] = [];
  for (const entry of links.values()) {
    const target = new URL(entry.url);
    const noHash = normalizeNoHash(target.href);
    const targetIsInternalPage = isInternalDocsPage(
      new URL(noHash),
      start,
      prefix,
    );

    if (targetIsInternalPage) {
      const data = pageData.get(noHash);
      if (!data) {
        const checked = await fetchCheck(new URL(noHash));
        if (!checked.ok) {
          broken.push({
            reason: checked.reason,
            sources: entry.sources,
            status: checked.status,
            type: 'internal-page',
            url: entry.url,
          });
        }
        continue;
      }

      if (data.status && data.status >= 400) {
        broken.push({
          reason: `HTTP ${data.status}`,
          sources: entry.sources,
          status: data.status,
          type: 'internal-page',
          url: entry.url,
        });
        continue;
      }

      if (target.hash) {
        const fragment = decodeURIComponent(target.hash.slice(1));
        if (!data.fragments.has(fragment)) {
          broken.push({
            reason: `Missing fragment #${fragment}`,
            sources: entry.sources,
            status: null,
            type: 'internal-fragment',
            url: entry.url,
          });
        }
      }
      continue;
    }

    if (!options.checkExternal && target.origin !== start.origin) {
      continue;
    }

    const checked = await fetchCheck(target);
    if (!checked.ok) {
      broken.push({
        reason: checked.reason,
        sources: entry.sources,
        status: checked.status,
        type: target.origin === start.origin ? 'internal-resource' : 'external',
        url: entry.url,
      });
    }
  }

  broken.sort((left, right) => left.url.localeCompare(right.url));

  const report: LinkCheckReport = {
    broken,
    brokenCount: broken.length,
    crawledPages: crawled.size,
    discoveredLinks: links.size,
    startUrl: start.href,
  };

  if (options.output) {
    await writeFile(options.output, JSON.stringify(report, null, 2));
  }

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(
      `Crawled ${report.crawledPages} pages, checked ${report.discoveredLinks} links, found ${report.brokenCount} broken links.`,
    );
    for (const brokenLink of report.broken) {
      const sources = brokenLink.sources
        .slice(0, 3)
        .map((source) => `${source.source} (${source.text || 'no text'})`)
        .join(', ');
      console.log(
        `- [${brokenLink.type}] ${brokenLink.url} :: ${brokenLink.reason ?? 'unknown error'} :: ${sources}`,
      );
    }
  }

  await browser.close();

  if (report.brokenCount > 0) {
    process.exitCode = 1;
  }
}

void run();
