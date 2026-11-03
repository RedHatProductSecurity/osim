import type { App, Ref } from 'vue';
import { computed, ref } from 'vue';

import { flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useFetchFlaw } from '@/composables/useFetchFlaw';
import { blankFlaw, useFlaw } from '@/composables/useFlaw';
import { useAegisSuggestDescription } from '@/composables/aegis/useAegisSuggestDescription';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';
import type { AegisSuggestionContextRefs } from '@/composables/aegis/useAegisSuggestionContext';

import { withSetup } from '@/__tests__/helpers';
import { getFlaw } from '@/services/FlawService';
import { getAffects } from '@/services/AffectService';
import { getFlawAuditHistory } from '@/services/AuditService';
import { osimRuntime } from '@/stores/osimRuntime';
import type { ZodAffectType, ZodFlawType } from '@/types';
import type { ZodFlawHistoryItemType } from '@/types/zodFlaw';
import type { OsimRuntimeType } from '@/types/zodOsim';

const mockAddToast = vi.fn();
vi.mock('@/stores/ToastStore', () => ({
  useToastStore: vi.fn(() => ({
    addToast: mockAddToast,
  })),
}));

vi.mock('@/stores/TourStore', () => ({
  useTourStore: vi.fn(() => ({
    isTourActive: false,
  })),
}));

vi.mock('@/stores/UserStore', () => ({
  useUserStore: vi.fn(() => ({
    userEmail: 'test@example.com',
  })),
}));

const analyzeMock = vi.fn();
vi.mock('@/services/AegisAIService', () => ({
  AegisAIService: vi.fn().mockImplementation(function () {
    return {
      analyzeCVEWithContext: analyzeMock,
      sendFeedback: vi.fn(),
    };
  }),
}));

vi.mock('@/services/FlawService', () => ({
  getFlaw: vi.fn(),
}));

vi.mock('@/services/AffectService', () => ({
  getAffects: vi.fn(),
}));

vi.mock('@/services/AuditService', () => ({
  getFlawAuditHistory: vi.fn(),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function serverFlaw(): ZodFlawType {
  return {
    ...blankFlaw(),
    uuid: 'flaw-uuid-1',
    cve_id: 'CVE-2024-1234',
    title: 'Original title',
    cve_description: 'Original description',
  };
}

function suggestionContext(): AegisSuggestionContextRefs {
  return {
    cveId: ref('CVE-2024-1234'),
    title: ref('Original title'),
    commentZero: ref(null),
    cveDescription: ref('Original description'),
    requiresCveDescription: ref(null),
    statement: ref(null),
    components: ref(['kernel']),
  } as AegisSuggestionContextRefs;
}

describe('useFetchFlaw', () => {
  let app: App | undefined;
  const { flaw, initialFlaw, isFlawUpdated, resetFlaw } = useFlaw();
  const tracking = useAegisMetadataTracking();
  const runtime = osimRuntime as Ref<OsimRuntimeType>;

  beforeEach(() => {
    app?.unmount();
    app = undefined;
    vi.clearAllMocks();
    resetFlaw();
    tracking.setAegisMetadata({});
    runtime.value.flags = undefined;
  });

  afterEach(() => {
    app?.unmount();
    app = undefined;
  });

  /** Wires the description suggestion composable to the shared flaw model like FlawForm. */
  function mountDescriptionSuggester() {
    const descriptionRef = computed({
      get: () => flaw.value.cve_description,
      set: (value) => { flaw.value.cve_description = value; },
    });
    const [descriptionActions, mountedApp] = withSetup(
      () => useAegisSuggestDescription({ context: suggestionContext(), descriptionRef }),
      [],
    );
    app = mountedApp;
    return descriptionActions;
  }

  it('keeps an AI description applied while the affects fetch is still pending', async () => {
    vi.mocked(getFlaw).mockResolvedValue(serverFlaw());
    const affectsDeferred = deferred<{ data: { results: ZodAffectType[] }; response: Response }>();
    vi.mocked(getAffects).mockReturnValue(affectsDeferred.promise);
    const descriptionActions = mountDescriptionSuggester();
    analyzeMock.mockResolvedValueOnce({
      suggested_description: 'AI suggested description',
      confidence: 0.95,
    });

    const fetching = useFetchFlaw().fetchFlaw('CVE-2024-1234');
    await flushPromises();
    expect(useFetchFlaw().isFetchingAffects.value).toBe(true);

    // The user generates a description while affects are still loading.
    await descriptionActions.suggestDescription();
    expect(flaw.value.cve_description).toBe('AI suggested description');
    expect(isFlawUpdated.value).toBe(true);
    expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'AI Suggestion Applied' }));

    // The paginated affects fetch finishes afterwards.
    const affects = [{ uuid: 'affect-uuid-1' }, { uuid: 'affect-uuid-2' }] as ZodAffectType[];
    affectsDeferred.resolve({ data: { results: affects }, response: {} as Response });
    await fetching;
    await flushPromises();

    expect(useFetchFlaw().isFetchingAffects.value).toBe(false);
    expect(flaw.value.affects).toEqual(affects);
    expect(initialFlaw.value.affects).toEqual(affects);
    // The applied suggestion must survive the late load and stay unsaved.
    expect(flaw.value.cve_description).toBe('AI suggested description');
    expect(isFlawUpdated.value).toBe(true);
  });

  it('syncs late audit history into the model and baseline without marking the flaw updated', async () => {
    runtime.value.flags = { flawHistory: true };
    vi.mocked(getFlaw).mockResolvedValue(serverFlaw());
    vi.mocked(getAffects).mockResolvedValue({ data: { results: [] }, response: {} as Response });
    const historyDeferred = deferred<ZodFlawHistoryItemType[]>();
    vi.mocked(getFlawAuditHistory).mockReturnValue(historyDeferred.promise);

    const { fetchFlaw, historyFetchError } = useFetchFlaw();
    const fetching = fetchFlaw('CVE-2024-1234');
    await flushPromises();
    expect(historyFetchError.value).toBe(false);

    const auditHistory = [{ pgh_label: 'update' }] as ZodFlawHistoryItemType[];
    historyDeferred.resolve(auditHistory);
    await fetching;
    await flushPromises();

    expect(flaw.value.history).toEqual(auditHistory);
    expect(initialFlaw.value.history).toEqual(auditHistory);
    expect(isFlawUpdated.value).toBe(false);
  });

  it('keeps flaw edits when the audit history fetch fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    runtime.value.flags = { flawHistory: true };
    vi.mocked(getFlaw).mockResolvedValue(serverFlaw());
    vi.mocked(getAffects).mockResolvedValue({ data: { results: [] }, response: {} as Response });
    const historyDeferred = deferred<ZodFlawHistoryItemType[]>();
    vi.mocked(getFlawAuditHistory).mockReturnValue(historyDeferred.promise);

    const { fetchFlaw, historyFetchError } = useFetchFlaw();
    const fetching = fetchFlaw('CVE-2024-1234');
    await flushPromises();

    flaw.value.cve_description = 'AI suggested description';
    expect(isFlawUpdated.value).toBe(true);

    historyDeferred.reject(new Error('history unavailable'));
    await fetching;
    await flushPromises();
    consoleError.mockRestore();

    expect(historyFetchError.value).toBe(true);
    expect(flaw.value.history).toEqual([]);
    expect(flaw.value.cve_description).toBe('AI suggested description');
    expect(isFlawUpdated.value).toBe(true);
  });
});
