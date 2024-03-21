<script setup lang="ts">
import EditableList from '@/components/widgets/EditableList.vue';
import type { ZodFlawAcknowledgmentType } from '@/types/zodFlaw';

const acknowledgments = defineModel<ZodFlawAcknowledgmentType[]>();

const emit = defineEmits<{
  'acknowledgment:update': [value: any[]];
  'acknowledgment:new': [];
  'acknowledgment:delete': [value: string];
}>();

function handleDelete(uuid: string, closeModal: () => void) {
  emit('acknowledgment:delete', uuid);

  closeModal();
}
</script>

<template>
  <div>
    <EditableList
      v-model="acknowledgments"
      entityName="Acknowledgment"
      @item:save="emit('acknowledgment:update', $event)"
      @item:delete="emit('acknowledgment:delete', $event)"
      @item:new="emit('acknowledgment:new')"
    >
      <template #default="{ item: {name, affiliation, uuid} }">
        <div class="form-group">
          {{ uuid }}
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
      <template #modal-header>
        <div>
          <h5>Confirm Acknowledgment Deletion</h5>
        </div>
      </template>
      <template #modal-body>
        <div>
          <p class="text-danger">
            Are you sure you want to delete this acknowledgment? This action will take place
            immediately and will not require saving the Flaw to take effect.
          </p>
        </div>
      </template>
      <template #modal-footer="{ item, closeModal }">
        <div>
          <button
            type="button"
            class="btn btn-danger me-2"
            @click="handleDelete(item.uuid, closeModal)"
          >
            Confirm
          </button>
          <button type="button" class="btn btn-secondary" @click="closeModal">Cancel</button>
        </div>
      </template>
    </EditableList>
  </div>
</template>
