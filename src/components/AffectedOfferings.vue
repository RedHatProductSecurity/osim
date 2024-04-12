<script setup lang="ts">
import { computed, toRefs, ref } from 'vue';

import { type ZodAffectType } from '@/types/zodFlaw';
import { uniques } from '@/utils/helpers';
import AffectedOfferingForm from '@/components/AffectedOfferingForm.vue';
import AffectExpandableForm from '@/components/AffectExpandableForm.vue';
import LabelCollapsable from '@/components/widgets/LabelCollapsable.vue';
import { watchArray } from '@vueuse/core';

const props = defineProps<{
  mode: string;
  theAffects: ZodAffectType[];
  affectsToDelete: ZodAffectType[];
  error: Record<string, any>[];
}>();

const emit = defineEmits<{
  'file-tracker': [value: object];
  'affect:remove': [value: ZodAffectType];
  'affect:recover': [value: ZodAffectType];
  'add-blank-affect': [];
}>();

const { theAffects, affectsToDelete } = toRefs(props);

const isProductStreamDefined = (affect: ZodAffectType) => affect.ps_module && affect.ps_component;

const affectedModules = uniques(theAffects.value.map((affect) => affect.ps_module));

const componentAffectsInModule = (moduleName: string) =>
  theAffects.value.filter((affect) => affect.ps_module === moduleName); 

const streamsAccordionState = ref(
  theAffects.value
    .filter(isProductStreamDefined)
    .reduce(
      (accordionStates: Record<string, boolean>, affect) => {
        accordionStates[streamPath(affect)] = false;
        accordionStates[affect.ps_module] = false;
        return accordionStates;
      },
      {}
    )
);

watchArray(theAffects.value, (nextList, priorList, addedAffects) => {
  addedAffects
    .reduce(
      (accordionStates: Record<string, boolean>, affect) => {
        accordionStates[streamPath(affect)] = false;
        accordionStates[affect.ps_module] = false;
        return accordionStates;
      },
      {}
    );
},
{ deep: true });


function collapseAll() {
  for (const streamName in streamsAccordionState.value) {
    streamsAccordionState.value[streamName] = false;
  }
}

function toggle(path: string) {
  streamsAccordionState.value[path] = !streamsAccordionState.value[path];
}

const ungroupedAffects = computed(() =>
  theAffects.value.filter((affect) => !affect.ps_module || !affect.uuid),
);

function moduleComponentName(moduleName: string = '<module not set>', componentName: string) {
  return `${moduleName}/${componentName}`;
}

function streamPath(affect: ZodAffectType) {
  return `${affect.ps_module}/${affect.ps_component}`;
}
</script>

<template>
  <div v-if="theAffects && mode === 'edit'" class="osim-affects">
    <h4 class="mb-4">
      Affected Offerings
      <button
        v-if="Object.values(streamsAccordionState).some(Boolean)"
        type="button"
        class="btn btn-sm btn-secondary"
        @click="collapseAll()"
      >
        Collapse All
      </button>
    </h4>
    <div v-for="(moduleName) in affectedModules" :key="moduleName">
      <LabelCollapsable
        :isExpanded="streamsAccordionState[moduleName]"
        class="mb-3"
        @setExpanded="toggle(moduleName)"
      >
        <template #label>
          <label class="ms-2 form-label">
            {{ `${moduleName} (${Object.keys(componentAffectsInModule(moduleName)).length} affected)` }}
          </label>
        </template>
        <template #buttons>
          <div v-if="streamsAccordionState?.[moduleName]" class="btn-group">
            <div class="dropdown">
              <button
                class="btn btn-white btn-outline-black btn-sm dropdown-toggle ms-2"
                type="button"
                data-bs-toggle="dropdown"
              >
                Bulk Action
              </button>
              <div class="dropdown-menu">
                <a class="dropdown-item" href="#"> 🚧 Change Affected Module for all components</a>
                <a class="dropdown-item" href="#"> 🚧 Change Status for all components</a>
                <a class="dropdown-item" href="#"> 🚧 Auto-file for all components</a>
              </div>
            </div>
          </div>
        </template>
        <div
          v-for="(affectedComponent, index) in componentAffectsInModule(moduleName)"
          :key="index"
          class="affected-offering"
        >
          <AffectExpandableForm
            v-model="componentAffectsInModule(moduleName)[index]"
            :componentName="affectedComponent.ps_component"
            :affectedComponent="affectedComponent"
            :isExpanded="streamsAccordionState[streamPath(affectedComponent)]"
            :error="error[theAffects.indexOf(affectedComponent)]"
            @setExpanded="toggle(streamPath(affectedComponent))"
            @affect:remove="emit('affect:remove', affectedComponent)"
            @file-tracker="emit('file-tracker', $event)"
          />
        </div>
      </LabelCollapsable>
    </div>
    <h5 v-if="ungroupedAffects.length">Unsaved/Modified Affected Offerings</h5>
    <div v-for="(affect, affectIndex) in ungroupedAffects" :key="affectIndex">
      <AffectedOfferingForm
        v-model="ungroupedAffects[affectIndex]"
        :error="error[affectIndex]"
        @affect:remove="emit('affect:remove', affect)"
      />
    </div>
    <button type="button" class="btn btn-secondary mt-3" @click.prevent="emit('add-blank-affect')">
      Add New Affect
    </button>
    <div v-if="affectsToDelete.length" class="mt-3 row">
      <div class="col-auto bg-warning rounded-3 p-3">
        <h5>Affected Offerings To Be Deleted</h5>
        <div v-for="(affect, affectIndex) in affectsToDelete" :key="affectIndex">
          <ul>
            <li>
              <span class="bg-primary">
                {{ moduleComponentName(affect.ps_module, affect.ps_component) }}
                {{ !affect.uuid ? "(doesn't exist yet in OSIDB)" : '' }}
              </span>
              <button
                type="button"
                class="btn btn-secondary"
                @click.prevent="emit('affect:recover', affect)"
              >
                Recover
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
