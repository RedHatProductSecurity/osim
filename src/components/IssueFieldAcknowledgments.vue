<template>
  <div>
    <EditableList
      v-model="acknowledgments"
      entityName="Acknowledgment"
      @generic-update="handleUpdate"
    >
      <template #default="{ name, affiliation }">
        <div class="form-group">
          <div>{{ name }} from {{ affiliation }}</div>
        </div>
      </template>

      <template #edit-form="{ items, itemIndex }">
        <div class="form-group">
          <div>
            <input v-model="items[itemIndex].name" type="text" />
            from
            <input v-model="items[itemIndex].affiliation" type="text" />
          </div>
        </div>
      </template>

      <template #create-form="{ items, itemIndex }">
        <div class="form-group">
          <div>
            <input v-model="items[itemIndex].name" type="text" />
            from
            <input v-model="items[itemIndex].affiliation" type="text" />
          </div>
        </div>
      </template>

      <template #modal="{item, closeModal}">
        <div>
          <p class="text-danger">Are you sure you want to delete this acknowledgment?</p>
          <button
            type="button"
            class="btn btn-danger"
            @click="handleUpdate({ emitType: 'delete::item', itemToDelete: item.uuid })"
          >
            Confirm
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            @click="closeModal"
          >
            Cancel
          </button>
        </div>
      </template>
    </EditableList>
  </div>
</template>

<script setup lang="ts">
import EditableList from '@/components/widgets/EditableList.vue';
import type { ZodFlawAcknowledgmentType } from '@/types/zodFlaw';

const acknowledgments = defineModel<ZodFlawAcknowledgmentType[]>();

const emit = defineEmits([
  'update:acknowledgments',
  'addBlankAcknowledgment:flaw',
  'delete:acknowledgment',
]);

type EmissionType = {
  emitType: string;
  itemsToSave?: ZodFlawAcknowledgmentType[];
  itemToDelete?: string;
};

function handleUpdate(emission: EmissionType) {
  console.log(emission)
  switch (emission.emitType) {
  case 'save::items':
    return emit('update:acknowledgments', emission.itemsToSave);
  case 'delete::item':
    return emit('delete:acknowledgment', emission.itemToDelete);
  case 'new::item':
    return emit('addBlankAcknowledgment:flaw');
  default:
    return;
  }
}
</script>
