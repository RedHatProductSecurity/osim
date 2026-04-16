# Cursor Agentic Config — osim

Local-only config (not tracked by git). Covers the full SDLC for the osim Vue 3 frontend.

---

## Rules (auto-applied by Cursor)

| File | Applies to | Purpose |
|------|-----------|---------|
| `rules/vue-typescript.mdc` | `*.vue`, `*.ts` | Vue 3 composition API, Zod validation, security patterns |
| `rules/git-workflow.mdc` | Always | Gitmoji commits, semantic branch naming |

---

## Agents (invoke with `@agent-name` or describe the task)

### `code-reviewer` — Review code changes

**When to use:** After you're satisfied with an implementation and want a structured review before running checks.

**Example prompts:**
```
Review my changes to CommentList.vue and useFlawCommentFilter.ts
```
```
@code-reviewer — what issues do you see in the flaw form changes?
```

**What it does:**
- Runs `git diff HEAD` to see what changed
- Checks TypeScript safety, Vue 3 patterns, security, code quality
- Returns 🔴 Critical / 🟡 Suggestion / 🟢 Minor feedback with file+line references
- Does NOT auto-run lint or tests

---

### `feature-scaffolder` — Generate new feature boilerplate

**When to use:** Starting a new feature that needs component + composable + service + types.

**Example prompts:**
```
Use feature-scaffolder to add a comment type filter. UI-only, no API changes needed.
```
```
Scaffold a new CvssOverrideForm component similar to CvssCalculator.
```

**What it does:**
1. Reads 2–3 similar existing files to match conventions
2. Generates: `components/<Name>/<Name>.vue`, `composables/use<Name>Model.ts`, optionally service + Zod type
3. Lists which existing files need updating to wire it in
4. Stops — does NOT run type-check or tests

---

### `pr-description` — Generate a PR description from branch changes

**When to use:** Before opening a PR.

**Example prompts:**
```
Write the PR description for this branch.
```
```
@pr-description
```

**Output:**
```
## Summary
Add comment type filter to flaw comment list.

## Changes
- CommentList.vue: new filter UI with CommentType checkboxes
- useFlawCommentFilter.ts: reactive filter composable

## Considerations
- Filter state is local — resets on navigation
```

---

## Workflow: Implementing a feature end-to-end

```
1. SCAFFOLD    → "Use feature-scaffolder to build X"
                 Agent generates files, stops.

2. ITERATE     → Edit freely. No agent checks between iterations.

3. REVIEW      → "Review my changes to <files>"  ← code-reviewer
                 Fix any 🔴 items.

4. VALIDATE    → "Run vibe-check"
                 Agent runs: yarn vibe-check (lint + type-check + tests)

5. COMMIT      → "Commit this"
                 osim-commit skill generates: ✨ short imperative message

6. E2E TESTS   → Switch to osim-ui-tests workspace
                 "Write an E2E test for X"  ← e2e-test-writer agent there
```

---

## Key SDLC commands (run manually or ask the agent explicitly)

```bash
yarn lint              # ESLint only
yarn type-check        # TypeScript only
yarn test:unit         # Vitest unit tests
yarn vibe-check        # lint + type-check + tests (pre-PR gate)
yarn dev               # local dev server
yarn generate-openapi-client  # regenerate API client from openapi-osidb.yml
```
