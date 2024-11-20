<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(defineProps<{
  default?: number;
  disabled?: number[];
  labels: string[];
  tooltips?: string[];
}>(), {
  default: 0,
  disabled: () => [],
  tooltips: () => [],
});

const emit = defineEmits(['tab-change']);
const activeTabIndex = ref(props.default ?? 0);

const selectTab = (index: number) => {
  activeTabIndex.value = index;
  emit('tab-change', index);
};
</script>

<template>
  <div>
    <ul class="nav nav-tabs">
      <li v-for="(label,index) in labels" :key="index" class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ 'active': activeTabIndex === index }"
          :disabled="disabled?.includes(index)"
          :title="tooltips[index]"
          @click="selectTab(index)"
        >
          {{ label }}
        </button>
      </li>
      <slot name="header-actions" />
    </ul>
    <slot name="tab-content" />
  </div>
</template>

<style scoped lang="scss">
.nav-link:not(:active) {
  color: gray;
}
</style>
