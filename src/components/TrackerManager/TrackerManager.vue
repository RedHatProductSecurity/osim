<script setup lang="ts">
import { toRefs, computed, ref } from 'vue';

import LowSeverityTrackersWarning from '@/components/LowSeverityTrackersWarning.vue';

import type { UpdateStreamOsim, UpdateStreamSelections } from '@/composables/useSingleFlawTrackers';
import { useRelatedFlawTrackers } from '@/composables/useRelatedFlawTrackers';
import { useFetchFlaw } from '@/composables/useFetchFlaw';
import { useRefreshTrackers } from '@/composables/useRefreshTrackers';

import TabsDynamic from '@/widgets/TabsDynamic/TabsDynamic.vue';
import type { ZodAffectType, ZodFlawType } from '@/types';
import { ImpactEnum } from '@/generated-client';

const props = defineProps<{
  flaw: ZodFlawType;
  relatedFlaws: ZodFlawType[];
  specificAffectsToTrack?: ZodAffectType[];
}>();

defineEmits<{
  'affects-trackers:hide': [];
  'affects-trackers:refresh': [];
}>();

const showLowSeverityTrackersWarning = ref(false);
const { relatedFlaws } = toRefs(props);

const shouldApplyToRelated = ref(true);
const shouldShowInspector = ref(false);
const { isRefreshingTrackers, refreshTrackers } = useRefreshTrackers();

const {
  addRelatedFlaw,
  affectsBySelectedFlawId,
  fileTrackers,
  filterString,
  isFilingTrackers,
  isLoadingTrackers,
  multiFlawTrackers,
  selectedStreams,
  synchronizeTrackerSelections,
  trackersToFile,
} = useRelatedFlawTrackers(props.flaw, relatedFlaws, props?.specificAffectsToTrack);

const { isFetchingRelatedFlaws } = useFetchFlaw();

const isQuerying = computed(() => isLoadingTrackers.value || isFetchingRelatedFlaws.value);

const selectedRelatedFlawIds = computed(() => Object.keys(affectsBySelectedFlawId.value));

const hasRelatedFlawSelections = computed(() => selectedRelatedFlawIds.value.length > 1);

const relatedFlawIds = computed(() =>
  relatedFlaws.value.map(flaw => flaw.cve_id || flaw.uuid)
    .filter(id => !selectedRelatedFlawIds.value.includes(id)),
);

const specificAffects = computed(() => props?.specificAffectsToTrack?.map(affect =>
  `${affect.ps_module}/${affect.ps_component}`));

const lowImpactAffectUuids = computed(() =>
  props.flaw.affects.filter(affect => affect.impact === ImpactEnum.Low).map(affect => affect.uuid),
);

const filingLowSeverityTrackers = computed(() =>
  selectedStreams.value.some(stream => lowImpactAffectUuids.value.includes(stream.affectUuid)),
);

const trackersToFileLabels = computed(() => selectedStreams.value.reduce(
  (trackerLabels: Record<string, any>, stream: UpdateStreamOsim) => {
    const streamName = stream.ps_update_stream;
    const moduleComponent = `${stream.ps_module}/${stream.ps_component}`;
    if (streamName in trackerLabels) {
      trackerLabels[streamName].flaws.add(stream.flawCveOrId);
      trackerLabels[streamName].affects.push(moduleComponent);
    } else {
      trackerLabels[streamName] = {
        flaws: new Set([stream.flawCveOrId]),
        affects: [moduleComponent],
      };
    }
    return trackerLabels;
  }, {}));

function updateSelection(trackerSelections: UpdateStreamSelections, tracker: UpdateStreamOsim) {
  const isSelected = trackerSelections.get(tracker);
  trackerSelections.set(tracker, !isSelected);
  if (shouldApplyToRelated.value) {
    synchronizeTrackerSelections(trackerSelections);
  }
}

function handleSetAll(tabProps: any, isSelected: boolean) {
  tabProps.setAllTrackerSelections(isSelected);
  if (shouldApplyToRelated.value) {
    synchronizeTrackerSelections(tabProps.trackerSelections);
  }
}

function clearFilter() {
  filterString.value = '';
}

async function handleFileTrackers() {
  if ((props.flaw.impact === ImpactEnum.Low || filingLowSeverityTrackers.value)
    && !showLowSeverityTrackersWarning.value
  ) {
    showLowSeverityTrackersWarning.value = true;
  } else {
    await fileTrackers();
    await refreshTrackers();
  }
}

function hideLowSeverityTrackersWarning() {
  showLowSeverityTrackersWarning.value = false;
}
</script>

<template>
  <div class="mt-3 mb-2 osim-tracker-manager py-1 px-3">
    <h4 class="mb-2">
      Tracker Manager
    </h4>
    <div v-if="specificAffects?.length" class="mb-2">
      <i class="bi bi-binoculars me-2"></i>
      <span class="me-2">Managing trackers for {{ specificAffects.length }} affected offering(s):</span>
      <span v-for="affect in specificAffects" :key="affect" class="badge bg-info me-1">{{ affect }}</span>
    </div>
    <div class="osim-tracker-manager-warning-modal">
      <LowSeverityTrackersWarning
        :showModal="showLowSeverityTrackersWarning"
        @hideModal="hideLowSeverityTrackersWarning()"
        @confirmOperation="handleFileTrackers()"
      />
    </div>
    <div class="osim-trackers-filing mb-2">
      <div class="osim-tracker-manager-controls">
        <input
          v-model="filterString"
          type="text"
          class="form-control border border-info focus-ring focus-ring-info p-1 ps-2 mt-2 mb-3 "
          placeholder="Filter Modules/Components..."
        />
        <button
          v-show="filterString"
          type="button"
          class="btn btn-sm btn-white btn-outline-dark-info border-0 my-2 ms-1"
          @click="clearFilter"
        >
          <i class="bi bi-x"></i>
        </button>
      </div>
      <TabsDynamic
        :labels="selectedRelatedFlawIds"
        :tabProps="multiFlawTrackers"
        :addableItems="relatedFlawIds"
        @addTab="addRelatedFlaw"
      >
        <template v-if="isQuerying" #loading-indicator>
          <div class="ms-2 mt-2">
            <span
              class="spinner-border spinner-border-sm me-1 text-info"
              role="status"
            >
              <span class="visually-hidden">Loading...</span>
            </span>
            <span class="ms-1">Querying available trackers&hellip;</span>
          </div>
        </template>
        <template v-else-if="isRefreshingTrackers" #loading-indicator>
          <div class="ms-2 mt-2">
            <span
              class="spinner-border spinner-border-sm me-1 text-info"
              role="status"
            >
              <span class="visually-hidden">Refreshing trackers...</span>
            </span>
            <span class="ms-1">Refreshing trackers&hellip;</span>
          </div>
        </template>
        <template
          v-for="(relatedFlawAffects, flawCveOrId) in affectsBySelectedFlawId"
          :key="flawCveOrId"
          #[flawCveOrId]="tabProps"
        >
          <div class="osim-tracker-tabs">
            <div v-if="tabProps.untrackableAffects?.length > 0" class="pt-5 p-3">
              <div class="alert alert-danger">
                <h5>Untrackable Affects</h5>
                <p>
                  These affects do not have available trackers. This may indicate an issue with product defintions.
                  Please contact the OSIDB/OSIM team for assistance.
                </p>
                <div class="osim-tracker-list">
                  <span
                    v-for="affect in tabProps.untrackableAffects"
                    :key="`${affect.ps_module}-${affect.ps_component}`"
                  >
                    <span class="ps-1 text-danger">
                      <i class="bi bi-exclamation-triangle"></i>
                      {{ affect.ps_module }}/{{ affect.ps_component }}
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div class="row mb-3">
              <div class="col-6">
                <div class="ms-2 pe-2">
                  <h5 class="pt-4 d-inline-block">
                    Unfiled
                  </h5>
                  <button
                    type="button"
                    class="btn btn-white btn-outline-dark-info btn-sm mx-2"
                    @click="handleSetAll(tabProps, true)"
                  >
                    <i class="bi bi-check-all"></i>
                    Select
                    {{ tabProps.filterString ? 'Filtered' : 'All' }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-white btn-outline-dark-info btn-sm me-2"
                    @click="handleSetAll(tabProps, false)"
                  >
                    <i class="bi bi-eraser"></i>
                    Deselect
                    {{ tabProps.filterString ? 'Filtered' : 'All' }}
                  </button>
                  <label
                    v-if="hasRelatedFlawSelections"
                    class="form-check form-switch h-100 ms-5 p-1 d-inline-block"
                  >
                    <input
                      v-model="shouldApplyToRelated"
                      type="checkbox"
                      class="form-check-input info focus-ring focus-ring-info"
                    />
                    <span class="form-check-label">
                      Sync selections across tabs
                    </span>
                  </label>
                </div>
                <div class="osim-tracker-list-container ms-3 mt-2 pb-3">
                  <div
                    v-if="tabProps.selectedStreams?.length"
                    class="osim-tracker-list mt-2"
                  >
                    <label
                      v-for="(tracker, index) in tabProps.selectedStreams"
                      :key="`${tracker.ps_update_stream}:${tracker.ps_component}:${index}`"
                    >
                      <input
                        :checked="tabProps.trackerSelections.get(tracker)"
                        type="checkbox"
                        class="osim-tracker form-check-input"
                        @input="updateSelection(tabProps.trackerSelections, tracker)"
                      />
                      <span
                        class="osim-tracker-label"
                        :class="{'osim-suggested-tracker': tracker.selected}"
                      >
                        <span>{{ `${tracker.ps_update_stream}` }}</span>
                        <span class="ms-2 fst-italic pe-1">{{ `${tracker.ps_component}` }}</span>
                        <span
                          v-if="tracker.selected"
                          title="Suggested Tracker"
                          class="ps-1"
                        >
                          <i class="bi bi-box-arrow-in-right">
                            <span class="visually-hidden"> Suggested Tracker </span>
                          </i>
                        </span>
                      </span>
                    </label>
                  </div>
                  <div
                    v-if="tabProps.unselectedStreams?.length"
                    class="osim-tracker-list mb-2"
                  >
                    <label
                      v-for="(tracker, index) in tabProps.unselectedStreams"
                      :key="`${tracker.ps_update_stream}:${tracker.ps_component}:${index}`"
                    >
                      <input
                        :checked="tabProps.trackerSelections.get(tracker)"
                        type="checkbox"
                        class="osim-tracker form-check-input"
                        @input="updateSelection(tabProps.trackerSelections, tracker)"
                      />
                      <span
                        class="osim-tracker-label"
                        :class="{'osim-suggested-tracker': tracker.selected}"
                      >
                        <span>{{ `${tracker.ps_update_stream}` }}</span>
                        <span class="ms-2 fst-italic pe-1">{{ `${tracker.ps_component}` }}</span>
                        <span
                          v-if="tracker.selected"
                          title="Suggested Tracker"
                          class="ps-1"
                        >
                          <i class="bi bi-box-arrow-in-right">
                            <span class="visually-hidden"> Suggested Tracker </span>
                          </i>
                        </span>
                      </span>
                    </label>
                  </div>

                  <button
                    v-if="trackersToFile.length"
                    type="button"
                    class="btn btn-sm btn-dark-info text-white mt-2 me-2"
                    @click="shouldShowInspector = !shouldShowInspector"
                  >
                    <i
                      class="bi me-2"
                      :class="shouldShowInspector ? 'bi-binoculars-fill': 'bi-binoculars'"
                    ></i>
                    <span v-if="!shouldShowInspector">Inspect {{ trackersToFile.length }} Trackers to File</span>
                    <span v-else>Hide Tracker Filing Inspector </span>
                  </button>
                  <table v-if="shouldShowInspector" class="osim-trackers-inspector">
                    <tr v-for="(trackerData, streamName) in trackersToFileLabels" :key="streamName">
                      <td>{{ streamName }}</td>
                      <td>

                        <span :title="trackerData.affects.join(', ')">
                          {{ trackerData.affects.length }} affect(s)
                        </span>
                        in
                        <span :title="Array.from(trackerData.flaws).join(', ')">
                          {{ trackerData.flaws.size }} flaw(s)</span>
                      </td>
                    </tr>
                  </table>
                  <button
                    type="button"
                    class="btn btn-sm btn-dark-info text-white osim-file-trackers mt-2"
                    :disabled="!trackersToFile.length || isFilingTrackers"
                    @click="handleFileTrackers"
                  >
                    <i v-if="!isFilingTrackers" class="bi bi-archive"></i>
                    <i v-else v-osim-loading.grow="isFilingTrackers"></i>
                    File {{ trackersToFile.length }} Trackers
                  </button>
                </div>
              </div>

              <div class="col-6">
                <h5 class="pt-4 mb-2 pb-2">Filed</h5>
                <div class="osim-tracker-list my-2">
                  <label
                    v-for="(tracker, index) in tabProps.alreadyFiledTrackers"
                    :key="`${tracker.ps_update_stream}:${tracker.ps_component}:${index}`"
                  >
                    <input
                      checked
                      disabled
                      type="checkbox"
                      class="osim-tracker form-check-input"
                    />
                    <span
                      class="osim-tracker-label"
                      :class="{'osim-suggested-tracker': tracker.selected}"
                    >
                      <span>{{ `${tracker.ps_update_stream}` }}</span>
                      <span class="ms-2 fst-italic pe-1">{{ `${tracker.ps_component}` }}</span>
                      <span
                        v-if="tracker.selected"
                        title="Suggested Tracker"
                        class="ps-1"
                      >
                        <i class="bi bi-box-arrow-in-right">
                          <span class="visually-hidden"> Suggested Tracker </span>
                        </i>
                      </span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </template>
      </TabsDynamic>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '@/scss/bootstrap-overrides';

details:not([open]) h5 {
  margin-bottom: 0;
}

.form-check-input {
  border-color: $info !important;

  &:checked {
    background-color: $info;
  }

  &:not(:checked) {
    &:active,
    &:focus {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3e%3ccircle r='3' fill='rgba%2821, 21, 21, 0.25%29'/%3e%3c/svg%3e");
    }
  }
}

.osim-tracker-manager-controls {
  position: relative;

  input[type='text'] {
    width: 30ch;
  }

  button {
    position: absolute;
    top: 2.5px;
    left: calc(30ch - 1px);
  }
}

label {
  padding: 0.125rem;
  margin: 0;

  .osim-tracker-label {
    padding-left: 0.125rem;
  }

  input[type='checkbox'].osim-tracker {
    margin-top: 0.1875rem;
    margin-right: 0.375rem;
    border-color: $dark-info;

    &:checked {
      background-color: $dark-info;
      border-color: $dark-info;
    }

    &:active {
      outline: 2px solid rgba($info, 0.5);
      border-color: $info;
    }

    &:focus {
      outline: 2px solid rgba($info, 0.5);
      border-color: $info;
    }
  }
}

.osim-suggested-tracker {
  padding-right: 0.25rem;
  background-color: $lighter-info;

  i {
    margin-right: 0.25rem;
  }
}

:deep(.nav-tabs) {
  border-bottom-color: $info;
  flex-flow: row wrap-reverse;

  .nav-item .nav-link {
    color: $info;
    border: none;
    background-color: $lighter-info;
    margin-right: 0.5rem;

    &.active {
      background-color: $lightest-info;
      color: $dark-info;
      border-top: 1px solid $info;
      border-left: 1px solid $info;
      border-right: 1px solid $info;
      border-bottom: 1px solid $lightest-info;
      margin-bottom: -2px;
    }

    &.osim-add-tab {
      background-color: #fff;
      color: $info;
      border: none;
      box-shadow: none;
      padding: 0.125rem 0.55rem;
      padding-bottom: 0.125rem;

      i {
        font-size: 1.5rem;
      }

      &:hover {
        background-color: $info;
        color: #fff;
      }
    }
  }
}

.osim-tracker-tabs {
  border: 1px solid $info;
  padding-left: 1rem;
  padding-bottom: 1rem;
  margin: 0;
  background-color: $lightest-info;
}

.osim-tracker-list {
  display: flex;
  flex-flow: column;
  max-height: 30vh;
  margin-right: 1rem;
  overflow-y: auto;
  background-color: #fff;

  &:has(label) {
    padding: 0.25rem;
    border: 1px solid $info;
  }

  &::-webkit-scrollbar-thumb {
    background: $info;
    border-radius: 0.5rem;
  }
}

.osim-tracker-list-container {
  &:has(.osim-tracker-list:nth-of-type(2)) {
    .osim-tracker-list {
      &:nth-of-type(1) {
        border-bottom: none;
        padding-bottom: 0;
      }

      &:nth-of-type(2) {
        border-top: 1px dashed $info;
        padding-top: 0;
      }
    }
  }
}

.osim-trackers-filing {
  overflow: hidden;
}

.osim-tracker-selection-disabled {
  text-decoration: strike-through;
  font-style: italic;
  color: gray;
}

button.osim-file-trackers:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}

.osim-trackers-inspector {
  margin-top: 0.5rem;
  margin-left: 0.5rem;

  td {
    list-style-type: none;
    padding: 0.25rem 0.5rem;
    background-color: #fff;
    border: 1px solid $info;
    max-height: 30vh;
    overflow-y: auto;

    span {
      cursor: help;
    }
  }
}

.osim-specific-affects {
  padding-left: 0.5rem;
  margin-bottom: 1rem;
  background-color: $lighter-info;
  display: inline-block;
}

.osim-tracker-manager-warning-modal {
  &:deep(.modal-body) {
    position: relative;
    padding: 0;

    .osim-affect-trackers-container {
      margin: 0 !important;

      .osim-hide-tracker-manager {
        display: none;
      }
    }
  }

  :deep(.btn-close) {
    position: absolute;
    top: 1rem;
    right: 1rem;
  }
}
</style>
