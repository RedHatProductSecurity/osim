<template>
  <div :class="cssClass" role="status">
    <span class="visually-hidden">Loading...</span>
  </div>
</template>

<script lang="ts">
export default {
  name: 'LoadingSpinner',
  props: {
    loading: {
      type: Boolean,
      required: true,
    },
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
