# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this project is

Hotel PMX: a React 19 + TypeScript front end for a hotel property management system. Sign-up, sign-in, password change the new property setup and Settings > Property Details, Terms and Inclusions, and Cancellation call `pms-backend` (`src/shared/services/http.ts`, `VITE_API_URL`, default `http://localhost:3000`); **every other screen runs on dummy data held in memory**.

Two roles share one sign-in. A **SUPER_ADMIN** gets the platform console (`src/superadmin/`): properties, users and access, activation keys, OTA channels and the activity log; "Open" on a property shows that hotel's workspace. **STAFF** get the hotel workspace (`src/customer/`) for the properties assigned to them. `src/app/App.tsx` picks between them from `me.user.role`. New people can register, describe a property in the setup wizard and enter an activation key. There is no router: signed-out pages are chosen from the path (`src/shared/features/auth/authPage.ts`), so static hosting needs an SPA fallback to `index.html`.

Screens call `<domain>Api` objects in `src/shared/services/`, which read and change the store in `src/shared/mocks/`. Changes reset on reload; only the session, theme and sidebar state are kept in the browser. Demo sign-ins and activation keys are listed in `README.md`.

## Stack (keep these versions; do not upgrade without a reason)

- React 19.2, react-dom 19.2
- TypeScript 6 (`tsconfig.app.json` for app code, `tsconfig.node.json` for tooling)
- Vite 8 with `@vitejs/plugin-react`
- Tailwind CSS 4.3 through `@tailwindcss/vite` (no `tailwind.config`; theme lives in `src/index.css` and `src/shared/theme/tokens.css`)
- lucide-react for icons
- ESLint 10 with react-hooks and react-refresh plugins

Do not add dependencies for something the project already does. Do not add a state library, a router or a CSS-in-JS system. Do not add network calls beyond the account and setup ones unless the task asks.

## Commands

```bash
npm install
npm run dev            # Vite dev server
npm run build          # tsc -b, then vite build into dist/
npm run lint           # eslint . and the palette guard
npm run check:palette  # colour guard only
npm run preview        # serve dist/
```

Run `npm run lint` and `npm run build` before reporting a task as done. Say plainly in the report if either could not be run.

## Layout

```
src/
  main.tsx                React root
  index.css               Tailwind entry and shared component classes
  app/                    App.tsx: providers, sign-in gate, chooses super admin or customer
  superadmin/             the platform console (super admin only)
    PlatformConsole.tsx
    layout/               console sidebar, header, navigation
    features/             dashboard, properties, users, activation-keys, ota-channels, activity-log
  customer/               the hotel workspace (property staff)
    HotelWorkspace.tsx
    layout/               hotel sidebar, header and their menus
    features/             analytics, dashboard, distribution, finance, guests, inventory,
                          onboarding, property-picker, reservations, rooms, settings
  shared/                 used by both sides
    components/           brand, feedback, layout (account menu), ui
    features/             auth (one sign-in for both), property-setup (setup wizard)
    config/               hotel views, sections, permissions
    services/             one <domain>Api.ts per domain, over the in-memory store
    mocks/                all dummy data and the in-memory store
    hooks/ lib/ theme/ types/ utils/
scripts/check-palette.mjs palette guard
```

Rules for placing code:

- `superadmin/` and `customer/` never import each other; `shared/` imports neither. Only `app/` composes the two.
- A new screen goes in its side's `features/<domain>/` and is lazy-loaded.
- Sub-parts of one screen stay in a sub-folder of that feature (for example `reservations/new-reservation/`).
- Anything used by two or more features moves to `shared/components/` (UI), `shared/utils/` (logic) or `shared/services/` (data access). Do not copy code between feature folders.
- Components are `PascalCase.tsx`, other modules `camelCase.ts`, folders `kebab-case`.
- Do not create re-export files that only forward another module. Import from the module that defines the symbol.
- Do not keep dead code. Delete unused exports, components and imports in the same change that makes them unused.

## Styling rules

- Colours come from theme tokens only (`primary`, `soft`, `surface`, `ink`, `border`, the five status tones). Stock Tailwind palette shades (`bg-slate-100`), raw hex and `dark:` variants fail `npm run check:palette`. A brand colour that must stay may be marked with a `palette-allow` comment on the line above.
- Use the shared classes in `index.css` (`pms-card`, `pms-btn-primary`, `pms-btn-ghost`, `pms-input`, `pms-table`, `pms-table-container`) before writing new ones.
- Form controls share one size: text inputs and selects use `pms-input` with `min-h-[34px] md:min-h-[32px]`. Do not set a different height per screen.
- Text sizes follow the page type ladder used in the reservation screens: micro, label, body, title and display, each with a value for phones (below 768px), tablets (768–1023px), desktop (1024–1439px) and large screens (1440px and up). Do not add fixed text sizes that ignore the bands.
- Layout must work at 320px, 768px, 1024px, 1280px, 1440px and 1920px. Check each band you touch. Do not let content overflow horizontally: wide tables go inside `TableContainer`.
- Use `lg:max-[1439px]:` style ranges when a desktop rule must not also apply to large screens. Stacked variants at the same breakpoint have no guaranteed order.

## Code rules

- TypeScript strict. Avoid `any`; if one is unavoidable, add a comment that says why.
- Functional components and hooks only. Keep components small; extract logic that is not rendering into `utils/` or a hook.
- All demo data lives in `shared/mocks/`. Screens read counts, dates, guests, rooms and folios from the store through `shared/services`. Do not type a record, a count or a date into a component, and do not add a second copy of a dataset.
- Notices, KPIs and calendar rooms are derived from the store (`shared/services/notices.ts`, the header effect, `room-calendar/calendarData.ts`).
- User-visible failures show a toast or an inline message through the existing `toast` helper. Do not swallow errors silently.
- Comments explain why, not what. Remove comments that describe code that no longer exists.

## Verification checklist

1. `npm run lint` passes (ESLint and palette guard).
2. `npm run build` passes (type check and bundle).
3. Open the changed screen at 320px, 768px, 1280px and 1920px. Check for horizontal scrolling, clipped text and overlapping controls.
4. Check the browser console for errors while navigating the changed screen.

## Do not

- Do not commit `.env` files or credentials. This build has no secrets; the demo passwords are fake.
- Do not edit `dist/` by hand; it is generated.
- Do not change the demo session, seed data or business date (`2026-10-17`) unless the task asks for it.
- Do not upgrade major versions of React, Vite or Tailwind as a side effect of another task.
