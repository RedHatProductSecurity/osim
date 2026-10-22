import { computed, nextTick, ref, type Ref } from 'vue';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import AegisComponentActions from '@/components/Aegis/AegisComponentActions.vue';
import AegisCvssActions from '@/components/Aegis/AegisCvssActions.vue';
import AegisCweActions from '@/components/Aegis/AegisCweActions.vue';
import AegisDescriptionActions from '@/components/Aegis/AegisDescriptionActions.vue';
import AegisImpactActions from '@/components/Aegis/AegisImpactActions.vue';
import AegisMitigationActions from '@/components/Aegis/AegisMitigationActions.vue';
import AegisStatementActions from '@/components/Aegis/AegisStatementActions.vue';
import AegisTitleActions from '@/components/Aegis/AegisTitleActions.vue';

import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';
import { useFlaw } from '@/composables/useFlaw';

import { mountWithConfig } from '@/__tests__/helpers';
import { osimRuntime } from '@/stores/osimRuntime';
import type { AegisChangeEntry } from '@/types/aegisAI';
import type { OsimRuntimeType } from '@/types/zodOsim';

// Keep real metadata and feedback composables: only suggestion generation is isolated.
vi.mock('@/composables/aegis/useAegisSuggestion', () => ({
  useAegisSuggestion: () => ({
    allSuggestions: ref([]),
    canShowFeedback: applied,
    canSuggest: ref(true),
    currentSuggestion: ref(null),
    details: ref({ explanation: 'New manual suggestion' }),
    hasAppliedSuggestion: applied,
    hasMultipleSuggestions: ref(false),
    hasPartialModification: ref(false),
    isFetchingSuggestion: ref(false),
    originalSuggestion: ref(null),
    revert: vi.fn(),
    selectedSuggestionIndex: ref(0),
    selectSuggestion: vi.fn(),
    sendFeedback: vi.fn(),
    suggestComponents: vi.fn(),
    suggestCvss: vi.fn(),
    suggestCwe: vi.fn(),
    suggestImpact: vi.fn(),
    suggestMitigation: vi.fn(),
    suggestStatement: vi.fn(),
  }),
}));

const applied = ref(false);
const runtime = osimRuntime as Ref<OsimRuntimeType>;
const tracking = useAegisMetadataTracking();
const wrappers: ReturnType<typeof mountWithConfig>[] = [];
const skip: AegisChangeEntry = {
  type: 'AI-Bot-Skipped',
  timestamp: '2026-10-20T10:00:00Z',
  confidence: 0.6,
  data_quality: 0.6,
  tools_used: ['external_references_tool'],
  skip_reason: 'confidence',
  skip_description: 'Recorded skip reason',
};

function textComposable() {
  return {
    canShowTitleFeedback: applied,
    canShowDescriptionFeedback: applied,
    canSuggest: ref(true),
    details: computed(() => ({ explanation: 'New manual suggestion' })),
    hasAppliedTitleSuggestion: applied,
    hasAppliedDescriptionSuggestion: applied,
    isSuggesting: ref(false),
    revertTitle: vi.fn(),
    revertDescription: vi.fn(),
    sendTitleFeedback: vi.fn(),
    sendDescriptionFeedback: vi.fn(),
    suggestTitle: vi.fn(),
    suggestDescription: vi.fn(),
  };
}

const fields = [
  { field: 'title', component: AegisTitleActions },
  { field: 'cve_description', component: AegisDescriptionActions },
  { field: 'impact', component: AegisImpactActions },
  { field: '_cvss3_vector', component: AegisCvssActions },
  { field: 'cwe_id', component: AegisCweActions },
  { field: 'components', component: AegisComponentActions },
  { field: 'statement', component: AegisStatementActions },
  { field: 'mitigation', component: AegisMitigationActions },
];

beforeEach(() => {
  useFlaw().resetFlaw();
  tracking.setAegisMetadata({});
  applied.value = false;
  runtime.value.flags = {};
});

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  tracking.setAegisMetadata({});
});

describe.each(fields)('$field skip warning', ({ component, field }) => {
  function setup() {
    const wrapper = mountWithConfig(component, {
      props: {
        composable: textComposable(),
        modelValue: field === 'components' ? [] : '',
        titleValue: '',
        descriptionValue: '',
      },
    });
    wrappers.push(wrapper);
    return wrapper;
  }

  it('reactively shows only its own field warning with all suggestion flags disabled', async () => {
    // A similarly named but incorrect metadata key must not light up this field.
    tracking.setAegisMetadata({ [`${field}_other`]: [skip] });
    const wrapper = setup();
    expect(wrapper.find('.bi-exclamation-triangle').exists()).toBe(false);

    tracking.setAegisMetadata({ [field]: [{ ...skip, skip_description: `${field}: recorded reason` }] });
    await nextTick();
    const warning = wrapper.get('.bi-exclamation-triangle');
    expect(wrapper.get('.bi-stars').classes()).toContain('disabled');
    await warning.trigger('click');
    const tooltip = wrapper.get('.aegis-tooltip');
    expect(tooltip.text()).toContain(`${field}: recorded reason`);
    expect(tooltip.text()).toContain('Confidence: 0.60');
    expect(tooltip.text()).toContain('Data quality: 0.60');
    expect(tooltip.text()).toContain('Tools used: external_references_tool');
    expect(wrapper.find('.bi-info-circle').exists()).toBe(false);
    expect(wrapper.find('.bi-hand-thumbs-up').exists()).toBe(false);
    expect(wrapper.find('.bi-arrow-counterclockwise').exists()).toBe(false);

    tracking.trackAIChange(field, 'AI', 'Manually generated value');
    await nextTick();
    expect(wrapper.find('.bi-exclamation-triangle').exists()).toBe(false);
    expect(wrapper.find('.aegis-tooltip').exists()).toBe(false);
  });

  it('shows the usual information icon after applying a manual suggestion despite a historical skip', async () => {
    tracking.setAegisMetadata({ [field]: [skip] });
    const wrapper = setup();
    expect(wrapper.find('.bi-exclamation-triangle').exists()).toBe(true);
    applied.value = true;
    await nextTick();
    expect(wrapper.find('.bi-exclamation-triangle').exists()).toBe(false);
    await wrapper.get('.bi-info-circle').trigger('click');
    expect(wrapper.get('.aegis-tooltip').text()).toContain('New manual suggestion');
    expect(wrapper.get('.aegis-tooltip').text()).not.toContain('Recorded skip reason');
    expect(wrapper.find('.bi-arrow-counterclockwise').exists()).toBe(true);
  });
});
