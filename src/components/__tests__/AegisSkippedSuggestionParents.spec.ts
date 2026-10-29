import { nextTick, type Ref } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';

import CvssCalculator from '@/components/CvssCalculator/CvssCalculator.vue';
import CweSelector from '@/components/CweSelector/CweSelector.vue';
import FlawFormImpact from '@/components/FlawForm/FlawFormImpact.vue';
import FlawMitigation from '@/components/FlawForm/FlawMitigation.vue';

import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';
import { aegisSuggestionRequestBody } from '@/composables/aegis/useAegisSuggestionContext';
import { useFlaw } from '@/composables/useFlaw';

import { mountWithConfig } from '@/__tests__/helpers';
import { AegisAIService } from '@/services/AegisAIService';
import { osimRuntime } from '@/stores/osimRuntime';
import type { AegisChangeEntry } from '@/types/aegisAI';
import type { OsimRuntimeType } from '@/types/zodOsim';

const tracking = useAegisMetadataTracking();
const runtime = osimRuntime as Ref<OsimRuntimeType>;
const warningSelector = '[role="button"][aria-label="AI-Bot suggestion unavailable"]';
const sendFeedback = vi.spyOn(AegisAIService.prototype, 'sendFeedback');
const parents = [
  { field: 'impact', component: FlawFormImpact },
  { field: 'mitigation', component: FlawMitigation },
  { field: '_cvss3_vector', component: CvssCalculator },
  { field: 'cwe_id', component: CweSelector },
];
const skip: AegisChangeEntry = {
  type: 'AI-Bot-Skipped',
  timestamp: '2026-10-20T10:00:00Z',
  skip_description: 'The external reference did not provide enough evidence',
};
let previousFlags: OsimRuntimeType['flags'];
let wrapper: ReturnType<typeof mountWithConfig> | undefined;

beforeEach(() => {
  sendFeedback.mockResolvedValue(undefined);
  previousFlags = runtime.value.flags;
  runtime.value.flags = {
    aiImpactSuggestions: false,
    aiMitigationSuggestions: false,
    aiCvssSuggestions: false,
    aiCweSuggestions: false,
  };
  useFlaw().resetFlaw();
  tracking.setAegisMetadata({});
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  tracking.setAegisMetadata({});
  runtime.value.flags = previousFlags;
  useFlaw().resetFlaw();
  sendFeedback.mockReset();
});

describe.each(parents)('$field rendered parent', ({ component, field }) => {
  function setup() {
    wrapper = mountWithConfig(component, {
      props: {
        aegisContext: aegisSuggestionRequestBody(useFlaw().flaw),
        modelValue: '',
        error: null,
        initialImpact: null,
        workflowState: 'NEW',
      },
    });
    return wrapper;
  }

  it.each(['AI', 'Partial AI', 'AI-Bot'] as const)(
    'shows a warning with flags disabled and removes it after a later %s entry',
    async (type) => {
      // Other-field metadata must not bypass this parent's guard.
      tracking.setAegisMetadata({ unrelated: [skip] });
      const subject = setup();
      expect(subject.find('.bi-stars').exists()).toBe(false);

      tracking.setAegisMetadata({ [field]: [skip] });
      await nextTick();
      expect(subject.get(warningSelector).isVisible()).toBe(true);
      expect(subject.get('.bi-stars').classes()).toContain('disabled');
      await subject.get(warningSelector).trigger('keydown', { key: 'Enter' });
      expect(subject.get('.aegis-tooltip').text()).toContain(skip.skip_description);

      tracking.setAegisMetadata({ [field]: [skip, {
        type,
        timestamp: '2026-10-20T11:00:00Z',
        value: 'A different value than the current field',
      }] });
      await nextTick();
      expect(subject.find(warningSelector).exists()).toBe(false);
      expect(subject.find('.aegis-tooltip').exists()).toBe(false);
      expect(subject.find('.bi-stars').exists()).toBe(false);
    },
  );
});

describe('accepted impact provenance after a skipped proposal', () => {
  it.each(['LOW', 'IMPORTANT'])('retains highlighting and feedback when the bot rejects %s', async (value) => {
    useFlaw().flaw.value.cve_id = 'CVE-2026-1234';
    const accepted: AegisChangeEntry = {
      type: 'AI-Bot',
      timestamp: '2026-10-20T09:00:00Z',
      value: 'LOW',
    };
    tracking.setAegisMetadata({ impact: [accepted] });
    wrapper = mountWithConfig(FlawFormImpact, {
      props: {
        aegisContext: aegisSuggestionRequestBody(useFlaw().flaw),
        modelValue: 'LOW',
        error: null,
        initialImpact: 'LOW',
        workflowState: 'NEW',
      },
    });
    expect(wrapper.get('.bi-robot').isVisible()).toBe(true);
    expect(wrapper.get('[title="Mark helpful"]').isVisible()).toBe(true);

    tracking.setAegisMetadata({ impact: [accepted, { ...skip, value }] });
    await nextTick();
    await wrapper.get(warningSelector).trigger('click');

    expect(wrapper.get('.aegis-tooltip').text()).toContain(`Discarded suggestion: ${value}`);
    expect(wrapper.get('.aegis-tooltip').text()).toContain(`Reason: ${skip.skip_description}`);
    expect(wrapper.get('.bi-robot').isVisible()).toBe(true);
    expect(wrapper.get('.form-label').classes()).toContain('bg-primary');
    expect(wrapper.get('select').element.value).toBe('LOW');
    expect(wrapper.get('[title="Mark unhelpful"]').isVisible()).toBe(true);
    await wrapper.get('[title="Mark helpful"]').trigger('click');
    await flushPromises();

    expect(sendFeedback).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      feature: 'suggest-impact',
      cve_id: 'CVE-2026-1234',
      actual: 'LOW',
      accept: true,
    }));
    expect(wrapper.get('select').element.value).toBe('LOW');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    expect(wrapper.get(warningSelector).isVisible()).toBe(true);
  });
});
