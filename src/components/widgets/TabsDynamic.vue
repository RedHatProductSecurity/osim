<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(defineProps<{
  labels: string[];
  slotProps: Record<string, any>;
  default?: number;
  disabled?: number[];
  tooltips?: string[];
}>(), {
  default: 0,
  disabled: () => [],
  tooltips: () => [],
});

const activeTabIndex = ref(props.default ?? 0);

const selectTab = (index: number) => {
  activeTabIndex.value = index;
};

</script>

<template>
  <div>
    <ul class="nav nav-tabs">
      <li v-for="(label, index) in labels" :key="index" class="nav-item">
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
    </ul>
    <div v-for="(label, index) in labels" :key="index" :class="{ 'visually-hidden': index !== activeTabIndex }">
      <slot
        :key="index"
        :name="label"
        v-bind="slotProps[label]"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.nav-link:not(:active) {
  color: gray;
}
</style>
