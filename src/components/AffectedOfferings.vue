<script setup lang="ts">
import { computed, toRefs, ref, watch } from 'vue';

import { objectMap, sortedByGroup } from '@/utils/helpers';
import { type ZodAffectType } from '@/types/zodFlaw';

import AffectedOfferingForm from '@/components/AffectedOfferingForm.vue';
import AffectExpandableForm from '@/components/AffectExpandableForm.vue';
import LabelCollapsable from '@/components/widgets/LabelCollapsable.vue';

const props = defineProps<{
  mode: string;
  theAffects: ZodAffectType[];
  affectsToDelete: ZodAffectType[];
  error: Record<string, any>[];
}>();

const emit = defineEmits<{
  'file-tracker': [value: object];
  remove: [value: ZodAffectType];
  recover: [value: ZodAffectType];
  'add-blank-affect': [];
}>();

const { theAffects, affectsToDelete } = toRefs(props);

const affectsWithDefinedModules = computed(() =>
  theAffects.value.filter((affect) => affect.ps_module && affect.ps_component),
);

const affectedModules = computed(() =>
  objectMap(sortedByGroup(affectsWithDefinedModules.value, 'ps_module'), (module, components) =>
    // Convert to object by extracting inner array value
    objectMap(sortedByGroup(components, 'ps_component'), (k, v) => v[0]),
  ),
);

const directoryOfCollapsed = ref(initializeCollapsedStates(theAffects.value));

props.theAffects.forEach(
  (affect) => {
    watch(
      () => [affect.ps_module, affect.ps_component],
      () => {
        if (affect.ps_module && affect.ps_component) {
          directoryOfCollapsed.value[affect.ps_module] = {
            ...initializeCollapsedStates(affectsWithDefinedModules.value)[affect.ps_module],
            ...directoryOfCollapsed.value[affect.ps_module],
          };
        }
      },
    );
  },
  { deep: true },
);

// watch(
//   props.theAffects,
//   () => {
//     console.log('changed');
//     directoryOfCollapsed.value = {
//       ...directoryOfCollapsed.value,
//       ...initializeCollapsedStates(affectsWithDefinedModules.value),
//     };
//   },
//   { deep: true },
// );

function collapseAll() {
  directoryOfCollapsed.value = initializeCollapsedStates(theAffects.value);
}

function toggle(reference: any) {
  reference.isExpanded = !reference.isExpanded;
}

function initializeCollapsedStates(affects: ZodAffectType[], isExpanded = false) {
  return objectMap(
    sortedByGroup(affects, 'ps_module'),
    (key, value): Record<string, any> => ({
      isExpanded,
      ...Object.fromEntries(value.map((affect: any) => [affect.ps_component, { isExpanded }])),
    }),
  );
}

const ungroupedAffects = computed(() =>
  theAffects.value.filter((affect) => !affect.ps_module || !affect.uuid),
);

function moduleComponentName(moduleName: string = '<module not set>', componentName: string) {
  return `${moduleName}::${componentName}`;
}
</script>

<template>
  <div v-if="theAffects && mode === 'edit'" class="osim-affects">
    <h4 class="mb-4">
      Affected Offerings

      <button
        v-if="Object.values(directoryOfCollapsed).some(({ isExpanded }) => isExpanded)"
        type="button"
        class="btn btn-sm btn-secondary"
        @click="collapseAll()"
      >
        Collapse All
      </button>
    </h4>
    <div v-for="(affectedComponents, moduleName) in affectedModules" :key="moduleName">
      <LabelCollapsable
        :isExpanded="directoryOfCollapsed[moduleName].isExpanded"
        class="mb-3"
        @setExpanded="toggle(directoryOfCollapsed[moduleName])"
      >
        <template #label>
          <label class="ms-2 form-label">
            {{ `${moduleName} (${Object.keys(affectedComponents).length} affected)` }}
          </label>
        </template>
        <template #buttons>
          <div v-if="directoryOfCollapsed[moduleName].isExpanded" class="btn-group">
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
          v-for="(affectedComponent, componentName) in affectedComponents"
          :key="componentName"
          class="affected-offering"
        >
          <AffectExpandableForm
            v-model="affectedComponents[componentName]"
            :componentName="`${componentName}`"
            :affectedComponent="affectedComponent"
            :isExpanded="directoryOfCollapsed[moduleName][componentName].isExpanded"
            :error="error[theAffects.indexOf(affectedComponent)]"
            @setExpanded="toggle(directoryOfCollapsed[moduleName][componentName])"
            @remove="emit('remove', affectedComponent)"
            @file-tracker="emit('file-tracker', $event)"
          />
        </div>
      </LabelCollapsable>
    </div>
    <h5 v-if="ungroupedAffects.length">Ungrouped Affected Offerings</h5>
    <div v-for="(affect, affectIndex) in ungroupedAffects" :key="affectIndex">
      <AffectedOfferingForm
        v-model="ungroupedAffects[affectIndex]"
        :error="error[affectIndex]"
        @remove="emit('remove', affect)"
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
              {{ moduleComponentName(affect.ps_module, affect.ps_component) }}
              {{ !affect.uuid ? "(doesn't exist yet in OSIDB)" : '' }}
              <button
                type="button"
                class="btn btn-secondary"
                @click.prevent="emit('recover', affect)"
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
