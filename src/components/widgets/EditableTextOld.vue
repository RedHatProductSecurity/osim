<script setup lang="ts">

import {ref} from 'vue';

const props = defineProps<{
  modelValue: string,
  editable: boolean,
  editing: boolean,
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string],
  'update:editing': [value: string],
}>();

const elDiv = ref<HTMLDivElement>();
const editing = ref<boolean>(props.editing);

function emitModelValue(event: Event) {
  console.log(event);
  emit('update:modelValue', event.target.innerText);
}

</script>

<template>
  <div
      class="osim-editable-text"
      :class="{'form-control': editing}"
      :contenteditable="true"
      @input="emitModelValue($event)"
      @click="editing=(editable && true)"
      ref="elDiv"
  >
    {{modelValue}}
  </div>
</template>

<!--<style scoped>-->

<!--.osim-editable-text {-->
<!--  outline: 1px solid black;-->
<!--  min-height: 30px;-->
<!--  min-width: 100px;-->
<!--}-->

<!--</style>-->
