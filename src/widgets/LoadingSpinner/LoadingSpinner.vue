<script lang="ts">
export default {
  name: 'LoadingSpinner',
  props: {
    type: {
      type: String,
      required: true,
      validator: (prop: string) => ['border', 'grow'].includes(prop),
      default: 'border',
    },
  },
  computed: {
    cssClass() {
      return `spinner-${this.type}`;
    },
  },
};
</script>

<template>
  <div :class="cssClass" role="status">
    <span class="visually-hidden">Loading...</span>
  </div>
</template>
