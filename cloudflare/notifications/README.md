# VAANI Notifications — Cloudflare D1

This backend is separate from VAANI Arena's Supabase project.

## Architecture

- GitHub Actions keeps the existing official-source scraper.
- Cloudflare D1 stores live and historical notifications.
- Cloudflare Worker provides the public read API and protected sync API.
- Vaani frontend reads the Worker API.

## Setup

1. Create a Cloudflare D1 database named `vaani-notifications`.
2. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc`.
3. Run `npx wrangler d1 execute vaani-notifications --remote --file=./schema.sql`.
4. Run `npx wrangler deploy`.
5. Create a Worker secret named `SYNC_SECRET`.
6. Add the Worker URL to Vaani as `VAANI_NOTIFICATIONS_API`.
7. Add these GitHub Actions secrets:
   - `VAANI_NOTIFICATIONS_API`
   - `VAANI_NOTIFICATIONS_SYNC_SECRET`
8. The existing notification sync workflow will POST normalized records to the Worker.

Never put `SYNC_SECRET` in frontend code.

Arena remains on Supabase.

## Preview deployments

Worker Previews are configured in `wrangler.jsonc`. They use the existing notifications D1 database for read-only access to the public notification feed. The Worker rejects all non-GET/non-OPTIONS methods when `ENVIRONMENT=preview`, so preview deployments cannot run the protected sync or other write operations.

If you later move previews to a separate staging D1 database, update the ID in `previews.d1_databases` and apply the schema to that database before deploying a Preview.
