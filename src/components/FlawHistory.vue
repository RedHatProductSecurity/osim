<script setup lang="ts">
import { ref } from 'vue';

import { capitalize, formatDateWithTimezone } from '@/utils/helpers';
import { flawFieldNamesMapping } from '@/constants/flawFields';
import type { ZodFlawType } from '@/types/zodFlaw';

import LabelCollapsible from './widgets/LabelCollapsible.vue';

defineProps<{
  flaw: ZodFlawType;
}>();

const historyExpanded = ref(false);

function isDateField(field: string) {
  return field.includes('_dt');
}
</script>

<template>
  <LabelCollapsible
    v-if="flaw.history && flaw.history.length > 0"
    class="my-2"
    :isExpanded="historyExpanded"
    @toggleExpanded="historyExpanded = !historyExpanded"
  >
    <template #label>
      <label class="mx-2 mb-0 form-label">
        History:
      </label>
    </template>
    <div class="mt-2">
      <label class="mx-2 form-label w-100">
        <template v-for="historyEntry in flaw.history" :key="historyEntry.pgh_slug">
          <div v-if="historyEntry.pgh_diff" class="alert alert-info mb-1 p-2">
            <span>
              {{ formatDateWithTimezone(historyEntry.pgh_created_at || '') }}
              - {{ historyEntry.pgh_context?.user || 'System' }}
            </span>
            <ul class="mb-2">
              <li v-for="(diffEntry, diffKey) in historyEntry.pgh_diff" :key="diffKey">
                <div class="ms-3 pb-0">
                  <span>{{ capitalize(historyEntry.pgh_label) }}</span>
                  <span class="fw-bold">{{ ' ' + (flawFieldNamesMapping[diffKey] || diffKey) }}</span>
                  <span>{{ ': ' +
                    (isDateField(diffKey) && diffEntry[0]
                      ? formatDateWithTimezone(diffEntry[0])
                      : (diffEntry[0]?.toString() || '')
                    ) + ' '
                  }}</span>
                  <i class="bi bi-arrow-right" />
                  {{ (isDateField(diffKey) && diffEntry[1]
                    ? formatDateWithTimezone(diffEntry[1])
                    : (diffEntry[1]?.toString() || '')
                  ) }}
                </div>
              </li>
            </ul>
          </div>
        </template>
      </label>
    </div>
  </LabelCollapsible>
</template>
