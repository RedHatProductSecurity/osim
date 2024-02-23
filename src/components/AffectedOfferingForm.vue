<script setup lang="ts">
import { computed, ref } from 'vue';
import LabelInput from '@/components/widgets/LabelInput.vue';
import LabelEditable from '@/components/widgets/LabelEditable.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';
import {
  affectImpacts,
  affectResolutions,
  affectAffectedness,
  affectTypes,
  type ZodAffectType,
} from '@/types/zodFlaw';

defineProps<{
  error?: string;
}>();

const modelValue = defineModel<ZodAffectType>({ default: null });

const emit = defineEmits<{
  'file-tracker': [value: object];
  'update:modelValue': [value: object];
  remove: [];
}>();

const affectCvssScore = ref(
  modelValue.value?.cvss_scores.find(({ issuer }) => issuer === 'RH')?.score || '',
);

const flawId = computed(() => modelValue.value?.flaw);

const handleFileTracker = () => {
  emit('file-tracker', { flaw_uuids: [flawId.value] });
};
</script>

<template>
  <div class="row osim-affected-offerings">
    <div class="col-6">
      <LabelInput v-model="modelValue.ps_module" label="Affected Module" />
      <LabelInput v-model="modelValue.ps_component" label="Affected Component" />
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
      <div class="col-auto align-self-center ms-auto">
        <button
          type="button"
          class="osim-affected-offering-remove btn btn-secondary justify-self-end"
          @click.prevent="emit('remove')"
        >
          Remove This Affect
        </button>
      </div>
    </div>
    <div class="col-6">
      <div class="d-flex justify-content-between">
        <h4
          v-if="modelValue.trackers && modelValue.trackers.length > 0"
          class="affect-trackers-heading"
        >
          Trackers
        </h4>
        <button
          type="button"
          class="osim-affected-offering-remove btn btn-secondary justify-self-end"
          @click.prevent="handleFileTracker"
        >
          File Tracker
        </button>
      </div>
      <div
        v-for="(tracker, trackerIndex) in modelValue.trackers"
        :key="trackerIndex"
        class="card mb-2 border-0"
      >
        <table class="table table-striped">
          <tbody>
            <tr>
              <th colspan="100%">
                <RouterLink :to="{ path: `/tracker/${tracker.uuid}` }"> Link </RouterLink>
              </th>
            </tr>
            <tr>
              <th>Type</th>
              <td>
                <!-- TODO: define a reasonable type -->
                {{ tracker.type }}
              </td>
            </tr>
            <tr>
              <th>Resolution</th>
              <td>
                {{ tracker.resolution }}
              </td>
            </tr>
            <tr>
              <th>Status</th>
              <td>
                {{ tracker.status }}
              </td>
            </tr>
            <tr>
              <th>Product Stream</th>
              <td>
                {{ tracker.ps_update_stream }}
              </td>
            </tr>
            <tr>
              <th>Created date</th>
              <td>{{ tracker.created_dt }}</td>
            </tr>
            <tr>
              <th>Updated date</th>
              <td>{{ tracker.updated_dt }}</td>
            </tr>
            <tr>
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
          </tbody>
        </table>
        <div>
          <h5>Errata</h5>
          <table
            v-for="(trackerErrata, trackerErrataIndex) in tracker.errata"
            :key="trackerErrataIndex"
            class="table-info table table-striped"
          >
            <tbody>
              <tr>
                <th>Advisory</th>
                <td>{{ trackerErrata.advisory_name }}</td>
              </tr>
              <tr>
                <th>Shipped</th>
                <td>{{ trackerErrata.shipped_dt }}</td>
              </tr>
            </tbody>
          </table>
        </div>
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
  table.table-striped th {
    border-bottom: none;
  }
}
</style>
