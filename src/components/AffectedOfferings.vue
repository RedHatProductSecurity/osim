<script setup lang="ts">
import { computed, toRefs, ref, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';

import { type ZodAffectType } from '@/types/zodAffect';
import { uniques } from '@/utils/helpers';
import { useTrackers } from '@/composables/useTrackers';

import AffectExpandableForm from '@/components/AffectExpandableForm.vue';
import AffectsTrackers from '@/components/AffectsTrackers.vue';
import LabelCollapsible from '@/components/widgets/LabelCollapsible.vue';
import OsimButton from '@/components/widgets/OsimButton.vue';
import LabelEditable from '@/components/widgets/LabelEditable.vue';

const props = defineProps<{
  flawId: string;
  theAffects: ZodAffectType[];
  affectsToDelete: ZodAffectType[];
  error: Record<string, any>[] | null;
}>();

const emit = defineEmits<{
  'file-tracker': [value: object];
  'affect:remove': [value: ZodAffectType];
  'affect:recover': [value: ZodAffectType];
  'add-blank-affect': [moduleId: string, callback: (affect: ZodAffectType) => void];
  'update-module-name': [previousModuleName: string, newModuleName: string];
}>();

const { theAffects, affectsToDelete } = toRefs(props);

const { getUpdateStreamsFor } = useTrackers(props.flawId, props.theAffects);

const affectsNotBeingDeleted = computed(
  () => theAffects.value.filter((affect) => !affectsToDelete.value.includes(affect))
);

const initialAffectedModules = computed(() => uniques(theAffects.value.map((affect) => affect.ps_module)));
const affectedModules = ref(
  uniques(theAffects.value.map((affect) => affect.ps_module)).map(moduleName => ({
    id: uuidv4(),
    name: moduleName,
    affects: theAffects.value.filter((affect) => affect.ps_module === moduleName),
  }))
);

const expandedModules = ref<Record<string, boolean>>({});

const shouldShowTrackers = ref(false);
const expandedAffects = ref(new Map());
updateAffectsExpandedState(theAffects.value);

watch(theAffects, (nextValue) => {
  const affectTracker = new Set();
  affectedModules.value.forEach(module => {
    module.affects = nextValue.filter(affect => {
      if (affect.ps_module === module.name && !affectTracker.has(affect)) {
        affectTracker.add(affect);
        return true;
      }
      return false;
    });
  });
  expandedModules.value = affectedModules.value.reduce((modules: Record<string, boolean>, module) => {
    modules[module.id] = areAnyComponentsExpandedIn(module.id) || expandedModules.value[module.id] || false;
    return modules;
  }, {});
  updateAffectsExpandedState(nextValue);
}, { deep: true, immediate: true });

const areAnyComponentsExpanded = computed(
  () => affectedModules.value.some((module) => areAnyComponentsExpandedIn(module.id))
);

const isAnythingExpanded = computed(() => (
  areAnyComponentsExpanded.value
  || Object.values(expandedModules.value).some(Boolean)
));

const isAnythingCollapsed = computed(() => (
  !Object.values(expandedModules.value).every(Boolean)
));

function areAnyComponentsExpandedIn (moduleId: string) {
  const module = affectedModules.value.find(module => module.id === moduleId);
  return module?.affects.some(isExpanded) || false;
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

function collapsePsModuleComponents(moduleId: string) {
  const module = affectedModules.value.find((module) => module.id === moduleId);
  const affects = module?.affects || [];
  for (const affect of affects) {
    expandedAffects.value.set(affect, ref(false));
  }
}

function collapseAll() {
  for (const moduleId in expandedModules.value) {
    collapsePsModuleComponents(moduleId);
    expandedModules.value[moduleId] = false;
  }
}

function expandAll() {
  for (const moduleId in expandedModules.value) {
    expandedModules.value[moduleId] = true;
  }
}

function togglePsComponentExpansion(affect: ZodAffectType) {
  if (expandedAffects.value.get(affect) === undefined) {
    expandedAffects.value.set(affect, ref(false));
  }
  const isExpanded = expandedAffects.value.get(affect);
  isExpanded.value = !isExpanded.value;
  expandedAffects.value.set(affect, isExpanded);
}

function togglePsModuleExpansion(moduleId: string) {
  expandedModules.value[moduleId] = !expandedModules.value[moduleId];
  if (!expandedModules.value[moduleId]) {
    collapsePsModuleComponents(moduleId);
  }
}

function moduleComponentName(moduleName: string = '<module not set>', componentName: string) {
  return `${moduleName}/${componentName}`;
}

function editableModuleName(moduleId: string) {
  const module = affectedModules.value.find(module => module.id === moduleId);
  const expandedState = expandedModules.value[moduleId];
  return expandedState && (!initialAffectedModules.value.includes(module?.name ?? '')
  || module?.affects.every(affect => !affect.uuid));
}

function addNewModule() {
  const newModuleName = '';
  const newModuleId = uuidv4();
  affectedModules.value.push({ id: newModuleId, name: newModuleName, affects: [] });
  expandedModules.value[newModuleId] = true;
}

function renameModule(newModuleName: string, index: number) {
  const module = affectedModules.value[index];
  const previousModuleName = module.name;

  // If the new module name already exists, prevent duplicate names
  if (affectedModules.value.some(module => module.name === newModuleName)) {
    console.error('Module name already exists');
    return;
  }

  // Update the module name
  module.name = newModuleName;

  // Clean up expandedModules to remove unnecessary keys
  for (const key in expandedModules.value) {
    if (!affectedModules.value.map(m => m.id).includes(key)) {
      delete expandedModules.value[key];
    }
  }

  emit('update-module-name', previousModuleName, newModuleName);
}

function addNewComponent(moduleId: string) {
  const module = affectedModules.value.find(module => module.id === moduleId);
  if (module) {
    emit('add-blank-affect', module.name, (newAffect) => {
      expandedAffects.value.set(newAffect, ref(true));
    });
  }
}

defineExpose({ togglePsModuleExpansion, togglePsComponentExpansion, isExpanded });

</script>

<template>
  <div v-if="theAffects" class="osim-affects my-2">
    <h4>Affected Offerings</h4>
    <AffectsTrackers
      v-show="shouldShowTrackers"
      :flawId="flawId"
      :theAffects="affectsNotBeingDeleted"
      @affects-trackers:hide="shouldShowTrackers = false"
    />
    <div class="my-2 py-2">
      <button
        v-if="isAnythingCollapsed"
        type="button"
        class="btn btn-sm btn-secondary me-2"
        @click="expandAll()"
      >
        Expand All Affects
      </button>
      <button
        v-if="isAnythingExpanded"
        type="button"
        class="btn btn-sm btn-secondary"
        @click="collapseAll()"
      >
        Collapse All Affects
      </button>
      <button
        v-show="!shouldShowTrackers"
        type="button"
        class="button btn btn-sm btn-black text-white"
        @click="shouldShowTrackers = !shouldShowTrackers"
      >
        <!-- <i class="bi bi-journal-plus"></i> -->
        <i class="bi bi-binoculars"></i>
        Manage Trackers
      </button>
    </div>

    <div v-for="(module, moduleIndex) in affectedModules" :key="`ps_module-${moduleIndex}`">
      <div v-if="editableModuleName(module.id)" class="col-6">
        <LabelEditable
          v-model="module.name"
          label="Module Name"
          type="text"
          @update:modelValue="(value) => renameModule(value as string, moduleIndex)"
        />
      </div>
      <LabelCollapsible
        :isExpanded="expandedModules[module.id] ?? false"
        class="mb-1"
        @setExpanded="togglePsModuleExpansion(module.id)"
      >
        <template #label>
          <label class="mx-2 form-label">
            {{ module.name }}
          </label>
          <span class="badge bg-light-yellow text-dark border border-warning">
            {{ `${module.affects.length} affected` }}
          </span>
        </template>
        <template #buttons>
          <div v-if="expandedModules[module.id]" class="btn-group">
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
            <button
              type="button"
              class="btn btn-sm btn-secondary ms-2"
              @click.prevent="addNewComponent(module.id)"
            >
              Add New Component
            </button>
          </div>
        </template>
        <div
          v-for="(affect, index) in module.affects"
          :key="affect.uuid || `new-affect-${index}`"
          class="osim-affected-offering"
        >
          <AffectExpandableForm
            :id="affect.uuid"
            v-model="module.affects[index]"
            :affect="affect"
            :isExpanded="isExpanded(affect) ?? false"
            :error="error?.[theAffects.indexOf(affect)] ?? null"
            :updateStreams="getUpdateStreamsFor(module.name, affect.ps_component)"
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
