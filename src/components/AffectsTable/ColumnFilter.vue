<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import type { Column } from '@tanstack/vue-table';

import type { ZodAffectType } from '@/types';
import DebouncedInput from '@/widgets/DebouncedInput/DebouncedInput.vue';
import DropDownMenu from '@/widgets/DropDownMenu/DropDownMenu.vue';

const props = defineProps<{
  column: Column<ZodAffectType, unknown>;
}>();

const inputFilter = ref<string>('');
const columnFilter = computed({
  get: () => props.column.getFilterValue() as string | string[],
  set: value => props.column.setFilterValue(value),
});
const sortedUniqueValues = computed(() =>
  Array.from(new Set([...props.column.getFacetedUniqueValues().keys()].flat())).sort(),
);
const metaEnum = computed(() =>
  props.column.columnDef.meta?.enum
  && (typeof props.column.columnDef.meta?.enum === 'function'
    ? props.column.columnDef.meta?.enum()
    : props.column.columnDef.meta?.enum),
);
function updateArrayFilter(value: string) {
  if ((columnFilter.value)?.includes(value) && Array.isArray(columnFilter.value)) {
    columnFilter.value = columnFilter.value.filter(f => f !== value);
  } else {
    columnFilter.value = [...columnFilter.value ?? [], value];
  }
}

watch(() => inputFilter.value, newValue => columnFilter.value = newValue);
</script>
<template>
  <DropDownMenu
    placement="bottom-start"
    @click.stop
    @open="inputFilter = columnFilter as string"
  >
    <template #trigger>
      <i
        :class="{
          'bi-funnel': !columnFilter,
          'bi-funnel-fill': columnFilter,
        }"
      ></i>
    </template>
    <template #content="{ close }">
      <template v-if="metaEnum">
        <ul class="list-unstyled w-100 px-2 mb-0">
          <li
            v-for="(value, key) in metaEnum"
            :key="key"
          >
            <label
              class="w-100 user-select-none"
              :class="{'text-uppercase': !value.includes(' ')}"
            >
              <input
                type="checkbox"
                class="form-check-input"
                :checked="columnFilter?.includes(value)"
                @change="updateArrayFilter(value)"
              >
              {{ value || "EMPTY" }}
            </label>

          </li>
        </ul>
      </template>
      <template v-else>
        <datalist :id="column.id + 'list'">
          <option
            v-for="value in sortedUniqueValues.slice(0, 100)"
            :key="value"
            :value
          />
        </datalist>
        <DebouncedInput
          v-model="inputFilter as string"
          class="form-control mx-2"
          type="text"
          :list="column.id + 'list'"
          placeholder="Search..."
          @blur="() => close()"
          @keypress.enter="() => close()"
        />
      </template>

    </template>
  </DropDownMenu>
</template>
