import { describe, it, expect, vi, type Mock } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { useRoute } from 'vue-router';
import IssueSearchAdvanced from '../IssueSearchAdvanced.vue';

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

  beforeEach(() => {
    const props: typeof IssueSearchAdvanced.props = {};
    wrapper = mount(IssueSearchAdvanced, {
      props
    });
  })

  it('should render', () => {
    expect(wrapper.exists()).toBe(true);
  })
});
