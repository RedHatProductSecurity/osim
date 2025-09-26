import { computed, type Ref } from 'vue';

import { omit } from 'ramda';

import type { ZodFlawCommentType, ZodFlawType } from '@/types/zodFlaw';
import type { ZodAffectCVSSType, ZodAffectType, ZodFlawCVSSType, ZodFlawReferenceType } from '@/types';
import { CommentType } from '@/constants';

type AffectWithoutTracker = Omit<ZodAffectType, 'trackers'>;

export function serializePublicComments(comments: ZodFlawCommentType[]) {
  const maxComments = 15;
  return comments
    .filter(comment => comment.type === CommentType.Public)
    .slice(0, maxComments)
    .map(comment => comment.text)
    .join('\n');
}

export type AegisSuggestionContextRefs = {
  affects?: null | Ref<AffectWithoutTracker[] | null>;
  comments?: null | Ref<string>;
  commentZero?: null | Ref<null | string>;
  components?: null | Ref<null | string[]>;
  cveDescription?: null | Ref<null | string | undefined>;
  cveId?: null | Ref<null | string>;
  cvssScores?: null | Ref<null | ZodAffectCVSSType[] | ZodFlawCVSSType[]> ;
  embargoed?: null | Ref<boolean | null>;
  references?: null | Ref<null | ZodFlawReferenceType[]>;
  requiresCveDescription?: null | Ref<null | string | undefined>;
  statement?: null | Ref<null | string | undefined>;
  title?: null | Ref<null | string>;
};

export function aegisSuggestionRequestBody(flaw: Ref<ZodFlawType>): AegisSuggestionContextRefs {
  return {
    cveId: computed(() => flaw.value.cve_id),
    title: computed(() => flaw.value.title),
    commentZero: computed(() => flaw.value.comment_zero),
    cveDescription: computed(() => flaw.value.cve_description),
    requiresCveDescription: computed(() => flaw.value.requires_cve_description),
    statement: computed(() => flaw.value.statement),
    components: computed(() => flaw.value.components),
    comments: computed(() => serializePublicComments(flaw.value.comments)),
    references: computed(() => flaw.value.references),
    embargoed: computed(() => flaw.value.embargoed),
    cvssScores: computed(() => flaw.value.cvss_scores),
    affects: computed(() => flaw.value.affects.map(affect => omit(['trackers'], affect))),
  };
}

export function serializeAegisContext(ctx: AegisSuggestionContextRefs) {
  return {
    cve_id: ctx.cveId?.value ?? '',
    title: ctx.title?.value ?? undefined,
    comment_zero: ctx.commentZero?.value ?? undefined,
    cve_description: ctx.cveDescription?.value ?? undefined,
    requires_cve_description: ctx.requiresCveDescription?.value ?? undefined,
    statement: ctx.statement?.value ?? undefined,
    components: ctx.components?.value ?? undefined,
    comments: ctx.comments?.value ?? undefined,
    references: ctx.references?.value ?? undefined,
    embargoed: ctx.embargoed?.value ?? undefined,
    cvss_scores: ctx.cvssScores?.value ?? undefined,
    affects: ctx.affects?.value ?? undefined,
  };
}
