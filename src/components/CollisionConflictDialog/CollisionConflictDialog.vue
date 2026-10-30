<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import Modal from '@/widgets/Modal/Modal.vue';
import type { CollisionChoice } from '@/utils/flawRebase';

export type CollisionConflictItem = {
  id: string;
  label: string;
  mine: string;
  server: string;
};

const props = withDefaults(defineProps<{
  conflicts?: CollisionConflictItem[];
  saving?: boolean;
  show?: boolean;
}>(), {
  conflicts: () => [],
  saving: false,
  show: false,
});

const emit = defineEmits<{
  cancel: [];
  confirm: [choices: Record<string, CollisionChoice>];
}>();

const choices = ref<Record<string, CollisionChoice>>({});

watch(() => props.conflicts, () => {
  choices.value = {};
}, { immediate: true });

const canConfirm = computed(() => props.conflicts.length > 0
  && props.conflicts.every(item => choices.value[item.id]));

const allMine = computed(() => canConfirm.value
  && props.conflicts.every(item => choices.value[item.id] === 'mine'));

const allServer = computed(() => canConfirm.value
  && props.conflicts.every(item => choices.value[item.id] === 'server'));

function choose(id: string, choice: CollisionChoice) {
  choices.value = { ...choices.value, [id]: choice };
}

function keepAll(choice: CollisionChoice) {
  choices.value = Object.fromEntries(props.conflicts.map(item => [item.id, choice]));
}

function confirm() {
  if (props.saving || !canConfirm.value) return;
  emit('confirm', { ...choices.value });
}
</script>

<template>
  <Modal
    class="modal-dialog-scrollable collision-conflict-dialog"
    :show="show"
    @close="emit('cancel')"
  >
    <template #title>
      Conflicting changes
    </template>
    <template #body>
      <p class="conflict-intro">
        This flaw was saved on the server while you still had unsaved edits.
        The fields below were changed on both sides. Choose which value to keep in each case.
      </p>
      <div class="conflict-sticky">
        <div class="conflict-compare conflict-columns">
          <p class="conflict-column-title">Your edit</p>
          <div class="conflict-keep-gap" aria-hidden="true"></div>
          <p class="conflict-column-title">Server</p>
        </div>
        <div class="conflict-compare">
          <button
            type="button"
            class="conflict-keep-all"
            :class="{ selected: allMine }"
            :aria-pressed="allMine"
            @click="keepAll('mine')"
          >
            Keep all mine
          </button>
          <div class="conflict-keep-gap" aria-hidden="true"></div>
          <button
            type="button"
            class="conflict-keep-all"
            :class="{ selected: allServer }"
            :aria-pressed="allServer"
            @click="keepAll('server')"
          >
            Keep all server
          </button>
        </div>
      </div>
      <div class="conflict-list">
        <article v-for="item in conflicts" :key="item.id" class="conflict-row">
          <h2 class="conflict-label">
            {{ item.label }}
          </h2>
          <div class="conflict-compare">
            <button
              type="button"
              class="conflict-side"
              :class="{ selected: choices[item.id] === 'mine' }"
              :aria-label="`Your edit for ${item.label}`"
              :aria-pressed="choices[item.id] === 'mine'"
              @click="choose(item.id, 'mine')"
            >
              <span class="conflict-value">{{ item.mine }}</span>
            </button>
            <div class="conflict-arrows">
              <button
                type="button"
                class="conflict-arrow"
                :class="{ selected: choices[item.id] === 'mine' }"
                :aria-label="`Keep your ${item.label}`"
                :aria-pressed="choices[item.id] === 'mine'"
                @click="choose(item.id, 'mine')"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M10 3 L5 8 L10 13" />
                </svg>
              </button>
              <button
                type="button"
                class="conflict-arrow"
                :class="{ selected: choices[item.id] === 'server' }"
                :aria-label="`Keep the server ${item.label}`"
                :aria-pressed="choices[item.id] === 'server'"
                @click="choose(item.id, 'server')"
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M6 3 L11 8 L6 13" />
                </svg>
              </button>
            </div>
            <button
              type="button"
              class="conflict-side"
              :class="{ selected: choices[item.id] === 'server' }"
              :aria-label="`Server value for ${item.label}`"
              :aria-pressed="choices[item.id] === 'server'"
              @click="choose(item.id, 'server')"
            >
              <span class="conflict-value">{{ item.server }}</span>
            </button>
          </div>
        </article>
      </div>
    </template>
    <template #footer>
      <button type="button" class="btn btn-secondary" @click="emit('cancel')">
        Cancel
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="saving || !canConfirm"
        :title="canConfirm ? '' : 'Choose a side for each difference'"
        @click="confirm"
      >
        Confirm
      </button>
    </template>
  </Modal>
</template>

<style scoped>
.conflict-intro {
  margin-bottom: 1rem;
  color: var(--bs-secondary-color);
}

.conflict-sticky {
  position: sticky;
  top: calc(-1 * var(--bs-modal-padding, 1rem));
  z-index: 2;
  margin-right: calc(-1 * var(--bs-modal-padding, 1rem));
  margin-left: calc(-1 * var(--bs-modal-padding, 1rem));
  padding: 0.25rem var(--bs-modal-padding, 1rem) 0.75rem;
  background: var(--bs-body-bg, #fff);
  border-bottom: 1px solid var(--bs-border-color);
}

.conflict-columns {
  margin-bottom: 0.5rem;
}

.conflict-column-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
}

.conflict-keep-all {
  justify-self: center;
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 999px;
  background: var(--bs-body-bg);
  color: var(--bs-secondary-color);
  font: inherit;
}

.conflict-list {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-top: 1.25rem;
}

.conflict-label {
  margin: 0 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--bs-border-color);
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
}

.conflict-compare {
  display: grid;
  grid-template-columns: minmax(9rem, 14rem) 5.5rem minmax(9rem, 14rem);
  gap: 0.75rem;
  align-items: stretch;
  justify-content: center;
  margin-inline: auto;
}

.conflict-side {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  background: var(--bs-tertiary-bg, var(--bs-light, #f8f9fa));
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.conflict-side:hover {
  border-color: var(--bs-primary);
}

.conflict-side.selected {
  border-color: var(--bs-primary);
  background: rgb(var(--bs-primary-rgb) / 8%);
}

.conflict-value {
  display: block;
  max-height: 9rem;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.conflict-arrows {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.conflict-arrow {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 1px solid var(--bs-border-color);
  border-radius: 999px;
  background: var(--bs-body-bg);
  color: var(--bs-secondary-color);
}

.conflict-arrow:hover,
.conflict-keep-all:hover {
  border-color: var(--bs-primary);
  background: rgb(var(--bs-primary-rgb) / 8%);
  color: var(--bs-primary);
}

.conflict-arrow svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentcolor;
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.conflict-arrow.selected,
.conflict-arrow.selected:hover,
.conflict-keep-all.selected,
.conflict-keep-all.selected:hover {
  border-color: var(--bs-primary);
  background: var(--bs-primary);
  color: #fff;
}

@media (width <= 720px) {
  .conflict-compare {
    grid-template-columns: 1fr;
  }

  .conflict-keep-gap {
    display: none;
  }
}
</style>

<style>
.collision-conflict-dialog.modal-dialog {
  width: min(46rem, calc(100vw - 2rem));
  max-width: min(46rem, calc(100vw - 2rem));
  height: calc(100vh - 3.5rem);
  margin: 1rem auto;
}

.collision-conflict-dialog .modal-content {
  height: 100%;
  max-height: calc(100vh - 2rem);
}

.collision-conflict-dialog .modal-body {
  overflow-y: auto;
}
</style>
