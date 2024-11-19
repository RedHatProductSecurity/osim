import { mountWithConfig } from '@/__tests__/helpers';
import { server } from '@/__tests__/setup';
import { getNextAccessTokenHandler } from '@/__tests__/handlers';
import FlawCreateView from '@/views/FlawCreateView.vue';

describe('flawCreateView', () => {
  beforeAll(() => {
    server.use(getNextAccessTokenHandler);
    vi.useFakeTimers({
      now: new Date('2024-09-24T14:00:00Z'),
    });
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it('should render', () => {
    const wrapper = mountWithConfig(FlawCreateView);

    expect(wrapper.html()).toMatchSnapshot();
  });
});
