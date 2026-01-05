import { getEnv } from "../env";
import { ApiError, createApiClient, defaultErrorLogger } from "./apiClient";
import { supabase } from "../supabaseClient";

/**
 * Create a preconfigured client:
 * - base URL from REACT_APP_API_BASE or defaults to "/api"
 * - attaches Supabase access token (if available) without logging it
 */
const env = getEnv();
const baseUrl = env.REACT_APP_API_BASE ? env.REACT_APP_API_BASE : "/api";

/**
 * Best-effort auth hook: attaches Supabase bearer token for backend requests.
 * Never logs tokens.
 */
async function attachSupabaseAuth({ url, init }) {
  if (!supabase) return { url, init };

  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return { url, init };

    const headers = new Headers(init.headers || {});
    if (!headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);

    return { url, init: { ...init, headers } };
  } catch {
    return { url, init };
  }
}

// PUBLIC_INTERFACE
export const apiClient = createApiClient(baseUrl, {
  onRequest: attachSupabaseAuth,
  onError: defaultErrorLogger
});

// PUBLIC_INTERFACE
export { ApiError, createApiClient };
