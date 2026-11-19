# AGENTS.md — OSIM

OSIM: Incident Response Web UI for OSIDB. Vue + TypeScript + Vite + Pinia + Bootstrap. Branch from `main`.

## Stack

- `yarn` only (`yarn.lock`)
- Vite + `vue-tsc` + `tsconfig.vitest.json`
- Vitest + MSW (`openapi-osidb.yml`) + Behave e2e
- ESLint + Prettier (`singleQuote`, `printWidth: 120`) + Stylelint
- Docker → Quay via `.github/workflows`

## Layout

- `src/main.ts`, `src/App.vue`, `src/router/`, `src/views/[Page]View.vue`
- `src/components/`, `src/widgets/`, `src/composables/`, `src/stores/` (except `osimRuntime.ts`)
- `src/services/*Service.ts` via `osidbFetch`, `src/types/`, `src/utils/`
- `src/mock-server/` generated, `public/runtime.json`

## Commands

`yarn`, `yarn dev` / `dev-server`, `yarn test:unit:nowatch`, `yarn build`, `yarn test:e2e`, `yarn type-check`, `yarn lint` / `lint-fix` / `lint-style`, `yarn lint-changed` / `type-check-changed`

Preserve `singleQuote` — check `git diff --stat` for quote-flip.

## Conventions

- `<script setup lang="ts">`, composition API, props over Pinia, semantic HTML
- `osidbFetch` per-request token, env `OSIM_*`, commits `type(scope): subject` + `git commit -S -s`

## Testing & CI

Host: `yarn test:unit:nowatch`, `yarn type-check`, `yarn lint-ts-vue`
Container: `podman run --rm --network host -v $PWD:/work -w /work node:22-slim yarn <cmd>`

## Links

- `docs/overview.md`, `CONTRIBUTING.md`, `README.md`
