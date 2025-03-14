<script setup lang="ts">
/* TODO: Modal refactors:
- Move composable here
- Revisit component design for reusability
*/

import { toRefs, watch } from 'vue';

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  close: [value: any];
}>();

defineOptions({
  inheritAttrs: false,
});
const { show } = toRefs(props);
watch(show, () => {
  if (show.value) {
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '0';
  } else {
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.padding = '';
  }
}, { immediate: true });
</script>

<template>
  <Transition name="modal">
    <div
      v-if="show"
      class="modal fade"
      :class="{show: show}"
      :style="{display: show? 'block' : 'none'}"
      :aria-hidden="!show"
      tabindex="-1"
      aria-labelledby="modalTitle"
      :role="show ? 'dialog' : ''"
    >
      <div class="modal-dialog" v-bind="$attrs">
        <div class="modal-content">
          <div v-if="$slots.header || $slots.title" class="modal-header">
            <slot name="header">
              <h1 class="modal-title fs-5"><slot name="title">Modal Title</slot></h1>
              <button
                type="button"
                class="btn-close"
                aria-label="Close"
                @click="emit('close', null)"
              ></button>
            </slot>
          </div>
          <div class="modal-body">
            <slot name="body">
              Modal Body
            </slot>
          </div>
          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer">
              <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
                @click="emit('close', null)"
              >Close</button>
              <button type="button" class="btn btn-primary" @click="emit('close', null)">
                Save
              </button>
            </slot>
          </div>
        </div>
      </div>
    </div>
  </Transition>
  <Transition name="modal-bg">
    <div v-if="show" class="modal-backdrop fade show"></div>
  </Transition>
</template>

<style scoped>
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-bg-enter-from,
.modal-bg-leave-to {
  background-color: transparent;
}

.modal-bg-enter-active,
.modal-bg-leave-active {
  transition: background-color 0.5s ease;
}

/*
.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}
*/
</style>
