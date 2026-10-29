// Shared HTTP helper for the CP fetchers.
// Every request: 15 s timeout, up to 2 retries with exponential backoff.
// Retries only on network errors, timeouts, 429 and 5xx. Other 4xx fail at once.

export const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';

const TIMEOUT_MS = 15_000;
const RETRIES = 2;
const BACKOFF_MS = 1_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

/**
 * Spaces out calls so that no two start less than `ms` apart.
 * Each attempt (including retries) waits its turn.
 */
export function throttle(ms) {
  let next = 0;
  return async () => {
    const now = Date.now();
    const wait = Math.max(0, next - now);
    next = Math.max(now, next) + ms;
    if (wait > 0) await sleep(wait);
  };
}

/**
 * fetch() with a timeout and retries. Resolves to the response body as text.
 * @param {string} url
 * @param {RequestInit & { beforeAttempt?: () => Promise<void> }} [options]
 */
export async function fetchText(url, options = {}) {
  const { beforeAttempt, headers, ...init } = options;
  let lastError;

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) await sleep(BACKOFF_MS * 2 ** (attempt - 1));
    if (beforeAttempt) await beforeAttempt();

    try {
      const res = await fetch(url, {
        ...init,
        headers: { 'User-Agent': USER_AGENT, ...headers },
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      const body = await res.text();
      if (res.ok) return body;

      lastError = new HttpError(`HTTP ${res.status} from ${url}`, res.status);
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable) throw lastError;
    } catch (err) {
      if (err instanceof HttpError && !(err.status === 429 || err.status >= 500)) throw err;
      if (err?.name === 'TimeoutError') lastError = new Error(`timed out after ${TIMEOUT_MS / 1000} s: ${url}`);
      else {
        // undici's "fetch failed" hides the useful part (DNS, refused, TLS) in `cause`.
        const cause = err?.cause?.code ?? err?.cause?.message;
        lastError = new Error(`${err?.message ?? err}${cause ? ` (${cause})` : ''}: ${url}`);
      }
    }
  }

  throw lastError;
}

/** fetchText, then JSON.parse with a readable error when the body is not JSON (e.g. a block page). */
export async function fetchJson(url, options) {
  const body = await fetchText(url, options);
  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${body.slice(0, 120).replace(/\s+/g, ' ')}`);
  }
}
