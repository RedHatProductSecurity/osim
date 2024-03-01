<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { deepCopyFromRaw } from '@/utils/helpers';
import Modal from '@/components/widgets/Modal.vue';
import { useModal } from '@/composables/useModal';
const { isModalOpen, openModal, closeModal } = useModal();

import LabelCollapsable from './LabelCollapsable.vue';

const items = defineModel<any[]>({ default: [] });
const props = defineProps<{
  entityName: string;
  entitiesName?: string;
}>();

const emit = defineEmits<{
  'save::items': [value: any[]];
  'new::item': [];
  'delete::item':[value: string];
}>();

const entityNamePlural = computed(() => props.entitiesName || `${props.entityName}s`);

onMounted(() => (priorValues.value = deepCopyFromRaw(items.value)));

const indexBeingEdited = ref<number | null>(null);
const isBeingEdited = (index: number) => indexBeingEdited.value === index;
const priorValues = ref<any[]>([]);
const modifiedItemIndexes = ref<number[]>([]);

const itemsToSave = computed((): any[] => [
  ...items.value.filter((item, index) => modifiedItemIndexes.value.includes(index)),
  ...items.value.filter(({ uuid }) => !uuid),
]);

function cancelEdit(index: number) {
  items.value[index] = deepCopyFromRaw(priorValues.value[index]);
  indexBeingEdited.value = null;
}

function setEdit(index: number) {
  indexBeingEdited.value = index;
}

function commitEdit(index: number) {
  modifiedItemIndexes.value.push(index);
  indexBeingEdited.value = null;
  priorValues.value = deepCopyFromRaw(items.value);
}

function handleConfirm(id: string) {
  emit('delete::item', id );
}
</script>

<template>
  <LabelCollapsable :label="entityNamePlural">
    <div
      v-for="(item, itemIndex) in items"
      :key="itemIndex"
      class="card p-3 pb-1 mb-3 rounded-3 osim-editable-list-card"
      :class="{
        'bg-light-light-orange': modifiedItemIndexes.includes(itemIndex),
        'bg-light-light-gray': !modifiedItemIndexes.includes(itemIndex),
        'bg-light-green': !item.uuid,
      }"
    >
      <div>
        <div v-if="item.uuid" class="osim-list-edit">
          <slot
            v-if="isBeingEdited(itemIndex)"
            name="edit-form"
            v-bind="{ item, items, itemIndex }"
          />
          <slot v-else name="default" v-bind="item" />

          <div class="buttons">
            <button
              v-if="indexBeingEdited !== itemIndex"
              type="button"
              class="btn"
              @click="setEdit(itemIndex)"
            >
              <i class="bi bi-pencil"></i>
            </button>
            <button
              v-if="indexBeingEdited !== itemIndex"
              type="button"
              class="btn"
              @click="openModal"
            >
              <i class="bi bi-trash"></i>
            </button>
            <button
              v-if="indexBeingEdited === itemIndex"
              type="button"
              class="btn"
              @click="commitEdit(itemIndex)"
            >
              <i class="bi bi-check"></i>
            </button>
            <button
              v-if="indexBeingEdited === itemIndex"
              type="button"
              class="btn"
              @click="cancelEdit(itemIndex)"
            >
              <i class="bi bi-x"></i>
            </button>
          </div>
        </div>
        <div v-else class="osim-list-create">
          <slot name="create-form" v-bind="{ item, items, itemIndex }" />
          <!-- if new and not saved in DB -->
        </div>
      </div>
      <Modal :show="isModalOpen" @close="closeModal" @confirm="handleConfirm">
        <template #body>
          <slot
            name="modal-body"
            v-bind="{ item, items, itemIndex, closeModal, isModalOpen, openModal }"
          />
        </template>
        <template #header>
          <slot
            name="modal-header"
            v-bind="{ item, items, itemIndex, closeModal, isModalOpen, openModal }"
          />
        </template>
        <template #footer>
          <slot
            name="modal-footer"
            v-bind="{ item, items, itemIndex, closeModal, isModalOpen, openModal }"
          />
        </template>
      </Modal>
    </div>
    <form>
      <button
        type="button"
        class="btn btn-primary me-2"
        :class="{ disabled: itemsToSave.length === 0 }"
        @click.prevent="emit('save::items', itemsToSave )"
      >
        Save Changes to {{ entityNamePlural }}
      </button>
      <button
        type="button"
        class="btn btn-secondary"
        @click.prevent="emit('new::item')"
      >
        Add {{ entityName }}
      </button>
    </form>
  </LabelCollapsable>
</template>

<style lang="scss" scoped>
header select {
  max-width: 28rem;
}

.osim-editable-list-card {
  position: relative;

  .buttons {
    position: absolute;
    right: 0;
    top: 4px;
  }
}
</style>
