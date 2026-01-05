/**
 * Fetch-based API client wrapper with:
 * - Timeout (AbortController)
 * - Retries (idempotent methods; 5xx/429)
 * - Structured errors (ApiError)
 * - Lightweight request/response interceptors
 *
 * Example:
 *   import { apiClient } from "../lib/http";
 *
 *   const user = await apiClient.get("/me");
 *   await apiClient.post("/items", { name: "Coffee" });
 */

/**
 * @typedef {Object} ApiClientOptions
 * @property {Record<string, string>} [defaultHeaders]
 * @property {number} [timeoutMs] Default timeout in milliseconds (default 10000)
 * @property {number} [maxRetries] Default max retries (default 3)
 * @property {(ctx: RequestInterceptorContext) => (Promise<RequestInterceptorContext>|RequestInterceptorContext)} [onRequest]
 * @property {(ctx: ResponseInterceptorContext) => (Promise<ResponseInterceptorContext>|ResponseInterceptorContext)} [onResponse]
 * @property {(err: ApiError, ctx: ErrorInterceptorContext) => void} [onError]
 */

/**
 * @typedef {Object} RequestInterceptorContext
 * @property {string} url
 * @property {RequestInit} init
 */

/**
 * @typedef {Object} ResponseInterceptorContext
 * @property {string} url
 * @property {RequestInit} init
 * @property {Response} response
 */

/**
 * @typedef {Object} ErrorInterceptorContext
 * @property {string} url
 * @property {RequestInit} init
 * @property {number} attempt
 */

/**
 * @typedef {Object} ParsedBody
 * @property {"json"|"text"|"blob"|"empty"} kind
 * @property {any} data
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomInt(minInclusive, maxInclusive) {
  return Math.floor(Math.random() * (maxInclusive - minInclusive + 1)) + minInclusive;
}

function joinUrl(baseUrl, path) {
  if (!baseUrl) return path;
  const base = String(baseUrl).replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${base}/${p}`;
}

function isIdempotent(method) {
  const m = String(method || "GET").toUpperCase();
  return m === "GET" || m === "HEAD" || m === "OPTIONS";
}

function getRequestIdFromHeaders(headers) {
  // Common header names
  return (
    headers.get("x-request-id") ||
    headers.get("x-correlation-id") ||
    headers.get("x-amzn-trace-id") ||
    null
  );
}

function isJsonContentType(contentType) {
  return Boolean(contentType && contentType.toLowerCase().includes("application/json"));
}

function isProbablyTextContentType(contentType) {
  if (!contentType) return false;
  const ct = contentType.toLowerCase();
  return ct.startsWith("text/") || ct.includes("application/xml") || ct.includes("application/xhtml");
}

function sanitizeHeadersForLogging(headers) {
  // Never log secrets. Redact common sensitive headers.
  const redacted = new Set(["authorization", "x-api-key", "apikey", "cookie", "set-cookie"]);
  const out = {};
  try {
    for (const [k, v] of headers.entries()) {
      const key = String(k).toLowerCase();
      out[k] = redacted.has(key) ? "[REDACTED]" : v;
    }
  } catch {
    // Ignore
  }
  return out;
}

/**
 * Structured API error that callers can catch and inspect.
 */
export class ApiError extends Error {
  /**
   * @param {Object} params
   * @param {string} params.message
   * @param {number|null} [params.status]
   * @param {string|null} [params.code]
   * @param {any} [params.details]
   * @param {string|null} [params.requestId]
   * @param {any} [params.body]
   * @param {boolean} [params.isNetworkError]
   * @param {boolean} [params.isTimeout]
   */
  constructor({ message, status = null, code = null, details = null, requestId = null, body = null, isNetworkError = false, isTimeout = false }) {
    super(message);
    this.name = "ApiError";
    /** @type {number|null} */
    this.status = status;
    /** @type {string|null} */
    this.code = code;
    /** @type {any} */
    this.details = details;
    /** @type {string|null} */
    this.requestId = requestId;
    /**
     * Raw response body (if captured). This is intentionally not logged by default.
     * @type {any}
     */
    this.body = body;
    /** @type {boolean} */
    this.isNetworkError = Boolean(isNetworkError);
    /** @type {boolean} */
    this.isTimeout = Boolean(isTimeout);
  }

  // PUBLIC_INTERFACE
  isRetryable() {
    /** Return true if this error is retryable based on status / network errors. */
    if (this.isTimeout || this.isNetworkError) return true;
    if (this.status == null) return false;
    return this.status === 429 || (this.status >= 500 && this.status <= 599);
  }
}

async function parseResponseBody(response) {
  /** @type {ParsedBody} */
  let parsed = { kind: "empty", data: null };

  // 204/205 no-content
  if (response.status === 204 || response.status === 205) return parsed;

  const contentType = response.headers.get("content-type") || "";

  try {
    if (isJsonContentType(contentType)) {
      const data = await response.json();
      parsed = { kind: "json", data };
    } else if (isProbablyTextContentType(contentType)) {
      const data = await response.text();
      parsed = { kind: "text", data };
    } else {
      // Default: blob (useful for files)
      const data = await response.blob();
      parsed = { kind: "blob", data };
    }
  } catch {
    // If parsing fails, do not throw; allow caller to still receive error context.
    parsed = { kind: "empty", data: null };
  }

  return parsed;
}

function deriveErrorFields(parsedBody) {
  // Try to normalize typical API error shapes:
  // { error: { code, message, details } } OR { code, message, details } OR { message }
  const b = parsedBody?.kind === "json" ? parsedBody.data : null;

  const code =
    (b && (b.code || b.error?.code || b.error_code || b.errorCode)) ? String(b.code || b.error?.code || b.error_code || b.errorCode) : null;

  const message =
    (b && (b.message || b.error?.message || b.error_description || b.errorDescription))
      ? String(b.message || b.error?.message || b.error_description || b.errorDescription)
      : null;

  const details = b && (b.details ?? b.error?.details ?? b.errors ?? null);

  return { code, message, details };
}

function computeBackoffDelayMs(attemptIndex, baseMs = 250, capMs = 5000) {
  // attemptIndex starts at 1 for first retry
  const exp = Math.min(capMs, baseMs * Math.pow(2, attemptIndex - 1));
  const jitter = randomInt(0, Math.floor(exp * 0.25)); // up to 25% jitter
  return Math.min(capMs, exp + jitter);
}

function shouldRetry({ method, status, error }) {
  if (!isIdempotent(method)) return false;
  if (error) return error.isRetryable?.() === true;
  if (status == null) return false;
  return status === 429 || (status >= 500 && status <= 599);
}

/**
 * PUBLIC_INTERFACE
 * @param {string} baseUrl
 * @param {ApiClientOptions} [options]
 */
export function createApiClient(baseUrl, options = {}) {
  /** Create an API client bound to a base URL. */

  const cfg = {
    baseUrl: String(baseUrl || ""),
    defaultHeaders: options.defaultHeaders || {},
    timeoutMs: Number.isFinite(options.timeoutMs) ? options.timeoutMs : 10_000,
    maxRetries: Number.isFinite(options.maxRetries) ? options.maxRetries : 3,
    onRequest: typeof options.onRequest === "function" ? options.onRequest : null,
    onResponse: typeof options.onResponse === "function" ? options.onResponse : null,
    onError: typeof options.onError === "function" ? options.onError : null
  };

  async function request(path, init = {}, requestOptions = {}) {
    const url = joinUrl(cfg.baseUrl, path);
    const method = String(init.method || "GET").toUpperCase();

    const timeoutMs = Number.isFinite(requestOptions.timeoutMs) ? requestOptions.timeoutMs : cfg.timeoutMs;
    const maxRetries = Number.isFinite(requestOptions.maxRetries) ? requestOptions.maxRetries : cfg.maxRetries;

    // Merge headers safely (caller overrides defaults)
    const headers = new Headers();
    for (const [k, v] of Object.entries(cfg.defaultHeaders || {})) headers.set(k, v);
    for (const [k, v] of Object.entries(init.headers || {})) headers.set(k, v);

    // If body is plain object, send JSON by default (unless FormData / Blob / string)
    let body = init.body;
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    const isBlob = typeof Blob !== "undefined" && body instanceof Blob;
    const isArrayBuffer = typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer;

    if (
      body != null &&
      typeof body === "object" &&
      !isFormData &&
      !isBlob &&
      !isArrayBuffer &&
      !(body instanceof URLSearchParams)
    ) {
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
      body = JSON.stringify(body);
    }

    // Always accept JSON by default
    if (!headers.has("accept")) headers.set("accept", "application/json, text/plain;q=0.9, */*;q=0.8");

    const baseInit = {
      ...init,
      method,
      headers,
      body
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const attemptNumber = attempt + 1;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);

      /** @type {RequestInit} */
      let finalInit = { ...baseInit, signal: controller.signal };

      // Request interceptor hook (e.g., attach auth header)
      if (cfg.onRequest) {
        const ctx = await cfg.onRequest({ url, init: finalInit });
        if (ctx?.init) finalInit = ctx.init;
      }

      try {
        const response = await fetch(url, finalInit);
        clearTimeout(id);

        // Response hook
        if (cfg.onResponse) {
          const ctx = await cfg.onResponse({ url, init: finalInit, response });
          // allow hook to replace response (rare)
          if (ctx?.response) {
            // eslint-disable-next-line no-param-reassign
            // @ts-ignore
            response = ctx.response;
          }
        }

        const requestId = getRequestIdFromHeaders(response.headers);

        // Parse body (also for errors)
        const parsed = await parseResponseBody(response);

        if (!response.ok) {
          const derived = deriveErrorFields(parsed);
          const err = new ApiError({
            message: derived.message || `Request failed (${response.status}).`,
            status: response.status,
            code: derived.code,
            details: derived.details,
            requestId,
            body: parsed.kind === "json" ? parsed.data : parsed.kind === "text" ? parsed.data : null
          });

          // Centralized error hook (do not log bodies or secrets)
          if (cfg.onError) cfg.onError(err, { url, init: finalInit, attempt: attemptNumber });

          if (attempt < maxRetries && shouldRetry({ method, status: response.status, error: err })) {
            const delay = computeBackoffDelayMs(attemptNumber);
            await sleep(delay);
            continue;
          }

          throw err;
        }

        // Success return: prefer JSON, else text/blob
        if (parsed.kind === "json") return parsed.data;
        if (parsed.kind === "text") return parsed.data;
        if (parsed.kind === "blob") return parsed.data;
        return null;
      } catch (e) {
        clearTimeout(id);

        const isAbort = e && typeof e === "object" && String(e.name) === "AbortError";
        const err =
          e instanceof ApiError
            ? e
            : new ApiError({
                message: isAbort ? "Request timed out." : "Network request failed.",
                status: null,
                code: isAbort ? "TIMEOUT" : "NETWORK_ERROR",
                details: null,
                requestId: null,
                body: null,
                isNetworkError: !isAbort,
                isTimeout: Boolean(isAbort)
              });

        if (cfg.onError) cfg.onError(err, { url, init: baseInit, attempt: attemptNumber });

        if (attempt < maxRetries && shouldRetry({ method, status: null, error: err })) {
          const delay = computeBackoffDelayMs(attemptNumber);
          await sleep(delay);
          continue;
        }

        throw err;
      }
    }

    // Unreachable, but keeps type/logic stable.
    throw new ApiError({ message: "Request failed after retries.", code: "RETRY_EXHAUSTED" });
  }

  const client = {
    // PUBLIC_INTERFACE
    request,
    /** Convenience helpers */
    // PUBLIC_INTERFACE
    get: (path, init = {}, opts = {}) => request(path, { ...init, method: "GET" }, opts),
    // PUBLIC_INTERFACE
    post: (path, body, init = {}, opts = {}) => request(path, { ...init, method: "POST", body }, opts),
    // PUBLIC_INTERFACE
    put: (path, body, init = {}, opts = {}) => request(path, { ...init, method: "PUT", body }, opts),
    // PUBLIC_INTERFACE
    patch: (path, body, init = {}, opts = {}) => request(path, { ...init, method: "PATCH", body }, opts),
    // PUBLIC_INTERFACE
    del: (path, init = {}, opts = {}) => request(path, { ...init, method: "DELETE" }, opts)
  };

  // Inline sanity checks (unit-like): ensure helpers exist
  if (typeof client.get !== "function" || typeof client.request !== "function") {
    throw new Error("[SpendSense] apiClient initialization failed (missing methods).");
  }

  return client;
}

/**
 * A safe default error logger that never logs request bodies or secret headers.
 */
export function defaultErrorLogger(err, ctx) {
  // eslint-disable-next-line no-console
  console.error("[SpendSense] API error:", {
    message: err?.message,
    status: err?.status ?? null,
    code: err?.code ?? null,
    requestId: err?.requestId ?? null,
    attempt: ctx?.attempt ?? null,
    url: ctx?.url,
    // Safe, redacted headers only (do NOT include Authorization)
    headers: ctx?.init?.headers instanceof Headers ? sanitizeHeadersForLogging(ctx.init.headers) : undefined
  });
}
