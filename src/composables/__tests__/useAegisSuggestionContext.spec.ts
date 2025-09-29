import { ref } from 'vue';

import * as sampleFlawFull from '@test-fixtures/sampleFlawFull.json';
import { omit } from 'ramda';

import {
  aegisSuggestionRequestBody,
  serializeAegisContext,
  serializePublicComments,
} from '@/composables/aegis/useAegisSuggestionContext';

import type { ZodFlawType } from '@/types';
import { withSetup } from '@/__tests__/helpers';

describe('useAegisSuggestionContext', () => {
  it('maps flaw ref fields to context refs', async () => {
    const flaw = ref<ZodFlawType>(structuredClone(sampleFlawFull) as ZodFlawType);

    const [ctx] = withSetup(() => aegisSuggestionRequestBody(flaw), []);

    expect(ctx.cveId!.value).toBe('CVE-2024-1234');
    expect(ctx.title!.value).toBe('Sample title');
    expect(ctx.commentZero!.value).toBe('Comment Zero == Patient Zero');
    expect(ctx.cveDescription!.value).toBe('I am a spooky CVE');
    expect(ctx.requiresCveDescription!.value).toBe('APPROVED');
    expect(ctx.statement!.value).toBe('Statement for None');
    expect(ctx.components!.value).toEqual(['kernel']);
    expect(ctx.comments!.value).toBe('');
    expect(ctx.references!.value).toEqual(flaw.value.references);
    expect(ctx.embargoed!.value).toBe(false);
    expect(ctx.cvssScores!.value).toEqual(flaw.value.cvss_scores);
    expect(ctx.affects!.value).toEqual(flaw.value.affects.map(affect => omit(['trackers'], affect)));
  });

  it('builds request context with expected keys and fallbacks', async () => {
    const flaw = ref<ZodFlawType>(structuredClone(sampleFlawFull) as ZodFlawType);
    flaw.value.cve_id = 'CVE-2024-2222';
    // simulate missing comment_zero to assert fallback to undefined
    // @ts-expect-error runtime test override
    flaw.value.comment_zero = null;
    const [ctx] = withSetup(() => aegisSuggestionRequestBody(flaw), []);
    const payload = serializeAegisContext(ctx);
    expect(payload).toEqual({
      cve_id: 'CVE-2024-2222',
      title: 'Sample title',
      comment_zero: undefined,
      cve_description: 'I am a spooky CVE',
      requires_cve_description: 'APPROVED',
      statement: 'Statement for None',
      components: ['kernel'],
      affects: flaw.value.affects.map(affect => omit(['trackers'], affect)),
      cvss_scores: flaw.value.cvss_scores,
      comments: serializePublicComments(flaw.value.comments),
      references: flaw.value.references,
      embargoed: flaw.value.embargoed,
    });
  });
});
