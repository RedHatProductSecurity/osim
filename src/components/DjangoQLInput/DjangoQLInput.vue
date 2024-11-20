<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';

import DjangoQL from '@mrmarble/djangoql-completion';

import { osimRuntime } from '@/stores/osimRuntime';

const model = defineModel<string>();
const emit = defineEmits<{
  submit: [value: string];
}>();

const djangoCompletion = ref();
const textArea = ref<HTMLTextAreaElement | null>(null);

onMounted(() => {
  if (!textArea.value) {
    return;
  }

  const djangoQL = new DjangoQL({
    completionEnabled: true,
    introspections: `${osimRuntime.value.backends.osidb}/osidb/api/v1/introspection`,
    selector: textArea.value,
    autoResize: false,
    onSubmit: function (value: string) {
      model.value = value;
      emit('submit', value);
    },
  });

  djangoQL.popupCompletion();

  djangoCompletion.value = djangoQL;
});

onUnmounted(() => {
  if (djangoCompletion.value) {
    djangoCompletion.value.destroyCompletionElement();
  }
});
</script>

<template>
  <textarea
    ref="textArea"
    v-model="model"
    class="form-control"
  />
</template>
