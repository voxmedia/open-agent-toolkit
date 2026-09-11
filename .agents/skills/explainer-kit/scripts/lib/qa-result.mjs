const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const REQUIRED_CHECKS = [
  'parse',
  'requiredNarrative',
  'structure',
  'sourceDumping',
  'shellScripts',
  'ledgerToPage',
  'pageToLedger',
];
const SCREENSHOTS = ['qa/320.png', 'qa/768.png', 'qa/1440.png'];
const BROWSER_RUNGS = new Set(['host', 'playwright']);

export function validateQaResult(value) {
  requireObject(value, 'QA result');
  requireExactKeys(
    value,
    [
      'artifactSha256',
      'checks',
      'rung',
      'reason',
      'screenshots',
      'visual',
      'deferredBrowserRequest',
    ],
    ['artifactSha256', 'checks', 'rung', 'visual'],
    'QA result',
  );
  if (!HASH_PATTERN.test(value.artifactSha256)) {
    throw new TypeError('QA result artifactSha256 is invalid.');
  }

  requireObject(value.checks, 'QA checks');
  requireExactKeys(value.checks, REQUIRED_CHECKS, REQUIRED_CHECKS, 'QA checks');
  for (const [id, check] of Object.entries(value.checks)) {
    requireObject(check, `QA check ${id}`);
    if (check.status === 'pass') {
      requireExactKeys(check, ['status'], ['status'], `QA check ${id}`);
    } else if (check.status === 'fail') {
      requireExactKeys(
        check,
        ['status', 'cause'],
        ['status', 'cause'],
        `QA check ${id}`,
      );
      requireNonEmptyString(check.cause, `QA check ${id} cause`);
    } else {
      throw new TypeError(`QA check ${id} status is invalid.`);
    }
  }

  if (value.rung === 'none') {
    requireExactKeys(
      value.visual,
      ['verdict'],
      ['verdict'],
      'QA visual result',
    );
    if (value.visual.verdict !== 'none') {
      throw new TypeError('The none rung requires visual verdict none.');
    }
    requireNonEmptyString(value.reason, 'QA none-rung reason');
    if (value.screenshots !== undefined) {
      throw new TypeError('The none rung cannot claim screenshots.');
    }
  } else if (BROWSER_RUNGS.has(value.rung)) {
    if (value.reason !== undefined) {
      throw new TypeError('A browser rung cannot carry a runtime reason.');
    }
    if (
      !Array.isArray(value.screenshots) ||
      value.screenshots.length !== SCREENSHOTS.length ||
      !value.screenshots.every((path, index) => path === SCREENSHOTS[index])
    ) {
      throw new TypeError(
        'A browser rung requires the three canonical screenshots.',
      );
    }
    validateBrowserVisual(value.visual);
  } else {
    throw new TypeError('QA result rung is invalid.');
  }

  if (value.deferredBrowserRequest !== undefined) {
    validateDeferredBrowserRequest(value.deferredBrowserRequest);
    if (value.rung !== 'none') {
      throw new TypeError(
        'A deferred browser request is valid only on the none rung.',
      );
    }
  }
  return value;
}

function validateBrowserVisual(visual) {
  requireObject(visual, 'QA visual result');
  if (visual.verdict === 'pass') {
    requireExactKeys(
      visual,
      ['verdict', 'notes'],
      ['verdict', 'notes'],
      'QA visual result',
    );
    requireNonEmptyString(visual.notes, 'QA visual notes');
    return;
  }
  if (visual.verdict === 'findings') {
    requireExactKeys(
      visual,
      ['verdict', 'findings', 'notes'],
      ['verdict', 'findings'],
      'QA visual result',
    );
    if (
      !Array.isArray(visual.findings) ||
      visual.findings.length === 0 ||
      !visual.findings.every(
        (finding) => typeof finding === 'string' && finding.length > 0,
      )
    ) {
      throw new TypeError('QA visual findings are invalid.');
    }
    if (visual.notes !== undefined) {
      requireNonEmptyString(visual.notes, 'QA visual notes');
    }
    return;
  }
  throw new TypeError('QA visual verdict is invalid.');
}

function validateDeferredBrowserRequest(value) {
  requireObject(value, 'Deferred browser request');
  requireExactKeys(
    value,
    ['rung', 'screenshots', 'artifactSha256', 'visualVerdict', 'visualNotes'],
    ['rung', 'screenshots', 'artifactSha256', 'visualVerdict'],
    'Deferred browser request',
  );
  if (value.rung !== 'host') {
    throw new TypeError('Deferred browser request rung is invalid.');
  }
  for (const [key, entry] of Object.entries(value)) {
    requireNonEmptyString(entry, `Deferred browser request ${key}`);
  }
}

function requireExactKeys(value, allowed, required, label) {
  const keys = Object.keys(value);
  if (
    keys.some((key) => !allowed.includes(key)) ||
    required.some((key) => !keys.includes(key))
  ) {
    throw new TypeError(`${label} keys are invalid.`);
  }
}

function requireObject(value, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
}

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}
