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
import { useAffectTracker } from '@/composables/useAffectTracker';
import type { TrackersPost } from '@/services/TrackerService';

defineProps<{
  error?: string;
}>();

const modelValue = defineModel<ZodAffectType>({ default: null });

const emit = defineEmits<{
  'file-tracker': [value: object];
  'update:modelValue': [value: object];
  remove: [value: ZodAffectType];
  recover: [value: ZodAffectType];
  'add-blank-affect': [];
}>();

const affectCvssScore = ref(
  modelValue.value?.cvss_scores?.find(({ issuer }) => issuer === 'RH')?.score || '',
);

const flawId = computed(() => modelValue.value.flaw);

const { getTrackers, moduleComponentStreams, isNotApplicable, postTracker } = useAffectTracker(
  flawId.value as string,
  modelValue.value.ps_module,
  modelValue.value.ps_component,
);

const updateStreamNames = computed(() =>
  moduleComponentStreams.value.map(({ps_update_stream}: any) => ps_update_stream),
);

const chosenUpdateStream = ref('');

function handleTrackAffect() {
  postTracker({
    ps_update_stream: chosenUpdateStream.value,
    resolution: modelValue.value.resolution || '',
    updated_dt: modelValue.value.updated_dt || '',
    affects: [modelValue.value.uuid],
    embargoed: modelValue.value.embargoed,
  } as TrackersPost);

}
// const handleFileTracker = () => {
// emit('file-tracker', { flaw_uuids: [flawId.value] });
// };
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
      <LabelEditable v-model="affectCvssScore" type="text" label="CVSS3" />
      <div class="row">
        <div class="col ps-0 mb-4">
          <button
            type="button"
            class="osim-affected-offering-remove btn btn-secondary"
            @click.prevent="emit('remove', modelValue)"
          >
            Remove This Affect
          </button>
        </div>
      </div>
    </div>
    <div class="col-6">
      <div class="bg-dark rounded-2 text-info">
        <h5 class="affect-trackers-heading p-2 ps-3 mb-0">Trackers</h5>
      </div>
      <p v-if="!modelValue.trackers || modelValue.trackers?.length === 0" class="ps-1 mt-3">
        <em>&mdash; None yet.</em>
      </p>

      <div
        v-for="(tracker, trackerIndex) in modelValue.trackers"
        :key="trackerIndex"
        class="osim-tracker-card ps-2 mb-3 pe-1"
      >
        <div class="card">
          <table class="table table-striped table-info mb-0">
            <tbody>
              <tr>
                <th>Type</th>
                <td>
                  {{ tracker.type }}
                </td>
                <th>Product Stream</th>
                <td>
                  {{ tracker.ps_update_stream }}
                </td>
              </tr>
              <tr>
                <th>Resolution</th>
                <td>
                  {{ tracker.resolution }}
                </td>
                <th>Status</th>
                <td>
                  {{ tracker.status }}
                </td>
              </tr>
              <tr>
                <th>Created date</th>
                <td>{{ tracker.created_dt }}</td>
                <th>Updated date</th>
                <td>{{ tracker.updated_dt }}</td>
              </tr>
              <tr>
                <th colspan="2">
                  <RouterLink :to="{ path: `/tracker/${tracker.uuid}` }"> Link </RouterLink>
                </th>
                <th>Affects</th>
                <td>
                  <ul>
                    <li
                      v-for="(trackerAffect, trackerAffectIndex) in tracker.affects"
                      :key="trackerAffectIndex"
                    >
                      {{ trackerAffect }}
                    </li>
                  </ul>
                </td>
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
          </table>
        </div>
      </div>

      <button
        v-if="updateStreamNames.length === 0"
        type="button"
        class="btn btn-secondary mt-4"
        :disabled="!flawId || isNotApplicable"
        @click.prevent="getTrackers"
      >
        File Tracker
      </button>
      <div v-else class="ps-3 mt-4 osim-tracker-update-streams">
        <LabelSelect
          v-model="chosenUpdateStream"
          :options="updateStreamNames"
          label="Update Stream"
        />
        <button
          type="button"
          class="btn btn-secondary"
          @click.prevent="handleTrackAffect"
        >
          Track Affect
        </button>
      </div>
      <div v-if="isNotApplicable">
        <p class="ps-3 mt-3">
          <em>&mdash; Not applicable for this affect.</em>
        </p>
      </div>
    </div>

    <!-- Commenting values below because OSIDB is supposed to inherit them from the Flaw -->
    <!--<LabelInput-->
    <!--    class="col-6"-->
    <!--    type="text"-->
    <!--    label="CVSS3 Score"-->
    <!--    v-model="modelValue.cvss3_score"/>-->
    <!--<LabelEditable-->
    <!--    class="col-6"-->
    <!--    type="date"-->
    <!--    label="Created Date"-->
    <!--    :readOnly="true"-->
    <!--    v-model="modelValue.created_dt"/>-->
    <!--<LabelEditable-->
    <!--    class="col-6"-->
    <!--    type="date"-->
    <!--    label="Updated Date"-->
    <!--    :readOnly="true"-->
    <!--    v-model="modelValue.updated_dt"/>-->
    <!--<LabelCheckbox-->
    <!--    class="col-6"-->
    <!--    label="Embargoed?"-->
    <!--    v-model="modelValue.embargoed"-->
    <!--    :readonly="true"-->
    <!--/>-->

    <!-- trackers are read-only -->
  </div>
</template>

<style scoped lang="scss">
.osim-affected-offerings {
  padding-left: 0.75rem;

  table.table-striped th {
    border-bottom: none;
  }

  .osim-tracker-update-streams :deep(.col-3),
  .osim-tracker-update-streams :deep(.col-9) {
    width: 50%;
  }
}
</style>
