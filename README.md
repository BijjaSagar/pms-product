# Hotel PMX — demo build

A React + TypeScript front end for a hotel property management system: reservations, room calendar, front desk, rates and channel distribution, folios and billing, night audit, reports and staff management.

## Backend

Accounts, owners, properties, Settings, guests, reservations and room holds call `pms-backend` (`npm run start:dev` there). Set `VITE_API_URL` in `.env.local` to its address **including the `/api/v1` prefix**, e.g. `http://localhost:3000/api/v1`. Forgot password is not available yet. The finance, night audit, report, rate and channel screens still run on dummy data in memory.

- `src/shared/mocks/` holds all demo data; `store.ts` is the interactive store, seeded for the business date `2026-10-17`.
- `src/shared/services/` holds the API the screens call. Each method reads or changes the store.
- **All changes reset when you reload the page.** The signed-in session, colour theme and sidebar state are kept in the browser.
- Report and audit-log CSV exports are generated in the browser.

## Accounts

There is no sign-up. Accounts are created from above, each level by the one over it:

| Level | Created by | Works from |
| --- | --- | --- |
| Super Super Admin | `npm run seed` in `pms-backend` | Platform console: managers, owners, properties, audit trail |
| Relationship Manager | Super Super Admin | Manager console: their owners (up to their limit, default 10) and those owners' properties |
| Owner (several people per company) | Super Super Admin or the manager | Owner console: one view across the company's properties, add properties, add colleagues |
| Property Admin and department staff | Owner, manager, or a Property Admin | The property's hotel workspace; the menu follows the department role |

Each new account gets a temporary password, shown once, and must replace it at first sign-in.

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

- **Theme accent:** `primary`, `primary-hover`, `primary-active`, `dark-accent` and `soft`. These follow the active preset (nine presets in `src/shared/theme/presets.ts`).
- **Status tones:** `success`, `info`, `warning`, `danger` and `neutral`. Each exposes `-bg`, `-text`, `-border` and `-foreground` tokens and is fixed across presets. Use them for state, not decoration.
- **Neutrals:** `page`, `surface`, `elevated`, `muted-surface`, `hover-surface`, `ink`, `ink-secondary`, `ink-muted`, `ink-disabled`, `border` and `divider`.
- **Charts and inline styles:** import `TONE_VARS` or `CHART_COLORS` from `src/shared/theme/tone.ts` instead of writing hex values.

Stock Tailwind palette utilities (`bg-slate-100`, `text-emerald-600`), raw hex or rgb values and `dark:` variants fail `npm run check:palette`. Legitimate brand marks (OTA logos, preset definitions, design-token files) are allowlisted in `scripts/check-palette.mjs`. A one-off brand colour can be marked with a `palette-allow` comment on the line above:

```tsx
{/* palette-allow: Partner brand colour */}
<span className="bg-[#003580]">B</span>
```

## Project structure

```
src/
  main.tsx                React root
  index.css               Tailwind entry and shared component classes
  app/                    App.tsx: providers, sign-in gate, chooses super admin or customer
  console/                the console for the Super Super Admin, Relationship Managers and owners
    ConsoleShell.tsx
    layout/               console sidebar, header, per-role navigation
    features/             dashboard, managers, owners, properties, audit, ota-channels, activity-log
  customer/               the hotel workspace (property staff)
    HotelWorkspace.tsx
    layout/               hotel sidebar, header and their menus
    features/             analytics, dashboard, distribution, finance, guests, inventory,
                          onboarding, property-picker, reservations, rooms, settings
  shared/                 used by both sides
    components/           brand, feedback, layout (account menu), ui
    features/             auth (one sign-in for everyone), property-setup (setup wizard), staff (team and roles)
    config/               hotel views, sections, permissions
    services/             one <domain>Api.ts per domain, over the in-memory store
    mocks/                all dummy data and the in-memory store
    hooks/ lib/ theme/ types/ utils/
scripts/check-palette.mjs palette guard
```

`console/` and `customer/` never import each other, and `shared/` imports neither. A screen goes in its side's `features/<domain>/` folder; anything both sides need goes in `shared/`. Components are `PascalCase.tsx`, other modules `camelCase.ts`, folders `kebab-case`.

For the rules agents and contributors follow in this repository, see `AGENTS.md`.
