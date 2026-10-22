# TriponX Hotel PMS — static demo build

## Running without a backend

This build is **fully static**. There is no server, no network calls and no
database — the UI is driven entirely by an in-memory data store that is seeded
at startup and lives for the lifetime of the browser tab.

- `src/data/catalog.ts` holds the fixed reference data (property, roles,
  permissions, staff, room types, guest profiles).
- `src/data/fixtures.ts` generates rooms, reservations and folios for the
  business date `2026-10-17`.
- `src/data/store.ts` is the interactive store. Every create/update/delete the
  UI performs (check-in, check-out, posting charges, taking payments, raising
  tickets, inviting staff, …) mutates this store in place, so the change is
  immediately visible everywhere in the app.
- `src/lib/api/*` keeps its original module shape and method signatures; the
  API objects now delegate to the store instead of `fetch`.

Because the store lives in memory, **all changes reset when you reload the
page**. There is no persistence layer.

### Sessions

There is no login screen. The app boots straight into a fixed demo session
(Anaya Sharma, Owner) with full access to every module, so all views render.
"Sign out" simply reloads that same demo session.

### Exports

Report and audit-log CSV exports are generated client-side from the store, so
the download buttons work without a server.

Expenses, rate plans and notification preferences remain demo-only sections.

## Development

```bash
npm install
npm run dev     # start the Vite dev server
npm run build   # type-check and produce a production bundle in dist/
npm run lint    # run ESLint
```

The production bundle in `dist/` is completely self-contained and can be served
from any static host.

## Project structure

- `src/App.tsx` owns providers, navigation, and the application shell.
- `src/features/<domain>/` contains pages and domain-specific UI for analytics,
  dashboard, distribution, finance, front desk, guests, housekeeping, maintenance,
  reservations, rooms, settings, and staff.
- `src/features/reservations/room-calendar/` contains calendar models,
  validation, and reservation dialogs.
- `src/components/` contains shared UI primitives, overlays, navigation, and
  error handling.
- `src/theme/` contains the nine theme presets, runtime theme provider, and
  semantic design tokens.
- `src/data/` contains the demo catalog, fixtures, and in-memory store;
  `src/lib/api/` preserves feature-facing contracts and adapters.

When adding a screen, place it in its domain feature and lazy-load it from
`src/App.tsx`. Shared controls belong in `src/components/`; avoid adding
page-specific copies of existing buttons, tables, or theme tokens.
