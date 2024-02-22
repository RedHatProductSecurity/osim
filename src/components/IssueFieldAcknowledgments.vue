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
            <input
              id=""
              v-model="items[itemIndex].name"
              type="text"
              name=""
            />
            from
            <input
              id=""
              v-model="items[itemIndex].affiliation"
              type="text"
              name=""
            />
          </div>
        </div>
      </template>

      <template #create-form="{ items, itemIndex }">
        <div class="form-group">
          <div>
            <input
              id=""
              v-model="items[itemIndex].name"
              type="text"
              name=""
            />
            from
            <input
              id=""
              v-model="items[itemIndex].affiliation"
              type="text"
              name=""
            />
          </div>
        </div>
      </template>

    </EditableList>
  </div>
</template>

<script setup lang="ts">
import EditableList from '@/components/widgets/EditableList.vue';
import type { ZodFlawAcknowledgmentType } from '@/types/zodFlaw';
const acknowledgments = defineModel<ZodFlawAcknowledgmentType[]>();

const emit = defineEmits(['update:acknowledgments', 'addBlankAcknowledgment:flaw']);

type EmissionType = {
  emitType: string;
  itemsToSave?: ZodFlawAcknowledgmentType[];
};

function handleUpdate(emission: EmissionType) {
  switch (emission.emitType) {
  case 'saveItems':
    return emit('update:acknowledgments', emission.itemsToSave);
  case 'addNew':
    return emit('addBlankAcknowledgment:flaw');
  default:
    return;
  }
}
</script>
