<script setup lang="ts">
import EditableList from '@/components/widgets/EditableList.vue';
import type { ZodFlawAcknowledgmentType } from '@/types/zodFlaw';

const acknowledgments = defineModel<ZodFlawAcknowledgmentType[]>();

const emit = defineEmits<{
  'acknowledgment:update': [value: any[]];
  'acknowledgment:new': [];
  'acknowledgment:cancel-new': [value: ZodFlawAcknowledgmentType];
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
      <template #default="{ item: { name, affiliation, uuid } }">
        <div class="form-group mb-2">
          {{ uuid }}
          <div>{{ name }} from {{ affiliation }}</div>
        </div>
      </template>

      <template #edit-form="{ items, itemIndex }">
        <div class="form-group">
          <div class="d-flex">
            <input v-model="items[itemIndex].name" class="form-control" type="text" />
            <p class="px-3 my-2">from</p>
            <input v-model="items[itemIndex].affiliation" class="form-control" type="text" />
          </div>
        </div>
      </template>

      <template #create-form="{ items, itemIndex }">
        <div class="form-group">
          <div class="d-flex">
            <input v-model="items[itemIndex].name" class="form-control" type="text" />
            <p class="px-3 my-2">from</p>
            <input v-model="items[itemIndex].affiliation" class="form-control" type="text" />
            <button
              class="btn osim-cancel-new-acknowledgment"
              @click="emit('acknowledgment:cancel-new', items[itemIndex])"
            >
              <i class="bi bi-x" />
            </button>
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

<style scoped>  
.form-group {
  width: 90%;
  margin-bottom: 10px;
}

.osim-cancel-new-acknowledgment {
  cursor: pointer;
  position: absolute;
  right: 8px;
  top: 0;
  padding: 0;
  font-size: 1.5rem;
}
</style>
