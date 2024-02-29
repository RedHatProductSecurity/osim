<script setup lang="ts">
import { computed, toRefs, ref } from 'vue';

import { groupBy, objectMap } from '@/utils/helpers';
import { type ZodAffectType } from '@/types/zodFlaw';

import AffectedOfferingForm from '@/components/AffectedOfferingForm.vue';
import LabelCollapsable from '@/components/widgets/LabelCollapsable.vue';

const props = defineProps<{
  mode: string;
  theAffects: ZodAffectType[];
  affectsToDelete: ZodAffectType[];
}>();

const emit = defineEmits<{
  'file-tracker': [value: object];
  remove: [value: ZodAffectType];
  recover: [value: ZodAffectType];
  'add-blank-affect': [];
}>();
const { theAffects, affectsToDelete } = toRefs(props);

const sortedByGroup = <T extends { ps_module: string }>(array: T[]) =>
  groupBy(
    array
      .filter(({ ps_module }) => ps_module)
      .sort(({ ps_module: a }, { ps_module: b }) => a.localeCompare(b)),
    ({ ps_module }) => ps_module,
  );

const groupedAffects = computed(() => sortedByGroup(theAffects.value));

const directoryOfCollapsed = ref(initializeCollapsedStates());

function collapseAll(inModuleName?: string) {
  if (inModuleName) {
    directoryOfCollapsed.value[inModuleName] = objectMap(
      directoryOfCollapsed.value[inModuleName],
      () => ({ isExpanded: false }),
    );
  } else {
    directoryOfCollapsed.value = initializeCollapsedStates();
  }
}


function initializeCollapsedStates(isExpanded = false) {
  return objectMap(
    sortedByGroup(theAffects.value),
    (key, value): Record<string, any> => ({
      isExpanded,
      ...Object.fromEntries(value.map((affect) => [affect.ps_component, { isExpanded }])),
    }),
  );
}

const ungroupedAffects = computed(() => theAffects.value.filter((affect) => !affect.ps_module));

function moduleComponentName(moduleName: string = '<module not set>', componentName: string) {
  return `${moduleName}::${componentName}`;
}
</script>

<template>
  <div v-if="theAffects && mode === 'edit'" class="osim-affects mb-3">
    <hr />
    <h5 class="mb-4">
      Affected Offerings

      <button type="button" class="btn btn-sm btn-secondary" @click="collapseAll()">
        Collapse All
      </button>
    </h5>
    <div v-for="(moduleAffects, moduleName) in groupedAffects" :key="moduleName">
      <LabelCollapsable v-model="directoryOfCollapsed[moduleName].isExpanded" class="mb-3">
        <template #label>
          <label class="ms-2 form-label">
            {{ `${moduleName} (${moduleAffects.length} affected)` }}
          </label>

          <button
            v-if="directoryOfCollapsed[moduleName].isExpanded"
            type="button"
            class="rounded-pill btn btn-sm btn-secondary ms-3"
            @click="collapseAll(moduleName as string)"
          >
            Collapse Components
          </button>
        </template>
        <div
          v-for="(affects, componentName) in groupBy(
            moduleAffects,
            ({ ps_component }) => ps_component,
          )"
          :key="componentName"
          class="container-fluid row affected-offering"
        >
          <LabelCollapsable
            v-model="directoryOfCollapsed[moduleName][componentName].isExpanded"
            :label="`${componentName} (${affects.length} affected)`"
            class="mt-2"
          >
            <div v-for="(affect, affectIndex) in affects" :key="affectIndex">
              <AffectedOfferingForm
                v-model="affects[affectIndex]"
                @remove="emit('remove', affect)"
                @file-tracker="emit('file-tracker', $event)"
              />
            </div>
          </LabelCollapsable>
        </div>
      </LabelCollapsable>
    </div>
    <h5 v-if="ungroupedAffects.length">Ungrouped Affected Offerings</h5>
    <div v-for="(affect, affectIndex) in ungroupedAffects" :key="affectIndex">
      <AffectedOfferingForm
        v-model="ungroupedAffects[affectIndex]"
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
