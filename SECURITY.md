# Security Notes

Memory Observatory is published as a sanitized public demo. The GitHub Pages build uses sample media and local fallback storage; it does not include private production assets, secrets, or Supabase credentials.

Production mode is designed for Vercel API routes in front of Supabase: public users can read visible memories, while write operations require a private editor session stored in a signed HttpOnly cookie.

## Environment Variables

Real deployments should configure backend access through environment variables only:

- `VITE_API_BASE_URL` for the frontend API origin (`/api` on same-origin Vercel)
- `SUPABASE_URL` for server-side Supabase access
- `SUPABASE_SERVICE_ROLE_KEY` for server-only writes that bypass RLS
- `SUPABASE_MEDIA_BUCKET` for Storage uploads
- `EDITOR_SECRET_HASH` for validating the private editor key without storing it in plain text
- `EDITOR_SESSION_SECRET` for signing editor session cookies
- `CRON_SECRET` for the Vercel keepalive route

Do not commit `.env.local`, Vercel production env files, service role keys, editor secrets, or private media.

## Demo Policies

`supabase-schema.sql` documents the permissive demo schema used by the original private-link workflow. It allows public reads and public writes because that mode was designed for controlled demos.

That tradeoff is useful only for local experimentation and private demos. It is not the production security model for sensitive data.

## Production Recommendation

For production data, use `supabase-schema.production-template.sql` as the starting point:

- RLS is enabled for `memories`, `responses`, and `editor_audit_events`.
- Anonymous visitors can only select `memories.hidden = false` and responses attached to visible memories.
- No anonymous insert/update/delete policies are created.
- Vercel API routes write with `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Editor access uses a private key hash and short-lived signed HttpOnly cookies.
- Media uploads use signed upload URLs created by the backend.
- Write paths log `create`, `update`, `delete`, `upload`, `response`, `session_login`, and `keepalive` events in `editor_audit_events`.

Public visitors should remain read-only unless the product explicitly accepts anonymous contributions. A future production version should add Supabase Auth, passkeys, or per-editor audit identities if multiple editors are needed.

## Reporting

If you find an issue in the public demo, open a GitHub issue without posting secrets, private media, or personal data.
