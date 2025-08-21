import { computed, type Ref } from 'vue';

import type { AegisSuggestionContextRefs } from '@/types/zodAegisAI';
import type { ZodFlawType } from '@/types/zodFlaw';

export function useAegisSuggestionContextFromFlaw(flaw: Ref<ZodFlawType>) {
  const ctx: AegisSuggestionContextRefs = {
    cveId: computed(() => flaw.value.cve_id),
    title: computed(() => flaw.value.title),
    commentZero: computed(() => flaw.value.comment_zero),
    cveDescription: computed(() => flaw.value.cve_description),
    requiresCveDescription: computed(() => flaw.value.requires_cve_description),
    statement: computed(() => flaw.value.statement),
    components: computed(() => flaw.value.components),
  };

  return ctx;
}

export function buildCveAnalysisContext(ctx: AegisSuggestionContextRefs) {
  return {
    cve_id: ctx.cveId?.value ?? '',
    title: ctx.title?.value ?? undefined,
    comment_zero: ctx.commentZero?.value ?? undefined,
    cve_description: ctx.cveDescription?.value ?? undefined,
    requires_cve_description: ctx.requiresCveDescription?.value ?? undefined,
    statement: ctx.statement?.value ?? undefined,
    components: ctx.components?.value ?? undefined,
  };
}
