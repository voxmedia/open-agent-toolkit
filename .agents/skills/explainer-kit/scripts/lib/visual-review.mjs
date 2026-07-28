import { validateContract } from './contracts.mjs';

const REQUIRED_VIEWPORTS = Object.freeze(['mobile', 'tablet', 'desktop']);

export async function runVisualReview({
  plan,
  rendered,
  evidence,
  visualCritic,
}) {
  if (typeof visualCritic !== 'function') {
    throw visualReviewError(
      'Independent visual review requires a visualCritic callback.',
    );
  }
  const request = buildVisualReviewRequest({ plan, rendered, evidence });
  const result = await visualCritic(structuredClone(request));
  const validation = validateContract('visual-review-result', result, {
    visualReviewRequest: request,
  });
  if (!validation.valid) {
    throw visualReviewError(
      `Visual critic returned an invalid result: ${formatErrors(validation.errors)}`,
    );
  }
  return {
    request,
    result: structuredClone(result),
  };
}

export function buildVisualReviewRequest({ plan, rendered, evidence }) {
  if (!Array.isArray(rendered) || !Array.isArray(evidence)) {
    throw visualReviewError(
      'Visual review requires rendered artifacts and browser evidence arrays.',
    );
  }
  const request = {
    schemaVersion: 'explainer-kit.visual-review-request/v1',
    plan: structuredClone(plan),
    renderedArtifacts: rendered.map(({ artifactId, renderedPath }) => ({
      artifactId,
      renderedPath,
      evidence: evidence
        .filter((item) => item.artifactId === artifactId)
        .map(({ viewport, screenshotPath, metricsPath }) => ({
          viewport,
          screenshotPath,
          metricsPath,
        })),
    })),
  };
  const validation = validateContract('visual-review-request', request);
  if (!validation.valid) {
    throw visualReviewError(
      `Visual review request is incomplete: ${formatErrors(validation.errors)}`,
    );
  }
  for (const artifact of request.renderedArtifacts) {
    const viewports = new Set(artifact.evidence.map(({ viewport }) => viewport));
    if (
      viewports.size !== REQUIRED_VIEWPORTS.length ||
      REQUIRED_VIEWPORTS.some((viewport) => !viewports.has(viewport))
    ) {
      throw visualReviewError(
        `Visual review requires mobile, tablet, and desktop evidence for ${artifact.artifactId}.`,
      );
    }
  }
  return request;
}

export function cohesionEvidenceFromLedger(artifacts, plan) {
  if (!plan?.ledger) return artifacts;
  return artifacts.map((artifact) => {
    const text = visibleText(artifact.html);
    return {
      ...artifact,
      cohesion: {
        terminology: observedClaims(
          plan.ledger.terminology,
          ({ term }) => term,
          ({ term }) => term,
          text,
        ),
        numericClaims: observedClaims(
          plan.ledger.numbers,
          ({ subject }) => subject,
          ({ value }) => value,
          text,
        ),
        statuses: observedClaims(
          plan.ledger.statuses,
          ({ subject }) => subject,
          ({ value }) => value,
          text,
        ),
      },
    };
  });
}

function observedClaims(entries, keyOf, valueOf, text) {
  return Object.fromEntries(
    (entries ?? [])
      .filter((entry) =>
        text.includes(String(valueOf(entry)).toLocaleLowerCase()),
      )
      .map((entry) => [keyOf(entry), valueOf(entry)]),
  );
}

function visibleText(value) {
  return String(value)
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

function formatErrors(errors) {
  return errors
    .slice(0, 3)
    .map(({ code, message }) => `${code}: ${message}`)
    .join('; ');
}

function visualReviewError(message) {
  const error = new Error(message);
  error.code = 'E_VISUAL_REVIEW';
  return error;
}
