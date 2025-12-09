<script lang="ts" setup>
import { computed, ref } from 'vue';

import { computedAsync, useToggle } from '@vueuse/core';

import { useFlawLabels } from '@/composables/useFlawLabels';

import LabelCollapsible from '@/widgets/LabelCollapsible/LabelCollapsible.vue';
import { FlawLabelTypeEnum, type ZodFlawLabelType } from '@/types/zodFlaw';

import FlawLabelTableEditingRow from './FlawLabelTableEditingRow.vue';

const labelsFromProps = defineModel<ZodFlawLabelType[]>({ required: true });

const {
  deletedLabels,
  isDeletedLabel,
  isNewLabel,
  isUpdatedLabel,
  labels,
  loadContextLabels,
  newLabels,
  updatedLabels,
} = useFlawLabels(labelsFromProps);

const isCreatingLabel = ref(false);
const isUpdatingLabel = ref<string>();
const contextLabels = computedAsync(loadContextLabels, []);
const availableLabels = computed(() =>
  contextLabels.value.filter(contextLabel =>
    !Object.values(labels.value).some(({ label }) => label === contextLabel),
  ),
);

const isExpandedDefault = labelsFromProps.value.some(label => label.contributor || label.state === 'NEW');
const [isExpanded, toggleExpanded] = useToggle(isExpandedDefault);

function handleNewLabel(label: ZodFlawLabelType) {
  newLabels.value.add(label.label);
  labels.value[label.label] = label;
  isCreatingLabel.value = false;
}

function handleUpdateLabel(label: ZodFlawLabelType) {
  updatedLabels.value.add(label.label);
  labels.value[label.label] = label;
  isUpdatingLabel.value = undefined;
}

function handleDeleteLabel(label: ZodFlawLabelType) {
  // if label is new, we can just remove it from the newLabels array
  if (newLabels.value.has(label.label)) {
    newLabels.value.delete(label.label);
    delete labels.value[label.label];
    return;
  }

  deletedLabels.value.add(label.label);
}

function handleUndoDelete(label: ZodFlawLabelType) {
  deletedLabels.value.delete(label.label);
}
</script>
<template>
  <LabelCollapsible :isExpanded @toggle-expanded="toggleExpanded()">
    <template #label>
      <span class="section-label">Contributors</span>
    </template>
    <table class="table table-striped table-hover">
      <thead class="table-dark">
        <tr>
          <th>State</th>
          <th>Type</th>
          <th>Label</th>
          <th>Contributor</th>
          <th class="table-actions-header">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="label in labels"
          :key="label.label"
          :class="{
            'new': isNewLabel(label),
            'updated': isUpdatedLabel(label),
            'deleted': isDeletedLabel(label),
          }"
        >
          <FlawLabelTableEditingRow
            v-if="isUpdatingLabel === label.label"
            :contextLabels="contextLabels"
            :initalLabel="label"
            @save="handleUpdateLabel"
            @cancel="isUpdatingLabel = undefined"
          />
          <template v-else>
            <td
              :class="{
                'fw-bold': label.state === 'REQ',
              }"
            >{{ label.state }}</td>
            <td>{{ label.type }}</td>
            <td
              :class="{
                'fw-bold': label.state === 'REQ',
                'text-decoration-line-through': !label.relevant,
              }"
              :title="!label.relevant ? 'Associated affect was removed' : undefined"
            >{{ label.label }}</td>
            <td>{{ label.contributor }}</td>
            <td>
              <div class="actions">
                <button
                  v-if="!isDeletedLabel(label)"
                  type="button"
                  title="Edit label"
                  class="btn btn-sm btn-dark"
                  @click="isUpdatingLabel = label.label"
                >
                  <i class="bi bi-pencil" />
                </button>
                <button
                  v-if="isDeletedLabel(label)"
                  type="button"
                  title="Undo delete"
                  class="btn btn-sm btn-dark"
                  @click="handleUndoDelete(label)"
                >
                  <i class="bi bi-arrow-counterclockwise" />
                </button>
                <button
                  v-if="label.type !== FlawLabelTypeEnum.PRODUCT_FAMILY && !isDeletedLabel(label)"
                  type="button"
                  title="Delete label"
                  class="btn btn-sm btn-dark"
                  @click="handleDeleteLabel(label)"
                >
                  <i class="bi bi-trash" />
                </button>
              </div>
            </td>
          </template>
        </tr>
        <tr v-if="isCreatingLabel">
          <FlawLabelTableEditingRow
            :contextLabels="availableLabels"
            @save="handleNewLabel"
            @cancel="isCreatingLabel = false"
          />
        </tr>
        <tr v-if="!isCreatingLabel" class="table-new-row">
          <td
            colspan="100%"
            class="text-center"
            title="Add new label"
            @click="isCreatingLabel = true"
          >
            <i
              class="bi bi-plus"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </LabelCollapsible>
</template>

<style scoped lang="scss">
.section-label {
  font-size: 1.5rem;
  margin-left: 0.5rem;
  font-weight: 500;
}

.table {
  --bs-table-bg: #eee;

  th {
    &:nth-of-type(1) {
      width: 10ch;
    }

    &:nth-of-type(2) {
      width: 30%;
    }

    &.table-actions-header {
      width: 10ch;
    }
  }

  tr {
    &.new td {
      border-color: #e0f0ff !important;
      background-color: #e0f0ff;
      color: #036;
    }

    &.updated td {
      border-color: #e9f7df !important;
      background-color: #e9f7df;
      color: #204d00;
    }

    &.deleted td {
      border-color: #ffe3d9 !important;
      background-color: #ffe3d9;
      color: #731f00;
    }

    :deep(td) {
      vertical-align: middle;
    }
  }

  .actions,
  :deep(.actions) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;

    .btn {
      --bs-btn-padding-y: 0.2rem;
    }
  }
}

.table-new-row {
  cursor: pointer;
}
</style>
