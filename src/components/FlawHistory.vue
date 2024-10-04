<script setup lang="ts">
import { ref } from 'vue';

import { DateTime } from 'luxon';

import { capitalizeFirstLetter } from '@/utils/helpers';
import { flawFieldNamesMapping } from '@/constants/flawFields';

import LabelCollapsible from './widgets/LabelCollapsible.vue';

defineProps<{
  flaw: any;
}>();

const historyExpanded = ref(false);
</script>

<template>
  <LabelCollapsible
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
        <template v-for="(historyEntry, histIndex) in flaw.history" :key="histIndex">
          <div v-if="historyEntry.pgh_diff" class="alert alert-info mb-1 p-2">
            <span>
              {{ DateTime.fromISO(historyEntry.pgh_created_at,{ setZone: true })
                .toFormat('yyyy-MM-dd hh:mm ZZZZ') }} - {{ historyEntry.pgh_context?.user || 'System' }}
            </span>
            <ul class="mb-2">
              <li v-for="(diffEntry, diffKey, diffIndex) in historyEntry.pgh_diff" :key="diffIndex">
                <div class="ms-3 pb-0">
                  <span>{{ capitalizeFirstLetter(historyEntry.pgh_label) }}</span>
                  <span class="fw-bold">{{ ' ' + (flawFieldNamesMapping[diffKey] || diffKey) }}</span>
                  <span>{{ ': ' + diffEntry[0] + ' ' }}</span>
                  <i class="bi bi-arrow-right" />
                  {{ diffEntry[1] }}
                </div>
              </li>
            </ul>
          </div>
        </template>
      </label>
    </div>
  </LabelCollapsible>
</template>
