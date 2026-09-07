/**
 * Pre-flight capability probe for the provider-neutral seams a lifecycle
 * `project-recap` run requires.
 *
 * The probe is pure: it inspects only the inputs a caller would hand to
 * `runOatExplainer`, applying the same resolution and exclusivity rules
 * `scripts/run.mjs` applies at runtime. It never imports a module, calls a
 * callback, validates a browser-session brand, or touches the filesystem.
 *
 * Three outcomes are kept distinct and are never conflated:
 *
 * - `missing` — no provider is supplied for a seam this mode requires. This is
 *   the only outcome that may become a recordable `skip` / `capability_probe`
 *   intent (`code: 'seams-unavailable'`).
 * - `invalid` — a seam is supplied but violates a resolution rule (both a
 *   callback and a module path, a non-function callback, an empty module path,
 *   or an unsupported `coreOptions` route). It fails closed with the same
 *   message the runtime would raise (`code: 'seams-invalid'`) and is never a
 *   skip.
 * - runtime failure — an unloadable module, a non-function export, an unbranded
 *   browser session, or a failed generation. The probe never observes these
 *   because it never loads or calls anything, so a failed run after a passing
 *   probe stays `failed`.
 *
 * Each seam has its own classifier that mirrors its `run.mjs` resolver check by
 * check and in the same order, because the resolvers do not share one order:
 * `resolveLifecycleCritic` counts only function/truthy candidates before it
 * type-checks, while the author, visual critic, and set planner type-check the
 * callback before they reject a direct-plus-module conflict. Keep each
 * classifier aligned with the resolver named in its comment.
 */

const MODES = new Set(['interactive', 'unattended']);

const isSet = (value) => value !== undefined;

const invalid = (reason, message) => ({ status: 'invalid', reason, message });
const supplied = () => ({ status: 'supplied' });
const absent = () => ({ status: 'absent' });

function badModulePath(value) {
  return typeof value !== 'string' || value.trim().length === 0;
}

/** Mirrors `run.mjs#resolveLifecycleAuthor`. */
function classifyAuthor({ author, authorModulePath }, coreOptions) {
  if (isSet(coreOptions.author)) {
    return invalid(
      'unsupported-core-option',
      'coreOptions.author is not supported at the OAT adapter boundary; supply author directly.',
    );
  }
  if (isSet(author) && typeof author !== 'function') {
    return invalid(
      'callback-not-a-function',
      'author must be a function when supplied.',
    );
  }
  if (isSet(author) && isSet(authorModulePath)) {
    return invalid(
      'multiple-sources',
      'Supply only one provider-neutral author callback or author module entry point.',
    );
  }
  if (!isSet(author) && !isSet(authorModulePath)) return absent();
  if (isSet(authorModulePath) && badModulePath(authorModulePath)) {
    return invalid(
      'empty-module-path',
      'authorModulePath must be a non-empty path.',
    );
  }
  return supplied();
}

/**
 * Mirrors `run.mjs#resolveLifecycleCritic`.
 *
 * `resolveLifecycleCritic` returns `null` rather than throwing when no critic is
 * supplied, so treating the critic as required looks stricter than the adapter
 * resolver in isolation. It is not, for the runs this probe serves: an
 * artifact-bound lifecycle closeout recap passes no `suppliedFactBasePath`, so
 * `bindProjectSources` binds it `factBase.mode: 'federated'`
 * (`bind-project-sources.mjs`), and the core throws for a federated fact base
 * with no critic (`explainer-kit/scripts/lib/fact-base.mjs`). Such a host cannot
 * produce a recap today; probing the critic turns that mid-run core failure into
 * a pre-flight capability skip. (A `supplied` fact base is a different
 * invocation path and does skip the core's critic check, but no lifecycle recap
 * caller uses it.) Do not "fix" this to match `resolveLifecycleCritic` — that
 * would reintroduce an unrunnable recap.
 */
function classifyCritic({ critic, criticModulePath }, coreOptions) {
  // The runtime counts only candidates that already look usable, so a
  // non-function callback beside a module path is a type error rather than a
  // conflict.
  const candidates = [
    typeof critic === 'function' ? critic : null,
    typeof coreOptions.critic === 'function' ? coreOptions.critic : null,
    criticModulePath ? criticModulePath : null,
  ].filter(Boolean);
  if (candidates.length > 1) {
    return invalid(
      'multiple-sources',
      'Supply only one provider-neutral critic callback or critic module entry point.',
    );
  }
  if (isSet(critic) && typeof critic !== 'function') {
    return invalid(
      'callback-not-a-function',
      'critic must be a function when supplied.',
    );
  }
  if (isSet(coreOptions.critic) && typeof coreOptions.critic !== 'function') {
    return invalid(
      'callback-not-a-function',
      'coreOptions.critic must be a function when supplied.',
    );
  }
  if (isSet(criticModulePath)) {
    return badModulePath(criticModulePath)
      ? invalid(
          'empty-module-path',
          'criticModulePath must be a non-empty path.',
        )
      : supplied();
  }
  // `coreOptions.critic` is the documented compatibility route, so it satisfies
  // the seam rather than invalidating it.
  return (critic ?? coreOptions.critic) ? supplied() : absent();
}

/** Mirrors `run.mjs#resolveLifecycleBrowserSession`. */
function classifyBrowserSession(
  {
    browserSession,
    browserSessionModulePath,
    browserProbe,
    browserProbeModulePath,
  },
  coreOptions,
) {
  if (isSet(coreOptions.browserProbe)) {
    return invalid(
      'unsupported-core-option',
      'coreOptions.browserProbe is not supported at the OAT adapter boundary; supply browserSession directly.',
    );
  }
  if (isSet(browserProbe) || isSet(browserProbeModulePath)) {
    return invalid(
      'unsupported-input',
      'Bare browserProbe callbacks are not supported at the OAT adapter boundary; supply a branded browserSession created by createBrowserProbeSession().',
    );
  }
  if (isSet(coreOptions.browserSession)) {
    return invalid(
      'unsupported-core-option',
      'coreOptions.browserSession is not supported at the OAT adapter boundary; supply browserSession directly.',
    );
  }
  if (isSet(browserSession) && isSet(browserSessionModulePath)) {
    return invalid(
      'multiple-sources',
      'Supply only one browser session descriptor or browser session module entry point.',
    );
  }
  if (isSet(browserSessionModulePath)) {
    return badModulePath(browserSessionModulePath)
      ? invalid(
          'empty-module-path',
          'browserSessionModulePath must be a non-empty path.',
        )
      : supplied();
  }
  // A browser session is a descriptor the runtime resolves by truthiness, so a
  // falsy one raises the same "requires exactly one" error as supplying none.
  // Classifying it invalid would fail the unattended completion this probe
  // exists to unblock.
  return browserSession ? supplied() : absent();
}

/** Mirrors `run.mjs#resolveLifecycleVisualCritic` and `resolveProviderCallback`. */
function classifyVisualCritic(
  { visualCritic, visualCriticModulePath },
  coreOptions,
) {
  if (isSet(coreOptions.visualCritic)) {
    return invalid(
      'unsupported-core-option',
      'coreOptions.visualCritic is not supported at the OAT adapter boundary; supply visualCritic directly.',
    );
  }
  if (isSet(visualCritic) && typeof visualCritic !== 'function') {
    return invalid(
      'callback-not-a-function',
      'visualCritic must be a function when supplied.',
    );
  }
  if (isSet(visualCritic) && isSet(visualCriticModulePath)) {
    return invalid(
      'multiple-sources',
      'Supply only one provider-neutral visual critic callback or visual critic module entry point.',
    );
  }
  if (!isSet(visualCriticModulePath)) {
    return visualCritic ? supplied() : absent();
  }
  return badModulePath(visualCriticModulePath)
    ? invalid(
        'empty-module-path',
        'visualCriticModulePath must be a non-empty path.',
      )
    : supplied();
}

/** Mirrors `run.mjs#resolveLifecycleSetPlanner`. */
function classifyPlanSet({ planSet, planSetModulePath }, coreOptions) {
  if (isSet(coreOptions.planSet)) {
    return invalid(
      'unsupported-core-option',
      'coreOptions.planSet is not supported at the OAT adapter boundary; supply planSet directly.',
    );
  }
  if (isSet(planSet) && typeof planSet !== 'function') {
    return invalid(
      'callback-not-a-function',
      'planSet must be a function when supplied.',
    );
  }
  if (isSet(planSet) && isSet(planSetModulePath)) {
    return invalid(
      'multiple-sources',
      'Supply only one provider-neutral set planner callback or set planner module entry point.',
    );
  }
  if (!isSet(planSet) && !isSet(planSetModulePath)) return absent();
  if (isSet(planSetModulePath) && badModulePath(planSetModulePath)) {
    return invalid(
      'empty-module-path',
      'planSetModulePath must be a non-empty path.',
    );
  }
  return supplied();
}

/**
 * The five seams an unattended `project-recap` requires, in report order.
 *
 * `requiredIn` mirrors the adapter contract: the author and the fact critic are
 * required by every federated adapter run, while the browser session, visual
 * critic, and set planner are required only for unattended project recaps.
 */
const SEAMS = [
  {
    id: 'author',
    requiredIn: ['interactive', 'unattended'],
    classify: classifyAuthor,
  },
  {
    id: 'critic',
    requiredIn: ['interactive', 'unattended'],
    classify: classifyCritic,
  },
  {
    id: 'browserSession',
    requiredIn: ['unattended'],
    classify: classifyBrowserSession,
  },
  {
    id: 'visualCritic',
    requiredIn: ['unattended'],
    classify: classifyVisualCritic,
  },
  {
    id: 'planSet',
    requiredIn: ['unattended'],
    classify: classifyPlanSet,
  },
];

export const RECAP_SEAM_IDS = Object.freeze(SEAMS.map((seam) => seam.id));
export const RECAP_PROBE_CODES = Object.freeze([
  'seams-ok',
  'seams-unavailable',
  'seams-invalid',
]);

export function probeRecapSeams(inputs = {}) {
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs)) {
    throw new TypeError('Seam probe inputs must be an object.');
  }
  const { mode = 'unattended', coreOptions = {} } = inputs;
  if (!MODES.has(mode)) {
    throw new Error(`Unsupported lifecycle mode: ${String(mode)}`);
  }
  if (!coreOptions || typeof coreOptions !== 'object') {
    throw new TypeError('coreOptions must be an object when supplied.');
  }

  const missing = [];
  const invalidSeams = [];
  const resolved = [];

  for (const seam of SEAMS) {
    const outcome = seam.classify(inputs, coreOptions);
    if (outcome.status === 'invalid') {
      invalidSeams.push({
        seam: seam.id,
        reason: outcome.reason,
        message: outcome.message,
      });
    } else if (outcome.status === 'supplied') {
      resolved.push(seam.id);
    } else if (seam.requiredIn.includes(mode)) {
      missing.push(seam.id);
    }
  }

  // Invalid outranks missing: a broken configuration must fail closed rather
  // than degrade into a capability skip.
  if (invalidSeams.length > 0) {
    return {
      ok: false,
      mode,
      code: 'seams-invalid',
      missing,
      invalid: invalidSeams,
      resolved,
      message: `Recap seam configuration is invalid: ${invalidSeams
        .map((entry) => entry.message)
        .join(' ')}`,
      guidance:
        'Correct the reported seam configuration. A configured-but-invalid seam fails closed and is never a capability skip.',
    };
  }

  if (missing.length > 0) {
    return {
      ok: false,
      mode,
      code: 'seams-unavailable',
      missing,
      invalid: invalidSeams,
      resolved,
      message: `No provider is configured for ${formatList(missing)}, so ${article(mode)} ${mode} project recap cannot run on this host.`,
      guidance:
        mode === 'unattended'
          ? `Configure ${formatList(missing)} to generate an unattended project recap, or let autonomous resolution record the recap as skip / capability_probe.`
          : `Configure ${formatList(missing)} to generate an interactive project recap, or record an interactive skip decision.`,
    };
  }

  return {
    ok: true,
    mode,
    code: 'seams-ok',
    missing,
    invalid: invalidSeams,
    resolved,
    message: `Every ${mode} project recap seam resolves on this host.`,
    guidance: null,
  };
}

/** `unattended` and `interactive` both take "an"; keep the surface grammatical. */
function article(mode) {
  return /^[aeiou]/i.test(mode) ? 'an' : 'a';
}

function formatList(values) {
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(', ')} and ${values.at(-1)}`;
}
