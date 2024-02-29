<script setup lang="ts">
import { computed, toRefs, ref, watch, nextTick } from 'vue';

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

const sortedByGroup = <T extends Record<string, any>>(array: T[], key: string) =>
  groupBy(
    array
      .filter((item: T) => item[key])
      .sort((itemA: T, itemB: T) => itemA[key].localeCompare(itemB[key])),
    (item: T) => item[key],
  );

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

watch(
  props.theAffects,
  () => {
    directoryOfCollapsed.value = {
      ...initializeCollapsedStates(affectsWithDefinedModules.value),
      ...directoryOfCollapsed.value,
    };
  },
  { deep: true },
);

function collapseAll() {
  directoryOfCollapsed.value = initializeCollapsedStates(theAffects.value);
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

function componentLabel(affectedComponent: ZodAffectType) {
  return affectedComponent.uuid
    ? `(${affectedComponent.trackers?.length || 0} trackers)`
    : '(unsaved in OSIDB)';
}

const ungroupedAffects = computed(() =>
  theAffects.value.filter((affect) => !affect.ps_module || !affect.uuid),
);

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
    <div v-for="(affectedComponents, moduleName) in affectedModules" :key="moduleName">
      <LabelCollapsable v-model="directoryOfCollapsed[moduleName].isExpanded" class="mb-3">
        <template #label>
          <label class="ms-2 form-label">
            {{ `${moduleName} (${Object.keys(affectedComponents).length} affected)` }}
          </label>
        </template>
        <div
          v-for="(affectedComponent, componentName) in affectedComponents"
          :key="componentName"
          class="affected-offering"
        >
          <LabelCollapsable
            v-model="directoryOfCollapsed[moduleName][componentName].isExpanded"
            :label="`${componentName} ${componentLabel(affectedComponent)}`"
            class="mt-2"
          >
            <AffectedOfferingForm
              v-model="affectedComponents[componentName]"
              @remove="emit('remove', affectedComponent)"
              @file-tracker="emit('file-tracker', $event)"
            />
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
