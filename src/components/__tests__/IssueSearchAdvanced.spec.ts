import { mount, VueWrapper } from '@vue/test-utils';
import { describe, it, expect, vi, type Mock } from 'vitest';
import { useRoute } from 'vue-router';
import IssueSearchAdvanced from '@/components/IssueSearchAdvanced.vue';
import { useToastStore } from '@/stores/ToastStore';

import { createTestingPinia } from '@pinia/testing';


vi.mock('vue-router', async () => {
  const actual = await vi.importActual("vue-router");
  return {
    ...actual as {},
    useRoute: vi.fn(),
  };
});

(useRoute as Mock).mockReturnValue({
  'query': { mode: 'advanced' },
});

describe('IssueSearchAdvanced', () => {
  let wrapper: VueWrapper<any>;

  beforeAll(() => {
    createTestingPinia({
      initialState: {
        toasts: [],
      },
    });
  })

  beforeEach(() => {
    const props: typeof IssueSearchAdvanced.props = {};
    wrapper = mount(IssueSearchAdvanced, {
      props,
      plugins:[useToastStore()],
      global: {
        mocks: { useRoute },
      }
    });
  })

  it('should render', () => {
    expect(wrapper.exists()).toBe(true);
  })
});
