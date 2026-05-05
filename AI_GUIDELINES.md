# OSIM — AI Assistant Guidelines

OSIM is a Vue 3 + TypeScript security advisory management frontend for OSIDB.

## Tech Stack

- Vue 3 (Composition API, `<script setup>`), TypeScript strict mode
- Pinia (state), Vue Router 4, Bootstrap 5
- Vitest + Vue Test Utils (unit), Playwright (E2E in `osim-ui-tests`)
- OpenAPI-generated client (`src/generated/`), Zod for runtime validation
- ESLint + Stylelint, Vite

## File Layout

```
src/
  components/   # UI components (directory-based, co-located spec files)
  composables/  # use*() hooks — reactive state + actions
  services/     # API calls via generated client only
  stores/       # Pinia stores
  types/        # Zod schemas + inferred TS types (zod*.ts)
  generated/    # OpenAPI client — never edit manually
  widgets/      # Complex reusable components
```

## Core Conventions

- `<script setup lang="ts">` — always
- `defineProps<T>()` / `defineEmits<{}>()` — explicit types, no `PropType`
- API calls only through generated OpenAPI client — no hand-rolled fetch
- Zod schemas in `src/types/zod*.ts` for all API response types
- `v-html` requires `sanitize-html` preprocessing — no exceptions
- No `any` — use `unknown` + type narrowing

## Development Commands

```bash
yarn dev             # dev server (HTTPS, hot reload)
yarn lint            # ESLint + Stylelint
yarn type-check      # TypeScript validation
yarn test:unit       # Vitest unit tests
yarn vibe-check      # lint + type-check + tests (pre-PR gate)
yarn generate-openapi-client  # regenerate API client
```

## Security Notes

This application handles security advisories and vulnerability data.
- Sanitize all user-generated HTML before rendering
- Validate user inputs before use
- Never expose credentials, tokens, or internal hostnames in code
- Auth is JWT-based; token handling is in `src/stores/`

## AI Workflow Notes

- Implement first — do not auto-run lint/tests after changes
- Only run validation when explicitly asked
- Search existing implementations before generating new ones
- Follow established patterns in composables and services

## Local Cursor Config (`.cursor/`)

A richer local-only Cursor config lives at `.cursor/` (excluded from git via `.git/info/exclude` — persists across all branches).

**Rules** (auto-applied by file type):
- `rules/vue-typescript.mdc` — Vue 3 composition, Zod, security patterns (`*.vue`, `*.ts`)
- `rules/git-workflow.mdc` — gitmoji commits, branch naming (always)

**Agents** (invoke by description or `@name`):
- `code-reviewer` — structured Vue/TS diff review, no auto-validation
- `feature-scaffolder` — generates component + composable + service + Zod type from description
- `pr-description` — concise PR summary from `git diff main...HEAD`

See `.cursor/README.md` for usage examples and the full SDLC workflow.
