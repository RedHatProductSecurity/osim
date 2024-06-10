<script setup lang="ts">
import { computed, toRefs, ref, watch, toRef } from 'vue';

import { type ZodAffectType } from '@/types/zodAffect';
import { uniques } from '@/utils/helpers';
import AffectExpandableForm from '@/components/AffectExpandableForm.vue';
import LabelCollapsible from '@/components/widgets/LabelCollapsible.vue';
import OsimButton from '@/components/widgets/OsimButton.vue';
import LabelEditable from './widgets/LabelEditable.vue';

const props = defineProps<{
  theAffects: ZodAffectType[];
  affectsToDelete: ZodAffectType[];
  error: Record<string, any>[] | null;
}>();

const emit = defineEmits<{
  'file-tracker': [value: object];
  'affect:remove': [value: ZodAffectType];
  'affect:recover': [value: ZodAffectType];
  'add-affect': [value: string];
}>();

const { theAffects, affectsToDelete } = toRefs(props);

const initialAffectedModules = computed(() => uniques(theAffects.value.map((affect) => affect.ps_module)));
const affectedModules = toRef(uniques(theAffects.value.map((affect) => affect.ps_module)));

const expandedModules = ref<Record<string, boolean>>({});

/* Show New component at the top*/
const affectsWithModuleName = (moduleName: string) =>
  theAffects.value.filter((affect) => affect.ps_module === moduleName);
  // theAffects.value.filter((affect) => affect.ps_module === moduleName).reverse();

const expandedAffects = ref(new Map());

updateAffectsExpandedState(theAffects.value);

watch(theAffects, (nextValue) => {
  expandedModules.value = affectedModules.value.reduce((modules: Record<string, boolean>, moduleName: string) => {
    modules[moduleName] = areAnyComponentsExpandedIn(moduleName) ?? false;
    return modules;
  }, {});
  updateAffectsExpandedState(nextValue);
}, { deep: true });

const areAnyComponentsExpanded = computed(
  () => affectedModules.value.some((moduleName) => affectsWithModuleName(moduleName).some(isExpanded))
);

const isAnythingExpanded = computed(() => (
  areAnyComponentsExpanded.value
  || Object.values(expandedModules.value).some(Boolean)
));

const isAnythingCollapsed = computed(() => (
  !Object.values(expandedModules.value).every(Boolean)
));

function areAnyComponentsExpandedIn (moduleName: string) {
  return affectsWithModuleName(moduleName).some(isExpanded);
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
  const affects = affectsWithModuleName(moduleName);
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

function expandAll() {
  for (const moduleName in expandedModules.value) {
    expandedModules.value[moduleName] = true;
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

function isNewModule(moduleName: string) {
  return !initialAffectedModules.value.includes(moduleName)
  || affectsWithModuleName(moduleName).every(affect => !affect.uuid);
}

function addNewModule() {
  affectedModules.value.push('');
}

</script>

<template>
  <div v-if="theAffects" class="osim-affects">
    <h4 class="mb-4">
      Affected Offerings
      <button
        v-if="isAnythingCollapsed"
        type="button"
        class="btn btn-sm btn-secondary me-2"
        @click="expandAll()"
      >
        Expand All
      </button>
      <button
        v-if="isAnythingExpanded"
        type="button"
        class="btn btn-sm btn-secondary"
        @click="collapseAll()"
      >
        Collapse All
      </button>
    </h4>
    <div v-for="(moduleName, moduleNameIndex) in affectedModules" :key="moduleName">
      <div v-if="isNewModule(moduleName)" class="col-6">
        <LabelEditable
          v-model="affectedModules[moduleNameIndex]"
          label="Module Name"
          type="text"
        />
      </div>
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
            {{ `${Object.keys(affectsWithModuleName(moduleName)).length} affected` }}
          </span>
        </template>
        <template #buttons>
          <div v-if="expandedModules[moduleName]" class="d-inline-flex">
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
            <button type="button" class="btn btn-secondary ms-2" @click.prevent="emit('add-affect', moduleName)">
              Add New Component
            </button>
          </div>
        </template>
        <div
          v-for="(affect, index) in affectsWithModuleName(moduleName)"
          :key="`moduleName-${affect.ps_component}-${index}`"
          class="osim-affected-offering"
        >
          <AffectExpandableForm
            v-model="affectsWithModuleName(moduleName)[index]"
            :affect="affect"
            :isExpanded="isExpanded(affect) ?? false"
            :error="error?.[theAffects.indexOf(affect)] ?? null"
            @setExpanded="togglePsComponentExpansion(affect)"
            @affect:remove="emit('affect:remove', affect)"
            @file-tracker="emit('file-tracker', $event)"
          />
        </div>
      </LabelCollapsible>
    </div>
    <button
      type="button"
      class="btn btn-secondary me-3"
      @click.prevent="addNewModule()"
    >
      Add New Module
    </button>
    <div v-if="affectsToDelete.length" class="mt-3 row">
      <div class="col-auto alert alert-danger rounded-3 p-3">
        <h5>Affected Offerings To Be Deleted</h5>
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
