<script setup lang="ts">
import { ref } from 'vue';

import { PackageURL } from 'packageurl-js';

import LabelEditable from '@/widgets/LabelEditable/LabelEditable.vue';

const error = ref<null | string>(null);
const purl = ref<null | string>(null);

function validatePurl(purl: string) {
  try {
    PackageURL.fromString(purl);
    error.value = null;
    return purl;
  } catch (e) {
    error.value = e.message;
    return null;
  }
}

function updatePurl(value: string) {
  if (validatePurl(value)) {
    purl.value = value;
  }
}
</script>

<template>
  <div class="ms-0">
    <LabelEditable
      v-model:modelValue="purl"
      label="Package URL"
      type="text"
      :error="error"
      @input="updatePurl($event.target.value)"
    />
  </div>
</template>
