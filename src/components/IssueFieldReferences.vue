<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import LabelTextarea from '@/components/widgets/LabelTextarea.vue';
import type { ZodFlawReferenceType } from '@/types/zodFlaw';
// import LabelDiv from './widgets/LabelDiv.vue';
import { flawReferenceTypeValues } from '@/types/zodFlaw';
import { deepCopyFromRaw } from '@/utils/helpers';
import LabelStatic from './widgets/LabelStatic.vue';
import LabelInput from './widgets/LabelInput.vue';
import LabelCollapsable from './widgets/LabelCollapsable.vue';

const references = defineModel<ZodFlawReferenceType[]>({ default: null });
const emit = defineEmits(['addBlankReference:flaw', 'update:references']);
onMounted(() => (priorValues.value = deepCopyFromRaw(references.value)));

const indexBeingEdited = ref<number | null>(null);
const priorValues = ref<ZodFlawReferenceType[]>([]);
const modifiedReferenceIndexes = ref<number[]>([]);

const referencesToSave = computed((): ZodFlawReferenceType[] => [
  ...references.value.filter((reference, index) => modifiedReferenceIndexes.value.includes(index)),
  ...references.value.filter(({ uuid }) => !uuid),
]);

const excludedReferenceTypes = ['SOURCE'];
const allowedReferenceTypes = flawReferenceTypeValues.filter(
  (referenceType) => !excludedReferenceTypes.includes(referenceType),
);

const referenceTypeLabel = (label: string) =>
  ({
    ARTICLE: 'Red Hat Security Bulletin (RHSB)',
    EXTERNAL: 'External',
  })[label] || null;

function cancelEdit(index: number) {
  references.value[index] = deepCopyFromRaw(priorValues.value[index]);
  indexBeingEdited.value = null;
}

function setEdit(index: number) {
  indexBeingEdited.value = index;
}

function commitEdit(index: number) {
  modifiedReferenceIndexes.value.push(index);
  indexBeingEdited.value = null;
  priorValues.value = deepCopyFromRaw(references.value);
  console.log('commitEdit', references.value[index]);
}
</script>

<template>
  <LabelCollapsable label="References">
    <div
      v-for="(reference, referenceIndex) in references"
      :key="referenceIndex"
      class="card p-3 pb-1 mb-3 rounded-3"
      :class="{
        'bg-light-light-orange': modifiedReferenceIndexes.includes(referenceIndex),
        'bg-light-light-gray': !modifiedReferenceIndexes.includes(referenceIndex),
        'bg-light-green': !reference.uuid,
      }"
    >
      <div>
        <div v-if="reference.uuid">
          <header class="d-flex justify-content-between">
            <a v-if="indexBeingEdited !== referenceIndex" :href="reference.url" target="_blank">
              <span class="me-2">{{ reference.updated_dt }}</span>
              <span
                class="badge rounded-pill"
                :class="{
                  'bg-primary': reference.type === 'ARTICLE',
                  'bg-warning': reference.type !== 'ARTICLE',
                }"
              >
                {{ referenceTypeLabel(reference.type) }}
              </span>
            </a>
            <select v-else v-model="references[referenceIndex].type" class="form-select mb-3">
              <option value="" disabled selected>Select a reference type</option>
              <option
                v-for="referenceType in allowedReferenceTypes"
                :key="referenceType"
                :value="referenceType"
              >
                Change to {{ referenceTypeLabel(referenceType) }} Reference
              </option>
            </select>
            <div class="buttons">
              <button
                v-if="indexBeingEdited !== referenceIndex"
                type="button"
                class="btn"
                @click="setEdit(referenceIndex)"
              >
                <i class="bi bi-pencil"></i>
              </button>
              <button
                v-if="indexBeingEdited === referenceIndex"
                type="button"
                class="btn"
                @click="commitEdit(referenceIndex)"
              >
                <i class="bi bi-check"></i>
              </button>
              <button
                v-if="indexBeingEdited === referenceIndex"
                type="button"
                class="btn"
                @click="cancelEdit(referenceIndex)"
              >
                <i class="bi bi-x"></i>
              </button>
            </div>
          </header>
        </div>
        <div v-else>
          <select v-model="references[referenceIndex].type" class="form-select mb-3">
            <option value="" disabled selected>Select a reference type</option>
            <option
              v-for="referenceType in allowedReferenceTypes"
              :key="referenceType"
              :value="referenceType"
            >
              New {{ referenceTypeLabel(referenceType) }} Reference
            </option>
          </select>
        </div>
        <LabelInput
          v-if="indexBeingEdited === referenceIndex || !reference.uuid"
          v-model="references[referenceIndex].url"
          label="Link URL"
        />
        <LabelTextarea
          v-if="indexBeingEdited === referenceIndex || !reference.uuid"
          v-model="references[referenceIndex].description"
          label="Description"
        />
        <LabelStatic v-else v-model="reference.description" label="Description" />
      </div>
    </div>
    <form>
      <button
        type="button"
        class="btn btn-primary me-2"
        :class="{ disabled: referencesToSave.length === 0 }"
        @click="emit('update:references', referencesToSave)"
      >
        Save Changes to References
      </button>
      <button type="button" class="btn btn-secondary" @click="emit('addBlankReference:flaw')">
        Add Reference
      </button>
    </form>
  </LabelCollapsable>
</template>

<style lang="scss" scoped>
.modified.card {
  border: 1px solid red !important;
}

header select {
  max-width: 28rem;
}

.osim-collapsable-label :deep(div.osim-static-label),
.osim-collapsable-label :deep(.osim-input) {
  padding-left: 0 !important;
  border-left: none !important;
  margin-left: 0 !important;
}
</style>
