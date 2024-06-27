<script setup lang="ts">
import { useDraggable } from '@/composables/useDraggable';
import { ref, computed } from 'vue';


const modelValue = defineModel<string[]>({ required: true });

const props = withDefaults(defineProps<{
  error?: string | string[],
  readOnly?: boolean,
}>(), {
  error: '',
  readOnly: false,
});

const elInput = ref<HTMLInputElement | null>(null);
const elDragZone = ref<HTMLElement | null>(null);
const newItem = ref('');

const { draggableItems, draggableClass, dragStart, dragEnd, dragOver } = useDraggable(elDragZone, modelValue);


const normalizedError = computed(() => {
  if (props.error == null) {
    return null;
  }
  if (Array.isArray(props.error)) {
    return props.error.filter(Boolean).join(', ');
  }
  return props.error;
});

function add() {
  if (newItem.value.trim().length > 0) {
    modelValue.value.push(newItem.value.trim());
    newItem.value = '';
  }
}

function remove(index: number) {
  modelValue.value.splice(index, 1);
  focusInput();
}

function focusInput(event?: Event) {
  if (elInput.value != null && (event?.target as HTMLElement)?.nodeName !== 'SPAN') {
    elInput.value.focus();
  }
}

function makeEditable(event: Event) {
  const target = event.target as HTMLElement;
  target.setAttribute('contenteditable', 'true');
  target.focus();
}

function edit(index: number, event: Event) {
  const target = event.target as HTMLElement;

  if (target.innerText.trim().length > 0) {
    modelValue.value[index] = target.innerText.trim();
    target.removeAttribute('contenteditable');
  }
}

</script>

<template>
  <div
    ref="elDragZone"
    class="osim-pill-list form-control"
    :class="{ 'is-invalid': !!normalizedError }"
    @click.prevent="focusInput"
    @submit.prevent
    @dragover="dragOver"
    @dragstart="dragStart"
    @dragend="dragEnd"
  >
    <TransitionGroup :name="draggableClass">
      <span
        v-for="value, index in draggableItems"
        :key="value"
        class="osim-pill-list-item badge text-bg-secondary"
        :draggable="true"
        :data-index="index"
      >
        <span
          @click="makeEditable"
          @keydown.enter.prevent="edit(index, $event)"
          @keydown.escape.prevent="edit(index, $event)"
          @blur="edit(index, $event)"
        >
          {{ value }}
        </span>
        <i
          class="bi bi-x-square ms-1"
          tabindex="0"
          @keydown.enter.prevent="remove(index)"
          @keydown.space.prevent="remove(index)"
          @click.prevent="remove(index)"
        >
          <span class="visually-hidden">Remove</span>
        </i>
      </span>
    </TransitionGroup>

    <input
      ref="elInput"
      v-model="newItem"
      class="osim-pill-list-input no-drag"
      type="text"
      @submit.prevent
      @blur="add()"
      @keydown.enter.prevent="add()"
    />
    <div v-if="!readOnly && normalizedError" class="invalid-tooltip no-drag">{{ normalizedError }}</div>
  </div>

</template>

<style scoped lang="scss">
.draggable-move {
  transition: all 0.5s ease;
}

.osim-pill-list {
  &:hover .invalid-tooltip {
    display: block;
  }

  display: flex;
  flex-flow: row wrap;
  gap: 1em;
  align-items: center;
}

.osim-pill-list:focus-within {
  outline: 0;
  box-shadow:
    var(--bs-focus-ring-x, 0)
    var(--bs-focus-ring-y, 0)
    var(--bs-focus-ring-blur, 0)
    var(--bs-focus-ring-width)
    var(--bs-focus-ring-color);
}

.osim-pill-list-item {
  font-size: .85rem;
  padding-block: 0.1rem;
}

.osim-pill-list-input {
  display: inline-block;
  height: 1.5rem;
  border: none;
  outline: none;
  box-shadow: none;
}

.osim-pill-list-input:focus,
.osim-pill-list-input:focus-visible {
  border: none;
  outline: none;
  box-shadow: none;
}
</style>
