<script setup lang="ts">
import { ref } from 'vue';
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
  'update:modelValue': [value: object];
  remove: [];
  'file-tracker': [];
}>();

const affectCvssScore = ref(
  modelValue.value?.cvss_scores.find(({ issuer }) => issuer === 'RH')?.score || '',
);
</script>

<template>
  <div class="row">
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
      <div class="col-auto align-self-center ms-auto">
        <button
          type="button"
          class="osim-affected-offering-remove btn btn-secondary justify-self-end"
          @click.prevent="emit('file-tracker')"
        >
          File Tracker
        </button>
      </div>
      <h4
        v-if="modelValue.trackers && modelValue.trackers.length > 0"
        class="affect-trackers-heading"
      >
        Trackers
      </h4>
      <div
        v-for="(tracker, trackerIndex) in modelValue.trackers"
        :key="trackerIndex"
        class="card bg-light-yellow mb-2 pb-2 border-0"
      >
        <table class="table table-striped">
          <tbody>
            <tr>
              <th>Type</th>
              <td>
                <!-- TODO: define a reasonable type -->
                {{ modelValue.type }}
              </td>
            </tr>
            <tr>
              <th>Resolution</th>
              <td>
                {{ modelValue.resolution }}
              </td>
            </tr>
            <tr v-if="(modelValue as any).status">
              <th>Status</th>
              <td>
                {{ (modelValue as any).status }}
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
          </tbody>
        </table>
        <li
          v-for="(trackerAffects, trackerAffectIndex) in tracker.affects"
          :key="trackerAffectIndex"
        >
          Affects: {{ trackerAffects }}
        </li>
      </div>
      <div class="col-3 text-end">
        <div>
          <div></div>
        </div>
        <ul></ul>
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
