import { nextTick, type Ref } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, type VueWrapper } from '@vue/test-utils';

import AegisPendingSuggestion from '@/components/Aegis/AegisPendingSuggestion.vue';
import FlawFormImpact from '@/components/FlawForm/FlawFormImpact.vue';

import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';
import { aegisSuggestionRequestBody } from '@/composables/aegis/useAegisSuggestionContext';
import { blankFlaw, useFlaw } from '@/composables/useFlaw';

import { mountWithConfig } from '@/__tests__/helpers';
import { osimRuntime } from '@/stores/osimRuntime';
import type { AegisChangeEntry, AegisMetadata } from '@/types/aegisAI';
import type { OsimRuntimeType } from '@/types/zodOsim';

const tracking = useAegisMetadataTracking();
const runtime = osimRuntime as Ref<OsimRuntimeType>;
const pendingSelector = '[role="button"][aria-label="AI-Bot suggestion pending — click to review"]';
const tooltipSelector = '.aegis-tooltip';
const acceptSelector = 'button[title="Apply the suggested value"]';
const rejectSelector = 'button[title="Dismiss the suggested value"]';
const copySelector = 'button[aria-label="Copy text"]';
const closeSelector = 'button[aria-label="Close suggestion details"]';
const literalText = '<img src=x onerror="alert(1)"> & <script>alert(2)</script> "quoted" \'text\' &lt;b&gt;<br>';
const pending: AegisChangeEntry = {
  type: 'AI-Bot-Pending',
  timestamp: '2026-11-20T10:00:00Z',
  value: 'LOW',
  explanation: 'External references indicate limited exploitability',
  confidence: 0.87,
  data_quality: 0.72,
  tools_used: ['external_references_tool', 'cve_tool'],
};
const expectedTooltipText = [
  'Aegis-AI-Bot suggestion pending',
  '',
  'Suggested impact: LOW',
  '',
  'Explanation: External references indicate limited exploitability',
  '',
  'Data quality: 0.72',
  'Confidence: 0.87',
  'Tools used: external_references_tool, cve_tool',
].join('\n');
const writeText = vi.fn<(text: string) => Promise<void>>();
const wrappers: { unmount(): void }[] = [];
let host: HTMLDivElement;
let originalClipboard: PropertyDescriptor | undefined;
let previousFlags: OsimRuntimeType['flags'];

function mountSuggestion(props: { fieldName?: string; modelValue?: null | string } = {}) {
  const wrapper = mountWithConfig(AegisPendingSuggestion, {
    attachTo: host,
    props: { fieldName: 'impact', modelValue: 'CRITICAL', ...props },
  });
  wrappers.push(wrapper);
  return wrapper;
}

function mountImpactForm(modelValue: null | string = 'CRITICAL') {
  const wrapper = mountWithConfig(FlawFormImpact, {
    attachTo: host,
    props: {
      aegisContext: aegisSuggestionRequestBody(useFlaw().flaw),
      error: null,
      initialImpact: null,
      workflowState: 'NEW',
      modelValue,
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}

/** Loads a flaw the way useFetchFlaw does: tracking and flaw share the metadata arrays. */
function loadFlawWithPendingImpact() {
  const flawData = {
    ...blankFlaw(),
    impact: 'CRITICAL' as const,
    aegis_meta: { impact: [structuredClone(pending)] },
  };
  useFlaw().setFlaw(flawData);
  tracking.setAegisMetadata(flawData.aegis_meta);
}

async function openTooltip(wrapper: VueWrapper<any>) {
  await wrapper.get<HTMLElement>(pendingSelector).trigger('click');
  // onClickOutside latches on the opening click and resets via a setTimeout(0)
  // macrotask; let it drain like a real browser would before the next click.
  await new Promise(resolve => setTimeout(resolve, 0));
  return wrapper.get(tooltipSelector);
}

beforeEach(() => {
  useFlaw().resetFlaw();
  tracking.setAegisMetadata({});
  previousFlags = runtime.value.flags;
  runtime.value.flags = {};
  host = document.createElement('div');
  document.body.append(host);
  originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  writeText.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  host.remove();
  if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
  else Reflect.deleteProperty(navigator, 'clipboard');
  tracking.setAegisMetadata({});
  runtime.value.flags = previousFlags;
  useFlaw().resetFlaw();
});

describe('pending suggestion indicator', () => {
  it('shows the indicator for an unprocessed pending suggestion with all suggestion flags disabled', () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const wrapper = mountSuggestion();

    const indicator = wrapper.get(pendingSelector);
    expect(indicator.attributes('role')).toBe('button');
    expect(indicator.attributes('aria-haspopup')).toBe('dialog');
    expect(indicator.attributes('aria-expanded')).toBe('false');
    expect(wrapper.find(tooltipSelector).exists()).toBe(false);
  });

  it.each<[string, AegisMetadata | null]>([
    ['no recorded metadata', null],
    ['a pending suggestion for another field', { impact_other: [pending], title: [pending] }],
    ['a pending suggestion already matching the field value', { impact: [{ ...pending, value: 'CRITICAL' }] }],
    ['a pending suggestion superseded by a later change', {
      impact: [pending, { type: 'AI', timestamp: '2026-11-20T11:00:00Z', value: 'LOW' }],
    }],
    ['a trailing AI entry', { impact: [{ type: 'AI', timestamp: '2026-11-20T11:00:00Z', value: 'LOW' }] }],
    ['a trailing Partial AI entry', {
      impact: [{ type: 'Partial AI', timestamp: '2026-11-20T11:00:00Z', value: 'LOW' }],
    }],
    ['a trailing AI-Bot entry', { impact: [{ type: 'AI-Bot', timestamp: '2026-11-20T11:00:00Z', value: 'LOW' }] }],
    ['a trailing AI-Bot-Skipped entry', { impact: [{ type: 'AI-Bot-Skipped', timestamp: '2026-11-20T11:00:00Z' }] }],
  ])('hides the indicator for %s', (_label, metadata) => {
    tracking.setAegisMetadata(metadata ?? {});
    const wrapper = mountSuggestion();

    expect(wrapper.find(pendingSelector).exists()).toBe(false);
    expect(wrapper.find(tooltipSelector).exists()).toBe(false);
  });

  it('hides the indicator once the field value matches the suggestion', async () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const wrapper = mountSuggestion();
    expect(wrapper.find(pendingSelector).exists()).toBe(true);

    await wrapper.setProps({ modelValue: 'LOW' });
    expect(wrapper.find(pendingSelector).exists()).toBe(false);
    expect(wrapper.find(tooltipSelector).exists()).toBe(false);
  });

  it('closes the open tooltip when the field value becomes the suggested value', async () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const wrapper = mountSuggestion();
    await openTooltip(wrapper);
    expect(wrapper.find(tooltipSelector).exists()).toBe(true);

    await wrapper.setProps({ modelValue: 'LOW' });
    expect(wrapper.find(tooltipSelector).exists()).toBe(false);
    expect(wrapper.find(pendingSelector).exists()).toBe(false);
  });
});

describe('pending suggestion details', () => {
  it('shows the suggested value with its explanation and metadata', async () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const wrapper = mountSuggestion();
    const tooltip = await openTooltip(wrapper);

    expect(tooltip.isVisible()).toBe(true);
    expect(tooltip.attributes('aria-label')).toBe('Aegis-AI-Bot suggestion pending');
    expect(tooltip.text()).toContain('Aegis-AI-Bot suggestion pending');
    expect(tooltip.text()).toContain('Suggested impact: LOW');
    expect(tooltip.text()).toContain('Explanation: External references indicate limited exploitability');
    expect(tooltip.text()).toContain('Confidence: 0.87');
    expect(tooltip.text()).toContain('Data quality: 0.72');
    expect(tooltip.text()).toContain('Tools used: external_references_tool, cve_tool');
  });

  it('joins list suggestions into the displayed value', async () => {
    tracking.setAegisMetadata({
      components: [{ ...structuredClone(pending), value: ['openssl', 'libxml2'] }],
    });
    const wrapper = mountSuggestion({ fieldName: 'components', modelValue: null });
    const tooltip = await openTooltip(wrapper);

    expect(tooltip.text()).toContain('Suggested components: openssl, libxml2');
  });

  it('omits missing optional metadata without placeholder text', async () => {
    tracking.setAegisMetadata({
      impact: [{ type: 'AI-Bot-Pending', timestamp: pending.timestamp, value: 'LOW' }],
    });
    const wrapper = mountSuggestion();
    const tooltip = await openTooltip(wrapper);

    expect(tooltip.text()).toContain('Suggested impact: LOW');
    expect(tooltip.text()).not.toMatch(/Explanation:|Confidence:|Data quality:|Tools used:|undefined|null/);
  });

  it('renders hostile suggestion text literally without executing markup', async () => {
    tracking.setAegisMetadata({
      impact: [{ ...structuredClone(pending), value: literalText, explanation: literalText }],
    });
    const wrapper = mountSuggestion();
    await openTooltip(wrapper);

    const content = wrapper.get('.aegis-tooltip-content');
    expect(content.text()).toContain(literalText);
    expect(wrapper.find('.aegis-tooltip-content img, .aegis-tooltip-content script').exists()).toBe(false);
  });

  it('copies the plain suggestion text', async () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const wrapper = mountSuggestion();
    await openTooltip(wrapper);

    await wrapper.get(copySelector).trigger('click');
    await flushPromises();

    expect(writeText).toHaveBeenCalledExactlyOnceWith(expectedTooltipText);
    expect(wrapper.get(copySelector).text()).toBe('Copied text');
  });
});

describe('dismissing the pending suggestion details', () => {
  it('opens and closes with the keyboard without recording a decision', async () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const wrapper = mountSuggestion();
    const indicator = wrapper.get<HTMLElement>(pendingSelector);
    indicator.element.focus();

    await indicator.trigger('keydown', { key: 'Enter' });
    expect(wrapper.get(tooltipSelector).isVisible()).toBe(true);

    await wrapper.get(tooltipSelector).trigger('keydown', { key: 'Escape' });
    expect(wrapper.find(tooltipSelector).exists()).toBe(false);
    expect(wrapper.find(pendingSelector).exists()).toBe(true);
    expect(wrapper.emitted('update:field')).toBeUndefined();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(tracking.getAegisMetadata().impact).toEqual([pending]);
  });

  it('closes with the close button without recording a decision', async () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const wrapper = mountSuggestion();
    await openTooltip(wrapper);

    await wrapper.get(closeSelector).trigger('click');

    expect(wrapper.find(tooltipSelector).exists()).toBe(false);
    expect(wrapper.find(pendingSelector).exists()).toBe(true);
    expect(wrapper.emitted('update:field')).toBeUndefined();
    expect(tracking.getAegisMetadata().impact).toEqual([pending]);
  });

  it('dismisses the tooltip when clicking outside without recording a decision', async () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const wrapper = mountSuggestion();
    await openTooltip(wrapper);

    const outside = document.createElement('button');
    outside.textContent = 'Another field';
    host.append(outside);
    outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    outside.click();
    await nextTick();

    expect(wrapper.find(tooltipSelector).exists()).toBe(false);
    expect(wrapper.find(pendingSelector).exists()).toBe(true);
    expect(wrapper.emitted('update:field')).toBeUndefined();
    expect(tracking.getAegisMetadata().impact).toEqual([pending]);
  });
});

describe('accepting the pending suggestion', () => {
  it('applies the suggested value, records the decision, and clears the indicator', async () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const wrapper = mountSuggestion();
    await openTooltip(wrapper);

    await wrapper.get(acceptSelector).trigger('click');
    await nextTick();

    expect(wrapper.emitted('update:field')).toEqual([['LOW']]);
    expect(wrapper.emitted('update:modelValue')).toEqual([['LOW']]);
    expect(wrapper.find(tooltipSelector).exists()).toBe(false);
    expect(wrapper.find(pendingSelector).exists()).toBe(false);
    expect(tracking.getAegisMetadata().impact).toEqual([
      pending,
      expect.objectContaining({
        type: 'AI-Bot',
        value: 'LOW',
        explanation: pending.explanation,
        confidence: pending.confidence,
        data_quality: pending.data_quality,
        tools_used: pending.tools_used,
      }),
    ]);
  });
});

describe('rejecting the pending suggestion', () => {
  it('removes the pending entry without changing the field value', async () => {
    tracking.setAegisMetadata({ impact: [structuredClone(pending)] });
    const wrapper = mountSuggestion();
    await openTooltip(wrapper);

    await wrapper.get(rejectSelector).trigger('click');
    await nextTick();

    expect(wrapper.emitted('update:field')).toBeUndefined();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.find(tooltipSelector).exists()).toBe(false);
    expect(wrapper.find(pendingSelector).exists()).toBe(false);
    expect(tracking.getAegisMetadata().impact).toBeUndefined();
    expect(tracking.hasAegisChanges()).toBe(false);
  });

  it('keeps earlier field history when rejecting', async () => {
    const accepted: AegisChangeEntry = {
      type: 'AI-Bot',
      timestamp: '2026-11-19T09:00:00Z',
      value: 'MODERATE',
    };
    tracking.setAegisMetadata({ impact: [accepted, structuredClone(pending)] });
    const wrapper = mountSuggestion();
    await openTooltip(wrapper);

    await wrapper.get(rejectSelector).trigger('click');

    expect(tracking.getAegisMetadata().impact).toEqual([accepted]);
  });
});

describe('impact form pending suggestion', () => {
  it('shows the pending impact indicator with all suggestion flags disabled', () => {
    loadFlawWithPendingImpact();
    const wrapper = mountImpactForm();

    expect(wrapper.find(pendingSelector).exists()).toBe(true);
  });
  it('applies the accepted suggestion to the impact field and records it once in aegis_meta', async () => {
    loadFlawWithPendingImpact();
    const wrapper = mountImpactForm();
    await openTooltip(wrapper);

    await wrapper.get(acceptSelector).trigger('click');
    await nextTick();

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['LOW']);
    const expected = [pending, expect.objectContaining({ type: 'AI-Bot', value: 'LOW' })];
    expect(tracking.getAegisMetadata().impact).toEqual(expected);
    expect(useFlaw().flaw.value.aegis_meta?.impact).toEqual(expected);
    expect(useFlaw().isFlawUpdated.value).toBe(true);
    expect(wrapper.find(pendingSelector).exists()).toBe(false);
  });

  it('rejects the pending impact suggestion without changing the field value', async () => {
    loadFlawWithPendingImpact();
    const wrapper = mountImpactForm();
    await openTooltip(wrapper);

    await wrapper.get(rejectSelector).trigger('click');
    await nextTick();

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.find(pendingSelector).exists()).toBe(false);
    expect(tracking.getAegisMetadata().impact).toBeUndefined();
    expect(useFlaw().flaw.value.aegis_meta?.impact).toEqual([]);
    expect(useFlaw().isFlawUpdated.value).toBe(true);
  });

  it('hides the indicator once the impact value matches the suggestion', async () => {
    loadFlawWithPendingImpact();
    const wrapper = mountImpactForm('CRITICAL');
    expect(wrapper.find(pendingSelector).exists()).toBe(true);

    await wrapper.setProps({ modelValue: 'LOW' });
    expect(wrapper.find(pendingSelector).exists()).toBe(false);
  });
});
