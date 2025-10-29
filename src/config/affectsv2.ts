import { setReadOnly } from '@/stores/osimRuntime';
import SampleFlawFullV2 from '@/__tests__/__fixtures__/sampleFlawFullV2.json';
import type { ZodFlawType } from '@/types';

import type { Tour } from './tours';

const affectsV2: Tour = {
  id: 'affects-v2',
  name: 'Affects V2',
  icon: 'bi-table',
  setup: async ({ router, setFlaw }) => {
    // Enable read-only mode to prevent network requests on mock data
    setReadOnly(true);

    // Load mock flaw data from test fixture
    setFlaw(structuredClone(SampleFlawFullV2 as unknown as ZodFlawType));

    // Navigate to the flaw edit view
    await router.push(`/flaws/${SampleFlawFullV2.uuid}`);
  },
  cleanup: ({ router }) => {
    // Navigate away from the mock flaw to the flaws list
    router.back();

    // Disable read-only mode after navigating away
    setReadOnly(false);
  },
  steps: [
    {
      element: '#affected-offerings',
      popover: {
        title: 'Affects V2',
        description: 'Affects and trackers are now merged into a single table.',
      },
    },
    {
      element: '#affected-offerings table.mb-0 > tbody:nth-child(2) > tr:nth-child(1) > td:nth-child(3)',
      popover: {
        description: 'Affects are now identified by the update stream. Previously, 1 affect could affect '
        + 'multiple streams (trackers). Now, 1 affect is mapped to 1 tracker.',
      },
    },
    {
      element: '#affected-offerings button.btn-secondary:nth-child(4)',
      popover: {
        description: 'Now that the table combines both Affects and Trackers columns, it can get quite wide, '
        + 'so we added some configuration options.',
        onNextClick: (element, _, { driver }) => {
          if (!element?.classList.contains('show')) {
            (element as HTMLButtonElement).click();
          }
          driver.moveNext();
        },
      },
    },
    {
      element: '#affected-offerings ul.dropdown-menu:nth-child(5)',
      popover: {
        description: 'Here you can personalize how the table behaves. All settings are persisted in the '
        + 'browser—configure it once and you\'re done!'
        + '<br><b>Group by PsModule</b> will reduce the number of rows in the table. It\'s only a visual '
        + 'aid; all other actions still work the same.'
        + '<br>Use the checkboxes to toggle <b>visibility</b> and drag and drop to change the <b>order</b> '
        + 'of the columns.'
        + '<br>You can reset all changes with the buttons at the bottom.',
        onNextClick: (element, _, { driver }) => {
          element?.parentElement?.click();
          driver.moveNext();
        },
      },
    },
    {
      element: '#affected-offerings button[title="Add new affect"]',
      popover: {
        description: 'Add new affects with this button.',
      },
    },
    {
      element: '#affected-offerings button[title="Select suggested trackers"]',
      popover: {
        description: 'In the old version, when opening the tracker manager, some streams were '
        + 'pre-selected to be filed. '
        + 'These suggestions come from OSIDB running checks in product definitions. '
        + 'Use this button to select suggested trackers.',
      },
    },
    {
      element: '#affected-offerings div.flex-row> input.form-control',
      popover: {
        description: 'You can filter by any column using this input to quickly find any affect.',
      },
    },
    {
      element: '#affected-offerings th.sortable:nth-child(3) > div:nth-child(1) > div:nth-child(1)',
      popover: {
        description: 'All columns can be filtered independently as well.',
      },
    },
    {
      element: '#affected-offerings th.sortable:nth-child(3) > span:nth-child(2)',
      popover: {
        description: 'Sorting is also possible. You can combine multiple columns by holding <kbd>Shift</kbd> '
        + 'when clicking this button.',
      },
    },
    {
      element: '#affected-offerings table.mb-0 > tbody:nth-child(2) > tr:last-child > td:nth-child(4) span',
      popover: {
        description: 'You can edit cells by double-clicking them. Keyboard navigation is enabled—try it!',
      },
    },
    {
      element: '#affected-offerings table.mb-0 > tbody:nth-child(2) > tr:last-child td:last-child',
      popover: {
        description: 'These are the actions for individual affects. You can delete, restore changes, '
        + 'or file individual trackers.',
      },
    },
    {
      element: '#affected-offerings table.mb-0 > tbody:nth-child(2) > tr:last-child td:first-child',
      popover: {
        description: 'By selecting rows, you can perform bulk actions like deleting affects, '
        + 'filing trackers, and more.',
      },
    },
  ],
};

export default affectsV2;
