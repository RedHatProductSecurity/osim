<script setup lang="ts">
import { ref, computed } from 'vue';

import { isCveValid } from '@/utils/helpers';

const props = defineProps<{
  addableItems?: any[];
  labels: string[];
  slotProps: Record<string, any>;
}>();

const emit = defineEmits<{
  'add-tab': [value?: any];
}>();

const activeTabIndex = ref(0);

const selectTab = (index: number) => activeTabIndex.value = index;

const searchFilter = ref('');
const filteredItems = computed(() => props.addableItems?.filter((item: string) => searchFilter.value
  ? item.toLowerCase().includes(searchFilter.value.toLowerCase())
  : item,
));
</script>

<template>
  <div>
    <ul class="nav nav-tabs">
      <li v-for="(label, index) in labels" :key="index" class="nav-item">
        <button
          type="button"
          class="nav-link"
          :class="{ 'active': activeTabIndex === index }"
          @click="selectTab(index)"
        >
          {{ label }}
        </button>
      </li>
      <li v-if="addableItems?.length" class="nav-item">
        <button
          type="button"
          class="nav-link osim-add-tab"
          data-bs-toggle="dropdown"
        >
          <i class="bi bi-plus"></i>
        </button>
        <ul class="osim-dropdown-menu dropdown-menu dropdown-menu-end">
          <li>
            <input
              v-model="searchFilter"
              class="border border-info px-1 mx-2 focus-ring focus-ring-info"
              type="text"
              placeholder="Search..."
              @submit.prevent="emit('add-tab', searchFilter)"
            />
            <button
              :disabled="!isCveValid(searchFilter)"
              class="btn btn-info btn-sm"
              type="button"
              @click="emit('add-tab', searchFilter)"
            >Add</button>
          </li>
          <li v-for="item in filteredItems" :key="item">
            <button
              class="dropdown-item"
              type="button"
              @click="emit('add-tab', item)"
            >
              {{ item }}
            </button>
          </li>
        </ul>
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

.osim-add-tab {
  background-color: #fff;
}

.osim-dropdown-menu {
  max-height: 12rem;
  overflow-y: auto;
}
</style>
