<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { usePagination } from '@/composables/usePagination';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

import EditableDate from '@/widgets/EditableDate/EditableDate.vue';
import { capitalize, formatDateWithTimezone } from '@/utils/helpers';
import { flawFieldNamesMapping } from '@/constants/flawFields';
import type { ZodFlawHistoryItemType } from '@/types/zodFlaw';
import LabelCollapsible from '@/widgets/LabelCollapsible/LabelCollapsible.vue';

const props = withDefaults(defineProps<{
  disabled?: boolean;
  error?: boolean;
  history: null | undefined | ZodFlawHistoryItemType[];
}>(), {
  disabled: false,
  error: false,
});

const { getFieldAegisType, isFieldAegisChange } = useAegisMetadataTracking();

const isLoading = computed(() => !props.disabled && (props.history === undefined || props.history === null));

const startDate = ref<null | string | undefined>(null);
const endDate = ref<null | string | undefined>(null);
const selectedHistoryModels = ref<string[]>([]);

const historyModelLabels: Record<string, string> = {
  'osidb.Flaw': 'Flaw',
  'osidb.FlawCVSS': 'Flaw CVSS',
  'osidb.Affect': 'Affect',
  'osidb.AffectCVSS': 'Affect CVSS',
  'osidb.Tracker': 'Tracker',
};

const historyModelOrder = Object.keys(historyModelLabels);

const emptyFilters = computed(() => {
  return !startDate.value && !endDate.value && allHistoryModelsSelected.value;
});

const availableHistoryModels = computed(() => {
  const models = new Set(props.history?.map(historyModelKey) ?? []);

  return [...models].sort((first, second) => {
    const firstIndex = historyModelOrder.indexOf(first);
    const secondIndex = historyModelOrder.indexOf(second);
    if (firstIndex !== -1 || secondIndex !== -1) {
      return (firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex)
        - (secondIndex === -1 ? Number.MAX_SAFE_INTEGER : secondIndex);
    }
    return historyModelLabel(first).localeCompare(historyModelLabel(second));
  });
});

watch(availableHistoryModels, (models, previousModels = []) => {
  const previousModelSet = new Set(previousModels);
  const selectedModelSet = new Set(selectedHistoryModels.value);
  const stillSelectedModels = models.filter(model => selectedModelSet.has(model));
  const newModels = models.filter(model => !previousModelSet.has(model));

  selectedHistoryModels.value = [...new Set([...stillSelectedModels, ...newModels])];
}, { immediate: true });

const selectedHistoryModelSet = computed(() => new Set(selectedHistoryModels.value));

const allHistoryModelsSelected = computed(() => {
  return availableHistoryModels.value.length === selectedHistoryModels.value.length;
});

const historyTypeFilterLabel = computed(() => {
  const selectedCount = selectedHistoryModels.value.length;
  const availableCount = availableHistoryModels.value.length;

  if (selectedCount === availableCount) return 'All history types';
  if (selectedCount === 0) return 'No history types';
  return `${selectedCount}/${availableCount} history types`;
});

const validDateRange = computed(() => {
  const start = startDate.value ? new Date(startDate.value) : null;
  const end = endDate.value ? new Date(endDate.value) : null;

  return (
    start instanceof Date && !Number.isNaN(start.getTime())
    && end instanceof Date && !Number.isNaN(end.getTime())
    && end >= start
  );
});

const filteredHistoryItems = computed(() => {
  const modelFilteredHistory = props.history?.filter(item => selectedHistoryModelSet.value.has(historyModelKey(item)));

  if (!validDateRange.value) {
    return modelFilteredHistory?.filter(hasVisibleHistoryDiff);
  }

  const start = new Date(startDate.value!);
  const end = new Date(endDate.value!);
  end.setDate(end.getDate() + 1);

  return modelFilteredHistory?.filter((item) => {
    if (!item.pgh_created_at) return false;

    const itemDate = new Date(item.pgh_created_at);

    return itemDate.getTime() >= start.getTime() && itemDate.getTime() <= end.getTime();
  }).filter(hasVisibleHistoryDiff);
});

const historyExpanded = ref(true);

const itemsPerPage = 20;
const totalPages = computed(() =>
  Math.ceil((filteredHistoryItems.value?.length || 0) / itemsPerPage),
);

const {
  changePage,
  currentPage,
  pages,
} = usePagination(totalPages, itemsPerPage);

const paginatedHistoryItems = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredHistoryItems.value?.slice(start, end);
});

function historyModelKey(historyEntry: ZodFlawHistoryItemType) {
  return historyEntry.pgh_obj_model || 'osidb.Flaw';
}

function historyModelLabel(model: string) {
  const entityName = model.split('.').pop() || model;
  return historyModelLabels[model] || entityName.replaceAll('CVSS', ' CVSS').trim();
}

function hasVisibleHistoryDiff(historyEntry: ZodFlawHistoryItemType) {
  if (!historyEntry.pgh_diff) return false;
  return Object.keys(historyEntry.pgh_diff).some(
    key => key !== 'last_validated_dt' && key !== 'aegis_meta',
  );
}

function isDateField(field: string) {
  return field.includes('_dt');
}

function isRelatedHistoryEntry(historyEntry: ZodFlawHistoryItemType) {
  return Boolean(historyEntry.pgh_obj_model && historyEntry.pgh_obj_model !== 'osidb.Flaw');
}

function historyEntityName(historyEntry: ZodFlawHistoryItemType) {
  return historyModelLabel(historyModelKey(historyEntry));
}

function historyEntityDetails(historyEntry: ZodFlawHistoryItemType) {
  const data = historyEntry.pgh_data || {};

  if (historyEntry.pgh_obj_model === 'osidb.Affect') {
    const streamOrModule = data.ps_update_stream || data.ps_module;
    const component = data.ps_component;
    return [streamOrModule, component].filter(Boolean).join(' / ') || historyEntry.pgh_obj_id || '';
  }

  if (historyEntry.pgh_obj_model === 'osidb.Tracker') {
    return data.external_system_id || data.ps_update_stream || historyEntry.pgh_obj_id || '';
  }

  if (
    historyEntry.pgh_obj_model === 'osidb.FlawCVSS'
    || historyEntry.pgh_obj_model === 'osidb.AffectCVSS'
  ) {
    return [data.issuer, data.version].filter(Boolean).join(' ') || historyEntry.pgh_obj_id || '';
  }

  return historyEntry.pgh_obj_id || '';
}

function historyEntityLabel(historyEntry: ZodFlawHistoryItemType) {
  const details = historyEntityDetails(historyEntry);
  return details ? `${historyEntityName(historyEntry)}: ${details}` : historyEntityName(historyEntry);
}

function fieldLabel(field: string) {
  return flawFieldNamesMapping[field] || capitalize(field.replaceAll('_', ' '));
}

function formatHistoryValue(value: any, field: string): string {
  if (isDateField(field) && value) return formatDateWithTimezone(value);
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(item => formatHistoryValue(item, field)).filter(Boolean).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return value.toString();
}

function isHistoryModelSelected(model: string) {
  return selectedHistoryModelSet.value.has(model);
}

function selectAllHistoryModels() {
  selectedHistoryModels.value = [...availableHistoryModels.value];
}

function toggleHistoryModel(model: string) {
  const selectedModelSet = new Set(selectedHistoryModels.value);
  if (selectedModelSet.has(model)) {
    selectedModelSet.delete(model);
  } else {
    selectedModelSet.add(model);
  }
  selectedHistoryModels.value = availableHistoryModels.value.filter(item => selectedModelSet.has(item));
}

function clearFilters() {
  startDate.value = null;
  endDate.value = null;
  selectAllHistoryModels();
}
</script>

<template>
  <LabelCollapsible
    class="my-2"
    :class="{'pb-4': !history?.length}"
    :isExpanded="historyExpanded"
    @toggleExpanded="historyExpanded = !historyExpanded"
  >
    <template #label>
      <label class="mx-2 mb-0 form-label">
        <h4 :class="{'mb-0': !historyExpanded}">History</h4>
      </label>
    </template>
    <template v-if="isLoading">
      <div class="d-flex align-items-center gap-2">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="visually-hidden">Loading history...</span>
        </div>
        <span class="text-muted">Loading history...</span>
      </div>
    </template>
    <template v-else-if="disabled">
      <div class="alert alert-secondary mb-0 d-flex align-items-center gap-2">
        <i class="bi bi-info-circle-fill"></i>
        <span>History feature is currently disabled.</span>
      </div>
    </template>
    <template v-else-if="error">
      <div class="alert alert-warning mb-0 d-flex align-items-center gap-2">
        <i class="bi bi-exclamation-triangle-fill"></i>
        <span>Failed to load history. Please try refreshing the page.</span>
      </div>
    </template>
    <template v-else-if="!history?.length">
      <span>There are no tracked changes for this flaw.</span>
    </template>
    <template v-else>
      <div class="d-flex mb-2 gap-2">
        <button
          tabindex="-1"
          type="button"
          :disabled="emptyFilters"
          class="input-group-text"
          @click="clearFilters()"
          @mousedown="event => event.preventDefault()"
        >
          <i class="bi bi-eraser"></i>
        </button>
        <EditableDate
          v-model="startDate as string"
          style="width: 225px;"
          placeholder="[Start date]"
        />
        <EditableDate
          v-model="endDate as string"
          style="width: 225px;"
          placeholder="[End date]"
        />
        <div v-if="availableHistoryModels.length > 1" class="dropdown">
          <button
            class="btn btn-outline-secondary dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            {{ historyTypeFilterLabel }}
          </button>
          <div class="dropdown-menu history-type-filter-menu p-2" @click.stop>
            <button
              type="button"
              class="dropdown-item px-2 py-1"
              :disabled="allHistoryModelsSelected"
              @click="selectAllHistoryModels"
            >
              Select all
            </button>
            <div class="dropdown-divider"></div>
            <label
              v-for="model in availableHistoryModels"
              :key="model"
              class="dropdown-item d-flex align-items-center gap-2 mb-0"
            >
              <input
                class="form-check-input history-type-filter-checkbox m-0"
                type="checkbox"
                :value="model"
                :checked="isHistoryModelSelected(model)"
                @change="toggleHistoryModel(model)"
              >
              <span>{{ historyModelLabel(model) }}</span>
            </label>
          </div>
        </div>
      </div>
      <template v-if="!filteredHistoryItems?.length">
        <span>There are no results for current filter.</span>
      </template>
      <div v-else class="mt-2">
        <div class="mt-2">
          <template v-for="historyEntry in paginatedHistoryItems" :key="historyEntry.pgh_slug">
            <div v-if="historyEntry.pgh_diff" class="alert alert-info mb-1 p-2">
              <span>
                <span v-if="isRelatedHistoryEntry(historyEntry)" class="badge bg-secondary me-2">
                  {{ historyEntityLabel(historyEntry) }}
                </span>
                {{ formatDateWithTimezone(historyEntry.pgh_created_at || '', true) }}
                - {{ historyEntry.pgh_context?.user || 'System' }}
              </span>
              <ul class="mb-2">
                <li
                  v-for="(diffEntry, diffKey) in historyEntry.pgh_diff"
                  v-show="diffKey !== 'aegis_meta' && diffKey !== 'last_validated_dt'"
                  :key="diffKey"
                >
                  <div class="ms-3 pb-0">
                    <span
                      v-if="isFieldAegisChange(historyEntry, diffKey)"
                      class="badge bg-secondary me-2"
                      style="cursor: default;"
                      :title="getFieldAegisType(historyEntry, diffKey) === 'AI'
                        ? 'Suggested by Aegis-AI'
                        : getFieldAegisType(historyEntry, diffKey) === 'AI-Bot'
                          ? 'Generated by Aegis-AI-Bot'
                          : 'This change was a modified Aegis-AI suggestion'"
                      data-bs-toggle="tooltip"
                    >
                      <i class="bi bi-robot"></i> {{ getFieldAegisType(historyEntry, diffKey) }}
                    </span>
                    <span>{{ capitalize(historyEntry.pgh_label) }}</span>
                    <span class="fw-bold">{{ ' ' + fieldLabel(diffKey) }}</span>
                    <span>{{ ': ' + formatHistoryValue(diffEntry[0], diffKey) + ' ' }}</span>
                    <i class="bi bi-arrow-right" />
                    {{ formatHistoryValue(diffEntry[1], diffKey) }}
                  </div>
                </li>
              </ul>
            </div>
          </template>
        </div>
      </div>
    </template>
  </LabelCollapsible>
  <div v-if="history?.length" class="pagination-controls gap-1 my-2">
    <button
      type="button"
      tabindex="-1"
      class="btn btn-sm btn-secondary rounded-end-0"
      :disabled="currentPage === 1"
      @click="changePage(currentPage - 1)"
    >
      <i class="bi bi-arrow-left fs-5" />
    </button>
    <button
      v-for="page in pages"
      :key="page"
      tabindex="-1"
      class="osim-page-btn btn btn-sm rounded-0 btn-secondary"
      style="width: 34.8px;"
      :disabled="page === currentPage || page === '..'"
      @click.prevent="changePage(page as number)"
    >
      {{ page }}
    </button>
    <button
      type="button"
      tabindex="-1"
      class="btn btn-sm btn-secondary rounded-start-0"
      :disabled="currentPage === totalPages || totalPages === 0"
      @click.prevent="changePage(currentPage + 1)"
    >
      <i class="bi bi-arrow-right fs-5" />
    </button>
  </div>
</template>

<style scoped lang="scss">
    .pagination-controls {
  display: flex;

  button {
    height: 2rem;
    padding-block: 0;

    &.osim-page-btn:disabled {
      background-color: transparent;
      color: black;
    }
  }
}
</style>
