import { reactive, type Directive } from 'vue';

import { flushPromises, mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import type { Table } from '@tanstack/vue-table';

import { useFlaw } from '@/composables/useFlaw';

import SampleFlawFull from '@/__tests__/__fixtures__/sampleFlawFull.json';
import { useToastStore } from '@/stores/ToastStore';
import type { ZodAffectType } from '@/types';

import LinkExistingTracker from '../LinkExistingTracker.vue';

const mocks = vi.hoisted(() => ({
  modifiedAffects: new Set<string>(),
  newAffects: new Set<string>(),
  removedAffects: new Set<string>(),
  linkExistingTracker: vi.fn(),
}));

vi.mock('@/composables/useAffectsModel', () => ({
  useAffectsModel: () => ({
    state: {
      modifiedAffects: mocks.modifiedAffects,
      newAffects: mocks.newAffects,
      removedAffects: mocks.removedAffects,
    },
    actions: { linkExistingTracker: mocks.linkExistingTracker },
  }),
}));

createTestingPinia();

const affect = SampleFlawFull.affects.find(item => !item.tracker) as ZodAffectType;
const createTable = () => ({
  options: { meta: { filingTracker: reactive(new Set<string>()) } },
} as unknown as Table<ZodAffectType>);

function mountDialog(table = createTable()) {
  return mount(LinkExistingTracker, {
    props: { affect, flawUuid: SampleFlawFull.uuid, rowId: affect.uuid!, table },
    attachTo: document.body,
    global: { directives: { osimLoading: vi.fn() as Directive }, stubs: { teleport: true } },
  });
}

describe('linkExistingTracker', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((value) => {
      if (value instanceof Set) value.clear();
    });
    mocks.linkExistingTracker.mockReset().mockResolvedValue({ refreshFailed: false });
    useFlaw().flaw.value = structuredClone(SampleFlawFull as any);
    vi.clearAllMocks();
  });

  it('focuses the dialog, contains keyboard focus and restores scrolling on unmount', async () => {
    const wrapper = mountDialog();
    await flushPromises();
    expect(document.activeElement).toBe(wrapper.find('input').element);
    expect(document.body.style.overflow).toBe('hidden');
    const close = wrapper.find<HTMLButtonElement>('.btn-close');
    const cancel = wrapper.find<HTMLButtonElement>('.btn-secondary');
    cancel.element.focus();
    await cancel.trigger('keydown', { key: 'Tab' });
    expect(document.activeElement).toBe(close.element);
    await close.trigger('keydown', { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(cancel.element);
    await close.trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
    expect(document.body.classList.contains('modal-open')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('rejects invalid IDs without calling the model action', async () => {
    const wrapper = mountDialog();
    await wrapper.find('input').setValue('not-a-tracker');
    await wrapper.find('button.btn-primary').trigger('click');

    expect(wrapper.find('[role="alert"]').text()).toContain('Enter a Jira key');
    expect(mocks.linkExistingTracker).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('locks the row and prevents duplicate submissions while loading', async () => {
    let finish!: (value: { refreshFailed: boolean }) => void;
    mocks.linkExistingTracker.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const table = createTable();
    const wrapper = mountDialog(table);
    await wrapper.find('input').setValue(' rhsa-1234 ');
    const submit = wrapper.find('button.btn-primary');

    await submit.trigger('click');
    await submit.trigger('click');
    expect(table.options.meta?.filingTracker.has(affect.uuid!)).toBe(true);
    expect(mocks.linkExistingTracker).toHaveBeenCalledTimes(1);
    expect(mocks.linkExistingTracker).toHaveBeenCalledWith(affect, 'RHSA-1234');
    expect(submit.attributes('disabled')).toBeDefined();

    finish({ refreshFailed: false });
    await flushPromises();
    expect(table.options.meta?.filingTracker.has(affect.uuid!)).toBe(false);
    wrapper.unmount();
  });

  it('reports success when the row unmounts before the request finishes', async () => {
    let finish!: (value: { refreshFailed: boolean }) => void;
    mocks.linkExistingTracker.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const table = createTable();
    const wrapper = mountDialog(table);
    await wrapper.find('input').setValue('RHSA-1234');
    await wrapper.find('button.btn-primary').trigger('click');
    wrapper.unmount();

    finish({ refreshFailed: false });
    await flushPromises();
    expect(table.options.meta?.filingTracker.has(affect.uuid!)).toBe(false);
    expect(useToastStore().addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Tracker linked',
      body: expect.stringContaining('RHSA-1234'),
    }));
  });

  it('closes on flaw navigation and suppresses the old flaw toast', async () => {
    let finish!: (value: { refreshFailed: boolean }) => void;
    mocks.linkExistingTracker.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const table = createTable();
    const wrapper = mountDialog(table);
    await wrapper.find('input').setValue('RHSA-1234');
    await wrapper.find('button.btn-primary').trigger('click');

    useFlaw().flaw.value.uuid = 'another-flaw';
    await flushPromises();
    expect(wrapper.emitted('close')).toHaveLength(1);
    finish({ refreshFailed: false });
    await flushPromises();

    expect(useToastStore().addToast).not.toHaveBeenCalled();
    expect(table.options.meta?.filingTracker.has(affect.uuid!)).toBe(false);
    wrapper.unmount();
  });

  it('reports successful links with a success toast', async () => {
    const wrapper = mountDialog();
    await wrapper.find('input').setValue('RHSA-1234');
    await wrapper.find('button.btn-primary').trigger('click');
    await flushPromises();

    expect(useToastStore().addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Tracker linked',
      body: expect.stringContaining('RHSA-1234'),
      css: 'success',
    }));
    expect(wrapper.emitted('close')).toHaveLength(1);
    wrapper.unmount();
  });

  it('surfaces actionable permission errors without exposing backend details', async () => {
    mocks.linkExistingTracker.mockRejectedValue({
      response: { status: 403, data: { detail: 'secret embargoed content' } },
    });
    const wrapper = mountDialog();
    await wrapper.find('input').setValue('RHSA-1234');
    await wrapper.find('button.btn-primary').trigger('click');
    await flushPromises();

    const toast = vi.mocked(useToastStore().addToast).mock.calls.at(-1)?.[0];
    expect(toast?.body).toContain('not found or inaccessible');
    expect(toast?.body).not.toContain('secret embargoed content');
    wrapper.unmount();
  });

  it('preserves backend validation details such as embargo incompatibility', async () => {
    mocks.linkExistingTracker.mockRejectedValue({
      response: { status: 400,
        statusText: 'Bad Request',
        data: {
          non_field_errors: ['Tracker is public but is associated with an embargoed flaw.'],
        } },
    });
    const wrapper = mountDialog();
    await wrapper.find('input').setValue('RHSA-1234');
    await wrapper.find('button.btn-primary').trigger('click');
    await flushPromises();

    expect(useToastStore().addToast).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.stringContaining('embargoed flaw'),
    }));
    wrapper.unmount();
  });

  it('warns when linking succeeds but refresh fails', async () => {
    mocks.linkExistingTracker.mockResolvedValue({ refreshFailed: true });
    const wrapper = mountDialog();
    await wrapper.find('input').setValue('RHSA-1234');
    await wrapper.find('button.btn-primary').trigger('click');
    await flushPromises();

    expect(useToastStore().addToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Tracker linked; refresh failed',
      body: expect.stringContaining('Reload to verify'),
      css: 'warning',
    }));
    wrapper.unmount();
  });
});
