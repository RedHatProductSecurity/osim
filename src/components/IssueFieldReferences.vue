<script setup lang="ts">
import LabelStatic from '@/components/widgets/LabelStatic.vue';
import LabelInput from '@/components/widgets/LabelInput.vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import EditableList from '@/components/widgets/EditableList.vue';
import type { ZodFlawReferenceType } from '@/types/zodFlaw';
import { flawReferenceTypeValues } from '@/types/zodFlaw';

const references = defineModel<ZodFlawReferenceType[]>({ default: null });

const excludedReferenceTypes = ['SOURCE'];
const allowedReferenceTypes = flawReferenceTypeValues.filter(
  (referenceType) => !excludedReferenceTypes.includes(referenceType),
);

const referenceTypeLabel = (label: string) =>
  ({
    ARTICLE: 'Red Hat Security Bulletin (RHSB)',
    EXTERNAL: 'External',
  })[label] || null;

const emit = defineEmits<{
  'reference:update': [value: any[]];
  'reference:new': [];
  'reference:delete': [value: string];
}>();

function handleDelete(uuid: string, closeModal: () => void) {
  emit('reference:delete', uuid);
  closeModal();
}
</script>

<template>
  <div>
    <EditableList
      v-model="references"
      entityName="Reference"
      @item:save="emit('reference:update', $event)"
      @item:delete="emit('reference:delete', $event)"
      @item:new="emit('reference:new')"
    >
      <template #default="{ item: { url, type, updated_dt, ...item } }">
        <a :href="url" target="_blank">
          <span class="me-2">{{ updated_dt }}</span>
          <span
            class="badge rounded-pill"
            :class="{
              'bg-primary': type === 'ARTICLE',
              'bg-warning': type !== 'ARTICLE',
            }"
          >
            {{ referenceTypeLabel(type) }}
          </span>
        </a>
        <div class="form-group">
          <LabelStatic v-model="item.description" label="Description" hasTopLabelStyle />
        </div>
      </template>

      <template #edit-form="{ items, itemIndex }">
        <div class="form-group">
          <div>
            <LabelInput v-model="items[itemIndex].url" label="Link URL" />
            <LabelTextarea v-model="items[itemIndex].description" label="Description" />
            <select v-model="items[itemIndex].type" class="form-select mb-3 osim-reference-types">
              <option value="" disabled selected>Select a reference type</option>
              <option
                v-for="referenceType in allowedReferenceTypes"
                :key="referenceType"
                :value="referenceType"
              >
                Change to {{ referenceTypeLabel(referenceType) }} Reference
              </option>
            </select>
          </div>
        </div>
      </template>

      <template #create-form="{ items, itemIndex }">
        <div class="form-group">
          <div>
            <LabelInput v-model="items[itemIndex].url" label="Link URL" />
            <LabelTextarea v-model="items[itemIndex].description" label="Description" />
            <select v-model="items[itemIndex].type" class="form-select mb-3 osim-reference-types">
              <option value="" disabled selected>Select a reference type</option>
              <option
                v-for="referenceType in allowedReferenceTypes"
                :key="referenceType"
                :value="referenceType"
              >
                {{ referenceTypeLabel(referenceType) }}
              </option>
            </select>
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

<style lang="scss" scoped>
select.osim-reference-types {
  max-width: 28rem;
}
</style>
