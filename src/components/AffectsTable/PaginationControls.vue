<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  currentPage: number;
  disabled: boolean;
  filteredCount: number;
  itemsPerPage: number;
  pages: (number | string)[];
  totalCount: number;
  totalPages: number;
}>();

const emit = defineEmits<{
  changeItemsPerPage: [itemsCount: number];
  changePage: [pageIndex: number];
  toggleShowAll: [showAll: boolean];
}>();

const controlledItemsPerPage = ref(props.itemsPerPage);

watch(
  () => props.itemsPerPage,
  () => controlledItemsPerPage.value = props.itemsPerPage,
);
</script>
<template>
  <div>
    <div class="pagination-controls" :class="{'disabled': disabled}">
      <button
        type="button"
        tabindex="-1"
        class="btn btn-sm btn-secondary rounded-end-0"
        :disabled="currentPage === 1"
        @click="emit('changePage', currentPage - 1)"
      >
        <i class="bi bi-arrow-left fs-5" />
      </button>
      <button
        v-for="page in pages"
        :key="page"
        tabindex="-1"
        class="osim-page-btn btn btn-sm rounded-0 btn-secondary"
        style="width: 34.8px;"
        :disabled="page === currentPage || page === '..'"
        @click.prevent="emit('changePage', page as number)"
      >
        {{ page }}
      </button>
      <button
        type="button"
        tabindex="-1"
        class="btn btn-sm btn-secondary rounded-start-0"
        :disabled="currentPage === totalPages || totalPages === 0"
        @click.prevent="() => emit('changePage', currentPage + 1)"
      >
        <i class="bi bi-arrow-right fs-5" />
      </button>
    </div>
    <div class="d-flex flex-row align-items-center gap-2">
      <div class="per-page-btn btn btn-sm btn-secondary" :class="{'disabled': disabled}">
        <i
          :style="itemsPerPage > 1
            ? 'pointer-events: auto;'
            : 'opacity: 50%; pointer-events: none;'"
          class="bi bi-dash-square fs-6 my-auto"
          title="Reduce affects per page"
          @click="() => emit('changeItemsPerPage', itemsPerPage - 1)"
        />
        <span class="mx-2 my-auto">Per page:</span>
        <input
          v-model="controlledItemsPerPage"
          type="text"
          class="form-control mx-2"
          @change=" emit('changeItemsPerPage', +($event.target as HTMLInputElement).value)"
          @blur=" emit('changeItemsPerPage', +($event.target as HTMLInputElement).value)"
        />
        <i
          :style="itemsPerPage < 100
            ? 'pointer-events: auto;'
            : 'opacity: 50%; pointer-events: none;'"
          class="bi bi-plus-square fs-6 my-auto"
          title="Increase affects per page"
          @click="() => emit('changeItemsPerPage', itemsPerPage + 1)"
        />
      </div>
      <div class="form-check form-switch">
        <input
          id="toggleAllAffects"
          type="checkbox"
          class="form-check-input"
          @change="emit('toggleShowAll', ($event.target as HTMLInputElement).checked)"
        >
        <label
          for="toggleAllAffects"
          class="form-check-label user-select-none"
        >Show All ({{ totalCount === filteredCount ? totalCount : `${filteredCount}/${totalCount}` }})</label>
      </div>
    </div>
  </div>
</template>
<style scoped lang="scss">
.disabled {
  opacity: 0.5;

  * {
    user-select: none !important;
    cursor: default !important;
    pointer-events: none !important;
  }
}

.flex-break {
  &::after {
    content: ' ';
    flex-basis: 100%;
    height: 0;
  }
}

.pagination-controls {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;

  button {
    height: 2rem;
    padding-block: 0;

    &.osim-page-btn:disabled {
      background-color: transparent;
      color: black;
    }
  }
}

.per-page-btn {
  display: flex;
  padding-block: 0;
  max-width: fit-content;

  input {
    width: 4ch;
    padding: 0.375rem 0;
    text-align: center;
  }
}
</style>
