# Supabase Integration (SpendSense Frontend)

This project uses **Supabase Auth (Google OAuth)** and Supabase Postgres for data + realtime.

## Environment Variables

These are read by the frontend at build/runtime (Create React App):

- `REACT_APP_SUPABASE_URL` – Supabase Project URL
- `REACT_APP_SUPABASE_KEY` – Supabase anon/public key
- `REACT_APP_FRONTEND_URL` – Public base URL of this frontend (used for OAuth redirect)

Example (do not commit `.env`, use `.env.example` instead):
- `REACT_APP_FRONTEND_URL=https://your-deployment-domain.example`

## Google OAuth Setup (Supabase Dashboard)

1. In Supabase: **Authentication → Providers → Google**  
   Enable Google and configure OAuth client id/secret.

2. In Supabase: **Authentication → URL Configuration**
   - Set **Site URL** to the deployed frontend URL (same as `REACT_APP_FRONTEND_URL`).
   - Add Redirect URLs:
     - `${REACT_APP_FRONTEND_URL}/auth/callback`
     - `${REACT_APP_FRONTEND_URL}/` (optional)

## Frontend Auth Flow

- Landing page is public: `/`
- User clicks **Sign in with Google** or **Sign up with Google** which calls:
  - `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '${REACT_APP_FRONTEND_URL}/auth/callback', queryParams: { prompt: 'select_account' } } })`
  - For sign-up intent, the UI uses a more explicit prompt to encourage consent/account selection:
    - `queryParams: { prompt: 'consent select_account' }`
- Supabase redirects back to `/auth/callback`
- The callback route reads the session (if present), then redirects to `/dashboard`.
- All non-landing routes are protected. If unauthenticated, the user sees a friendly guard panel and can go back to Landing.

### Profile bootstrap (optional)

If a `profiles` table exists, the frontend will attempt a **best-effort** upsert of a minimal profile record after authentication (id/email/name/avatar).  
If the table does not exist or RLS blocks it, it safely no-ops.

## Notes about Data + Realtime

- Realtime subscriptions and data loading remain as implemented.
- When authenticated, queries should be user-scoped using the Supabase user id when provided.
- If RLS is enabled, ensure policies allow authenticated users to read their rows.

## FX / USD Normalization (OpenExchangeRates)

SpendSense normalizes monetary amounts to **USD** in the UI across Dashboard, Transactions, and Insights.

### Required Environment Variables (frontend)

Add to your `.env` (or set via deployment env vars):

- `REACT_APP_OPENEXCHANGERATES_APP_ID` – OpenExchangeRates App ID (keep secret; do not commit)
- `REACT_APP_BASE_CURRENCY` – Base currency for normalization (currently expected `USD`)

These are documented in `.env.example`.

### Refresh + Caching Behavior

- Rates are fetched from `https://openexchangerates.org/api/latest.json` using `app_id`.
- Rates are cached with:
  - In-memory cache (for the current tab/session)
  - `localStorage` cache (as a cross-refresh "last-good" fallback)
- TTL is ~**1 hour**. When the network fails, the app will:
  - fall back to the last-good cached rates, if available, and show a non-blocking toast
  - otherwise show amounts without conversion

### Security

- The App ID is **never rendered** in the UI and is **not logged** by the client code.
