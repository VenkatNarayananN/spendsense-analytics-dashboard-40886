import { getEnv, optionalEnv } from "../env";
import { createApiClient } from "../http/apiClient";

const OXR_ENDPOINT = "https://openexchangerates.org/api/latest.json";

// Storage keys are namespaced to avoid collisions.
const LS_KEY_RATES = "spendsense:fx:oxr:rates";
const LS_KEY_META = "spendsense:fx:oxr:meta";

// In-memory cache to avoid repeated parsing / network calls during a session.
let memoryCache = /** @type {FxRatesCache|null} */ (null);

/**
 * @typedef {Object} FxRates
 * @property {string} base Base currency returned by OXR (typically "USD")
 * @property {number} timestamp Unix seconds
 * @property {Record<string, number>} rates Map currency code -> rate (units per 1 base)
 */

/**
 * @typedef {Object} FxRatesCache
 * @property {FxRates} rates
 * @property {number} fetchedAtMs
 */

/**
 * @typedef {Object} GetRatesResult
 * @property {FxRates|null} rates
 * @property {boolean} usedFallback True when we could not fetch fresh rates and used cached/last-good.
 * @property {string|null} warning A user-displayable warning message (no secrets).
 */

function nowMs() {
  return Date.now();
}

function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Validate minimal shape of an OXR response.
 */
function isValidRatesPayload(payload) {
  if (!payload || typeof payload !== "object") return false;
  if (typeof payload.base !== "string") return false;
  if (typeof payload.timestamp !== "number") return false;
  if (!payload.rates || typeof payload.rates !== "object") return false;

  // Rates must be finite positive numbers.
  const sample = payload.rates.USD ?? payload.rates.EUR ?? payload.rates.GBP;
  if (sample != null && (!Number.isFinite(Number(sample)) || Number(sample) <= 0)) return false;

  return true;
}

function readFromLocalStorage() {
  if (!isBrowser()) return null;

  const rawRates = window.localStorage.getItem(LS_KEY_RATES);
  const rawMeta = window.localStorage.getItem(LS_KEY_META);
  if (!rawRates || !rawMeta) return null;

  const rates = safeJsonParse(rawRates);
  const meta = safeJsonParse(rawMeta);

  if (!rates || !meta) return null;
  if (!isValidRatesPayload(rates)) return null;
  if (!Number.isFinite(meta?.fetchedAtMs)) return null;

  return /** @type {FxRatesCache} */ ({ rates, fetchedAtMs: meta.fetchedAtMs });
}

function writeToLocalStorage(cache) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(LS_KEY_RATES, JSON.stringify(cache.rates));
    window.localStorage.setItem(LS_KEY_META, JSON.stringify({ fetchedAtMs: cache.fetchedAtMs }));
  } catch {
    // Ignore localStorage failures (quota, privacy mode).
  }
}

function ttlMsFromEnv() {
  // Not requested as an env var; keep simple + fixed default.
  return 60 * 60 * 1000; // 1 hour
}

function getEnvAppId() {
  // Not part of the new required env set, but still supported for existing installs.
  // Never log it.
  return optionalEnv("REACT_APP_OPENEXCHANGERATES_APP_ID", "");
}

function getEnvBaseCurrency() {
  // Prefer new key; fall back to legacy key to avoid breaking existing setups.
  const env = getEnv();
  const legacy = optionalEnv("REACT_APP_BASE_CURRENCY", "USD");
  return String(env.REACT_APP_OXR_BASE_CURRENCY || legacy || "USD").toUpperCase();
}

/**
 * Fetch rates from OpenExchangeRates.
 * Note: we do NOT log the URL (contains the app_id), and we do NOT log the key.
 */
async function fetchRatesFromNetwork() {
  const env = getEnv();
  if (env.REACT_APP_OXR_ENABLED === false) {
    throw new Error("OpenExchangeRates is disabled (REACT_APP_OXR_ENABLED=false).");
  }

  const appId = getEnvAppId();
  if (!appId) {
    throw new Error("OpenExchangeRates is not configured (missing REACT_APP_OPENEXCHANGERATES_APP_ID).");
  }

  // Do NOT log URL (contains app_id).
  const url = `${OXR_ENDPOINT}?app_id=${encodeURIComponent(appId)}`;

  // Use our API client for timeout/retry even though this is a public endpoint.
  const oxrClient = createApiClient("", {
    timeoutMs: 10_000,
    maxRetries: 3
  });

  const json = await oxrClient.get(url, {
    // Ensure we always accept JSON
    headers: { accept: "application/json" }
  });

  if (!isValidRatesPayload(json)) {
    throw new Error("Rates response invalid.");
  }

  return /** @type {FxRates} */ ({
    base: String(json.base).toUpperCase(),
    timestamp: Number(json.timestamp),
    rates: Object.fromEntries(
      Object.entries(json.rates).map(([k, v]) => [String(k).toUpperCase(), Number(v)])
    )
  });
}

/**
 * PUBLIC_INTERFACE
 */
export async function getFxRates({ forceRefresh = false } = {}) {
  /** Get latest FX rates with TTL caching. Falls back to last-good cached rates when network fails. */
  const baseCurrency = getEnvBaseCurrency();
  if (baseCurrency !== "USD") {
    // This app normalizes to USD. Keep env for future flexibility, but enforce for now.
    // Not throwing to avoid breaking UI; callers always convert to USD.
  }

  const ttlMs = ttlMsFromEnv();
  const t = nowMs();

  // Memory cache first.
  if (!forceRefresh && memoryCache && t - memoryCache.fetchedAtMs < ttlMs) {
    return /** @type {GetRatesResult} */ ({ rates: memoryCache.rates, usedFallback: false, warning: null });
  }

  // LocalStorage cache second.
  const lsCache = !forceRefresh ? readFromLocalStorage() : null;
  if (!forceRefresh && lsCache && t - lsCache.fetchedAtMs < ttlMs) {
    memoryCache = lsCache;
    return /** @type {GetRatesResult} */ ({ rates: lsCache.rates, usedFallback: false, warning: null });
  }

  // Network fetch.
  try {
    const freshRates = await fetchRatesFromNetwork();
    const cache = /** @type {FxRatesCache} */ ({ rates: freshRates, fetchedAtMs: t });
    memoryCache = cache;
    writeToLocalStorage(cache);
    return /** @type {GetRatesResult} */ ({ rates: freshRates, usedFallback: false, warning: null });
  } catch (_e) {
    // Network failed. Use last-good cache (memory or LS), even if expired.
    const fallback = memoryCache || readFromLocalStorage();
    if (fallback?.rates) {
      memoryCache = fallback;
      return /** @type {GetRatesResult} */ ({
        rates: fallback.rates,
        usedFallback: true,
        warning: "FX rates unavailable — showing USD estimates using last known rates."
      });
    }

    // No fallback available.
    return /** @type {GetRatesResult} */ ({
      rates: null,
      usedFallback: true,
      warning: "FX rates unavailable — showing amounts without conversion."
    });
  }
}

/**
 * PUBLIC_INTERFACE
 */
export function convertToUSD({ amount, currency, rates }) {
  /** Convert an amount in a given currency into USD using OXR rates. Returns null if conversion isn't possible. */
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;

  const ccy = String(currency || "USD").toUpperCase();

  // Already USD.
  if (ccy === "USD") return n;

  if (!rates || !rates.rates) return null;

  // OXR provides rates: 1 USD = X {currency}. Therefore:
  // amount_ccy -> USD = amount_ccy / rate[ccy]
  const rate = Number(rates.rates[ccy]);
  if (!Number.isFinite(rate) || rate <= 0) return null;

  return n / rate;
}

/**
 * PUBLIC_INTERFACE
 */
export function formatMoneyUSD(value) {
  /** Format as USD currency string used across UI. */
  const n = Number(value);
  if (!Number.isFinite(n)) return "$0.00";
  return `$${Math.abs(n).toFixed(2)}`;
}

/**
 * PUBLIC_INTERFACE
 */
export function formatWithOriginal({ amountUsd, originalAmount, originalCurrency }) {
  /** Format a USD value and provide a tooltip title containing original currency when available. */
  const usd = Number(amountUsd);
  const orig = Number(originalAmount);
  const ccy = String(originalCurrency || "").toUpperCase();

  const usdText = Number.isFinite(usd) ? `${usd < 0 ? "-" : "+"}${formatMoneyUSD(usd)}` : "-$—";

  let title = "USD normalized";
  if (Number.isFinite(orig) && ccy) {
    const origSign = orig < 0 ? "-" : "+";
    title = `Original: ${origSign}${ccy} ${Math.abs(orig).toFixed(2)}`;
  }

  return { text: usdText, title };
}
