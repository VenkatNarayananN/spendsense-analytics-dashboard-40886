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
- User clicks **Sign in with Google** which calls:
  - `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '${REACT_APP_FRONTEND_URL}/auth/callback' } })`
- Supabase redirects back to `/auth/callback`
- The callback route reads the session (if present), then redirects to `/dashboard`.
- All non-landing routes are protected. If unauthenticated, the user sees a friendly guard panel and can go back to Landing.

## Notes about Data + Realtime

- Realtime subscriptions and data loading remain as implemented.
- When authenticated, queries should be user-scoped using the Supabase user id when provided.
- If RLS is enabled, ensure policies allow authenticated users to read their rows.

