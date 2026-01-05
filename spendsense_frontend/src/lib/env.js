/**
 * Secure env handling for the React (CRA) frontend.
 *
 * - Avoids logging env values (some are secrets).
 * - Validates required public runtime variables at startup (when requested).
 * - Provides helpers for required/optional env access.
 *
 * Usage:
 *   import { getEnv, requireEnv, optionalEnv } from "../lib/env";
 *
 *   const env = getEnv(); // frozen snapshot
 *   const supabaseUrl = requireEnv("REACT_APP_SUPABASE_URL");
 */

/** @type {readonly string[]} */
const REQUIRED_KEYS = Object.freeze(["REACT_APP_SUPABASE_URL", "REACT_APP_SUPABASE_KEY"]);

/** @type {readonly string[]} */
const OPTIONAL_KEYS = Object.freeze([
  "REACT_APP_API_BASE",
  "REACT_APP_OXR_BASE_CURRENCY",
  "REACT_APP_OXR_ENABLED"
]);

/** Cache computed env snapshot (frozen). */
let cachedEnv = null;

/**
 * Return true if we should be strict (throw on missing required vars).
 * In CRA, NODE_ENV is embedded at build-time.
 */
function isProductionBuild() {
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
}

/**
 * Build a safe, non-secret error message for missing env vars.
 * Never prints values.
 */
function buildMissingEnvError(missingKeys) {
  const keys = missingKeys.join(", ");
  const guidance =
    "Missing required environment variables. " +
    "Create React App only exposes variables prefixed with REACT_APP_. " +
    "Set them in your environment (or .env.local) and rebuild the app.";

  return new Error(`[SpendSense] ${guidance}\nMissing: ${keys}`);
}

/**
 * Normalize a boolean-like env var (default fallback).
 */
function parseBool(value, fallback) {
  if (value == null || String(value).trim() === "") return fallback;
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on", "enabled"].includes(v)) return true;
  if (["0", "false", "no", "n", "off", "disabled"].includes(v)) return false;
  return fallback;
}

/**
 * Freeze helper (deep-ish for our flat env object).
 */
function freezeEnv(obj) {
  return Object.freeze({ ...obj });
}

/**
 * Validate required env vars. In production build, throws an Error with guidance.
 * In dev/test, does not throw (to allow "UI-only mode"), but still returns missing keys.
 */
function validateEnvOrWarnOnly() {
  const missing = [];
  for (const k of REQUIRED_KEYS) {
    const v = process.env[k];
    if (v == null || String(v).trim() === "") missing.push(k);
  }

  if (missing.length > 0 && isProductionBuild()) {
    throw buildMissingEnvError(missing);
  }

  return missing;
}

// PUBLIC_INTERFACE
export function requireEnv(key) {
  /** Returns an env var string; throws if missing/empty (always). Never logs values. */
  const v = process.env[key];
  if (v == null || String(v).trim() === "") {
    throw buildMissingEnvError([key]);
  }
  return String(v);
}

// PUBLIC_INTERFACE
export function optionalEnv(key, fallback = "") {
  /** Returns an env var string or a fallback. Never logs values. */
  const v = process.env[key];
  if (v == null || String(v).trim() === "") return fallback;
  return String(v);
}

// PUBLIC_INTERFACE
export function getEnv() {
  /**
   * Returns a frozen snapshot of relevant env vars (sanitized + defaults applied).
   * Required keys are validated (throws only for production builds; see validateEnvOrWarnOnly()).
   */
  if (cachedEnv) return cachedEnv;

  validateEnvOrWarnOnly();

  const oxrBaseCurrency = optionalEnv("REACT_APP_OXR_BASE_CURRENCY", "USD").toUpperCase();
  const oxrEnabled = parseBool(optionalEnv("REACT_APP_OXR_ENABLED", "true"), true);

  cachedEnv = freezeEnv({
    // Required (may be empty in dev/test; see validation behavior)
    REACT_APP_SUPABASE_URL: optionalEnv("REACT_APP_SUPABASE_URL", ""),
    REACT_APP_SUPABASE_KEY: optionalEnv("REACT_APP_SUPABASE_KEY", ""),

    // Optional
    REACT_APP_API_BASE: optionalEnv("REACT_APP_API_BASE", ""),
    REACT_APP_OXR_BASE_CURRENCY: oxrBaseCurrency,
    REACT_APP_OXR_ENABLED: oxrEnabled
  });

  // Inline sanity checks (unit-like, safe)
  if (cachedEnv.REACT_APP_OXR_BASE_CURRENCY.length < 3) {
    // Don't throw; normalize to USD to avoid breaking UI.
    cachedEnv = freezeEnv({ ...cachedEnv, REACT_APP_OXR_BASE_CURRENCY: "USD" });
  }

  return cachedEnv;
}
