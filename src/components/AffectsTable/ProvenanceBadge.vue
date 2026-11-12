<script lang="ts" setup>
import { computed } from 'vue';

import type { ZodAffectType } from '@/types';
import { classifyAffectProvenance, provenancePresentation } from '@/utils/affectProvenance';

const props = withDefaults(defineProps<{
  affect: ZodAffectType;
  /** Icon-only rendering for compact placements (e.g. inside the Label
   * column) so the badge reads as a marker, not another label pill. */
  iconOnly?: boolean;
}>(), {
  iconOnly: false,
});

const presentation = computed(() => provenancePresentation[classifyAffectProvenance(props.affect)]);
// leading space kept in the string so the icon/label gap survives Vue's
// whitespace condensing (template-level whitespace would be dropped)
const labelText = computed(() => props.iconOnly ? '' : ` ${presentation.value.label}`);
</script>
<template>
  <span
    class="badge"
    :class="presentation.badgeClasses"
    style="cursor: default;"
    :title="presentation.tooltip"
    :aria-label="presentation.label"
    data-bs-toggle="tooltip"
  >
    <i :class="['bi', presentation.icon]"></i>{{ labelText }}
  </span>
</template>
