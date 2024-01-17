<script setup lang="ts">

import LabelInput from '@/components/widgets/LabelInput.vue';
import LabelEditable from '@/components/widgets/LabelEditable.vue';
import LabelCheckbox from '@/components/widgets/LabelCheckbox.vue';
import LabelSelect from '@/components/widgets/LabelSelect.vue';
import { ZodAffectSchema } from '@/types/zodFlaw';

const props = defineProps<{
  modelValue: any,
  error?: string,
}>();
const emit = defineEmits<{
  'update:modelValue': [value: object],
  'remove': [],
}>();

const affectImpacts = Object.values(ZodAffectSchema.shape.impact.unwrap().unwrap().enum) as string[];
const affectResolutions = Object.values(ZodAffectSchema.shape.resolution.unwrap().unwrap().enum) as string[];
const affectAffectedness = Object.values(ZodAffectSchema.shape.affectedness.unwrap().unwrap().enum) as string[];
const affectTypes = Object.values(ZodAffectSchema.shape.type.unwrap().unwrap().enum) as string[];

</script>

<template>
  <div class="row">
    <LabelInput
        class="col-6"
        label="Affected Module"
        v-model="modelValue.ps_module"/>
    <div class="col-auto align-self-center ms-auto">
      <button
          type="button"
          class="osim-affected-offering-remove btn btn-secondary justify-self-end"
          @click.prevent="$emit('remove')"
      >Remove This Affect</button>
    </div>
    <LabelInput
        class="col-6"
        label="Affected Component"
        v-model="modelValue.ps_component"/>
    <LabelSelect
        class="col-6"
        label="Type"
        v-model="modelValue.type"
        :options="affectTypes"
    />
    <LabelSelect
        class="col-6"
        label="Affectedness"
        v-model="modelValue.affectedness"
        :options="affectAffectedness"
    />
    <LabelSelect
        class="col-6"
        label="Resolution"
        v-model="modelValue.resolution"
        :options="affectResolutions"
    />
    <LabelSelect
        class="col-6"
        label="Impact"
        v-model="modelValue.impact"
        :options="affectImpacts"/>
    <LabelEditable
        class="col-6"
        type="text"
        label="CVSS3"
        v-model="modelValue.cvss3"/>
    <LabelInput
        class="col-6"
        type="text"
        label="CVSS3 Score"
        v-model="modelValue.cvss3_score"/>
    <LabelEditable
        class="col-6"
        type="date"
        label="Created Date"
        :readOnly="true"
        v-model="modelValue.created_dt"/>
    <LabelEditable
        class="col-6"
        type="date"
        label="Updated Date"
        :readOnly="true"
        v-model="modelValue.updated_dt"/>
    <LabelCheckbox
        class="col-6"
        label="Embargoed?"
        v-model="modelValue.embargoed"
        :readonly="true"
    />

    <!-- trackers are read-only -->
    <h4 class="affect-trackers-heading" v-if="modelValue.trackers && modelValue.trackers.length > 0">Trackers</h4>
    <div v-for="tracker in modelValue.trackers">
      <div class="row">
        <div class="col-6 flex-grow-1">
          <div>Type: {{ modelValue.type }}</div>
          <div v-if="modelValue.status">Status: {{ modelValue.status }}</div>
          <div>Resolution: {{ modelValue.resolution }}</div>
        </div>
        <div class="col-3 text-end">
          <div>Created date: {{ tracker.created_dt }}</div>
          <div>Updated date: {{ tracker.updated_dt }}</div>
        </div>
      </div>
      <ul>
        <li v-for="tracker_affects in tracker.affects">Affects: {{ tracker_affects }}</li>
      </ul>
    </div>
  </div>

</template>

<style scoped>
</style>
