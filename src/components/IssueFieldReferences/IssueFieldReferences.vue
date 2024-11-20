<script setup lang="ts">
import { ref } from 'vue';

import LabelStatic from '@/widgets/LabelStatic/LabelStatic.vue';
import LabelSelect from '@/widgets/LabelSelect/LabelSelect.vue';
import LabelInput from '@/widgets/LabelInput/LabelInput.vue';
import LabelTextarea from '@/widgets/LabelTextarea/LabelTextarea.vue';
import EditableList from '@/widgets/EditableList/EditableList.vue';
import type { ZodFlawReferenceType } from '@/types/zodFlaw';
import { flawReferenceTypeValues } from '@/types/zodFlaw';

defineProps<{
  error: null | Record<string, any>[];
  mode: 'create' | 'edit';
}>();

const references = defineModel<ZodFlawReferenceType[]>({ default: null });

const emit = defineEmits<{
  'reference:cancel-new': [value: ZodFlawReferenceType];
  'reference:delete': [value: string];
  'reference:new': [];
  'reference:update': [value: any[]];
}>();
const excludedReferenceTypes = ['SOURCE'];

const referenceTypeLabel = (label: string) =>
  ({
    ARTICLE: 'Red Hat Security Bulletin (RHSB)',
    EXTERNAL: 'External',
    UPSTREAM: 'Upstream',
    SOURCE: 'Source',
  })[label] || null;

function handleDelete(uuid: string, closeModal: () => void) {
  emit('reference:delete', uuid);
  closeModal();
}

const editableListComp = ref<InstanceType<typeof EditableList> | null>(null);

defineExpose({ editableListComp });
</script>

<template>
  <div>
    <EditableList
      ref="editableListComp"
      v-model="references"
      :mode="mode"
      entityName="Reference"
      @item:save="emit('reference:update', $event)"
      @item:delete="emit('reference:delete', $event)"
      @item:new="emit('reference:new')"
    >
      <template #default="{ item: { url, type, ...item } }">
        <div class="info-group">
          <span
            class="badge rounded-pill"
            :class="{
              'bg-primary': type === 'ARTICLE',
              'bg-warning': type !== 'ARTICLE',
            }"
            :style="type !== 'ARTICLE' ? 'color: black' : ''"
          >
            {{ referenceTypeLabel(type) }}
          </span>
          <a class="m-1 mb-3" :href="url" target="_blank">{{ url }}</a>
        </div>
        <div v-if="item.description" class="form-group">
          <LabelStatic v-model="item.description" label="Description" hasTopLabelStyle />
        </div>
      </template>

      <template #edit-form="{ items, itemIndex }">
        <div class="form-group">
          <div class="p-3 pt-4">
            <LabelInput v-model="items[itemIndex].url" label="Link URL" :error="error?.[itemIndex].url" />
            <LabelTextarea
              v-model="items[itemIndex].description"
              label="Description"
            />
            <LabelSelect
              v-model="items[itemIndex].type"
              label="Reference type"
              :error="null"
              :options="Object.fromEntries(flawReferenceTypeValues.map(type=> [referenceTypeLabel(type), type]))"
              :options-hidden="excludedReferenceTypes"
            />
          </div>
        </div>
      </template>

      <template #create-form="{ items, itemIndex }">
        <div class="form-group">
          <div class="ms-3 me-4">
            <button
              type="button"
              class="btn osim-cancel-new-reference"
              @click="emit('reference:cancel-new', items[itemIndex])"
            >
              <i class="bi bi-x" />
            </button>
            <LabelInput v-model="items[itemIndex].url" label="Link URL" :error="error?.[itemIndex].url" />
            <LabelTextarea
              v-model="items[itemIndex].description"
              label="Description"
              :error="error?.[itemIndex].description"
            />
            <LabelSelect
              v-model="items[itemIndex].type"
              label="Reference type"
              :error="null"
              :options="Object.fromEntries(flawReferenceTypeValues.map(type=> [referenceTypeLabel(type), type]))"
              :options-hidden="excludedReferenceTypes"
            />
          </div>
        </div>
      </template>
      <template #modal-header>
        <div>
          <h5>Confirm Reference Deletion</h5>
        </div>
      </template>
      <template #modal-body>
        <div>
          <p class="text-danger">
            Are you sure you want to delete this reference? This action will take place
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

.osim-cancel-new-reference {
  position: absolute;
  right: 8px;
  top: 0;
  padding: 0;
  cursor: pointer;
  font-size: 1.5rem;
}

.info-group {
  display: flex;
  flex-direction: column;
}

.badge {
  max-width: fit-content;
}
</style>
