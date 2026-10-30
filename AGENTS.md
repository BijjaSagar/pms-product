# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this project is

TriponX Hotel PMS: a React 19 + TypeScript single-page front end for a hotel property management system. It is a **static demo**: there is no server and no database. All data lives in an in-memory store (`src/data/store.ts`) seeded at startup, so every change resets on reload. The UI and its interactions are the product; `src/lib/api/pms.ts` keeps the API shape a real backend would expose.

## Stack (keep these versions; do not upgrade without a reason)

- React 19.2, react-dom 19.2
- TypeScript 6 (`tsconfig.app.json` for app code, `tsconfig.node.json` for tooling)
- Vite 8 with `@vitejs/plugin-react`
- Tailwind CSS 4.3 through `@tailwindcss/vite` (no `tailwind.config`; theme lives in `src/index.css` and `src/theme/tokens.css`)
- lucide-react for icons
- ESLint 10 with react-hooks and react-refresh plugins

Do not add dependencies for something the project already does. Do not add a state library, a router or a CSS-in-JS system.

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
  App.tsx                 providers, shell, view switch (lazy-loads each page)
  main.tsx                React root; imports index.css
  index.css               Tailwind entry, global base rules, shared .pms-* components
  config/
    navigation.ts         view ids, sidebar sections, view-to-permission map
  components/             shared UI, one component per file
    layout/               Sidebar and Header (app chrome only)
  features/<domain>/      one folder per screen area; a page file plus its sub-parts
  data/                   demo catalog, fixtures, in-memory store (the single source of demo data)
  lib/
    api/                  feature-facing API objects (pms.ts) and adapters
    scrollLock.ts         body scroll lock used by dialogs
  theme/                  nine colour presets, theme provider, tokens.css, tone helpers
  types/index.ts          shared domain types
  utils/                  small pure helpers (currency, dates, status tones, toasts)
scripts/check-palette.mjs palette guard, run by `npm run lint`
```

Rules for placing code:

- A new screen goes in `features/<domain>/` and is lazy-loaded from `App.tsx`.
- Sub-parts of one screen stay in a sub-folder of that feature (for example `reservations/new-reservation/`), not in `components/`.
- Anything used by two or more features moves to `components/` (UI), `utils/` (logic) or `lib/api/` (data access). Do not copy code between feature folders.
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
- All demo data lives in `data/`. Screens read counts, dates, guests, rooms and folios from the store through `lib/api`. Do not type a record, a count or a date into a component, and do not add a second copy of a dataset.
- Notices, KPIs and calendar rooms are derived from the store (`lib/api/notices.ts`, the header effect, `room-calendar/calendarData.ts`).
- User-visible failures show a toast or an inline message through the existing `toast` helper. Do not swallow errors silently.
- Comments explain why, not what. Remove comments that describe code that no longer exists.

## Verification checklist

1. `npm run lint` passes (ESLint and palette guard).
2. `npm run build` passes (type check and bundle).
3. Open the changed screen at 320px, 768px, 1280px and 1920px. Check for horizontal scrolling, clipped text and overlapping controls.
4. Check the browser console for errors while navigating the changed screen.

## Do not

- Do not commit `.env` files or credentials. This build has no secrets.
- Do not edit `dist/` by hand; it is generated.
- Do not change the demo session, seed data or business date (`2026-10-17`) unless the task asks for it.
- Do not upgrade major versions of React, Vite or Tailwind as a side effect of another task.
