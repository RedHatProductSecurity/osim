<script setup lang="ts">
import { ref } from 'vue';

import EditableList from '@/widgets/EditableList/EditableList.vue';
import type { ZodFlawAcknowledgmentType } from '@/types/zodFlaw';
import LabelInput from '@/widgets/LabelInput/LabelInput.vue';

defineProps<{
  error: null | Record<string, any>[];
  mode: 'create' | 'edit';
}>();

const acknowledgments = defineModel<ZodFlawAcknowledgmentType[]>();

const emit = defineEmits<{
  'acknowledgment:cancel-new': [value: ZodFlawAcknowledgmentType];
  'acknowledgment:delete': [value: string];
  'acknowledgment:new': [];
  'acknowledgment:update': [value: any[]];
}>();

function handleDelete(uuid: string, closeModal: () => void) {
  emit('acknowledgment:delete', uuid);

  closeModal();
}

const editableListComp = ref<InstanceType<typeof EditableList> | null>(null);

defineExpose({ editableListComp });
</script>

<template>
  <div>
    <EditableList
      ref="editableListComp"
      v-model="acknowledgments"
      :mode="mode"
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
          <div class="ps-3">
            <LabelInput
              v-model="items[itemIndex].name"
              label="Name"
              :error="error?.[itemIndex].name"
              type="text"
            />
            <LabelInput
              v-model="items[itemIndex].affiliation"
              label="Affiliation"
              :error="error?.[itemIndex].affiliation"
              type="text"
            />
          </div>
        </div>
      </template>

      <template #create-form="{ items, itemIndex }">
        <div class="form-group">
          <div class="ps-3">
            <LabelInput
              v-model="items[itemIndex].name"
              label="Name"
              :error="error?.[itemIndex].name"
              type="text"
            />
            <LabelInput
              v-model="items[itemIndex].affiliation"
              label="Affiliation"
              :error="error?.[itemIndex].affiliation"
              type="text"
            />
          </div>
          <button
            type="button"
            class="btn osim-cancel-new-acknowledgment"
            @click="emit('acknowledgment:cancel-new', items[itemIndex])"
          >
            <i class="bi bi-x" />
          </button>
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
