# TriponX Hotel PMS — static demo build

A React + TypeScript front end for a hotel property management system: reservations, room calendar, front desk, rates and channel distribution, folios and billing, night audit, reports and staff management.

## Running without a backend

This build is fully static. There is no server, no network calls and no database. The UI runs against an in-memory store that is seeded at startup and lives for the lifetime of the browser tab.

- `src/data/catalog.ts` holds fixed reference data (property, roles, permissions, staff, room types, guest profiles).
- `src/data/fixtures.ts` generates rooms, reservations and folios for the business date `2026-10-17`.
- `src/data/store.ts` is the interactive store. Every create, update and delete the UI performs (check-in, check-out, posting charges, taking payments, raising tickets, inviting staff) changes this store in place, so the change shows everywhere in the app.
- `src/lib/api/*` keeps the feature-facing API shape. The API objects delegate to the store instead of `fetch`.

Because the store lives in memory, **all changes reset when you reload the page**. There is no persistence layer. The one exception is the chosen colour theme and the sidebar collapsed state, which are saved in the browser.

### Sessions

There is no login screen. The app starts in a fixed demo session (Anaya Sharma, Owner) with access to every module. "Sign out" reloads that session.

### Exports

Report and audit-log CSV exports are generated in the browser from the store.

Expenses, rate plans and notification preferences remain demo-only sections.

## Development

```bash
npm install
npm run dev            # start the Vite dev server
npm run build          # type-check and produce a production bundle in dist/
npm run lint           # run ESLint plus the palette guard
npm run check:palette  # check colours only
npm run preview        # serve the production bundle locally
```

The production bundle in `dist/` is self-contained and can be served from any static host.

## Colour palette

The UI is light-only and uses one controlled palette. Do not add bespoke accents when styling a screen.

- **Theme accent:** `primary`, `primary-hover`, `primary-active`, `dark-accent` and `soft`. These follow the active preset (nine presets in `src/theme/presets.ts`).
- **Status tones:** `success`, `info`, `warning`, `danger` and `neutral`. Each exposes `-bg`, `-text`, `-border` and `-foreground` tokens and is fixed across presets. Use them for state, not decoration.
- **Neutrals:** `page`, `surface`, `elevated`, `muted-surface`, `hover-surface`, `ink`, `ink-secondary`, `ink-muted`, `ink-disabled`, `border` and `divider`.
- **Charts and inline styles:** import `TONE_VARS` or `CHART_COLORS` from `src/theme/tone.ts` instead of writing hex values.

Stock Tailwind palette utilities (`bg-slate-100`, `text-emerald-600`), raw hex or rgb values and `dark:` variants fail `npm run check:palette`. Legitimate brand marks (OTA logos, preset definitions, design-token files) are allowlisted in `scripts/check-palette.mjs`. A one-off brand colour can be marked with a `palette-allow` comment on the line above:

```tsx
{/* palette-allow: Partner brand colour */}
<span className="bg-[#003580]">B</span>
```

## Project structure

```
src/
  App.tsx                 providers, navigation shell and view switch
  main.tsx                React root
  index.css               Tailwind entry and shared component classes
  config/                 navigation (views, sections, permissions) and notices
  components/             shared UI primitives, overlays, toasts, error pages
    layout/               sidebar and header
  features/
    analytics/            reports hub
    auth/                 demo session context
    dashboard/            operational overview
    distribution/         rate management and channel manager
    finance/              billing, invoices, payments, night audit
    guests/               guest directory
    maintenance/          work orders
    reservations/         reservations list, room calendar, new reservation
    rooms/                room overview and status timeline
    settings/             property settings, room types, appearance
    staff/                staff and roles
  data/                   catalog, fixtures, in-memory store
  lib/
    api/                  feature-facing API objects and adapters
    scrollLock.ts         body scroll lock for dialogs
  theme/                  presets, theme provider, design tokens, tone helpers
  types/                  shared domain types
  utils/                  currency, dates, folio and status helpers, toasts
scripts/check-palette.mjs palette guard
```

When adding a screen, place it in its domain folder under `features/` and lazy-load it from `src/App.tsx`. Shared controls belong in `src/components/`. Avoid page-specific copies of existing buttons, tables or theme tokens.

For the rules agents and contributors follow in this repository, see `AGENTS.md`.
