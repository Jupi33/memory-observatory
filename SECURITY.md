# Security Notes

Memory Observatory is published as a sanitized public demo. The GitHub Pages build uses sample media and local fallback storage; it does not include private production assets, secrets, or Supabase credentials.

## Environment Variables

Real deployments should configure Supabase through environment variables only:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_MEDIA_BUCKET`
- `CRON_SECRET` for the Vercel keepalive route

Do not commit `.env.local`, Vercel production env files, service role keys, or private media.

## Demo Policies

`supabase-schema.sql` documents the permissive demo schema used by the gift-site workflow. It allows public reads and public writes because the original product goal was a shareable, no-login experience.

That tradeoff is useful for demos and private links, but it is not a production security model for sensitive data.

## Production Recommendation

For production data, use `supabase-schema.production-template.sql` as a starting point and add one of these controls before enabling writes:

- Supabase Auth with explicit editor accounts.
- A short-lived edit token validated by an Edge Function.
- A private admin surface that writes with server-side credentials.

Public visitors should be read-only unless the product intentionally accepts anonymous contributions.

## Reporting

If you find an issue in the public demo, open a GitHub issue without posting secrets, private media, or personal data.
