<script setup lang="ts">
import { computed, ref } from 'vue';
import LabelEditable from '@/components/widgets/LabelEditable.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';

import {
  affectImpacts,
  affectResolutions,
  affectAffectedness,
  affectTypes,
  type ZodAffectType,
} from '@/types/zodFlaw';

import { useWindowSize } from '@vueuse/core';

const { width: screenWidth } = useWindowSize();

defineProps<{
  error?: string;
}>();

const isScreenSortaSmall = computed(() => screenWidth.value < 950);

const modelValue = defineModel<ZodAffectType>({ default: null });

const emit = defineEmits<{
  'update:modelValue': [value: object];
  remove: [value: object];
}>();

const affectCvssScore = ref(
  modelValue.value?.cvss_scores?.find(({ issuer }) => issuer === 'RH')?.score || '',
);
</script>

<template>
  <div class="row osim-affected-offerings pt-2">
    <div class="col-6">
      <LabelEditable v-model="modelValue.ps_module" type="text" label="Affected Module" />
      <LabelEditable v-model="modelValue.ps_component" type="text" label="Affected Component" />
      <!--Hiding the Type field until we have more options to choose from-->
      <LabelSelect
        v-model="modelValue.type"
        class="col-6 visually-hidden"
        label="Type"
        :options="affectTypes"
      />
      <LabelSelect
        v-model="modelValue.affectedness"
        label="Affectedness"
        :options="affectAffectedness"
      />
      <LabelSelect
        v-model="modelValue.resolution"
        label="Resolution"
        :options="affectResolutions"
      />
      <LabelSelect v-model="modelValue.impact" label="Impact" :options="affectImpacts" />
      <!-- TODO: Should CVSSv3 be inherited from Flaw? -->
      <LabelEditable v-model="affectCvssScore" type="text" label="CVSSv3" />
      <div class="row">
        <div class="col ps-0 mb-4">
          <button
            v-if="!modelValue.uuid"
            type="button"
            class="osim-affected-offering-remove btn btn-secondary"
            @click.prevent="emit('remove', modelValue)"
          >
            Remove This Affect
          </button>
        </div>
      </div>
    </div>
    <div class="col-6 p-0">
      <div class="bg-dark rounded-top-2 text-info">
        <h5 class="affect-trackers-heading p-2 ps-3 m-0">Trackers</h5>
      </div>
      <p v-if="!modelValue.trackers || modelValue.trackers?.length === 0" class="ps-1 mt-3">
        <em>&mdash; None yet.</em>
      </p>

      <div
        v-for="(tracker, trackerIndex) in modelValue.trackers"
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
                  <RouterLink :to="{ path: `/tracker/${tracker.uuid}` }">
                    <i class="bi bi-link"></i>{{ tracker.type }}
                  </RouterLink>
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
                  {{ trackerErrata.advisory_name }} &mdash; {{ trackerErrata.shipped_dt }}
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
