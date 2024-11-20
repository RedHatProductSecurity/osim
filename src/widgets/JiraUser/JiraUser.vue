<script setup lang="ts">
import { computed, toValue } from 'vue';

const props = defineProps<{
  displayName: string;
  emailAddress?: string;
  name?: string;
  query?: string;
}>();

const formatedUser = computed(() => {
  let output = props.displayName;
  if (props.emailAddress) {
    output += ` - ${props.emailAddress}`;
  }
  if (props.name) {
    output += ` (${props.name})`;
  }
  if (props.query) {
    output = output.replace(new RegExp(toValue(props.query), 'gi'), '<b>$&</b>');
  }
  return output;
});
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <span v-html="formatedUser" />
</template>
