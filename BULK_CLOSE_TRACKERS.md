# Bulk Close Trackers — Implementation Instructions

## Goal

Add a bulk action to close Jira trackers. Analysts select affects with Jira trackers in the AffectsTable, click "Close trackers", confirm, and OSIM calls the Jira REST API directly (using the user's Jira API key) to transition each tracker to "Closed". After completion, the flaw reloads to reflect updated tracker statuses.

## Scope

- **Jira only** — Bugzilla trackers are out of scope; filter them out.
- **Default resolution** — no resolution picker; use whatever the Jira workflow defaults to.
- **Reload after close** — emit `refresh:flaw` to trigger a full flaw reload from the server.

## Architecture Overview

```
AffectsTable.vue  →  useAffectsTable.ts  →  JiraService.ts  →  Jira REST API
     ↓ emit('refresh:flaw')
FlawForm.vue  →  FlawEditView.vue  →  fetchFlaw()
```

## Approach: Red-Green-Commit

Each phase writes failing tests first (red), then the implementation to make them pass (green), then commits. Do **not** skip to implementation without the test existing first.

---

## Phase 1: Jira Transition Service Functions

### Context

File: `src/services/JiraService.ts`

This file already has `jiraFetch()` (handles auth, error responses, read-only checks), `getJiraIssue()`, `putJiraIssue()`, `postJiraComment()`, etc. You are adding three new exported functions following the same patterns.

The Jira REST API uses a two-step process to close an issue:
1. `GET /rest/api/3/issue/{issueKey}/transitions` → returns `{ transitions: [{ id, name }, ...] }`
2. `POST /rest/api/3/issue/{issueKey}/transitions` with body `{ transition: { id } }` → executes the transition

### 1a. Red — Write tests

Create `src/services/__tests__/JiraService.spec.ts`.

Mock the global `fetch` function (the same way `FlawService.spec.ts` uses `vi.spyOn(global, 'fetch')`). You need `createTestingPinia()` in `beforeAll` because `jiraFetch` internally calls `useSettingsStore()` and `useUserStore()`.

After creating the pinia, set the store values so auth headers can be built:
```ts
import { useSettingsStore } from '@/stores/SettingsStore';
import { useUserStore } from '@/stores/UserStore';

// In beforeAll/beforeEach:
const settingsStore = useSettingsStore();
settingsStore.apiKeys = { jiraApiKey: 'test-token', bugzillaApiKey: '' };
const userStore = useUserStore();
userStore.userEmail = 'test@example.com';
```

Also mock `@/stores/osimRuntime` is already handled by the global setup file (`src/__tests__/setup.ts`) which mocks it with `jira: ''` — override the jira backend value by importing `osimRuntime` and setting `osimRuntime.value.backends.jira = 'https://jira.example.com'` in your `beforeAll`.

Tests to write:

1. **`getJiraTransitions` returns transitions list** — Mock `fetch` to return `{ transitions: [{ id: '31', name: 'Close' }] }`. Call `getJiraTransitions('TEST-123')`. Assert fetch was called with URL containing `/rest/api/3/issue/TEST-123/transitions` and method `GET`. Assert return value contains the transitions array.

2. **`postJiraTransition` sends correct body** — Mock `fetch` to return 204 (no content). Call `postJiraTransition('TEST-123', '31')`. Assert fetch was called with URL containing `/rest/api/3/issue/TEST-123/transitions`, method `POST`, and body `{ transition: { id: '31' } }`.

3. **`closeJiraIssue` finds "Close" transition and calls it** — Mock `fetch` to return transitions `[{ id: '11', name: 'In Progress' }, { id: '31', name: 'Close' }]` on first call, then 204 on second call. Call `closeJiraIssue('TEST-123')`. Assert fetch was called twice.

4. **`closeJiraIssue` throws when no close transition exists** — Mock `fetch` to return transitions `[{ id: '11', name: 'In Progress' }]`. Call `closeJiraIssue('TEST-123')`. Assert it rejects with an error message containing "No close transition".

5. **`closeJiraIssue` matches "Done" as a close transition** — Mock `fetch` to return transitions `[{ id: '41', name: 'Done' }]` then 204. Call `closeJiraIssue('TEST-123')`. Assert it resolves (the regex `/close|done/i` matches).

Run tests — they should all fail (functions don't exist yet).

### 1b. Green — Implement

In `src/services/JiraService.ts`, add these three functions at the end (before the private helper functions section, i.e., before `function getJiraCloudAuthHeaders`):

```ts
export async function getJiraTransitions(issueKey: string) {
  return jiraFetch<{ transitions: Array<{ id: string; name: string }> }>({
    method: 'get',
    url: `/rest/api/3/issue/${issueKey}/transitions`,
  });
}

export async function postJiraTransition(issueKey: string, transitionId: string) {
  return jiraFetch({
    method: 'post',
    url: `/rest/api/3/issue/${issueKey}/transitions`,
    data: {
      transition: { id: transitionId },
    },
  });
}

export async function closeJiraIssue(issueKey: string) {
  const { data } = await getJiraTransitions(issueKey);
  const closeTransition = data.transitions.find(t => /close|done/i.test(t.name));
  if (!closeTransition) {
    throw new Error(`No close transition available for ${issueKey}`);
  }
  return postJiraTransition(issueKey, closeTransition.id);
}
```

Run tests — all should pass.

### 1c. Commit

```
feat(jira): add transition API functions for closing trackers

Add getJiraTransitions(), postJiraTransition(), and closeJiraIssue()
to JiraService. closeJiraIssue() discovers the close/done transition
automatically and executes it.
```

---

## Phase 2: `closeSelectedTrackers` Action in `useAffectsTable`

### Context

File: `src/composables/useAffectsTable.ts`

This composable already exposes `fileSelectedTrackers()` which follows the pattern: get selected rows from table → filter → iterate calling service → show toast → refresh. You are adding `closeSelectedTrackers()` following the same pattern, plus emitting `refresh:flaw`.

The composable currently does not accept any parameters. You need to add an `onRefreshFlaw` callback parameter so `AffectsTable.vue` can pass its emit function. This callback will be invoked after closing is complete to trigger a flaw reload.

Key state to add:
- `isClosingTrackers` (ref<boolean>) — tracks loading state, exposed in `state`

Key action to add:
- `closeSelectedTrackers()` — exposed in `actions`

### 2a. Red — Write tests

Create `src/composables/__tests__/useAffectsTable.spec.ts` (or add to it if it exists).

This composable is tightly coupled to TanStack Table, Pinia stores, and other composables. The cleanest test strategy: mock `closeJiraIssue` from JiraService and test the `closeSelectedTrackers` logic.

However, given the complexity of mocking the full table, a more pragmatic approach is to test `closeJiraIssue` integration at the service level (Phase 1) and test the UI button behavior at the component level (Phase 3). **If the composable is too complex to unit test in isolation, skip this phase's tests and cover the behavior in Phase 3 component tests instead.**

If you do write composable tests:

Mock these:
```ts
vi.mock('@/services/JiraService', () => ({
  closeJiraIssue: vi.fn(),
}));
```

Tests:
1. **`closeSelectedTrackers` calls `closeJiraIssue` for each selected Jira tracker** — This requires setting up a full TanStack table instance which is complex. If infeasible to mock cleanly, defer to Phase 3 component tests.

### 2b. Green — Implement

In `src/composables/useAffectsTable.ts`:

**1. Add import:**
```ts
import { closeJiraIssue } from '@/services/JiraService';
```

Add it next to the existing import from `@/services/TrackerService`.

**2. Add `onRefreshFlaw` parameter to `useAffectsTable`:**

Change the function signature from:
```ts
export function useAffectsTable() {
```
to:
```ts
export function useAffectsTable(onRefreshFlaw?: () => void) {
```

**3. Add state:**

Near the existing `isFetchingSuggestedTrackers` ref, add:
```ts
const isClosingTrackers = ref(false);
```

**4. Add the action function:**

Place it right after the existing `fileSelectedTrackers` function:

```ts
async function closeSelectedTrackers() {
  const affectsWithJiraTracker = table.getSelectedRowModel().flatRows
    .filter(row => row.original.tracker?.type === 'JIRA'
      && row.original.tracker?.external_system_id)
    .map(row => row.original);

  if (!affectsWithJiraTracker.length) return;

  const count = affectsWithJiraTracker.length;
  if (!confirm(`Close ${count} Jira tracker(s)? This cannot be undone.`)) return;

  isClosingTrackers.value = true;
  let successCount = 0;

  for (const affect of affectsWithJiraTracker) {
    try {
      await closeJiraIssue(affect.tracker!.external_system_id);
      successCount++;
    } catch {
      // Error already handled by jiraFetch (toast shown on HTTP error)
    }
  }

  showSuccessToast(successCount, 'tracker', 'closed');
  isClosingTrackers.value = false;
  table.resetRowSelection();
  onRefreshFlaw?.();
}
```

**5. Expose in return value:**

Add `isClosingTrackers` to the returned `state` object:
```ts
state: {
  // ... existing fields ...
  isClosingTrackers,
},
```

Add `closeSelectedTrackers` to the returned `actions` object:
```ts
actions: {
  // ... existing fields ...
  closeSelectedTrackers,
},
```

### 2c. Commit

```
feat(affects): add closeSelectedTrackers action

Adds bulk close functionality to useAffectsTable composable.
Iterates selected Jira trackers, calls closeJiraIssue for each,
shows success toast, and triggers flaw reload.
```

---

## Phase 3: UI — "Close trackers" Button and Emit Wiring

### Context

Files:
- `src/components/AffectsTable/AffectsTable.vue` — the table component, uses `useAffectsTable()`
- `src/components/FlawForm/FlawForm.vue` — parent component, already has `emit('refresh:flaw')` defined

### 3a. Red — Write tests

File: `src/components/AffectsTable/__tests__/AffectsTable.spec.ts` (already exists — add tests to it).

Read the existing test file first to understand its setup pattern (it likely mounts the component with specific pinia/store mocks).

Tests to add:

1. **"Close trackers" button is not visible when no rows are selected** — Mount AffectsTable with affects that have Jira trackers. Assert no button with text "Close trackers" exists.

2. **"Close trackers" button appears when a row with a Jira tracker is selected** — Mount AffectsTable, select a row that has `tracker: { type: 'JIRA', external_system_id: 'TEST-1', ... }`. Assert button with text "Close trackers" is visible.

3. **"Close trackers" button does NOT appear when only rows without trackers are selected** — Select rows that have `tracker: null`. Assert button is absent.

4. **"Close trackers" button does NOT appear when only Bugzilla tracker rows are selected** — Select rows that have `tracker: { type: 'BUGZILLA', ... }`. Assert button is absent.

**Note:** If the existing `AffectsTable.spec.ts` test setup is too complex to extend for this, write minimal tests that verify the conditional rendering logic by checking the `v-if` conditions with a simpler mount. Alternatively, if the existing spec already has a working mount pattern, follow it.

### 3b. Green — Implement

**`src/components/AffectsTable/AffectsTable.vue`:**

**1. Add emit definition and pass to composable:**

Add emit to the script setup:
```ts
const emit = defineEmits<{
  (e: 'refresh:flaw'): void;
}>();
```

Change the `useAffectsTable()` call to pass the emit:
```ts
const {
  actions: {
    // ... existing destructured actions ...
    closeSelectedTrackers,
  },
  state: {
    // ... existing destructured state ...
    isClosingTrackers,
  },
} = useAffectsTable(() => emit('refresh:flaw'));
```

**2. Add the button in the template:**

In the toolbar area, right after the existing "Create trackers" button block, add:

```vue
<button
  v-if="(table.getIsSomeRowsSelected() || table.getIsAllRowsSelected())
    && table.getSelectedRowModel().flatRows.some(row => row.original.tracker?.type === 'JIRA')"
  v-osim-loading="isClosingTrackers"
  :disabled="isClosingTrackers"
  class="btn btn-warning text-nowrap"
  type="button"
  title="Close Jira trackers for selected affects"
  @click="closeSelectedTrackers()"
>
  <i v-if="!isClosingTrackers" class="bi-x-circle"></i>
  Close trackers
</button>
```

Place it immediately after this existing block:
```vue
<button
  v-if="(table.getIsSomeRowsSelected() || table.getIsAllRowsSelected())
    && table.getSelectedRowModel().flatRows.filter(row => !row.original.tracker).length"
  class="btn btn-danger text-nowrap"
  ...
>
  Create trackers
</button>
<!-- INSERT NEW BUTTON HERE -->
```

**`src/components/FlawForm/FlawForm.vue`:**

**3. Wire the emit from AffectsTable:**

Find where `<AffectsTable v-else />` is rendered (line ~619) and add the event handler:

```vue
<AffectsTable v-else @refresh:flaw="emit('refresh:flaw')" />
```

The `FlawForm` already defines `emit('refresh:flaw')` (line 71) and the parent `FlawEditView` already handles `@refresh:flaw="fetchFlaw(id)"` (line 30). So this just wires the bubble.

### 3c. Run all tests

```bash
npx vitest run
```

All tests should pass.

### 3d. Commit

```
feat(ui): add Close trackers button with flaw reload

Adds a "Close trackers" button to AffectsTable toolbar that appears
when selected rows include Jira trackers. Wires refresh:flaw emit
through FlawForm to trigger a full flaw reload after closing.
```

---

## File Change Summary

| File | Change |
|------|--------|
| `src/services/JiraService.ts` | Add `getJiraTransitions()`, `postJiraTransition()`, `closeJiraIssue()` |
| `src/services/__tests__/JiraService.spec.ts` | **New file** — tests for the three functions above |
| `src/composables/useAffectsTable.ts` | Add `onRefreshFlaw` param, `isClosingTrackers` state, `closeSelectedTrackers()` action, import `closeJiraIssue` |
| `src/components/AffectsTable/AffectsTable.vue` | Add `defineEmits`, destructure new action/state, add "Close trackers" button, pass emit to composable |
| `src/components/FlawForm/FlawForm.vue` | Add `@refresh:flaw` handler on `<AffectsTable>` |
| `src/components/AffectsTable/__tests__/AffectsTable.spec.ts` | Add tests for button visibility conditions |

## Key Decisions

- **`confirm()` for confirmation** — native browser dialog, zero UI code. Replace with `Modal.vue` widget later if the team wants branded UX.
- **Sequential iteration** — trackers closed one-by-one in a for loop (same pattern as `fileSelectedTrackers`). Parallelism can be added later if needed.
- **Transition name matching** — `/close|done/i` regex covers standard Jira workflows. If a project uses a non-standard name, `closeJiraIssue` throws a descriptive error per-issue, and the analyst sees a toast for the failure while successes proceed.
- **No Bugzilla** — filtered out at `row.original.tracker?.type === 'JIRA'` in both the button visibility and the action.
