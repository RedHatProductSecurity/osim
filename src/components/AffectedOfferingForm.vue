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
  type ZodAffectType
} from '@/types/zodFlaw';

defineProps<{
  error?: string,
}>();

const modelValue = defineModel<ZodAffectType>({ default: null });

defineEmits<{
  'update:modelValue': [value: object],
  'remove': [],
}>();

const affectCvssScore = ref(modelValue.value?.cvss_scores.find(({issuer}) =>issuer === 'RH')?.score);


</script>

<template>
  <div class="row">
    <LabelInput
      v-model="modelValue.ps_module"
      class="col-6"
      label="Affected Module"
    />
    <div class="col-auto align-self-center ms-auto">
      <button
        type="button"
        class="osim-affected-offering-remove btn btn-secondary justify-self-end"
        @click.prevent="$emit('remove')"
      >Remove This Affect</button>
    </div>
    <LabelInput
      v-model="modelValue.ps_component"
      class="col-6"
      label="Affected Component"
    />
    <!--Hiding the Type field until we have more options to choose from-->
    <LabelSelect
      v-model="modelValue.type"
      class="col-6 visually-hidden"
      label="Type"
      :options="affectTypes"
    />
    <LabelSelect
      v-model="modelValue.affectedness"
      class="col-6"
      label="Affectedness"
      :options="affectAffectedness"
    />
    <LabelSelect
      v-model="modelValue.resolution"
      class="col-6"
      label="Resolution"
      :options="affectResolutions"
    />
    <LabelSelect
      v-model="modelValue.impact"
      class="col-6"
      label="Impact"
      :options="affectImpacts"
    />
    <LabelEditable
      v-model="affectCvssScore"
      type="text"
      class="col-6"
      label="CVSS3"
    />
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
    <h4 v-if="modelValue.trackers && modelValue.trackers.length > 0" class="affect-trackers-heading">
      Trackers
    </h4>
    <div v-for="(tracker, trackerIndex) in modelValue.trackers" :key="trackerIndex">
      <div class="row">
        <div class="col-6 flex-grow-1">
          <div>Type: {{ modelValue.type }}</div>
          <!-- TODO: define a reasonable type -->
          <div v-if="(modelValue as any).status">
            Status: {{ (modelValue as any).status }}
          </div>
          <div>Resolution: {{ modelValue.resolution }}</div>
        </div>
        <div class="col-3 text-end">
          <div>Created date: {{ tracker.created_dt }}</div>
          <div>Updated date: {{ tracker.updated_dt }}</div>
        </div>
      </div>
      <ul>
        <li v-for="(trackerAffects, trackerAffectIndex) in tracker.affects" :key="trackerAffectIndex">
          Affects: {{ trackerAffects }}
        </li>
      </ul>
    </div>
  </div>
</template>
