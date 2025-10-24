import { computed, type Ref } from 'vue';

import { omit } from 'ramda';

import type {
  ZodAffectCVSSType,
  ZodAffectType,
  ZodFlawCVSSType,
  ZodFlawReferenceType,
  ZodFlawType,
  ZodFlawCommentType,
} from '@/types';
import { CommentType } from '@/constants';

type AffectWithoutTracker = Omit<ZodAffectType, 'trackers'>;
type NullableRef<T> = null | Ref<T>;
type DeepNullableRef<T> = NullableRef<null | T>;

export function serializePublicComments(comments: ZodFlawCommentType[]) {
  const maxComments = 15;
  return comments
    .filter(comment => comment.type === CommentType.Public)
    .slice(0, maxComments)
    .map(comment => comment.text)
    .join('\n');
}

export type AegisSuggestionContextRefs = {
  affects?: DeepNullableRef<AffectWithoutTracker[]>;
  comments?: NullableRef<string>;
  commentZero?: DeepNullableRef<string>;
  components?: DeepNullableRef<string[]>;
  cveDescription?: DeepNullableRef<string | undefined>;
  cveId?: DeepNullableRef<string>;
  cvssScores?: DeepNullableRef<ZodAffectCVSSType[] | ZodFlawCVSSType[]>;
  embargoed?: DeepNullableRef<boolean>;
  references?: DeepNullableRef<ZodFlawReferenceType[]>;
  requiresCveDescription?: DeepNullableRef<string | undefined>;
  statement?: DeepNullableRef<string | undefined>;
  title?: DeepNullableRef<string>;
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
