# OSIM Onboarding Guide

## 1. Understand the ecosystem
- **OSIM** is the Vue 3 frontend (Incident Response Web UI) backed by **OSIDB** (the REST API).
- Two repos to know: `osim` (frontend) and `osim-ui-tests` (Playwright E2E tests).
- Read [`docs/overview.md`](../docs/overview.md) for architecture, directory layout, and core patterns.

---

## 2. Local setup
- Install deps: `yarn`
- Configure `public/runtime.json` pointing to local or staging OSIDB (see `docs/overview.md` → *Local Configuration*).
- Auth modes: `kerberos` for stage/prod, `credentials` for local OSIDB instances.
- Run dev server: `yarn dev`

---

## 3. Source structure

| Dir | What lives there |
|---|---|
| `src/components/` | Reusable Vue components |
| `src/views/` | Route-mounted pages (`*View.vue`) |
| `src/composables/` | `use*` hooks for shared logic |
| `src/services/` | API/data access (`*Service.ts`) |
| `src/stores/` | Pinia cross-component state |
| `src/types/` | Zod schemas + TypeScript types |
| `src/generated-client/` | Auto-generated OSIDB API client |

---

## 4. Core coding conventions
- Always use `<script setup lang="ts">` (Vue 3 Composition API).
- All env vars are prefixed `OSIM_`.
- API calls go through services, not directly in components.
- Use Pinia only when state needs to be shared across siblings.
- Schema validation uses **Zod** — `src/types/zodFlaw.ts` is the main reference.
- Prefer nesting `<input>` inside `<label>` over `id`/`for` pairs.

---

## 5. Development workflow (feature end-to-end)

```
SCAFFOLD  → create component + composable + service + Zod type
ITERATE   → edit freely
REVIEW    → yarn vibe-check  (lint + type-check + unit tests)
COMMIT    → gitmoji + short imperative message (e.g. ✨ add flaw priority filter)
E2E TEST  → write spec in osim-ui-tests workspace
```

---

## 6. Key commands

```bash
yarn dev                        # dev server
yarn vibe-check                 # lint + type-check + tests (required before PR)
yarn lint                       # ESLint only
yarn type-check                 # TypeScript only
yarn test:unit                  # Vitest unit tests
yarn generate-openapi-client    # regenerate API client from openapi-osidb.yml
```

---

## 7. Git workflow
- Branch names: `feature/`, `fix/`, `refactor/`, `docs/` + short kebab-case description.
- Commit format: `<gitmoji> <short imperative sentence>` (e.g. `🐛 fix owner field not saving`).
- Consolidate commits before pushing. Run `yarn vibe-check` before opening a PR.

---

## 8. E2E tests (`osim-ui-tests`)
- Specs live in `tests/`, page helpers in `pages/`.
- Required env vars: `OSIDB_URL`, `OSIM_URL`, `LOGIN_USERNAME`, `LOGIN_PASSWORD`.
- Run a single spec: `yarn playwright test tests/<file>.spec.ts --headed`
- Record new interactions: `yarn playwright codegen $OSIM_URL`

---

## 9. OpenAPI client
- API contract lives in `openapi-osidb.yml`.
- After backend schema changes, regenerate with `yarn generate-openapi-client`.

---

## 10. PR checklist (from `CONTRIBUTING.md`)
- [ ] Linting passed
- [ ] Type checks passed
- [ ] Test suite passed
- [ ] Commits consolidated
- [ ] Changelog updated
- [ ] Test cases added/updated

---

> **First reading path:** `README.md` → `docs/overview.md` → `CONTRIBUTING.md` → pick a small `fix/` ticket to trace through the full workflow once.
