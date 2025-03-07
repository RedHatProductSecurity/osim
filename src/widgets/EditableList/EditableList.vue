<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';

import { equals } from 'ramda';

import { useModal } from '@/composables/useModal';

import Modal from '@/widgets/Modal/Modal.vue';
import { deepCopyFromRaw } from '@/utils/helpers';
import LabelCollapsible from '@/widgets/LabelCollapsible/LabelCollapsible.vue';

const props = defineProps<{
  entitiesName?: string;
  entityName: string;
  mode: 'create' | 'edit';
}>();
const items = defineModel<any[]>({ default: [] });
const emit = defineEmits<{
  'item:delete': [value: string];
  'item:new': [];
  'item:save': [value: any[]];
}>();

const modals = computed(() => Object.fromEntries(items.value.map(item => [item.uuid, useModal()])));

function useModalForItem(uuid: string) {
  return modals.value[uuid];
}

const entityNamePlural = computed(() => props.entitiesName || `${props.entityName}s`);

const isExpanded = ref(false);

onMounted(() => {
  savedValues.value = deepCopyFromRaw(items.value);
  priorValues.value = deepCopyFromRaw(items.value);
});

const indexBeingEdited = ref<null | number>(null);
const isBeingEdited = (index: number) => indexBeingEdited.value === index;
const priorValues = ref<any[]>([]);
const savedValues = ref<any[]>([]);

function modifiedItem(index: number) {
  return items.value[index].uuid && !equals(items.value[index], savedValues.value[index]);
}

const itemsToSave = computed((): any[] => [
  ...items.value.filter((item, index) => modifiedItem(index)),
  ...items.value.filter(({ uuid }) => !uuid),
]);

watch(indexBeingEdited, (nextIndex, prevIndex) => {
  if (prevIndex != null && nextIndex != null) {
    commitEdit();
    setEdit(nextIndex);
  }
});

function addItem() {
  isExpanded.value = true;
  emit('item:new');
}

function saveItems() {
  emit('item:save', itemsToSave.value);
}

function cancelEdit(index: number) {
  items.value[index] = deepCopyFromRaw(priorValues.value[index]);
  indexBeingEdited.value = null;
}

function setEdit(index: number) {
  indexBeingEdited.value = index;
}

function commitEdit() {
  priorValues.value = deepCopyFromRaw(items.value);
  indexBeingEdited.value = null;
}

defineExpose({ isExpanded });
</script>

<template>
  <div>
    <LabelCollapsible
      :label="`${entityNamePlural}: ${items.length}`"
      :isExpandable="items.length > 0"
      :isExpanded="isExpanded"
      @toggleExpanded="isExpanded = !isExpanded"
    >
      <div
        v-for="(item, itemIndex) in items"
        :id="item.uuid"
        :key="itemIndex"
        class="card p-3 pb-1 mb-3 rounded-3 osim-editable-list-card bg-lighter-gray"
        :class="{
          'bg-light-green': !item.uuid,
          'bg-light-yellow': modifiedItem(itemIndex),
        }"
      >
        <div>
          <div v-if="item.uuid" class="osim-list-edit">
            <slot
              v-if="isBeingEdited(itemIndex)"
              name="edit-form"
              v-bind="{ item, items, itemIndex, ...useModalForItem(item.uuid) }"
            />
            <slot
              v-else
              name="default"
              v-bind="{ item, items, itemIndex, ...useModalForItem(item.uuid) }"
            />

            <div class="buttons">
              <button
                v-if="indexBeingEdited !== itemIndex"
                type="button"
                class="btn pe-1"
                @click="setEdit(itemIndex)"
              >
                <i class="bi bi-pencil">
                  <span class="visually-hidden">Edit {{ entityName }}</span>
                </i>
              </button>
              <button
                v-if="indexBeingEdited !== itemIndex"
                type="button"
                class="btn ps-1"
                @click="useModalForItem(item.uuid).openModal"
              >
                <i class="bi bi-trash">
                  <span class="visually-hidden">Delete {{ entityName }}</span></i>
              </button>
              <button
                v-if="indexBeingEdited === itemIndex"
                type="button"
                class="btn pe-0 pt-0"
                @click="commitEdit()"
              >
                <i class="bi bi-check fs-4">
                  <span class="visually-hidden">Confirm {{ entityName }} Edit </span>
                </i>
              </button>
              <button
                v-if="indexBeingEdited === itemIndex"
                type="button"
                class="btn ps-0 pt-0 pe-2"
                @click="cancelEdit(itemIndex)"
              >
                <i class="bi bi-x fs-4">
                  <span class="visually-hidden">Cancel {{ entityName }} Edit </span>
                </i>
              </button>
            </div>
          </div>
          <div v-else class="osim-list-create">
            <slot
              name="create-form"
              v-bind="{ item, items, itemIndex, ...useModalForItem(item.uuid) }"
            />
          <!-- if new and not saved in DB -->
          </div>
        </div>
        <Modal
          v-if="item.uuid"
          :show="useModalForItem(item.uuid).isModalOpen.value"
          @close="useModalForItem(item.uuid).closeModal"
        >
          <template #body>
            <slot
              name="modal-body"
              v-bind="{ item, items, itemIndex, ...useModalForItem(item.uuid) }"
            />
          </template>
          <template #header>
            <slot
              name="modal-header"
              v-bind="{ item, items, itemIndex, ...useModalForItem(item.uuid) }"
            />
          </template>
          <template #footer>
            <slot
              name="modal-footer"
              v-bind="{ item, items, itemIndex, ...useModalForItem(item.uuid) }"
            />
          </template>
        </Modal>
      </div>
    </LabelCollapsible>
    <form>
      <button
        v-if="props.mode !== 'create'"
        type="button"
        class="btn btn-primary me-2"
        :class="{ disabled: itemsToSave.length === 0 }"
        @click.prevent="saveItems()"
      >
        Save Changes to {{ entityNamePlural }}
      </button>
      <button type="button" class="btn btn-secondary" @click="addItem()">
        Add {{ entityName }}
      </button>
    </form>
  </div>
</template>

<style lang="scss" scoped>
header select {
  max-width: 28rem;
}

.osim-editable-list-card {
  .buttons {
    position: absolute;
    right: 0;
    top: 0;

    .bi {
      font-size: 1rem;
    }
  }
}
</style>
