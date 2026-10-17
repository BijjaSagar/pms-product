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

## Template notes

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
