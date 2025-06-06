<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';

import { Popover } from 'bootstrap';

const props = defineProps<{
  btnText: string;
  confidence: number;
  content: string;
  disabledTooltip: string;
  enabled: boolean;
  enabledTooltip: string;
  title: string;
}>();

const tooltip = computed(() => suggestionApplied.value ? props.enabledTooltip : props.disabledTooltip);
const suggestionApplied = ref(props.enabled);
const popoverButton = ref(null);
let popoverInstance: null | Popover = null;

const customPopoverTemplate = `
  <div class="popover custom-popover-theme" role="tooltip">
    <div class="popover-arrow"></div>
    <h3 class="popover-header"></h3>
    <div class="p-3">
      <p class="m-0">${props.content}</p>
      <p class="m-0"><b>Confidence:</b><span class="ms-2">${props.confidence}%</span></p>
    </div>
    <div class="custom-footer p-2 border-top">
      <div class="btn btn-sm btn-dark w-100">${props.btnText}</div>
    </div>
  </div>
`;

onMounted(() => {
  if (popoverButton.value) {
    popoverInstance = new Popover(popoverButton.value, {
      placement: 'right',
      title: props.title,
      content: props.content,
      html: true,
      trigger: 'click',
      container: 'body',
      template: customPopoverTemplate,
    });
  }
});

onUnmounted(() => {
  if (popoverInstance) {
    popoverInstance.dispose();
  }
});
</script>

<template>
  <button
    ref="popoverButton"
    type="button"
    class="relative btn py-0 px-1 mx-2"
    data-bs-toggle="popover"
    @click.prevent
  >
    <i :class="{'bi-x-diamond': !suggestionApplied, 'bi-x-diamond-fill': suggestionApplied}" :title="tooltip" />
  </button>
</template>
