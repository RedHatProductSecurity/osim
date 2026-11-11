<script lang="ts" setup>
import { computed } from 'vue';

import type { ZodAffectType } from '@/types';
import { classifyAffectProvenance, provenancePresentation } from '@/utils/affectProvenance';

const props = defineProps<{
  affect: ZodAffectType;
}>();

const presentation = computed(() => provenancePresentation[classifyAffectProvenance(props.affect)]);
</script>
<template>
  <span
    class="badge"
    :class="presentation.badgeClasses"
    style="cursor: default;"
    :title="presentation.tooltip"
    data-bs-toggle="tooltip"
  >
    <i :class="['bi', presentation.icon]"></i> {{ presentation.label }}
  </span>
</template>
