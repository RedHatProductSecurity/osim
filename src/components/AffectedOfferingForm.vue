<script setup lang="ts">
import { computed } from 'vue';
import { useWindowSize } from '@vueuse/core';
import LabelEditable from '@/components/widgets/LabelEditable.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';
import { osimRuntime } from '@/stores/osimRuntime';
import { trackerUrl } from '@/services/TrackerService';
import {
  affectAffectedness,
  affectImpacts,
  affectResolutions,
  type ZodAffectType,
  type ZodAffectCVSSType,
} from '@/types/zodAffect';

const { width: screenWidth } = useWindowSize();

type NotUndefined<T> = Exclude<T, undefined>;

defineProps<{
  error: Record<string, NotUndefined<any>> | null;
}>();

const isScreenSortaSmall = computed(() => screenWidth.value < 950);

const modelValue = defineModel<ZodAffectType>();


function getCvssData(issuer: string, version: string) {
  return modelValue.value?.cvss_scores.find(
    (assessment) => assessment.issuer === issuer && assessment.cvss_version === version
  );
}

if (!getCvssData('RH', 'V3')) {
  modelValue.value?.cvss_scores?.push(
    {
      vector: null,
      uuid: null,
      issuer: 'RH',
      cvss_version: 'V3',
      comment: 'hardcoded comment', // TODO: remove this line when the comment field is added to the UI
      created_dt: null,
      score: null,
      embargoed: modelValue.value.embargoed,
      alerts: [],
    } as ZodAffectCVSSType
  );
}

const affectCvss3Vector = computed(
  () => modelValue.value?.cvss_scores.find(({ issuer, cvss_version }) => issuer === 'RH' && cvss_version === 'V3')
    ?.vector
    || null
);


const hasTrackers = computed(() =>
  modelValue.value?.trackers
  && modelValue.value?.trackers?.length > 0
  && modelValue.value?.trackers.every(({ ps_update_stream }) => ps_update_stream)
);

const hiddenResolutionOptions = computed(() => {
  const availableOptions = ['', 'DELEGATED', 'WONTFIX', 'OOSS'];
  return affectResolutions.filter(option => !availableOptions.includes(option));
});

</script>

<template>
  <div v-if="modelValue" class="row osim-affected-offerings pt-2">
    <div class="col-6">
      <LabelEditable
        v-model="modelValue.ps_module"
        :error="error?.ps_module"
        type="text"
        label="Affected Module"
      />
      <LabelEditable
        v-model="modelValue.ps_component"
        :error="error?.ps_component"
        type="text"
        label="Affected Component"
      />
      <LabelSelect
        v-model="modelValue.affectedness"
        :error="error?.affectedness"
        label="Affectedness"
        :options="affectAffectedness"
      />
      <LabelSelect
        v-model="modelValue.resolution"
        :error="error?.resolution"
        label="Resolution"
        :options="affectResolutions"
        :optionsHidden="hiddenResolutionOptions"
      />
      <LabelSelect
        v-model="modelValue.impact"
        :error="error?.impact"
        label="Impact"
        :options="affectImpacts"
      />
      <LabelEditable
        v-model="affectCvss3Vector"
        :error="error?.cvss_scores?.vector"
        type="text"
        label="CVSSv3"
      />
    </div>
    <div class="col-6 p-0">
      <div class="bg-dark rounded-top-2 text-info">
        <h5 class="affect-trackers-heading p-2 ps-3 m-0">Trackers</h5>
      </div>
      <p v-if="!hasTrackers" class="ps-1 mt-3">
        <em>&mdash; None yet.</em>
      </p>

      <div
        v-for="(tracker, trackerIndex) in modelValue.trackers.filter(({ ps_update_stream }) => ps_update_stream)"
        :key="trackerIndex"
        class="osim-tracker-card pb-2 pt-0 pe-2 ps-2 bg-dark"
      >
        <details>
          <summary class="text-info">{{ tracker.ps_update_stream }}</summary>
          <table class="table table-striped table-info mb-0">
            <tbody v-if="!isScreenSortaSmall">
              <tr>
                <th>Type</th>
                <td>
                  <a
                    :href="trackerUrl(tracker.type, tracker.external_system_id)"
                    target="_blank"
                  >
                    <i class="bi bi-link" />{{ tracker.type }}
                  </a>
                </td>
                <th>Product Stream</th>
                <td>
                  {{ tracker.ps_update_stream }}
                </td>
              </tr>
              <tr>
                <!-- <th>Resolution</th>
                <td>
                  {{ tracker.resolution }}
                </td> -->
                <th>Status</th>
                <td>
                  {{ tracker.status }}
                </td>
              </tr>
              <tr>
                <th>Created date</th>
                <td>{{ tracker.created_dt }}</td>
                <th>Updated date</th>
                <!-- updated_dt will match the flaw and affect updated_dt -->
                <td>{{ tracker.updated_dt }}</td>
              </tr>
              <tr v-if="tracker.errata.length">
                <th colspan="4" class="text-center table-dark text-warning">Errata</th>
              </tr>
              <tr
                v-for="(trackerErrata, trackerErrataIndex) in tracker.errata"
                :key="trackerErrataIndex"
                class="table-warning"
              >
                <th>Advisory</th>
                <td colspan="3">
                  <a
                    :href="osimRuntime.backends.errata + '/advisory/' + trackerErrata.et_id"
                    target="_blank"
                  >
                    {{ trackerErrata.advisory_name }}
                  </a>
                  &mdash; {{ trackerErrata.shipped_dt }}
                </td>
              </tr>
            </tbody>
            <!-- TODO: Break table out into component and replace these -->
            <tbody v-else>
              <tr>
                <th colspan="2">Type</th>
                <td colspan="2">
                  <RouterLink :to="{ path: `/tracker/${tracker.uuid}` }">
                    <i class="bi bi-link"></i>{{ tracker.type }}
                  </RouterLink>
                </td>
              </tr>
              <tr>
                <th colspan="2">Product Stream</th>
                <td colspan="2">
                  {{ tracker.ps_update_stream }}
                </td>
              </tr>
              <!-- <tr>
                <th colspan="2">Resolution</th>
                <td colspan="2">
                  {{ tracker.resolution }}
                </td>
              </tr> -->
              <tr>
                <th colspan="2">Status</th>
                <td colspan="2">
                  {{ tracker.status }}
                </td>
              </tr>
              <tr>
                <th colspan="2">Created date</th>
                <td colspan="2">{{ tracker.created_dt }}</td>
              </tr>
              <tr>
                <th colspan="2">Updated date</th>
                <td colspan="2">{{ tracker.updated_dt }}</td>
              </tr>
              <tr v-if="tracker.errata.length">
                <td colspan="4" class="text-center table-dark text-warning">Errata</td>
              </tr>
              <tr
                v-for="(trackerErrata, trackerErrataIndex) in tracker.errata"
                :key="trackerErrataIndex"
                class="table-warning"
              >
                <th colspan="1">Advisory</th>
                <td colspan="3">
                  {{ trackerErrata.advisory_name }}
                  <br />
                  {{ trackerErrata.shipped_dt }}
                </td>
              </tr>
            </tbody>
          </table>
        </details>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.osim-affected-offerings {
  padding-left: 0.75rem;

  table {
    table-layout: fixed;
  }

  th {
    border-bottom: none;
  }

  td {
    word-wrap: break-word;
  }

  .osim-tracker-update-streams :deep(.col-3),
  .osim-tracker-update-streams :deep(.col-9) {
    width: 50%;
  }
}
</style>
