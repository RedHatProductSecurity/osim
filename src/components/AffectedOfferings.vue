<script setup lang="ts">
import { computed, toRefs, ref, watch } from 'vue';

import { type ZodAffectType } from '@/types/zodAffect';
import { uniques } from '@/utils/helpers';
import AffectExpandableForm from '@/components/AffectExpandableForm.vue';
import LabelCollapsible from '@/components/widgets/LabelCollapsible.vue';
import OsimButton from '@/components/widgets/OsimButton.vue';

const props = defineProps<{
  theAffects: ZodAffectType[];
  affectsToDelete: ZodAffectType[];
  error: Record<string, any>[] | null;
  wereAffectsDeleteted: boolean;
}>();

const emit = defineEmits<{
  'file-tracker': [value: object];
  'affect:remove': [value: ZodAffectType];
  'affect:recover': [value: ZodAffectType];
  'add-blank-affect': [];
}>();

const { theAffects, affectsToDelete } = toRefs(props);

const affectedModules = computed(() => uniques(theAffects.value.map((affect) => affect.ps_module)));

const expandedModules = ref<Record<string, boolean>>({});

const componentAffectsInModule = (moduleName: string) =>
  theAffects.value.filter((affect) => affect.ps_module === moduleName);

const expandedAffects = ref(new Map());

updateAffectsExpandedState(theAffects.value);

watch(expandedAffects, (nextValue) => {
  console.log('ofVisibleComponentsIs', nextValue);
}, { deep: true });

watch(theAffects, (nextValue) => {
  expandedModules.value = affectedModules.value.reduce((modules: Record<string, boolean>, moduleName: string) => {
    modules[moduleName] = areAnyComponentsExpandedIn(moduleName) ?? false;
    return modules;
  }, {});
  updateAffectsExpandedState(nextValue);
}, { deep: true });

const areAnyComponentsExpanded = computed(
  () => affectedModules.value.some((moduleName) => componentAffectsInModule(moduleName).some(isExpanded))
);

const isAnythingExpanded = computed(() => (
  areAnyComponentsExpanded.value
  || Object.values(expandedModules.value).some(Boolean)
));

function areAnyComponentsExpandedIn (moduleName: string) {
  return componentAffectsInModule(moduleName).some(isExpanded);
}

function updateAffectsExpandedState (affects: any[]) {
  for (const affect of affects) {
    const maybeValue = expandedAffects.value.get(affect);
    expandedAffects.value.set(affect, maybeValue ?? ref(false));
  }
}

function isExpanded(affect: ZodAffectType) {
  return expandedAffects.value.get(affect)?.value ?? true; // new affect is expanded by default;
}

function collapsePsModuleComponents(moduleName: string) {
  const affects = componentAffectsInModule(moduleName);
  for (const affect of affects) {
    expandedAffects.value.set(affect, ref(false));
  }
}

function collapseAll() {
  for (const moduleName in expandedModules.value) {
    collapsePsModuleComponents(moduleName);
    expandedModules.value[moduleName] = false;
  }
}

function togglePsComponentExpansion(affect: ZodAffectType) {
  const isExpanded = expandedAffects.value.get(affect);
  isExpanded.value = !isExpanded.value;
  expandedAffects.value.set(affect, isExpanded);
}

function togglePsModuleExpansion(moduleName: string) {
  expandedModules.value[moduleName] = !expandedModules.value[moduleName];
  if (!expandedModules.value[moduleName]) {
    collapsePsModuleComponents(moduleName);
  }
}

function moduleComponentName(moduleName: string = '<module not set>', componentName: string) {
  return `${moduleName}/${componentName}`;
}

</script>

<template>
  <div v-if="theAffects" class="osim-affects">
    <h4 class="mb-4">
      Affected Offerings
      <button
        v-if="isAnythingExpanded"
        type="button"
        class="btn btn-sm btn-secondary"
        @click="collapseAll()"
      >
        Collapse All
      </button>
    </h4>
    <div v-for="(moduleName) in affectedModules" :key="moduleName">
      <LabelCollapsible
        :isExpanded="expandedModules[moduleName] ?? false"
        class="mb-3"
        @setExpanded="togglePsModuleExpansion(moduleName)"
      >
        <template #label>
          <label class="mx-2 form-label">
            {{ moduleName }}
          </label>
          <span class="badge bg-light-yellow text-dark border border-warning">
            {{ `${Object.keys(componentAffectsInModule(moduleName)).length} affected` }}
          </span>
        </template>
        <template #buttons>
          <div v-if="expandedModules[moduleName]" class="btn-group">
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
          :key="`moduleName-${affectedComponent.ps_component}-${index}`"
          class="osim-affected-offering"
        >
          <AffectExpandableForm
            v-model="componentAffectsInModule(moduleName)[index]"
            :componentName="affectedComponent.ps_component"
            :affectedComponent="affectedComponent"
            :isExpanded="isExpanded(affectedComponent) ?? false"
            :error="error?.[theAffects.indexOf(affectedComponent)] ?? null"
            @setExpanded="togglePsComponentExpansion(affectedComponent)"
            @affect:remove="emit('affect:remove', affectedComponent)"
            @file-tracker="emit('file-tracker', $event)"
          />
        </div>
      </LabelCollapsible>
    </div>
    <button type="button" class="btn btn-secondary mt-3" @click.prevent="emit('add-blank-affect')">
      Add New Affect
    </button>
    <div v-if="affectsToDelete.length" class="mt-3 row">
      <div class="col-auto alert alert-danger rounded-3 p-3">
        <h5 v-if="wereAffectsDeleteted">Deleted Affected Offerings</h5>
        <h5 v-else>Affected Offerings To Be Deleted</h5>
        <div>
          <p
            v-for="(affect, affectIndex) in affectsToDelete"
            :key="affectIndex"
            class="p-0 "
          >
            <OsimButton
              class="m-0 py-0 osim-button btn-success btn btn-sm text-white"
              title="Recover"
              @click.prevent="emit('affect:recover', affect)"
            >
              <i class="bi bi-prescription2"></i>
              Recover
            </OsimButton>
            <span class="m-0 py-0 alert alert-warning">
              {{ moduleComponentName(affect.ps_module, affect.ps_component) }}
              {{ !affect.uuid ? "(doesn't exist yet in OSIDB)" : '' }}
            </span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
