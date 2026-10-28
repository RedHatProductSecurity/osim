import { computed, ref, type App, type Ref } from 'vue';

import * as sampleFlawFull from '@test-fixtures/sampleFlawFull.json';
import { createTestingPinia } from '@pinia/testing';
import { http, HttpResponse } from 'msw';
import { omit } from 'ramda';

import {
  aegisSuggestionRequestBody,
  serializeAegisContext,
  serializePublicComments,
} from '@/composables/aegis/useAegisSuggestionContext';
import { useAegisSteeringNotes } from '@/composables/aegis/useAegisSteeringNotes';
import { useAegisSuggestTitle } from '@/composables/aegis/useAegisSuggestTitle';
import { provideFullFlawSuggestions } from '@/composables/aegis/useFullFlawSuggestions';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';
import { blankFlaw } from '@/composables/useFlaw';

import type { ZodFlawType } from '@/types';
import type { OsimRuntimeType } from '@/types/zodOsim';
import { withSetup } from '@/__tests__/helpers';
import { server } from '@/__tests__/setup';
import { osimRuntime } from '@/stores/osimRuntime';

const apps: App[] = [];
const baseUrl = 'http://localhost:8080';

function setupRequests(metadata: unknown) {
  const flaw = ref<ZodFlawType>({ ...blankFlaw(), cve_id: 'CVE-2024-1234', aegis_meta: metadata });
  const [actions, app] = withSetup(() => {
    const context = aegisSuggestionRequestBody(flaw);
    const coordinator = provideFullFlawSuggestions(context, () => flaw.value);
    const titleActions = useAegisSuggestTitle({
      context,
      coordinator,
      titleRef: computed({ get: () => flaw.value.title, set: (value) => { flaw.value.title = value ?? ''; } }),
    });
    return { coordinator, titleActions, notes: useAegisSteeringNotes(flaw) };
  }, [createTestingPinia()]);
  apps.push(app);
  return { ...actions, flaw };
}

function recordRequests() {
  const bodies: Record<string, unknown>[] = [];
  const description = { suggested_title: 'AI title', suggested_description: 'AI description' };
  server.use(
    http.post(`${baseUrl}/analysis/cve/suggest-description`, async ({ request }) => {
      bodies.push(await request.json() as Record<string, unknown>);
      return HttpResponse.json(description);
    }),
    http.post(`${baseUrl}/analysis/cve`, async ({ request }) => {
      bodies.push(await request.json() as Record<string, unknown>);
      return HttpResponse.json({ results: { 'suggest-description': description }, errors: {} });
    }),
  );
  return bodies;
}

describe('useAegisSuggestionContext', () => {
  afterEach(() => {
    for (const app of apps.splice(0)) app.unmount();
  });

  it('maps flaw ref fields to context refs', async () => {
    const flaw = ref<ZodFlawType>(structuredClone(sampleFlawFull) as ZodFlawType);

    const ctx = aegisSuggestionRequestBody(flaw);

    expect(ctx.cveId!.value).toBe('CVE-2024-1234');
    expect(ctx.title!.value).toBe('Sample title');
    expect(ctx.commentZero!.value).toBe('Comment Zero == Patient Zero');
    expect(ctx.cveDescription!.value).toBe('I am a spooky CVE');
    expect(ctx.statement!.value).toBe('Statement for None');
    expect(ctx.components!.value).toEqual(['kernel']);
    expect(ctx.comments!.value).toBe('');
    expect(ctx.references!.value).toEqual(flaw.value.references);
    expect(ctx.embargoed!.value).toBe(false);
    expect(ctx.impact!.value).toBe('MODERATE');
    expect(ctx.cvssScores!.value).toEqual(flaw.value.cvss_scores);
    expect(ctx.affects!.value).toEqual(flaw.value.affects.map(affect => omit(['tracker'], affect)));
  });

  it('builds request context with expected keys and fallbacks', async () => {
    const flaw = ref<ZodFlawType>(structuredClone(sampleFlawFull) as ZodFlawType);
    flaw.value.cve_id = 'CVE-2024-2222';
    // simulate missing comment_zero to assert fallback to undefined
    // @ts-expect-error runtime test override
    flaw.value.comment_zero = null;
    const ctx = aegisSuggestionRequestBody(flaw);
    const payload = serializeAegisContext(ctx);
    expect(payload).toEqual({
      cve_id: 'CVE-2024-2222',
      title: 'Sample title',
      comment_zero: undefined,
      cve_description: 'I am a spooky CVE',
      statement: 'Statement for None',
      steering_notes: undefined,
      components: ['kernel'],
      affects: flaw.value.affects.map(affect => omit(['tracker'], affect)),
      cvss_scores: flaw.value.cvss_scores,
      comments: serializePublicComments(flaw.value.comments),
      references: flaw.value.references,
      embargoed: flaw.value.embargoed,
      impact: 'MODERATE',
    });
  });

  it.each([
    { label: 'missing metadata', metadata: undefined },
    { label: 'null metadata', metadata: null },
    { label: 'missing notes', metadata: {} },
    { label: 'null notes', metadata: { steering_notes: null } },
    { label: 'non-string notes', metadata: { steering_notes: ['legacy value'] } },
    { label: 'legacy metadata', metadata: 'legacy value' },
  ])('omits steering_notes from JSON for $label', ({ metadata }) => {
    const flaw = ref<ZodFlawType>({ ...blankFlaw(), aegis_meta: metadata });
    const context = aegisSuggestionRequestBody(flaw);
    expect(context.steeringNotes!.value).toBeUndefined();
    const json = JSON.parse(JSON.stringify(serializeAegisContext(context)));
    expect(json).not.toHaveProperty('steering_notes');
    expect(json).not.toHaveProperty('aegis_meta');
  });

  describe('analysis request JSON', () => {
    beforeEach(() => {
      const runtime = osimRuntime as Ref<OsimRuntimeType>;
      runtime.value.backends.aegisai = baseUrl;
      runtime.value.flags = { aiTitleSuggestions: true };
      useAegisMetadataTracking().setAegisMetadata({});
    });

    it.each([undefined, null, '', ' \t\n ', '  Internal\n分析 🔒\t '])(
      'sends only top-level notes %j in both single and bulk requests', async (notes) => {
        const bodies = recordRequests();
        const { coordinator, titleActions } = setupRequests({
          steering_notes: notes,
          title: [{ type: 'AI-Bot', value: 'Private history', timestamp: '2024-01-01T00:00:00Z' }],
          bot_processed: true,
          other_private_metadata: { secret: 'Must stay local' },
        });
        await titleActions.suggestTitle();
        await coordinator.suggestAll(['title']);

        expect(bodies).toHaveLength(2);
        for (const body of bodies) {
          expect(body.cve_id).toBe('CVE-2024-1234');
          if (notes == null) expect(body).not.toHaveProperty('steering_notes');
          else expect(body.steering_notes).toBe(notes);
          expect(body).not.toHaveProperty('aegis_meta');
          expect(body).not.toHaveProperty('bot_processed');
          expect(body).not.toHaveProperty('other_private_metadata');
          expect(JSON.stringify(body)).not.toContain('Private history');
          expect(JSON.stringify(body)).not.toContain('Must stay local');
        }
        expect(bodies[1].features).toEqual(['suggest-description']);
      },
    );

    it('reads locally applied notes for each request without sending an unapplied draft', async () => {
      const bodies = recordRequests();
      const { coordinator, flaw, notes, titleActions } = setupRequests({ steering_notes: 'Loaded notes' });
      notes.setDraft('  New notes\n分析 🔒\t ');
      await titleActions.suggestTitle();
      await coordinator.suggestAll(['title']);
      expect(bodies.slice(0, 2).map(body => body.steering_notes)).toEqual(['Loaded notes', 'Loaded notes']);

      notes.save();
      notes.setDraft('Unapplied draft');
      await titleActions.suggestTitle();
      await coordinator.suggestAll(['title']);
      expect(bodies.slice(2, 4).map(body => body.steering_notes)).toEqual([
        '  New notes\n分析 🔒\t ', '  New notes\n分析 🔒\t ',
      ]);
      expect(notes.draft.value).toBe('Unapplied draft');

      notes.clear();
      notes.save();
      notes.setDraft('Another unapplied draft');
      await titleActions.suggestTitle();
      await coordinator.suggestAll(['title']);
      expect(bodies).toHaveLength(6);
      expect(bodies.slice(4).map(body => body.steering_notes)).toEqual(['', '']);
      expect(flaw.value.aegis_meta.steering_notes).toBe('');
      expect(notes.draft.value).toBe('Another unapplied draft');
    });
  });
});
