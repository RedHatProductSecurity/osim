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

function serverFlawB(): ZodFlawType {
  return {
    ...blankFlaw(),
    uuid: 'flaw-uuid-2',
    cve_id: 'CVE-2024-5678',
    title: 'Second flaw title',
    cve_description: 'Second flaw description',
  };
}

type AffectsResponse = { data: { results: ZodAffectType[] }; response: Response };

const FLAW_A_CVE = 'CVE-2024-1234';
const FLAW_B_CVE = 'CVE-2024-5678';

/** Routes flaw/affects mocks to per-flaw deferreds so each fetchFlaw call's requests settle independently. */
function mockFetchesPerFlaw(
  flawA: { promise: Promise<ZodFlawType> },
  flawB: { promise: Promise<ZodFlawType> },
  affectsA: { promise: Promise<AffectsResponse> },
  affectsB: { promise: Promise<AffectsResponse> },
) {
  vi.mocked(getFlaw).mockImplementation(
    id => (id === FLAW_A_CVE ? flawA.promise : flawB.promise),
  );
  vi.mocked(getAffects).mockImplementation(
    id => (id === FLAW_A_CVE ? affectsA.promise : affectsB.promise),
  );
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

  it('ignores a stale flaw response after a newer fetchFlaw call has replaced the model', async () => {
    const replaceStateSpy = vi.spyOn(history, 'replaceState').mockImplementation(() => {});
    const flawADeferred = deferred<ZodFlawType>();
    const flawBDeferred = deferred<ZodFlawType>();
    const affectsADeferred = deferred<AffectsResponse>();
    const affectsBDeferred = deferred<AffectsResponse>();
    mockFetchesPerFlaw(flawADeferred, flawBDeferred, affectsADeferred, affectsBDeferred);
    const flawA = {
      ...serverFlaw(),
      aegis_meta: {
        cve_description: [{ type: 'AI-Bot', timestamp: '2024-01-01T00:00:00.000Z', value: 'A description' }],
      },
    };

    const fetchingA = useFetchFlaw().fetchFlaw(FLAW_A_CVE);
    await flushPromises();

    // A fresh composable instance fetches flaw B; the generation guard must coordinate across instances.
    const { fetchFlaw: fetchFlawB, isFetchingAffects } = useFetchFlaw();
    const fetchingB = fetchFlawB(FLAW_B_CVE);
    flawBDeferred.resolve(serverFlawB());
    await flushPromises();
    expect(flaw.value.uuid).toBe('flaw-uuid-2');
    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '/flaws/CVE-2024-5678');

    // A's flaw response arrives late: it must not replace B's model, URL, or aegis metadata.
    flawADeferred.resolve(flawA);
    await flushPromises();
    await fetchingA;

    expect(flaw.value.uuid).toBe('flaw-uuid-2');
    expect(flaw.value.cve_description).toBe('Second flaw description');
    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    expect(replaceStateSpy).not.toHaveBeenCalledWith(null, '', '/flaws/CVE-2024-1234');
    expect(tracking.getAegisMetadata()).toEqual({});

    // The current fetch keeps working: B's affects still land in model and baseline.
    const affectsB = [{ uuid: 'affect-uuid-b-1' }] as ZodAffectType[];
    affectsBDeferred.resolve({ data: { results: affectsB }, response: {} as Response });
    await fetchingB;
    await flushPromises();
    expect(isFetchingAffects.value).toBe(false);
    expect(flaw.value.affects).toEqual(affectsB);
    expect(initialFlaw.value.affects).toEqual(affectsB);
    replaceStateSpy.mockRestore();
  });

  it('ignores a stale audit history success after a newer fetchFlaw call', async () => {
    runtime.value.flags = { flawHistory: true };
    const flawADeferred = deferred<ZodFlawType>();
    const flawBDeferred = deferred<ZodFlawType>();
    const affectsADeferred = deferred<AffectsResponse>();
    const affectsBDeferred = deferred<AffectsResponse>();
    const historyADeferred = deferred<ZodFlawHistoryItemType[]>();
    const historyBDeferred = deferred<ZodFlawHistoryItemType[]>();
    mockFetchesPerFlaw(flawADeferred, flawBDeferred, affectsADeferred, affectsBDeferred);
    vi.mocked(getFlawAuditHistory).mockImplementation(
      uuid => (uuid === 'flaw-uuid-1' ? historyADeferred.promise : historyBDeferred.promise),
    );

    const { fetchFlaw, historyFetchError } = useFetchFlaw();
    fetchFlaw(FLAW_A_CVE);
    flawADeferred.resolve(serverFlaw());
    await flushPromises();
    expect(flaw.value.uuid).toBe('flaw-uuid-1');
    expect(vi.mocked(getFlawAuditHistory)).toHaveBeenCalledWith('flaw-uuid-1');

    const fetchingB = fetchFlaw(FLAW_B_CVE);
    flawBDeferred.resolve(serverFlawB());
    await flushPromises();
    expect(flaw.value.uuid).toBe('flaw-uuid-2');

    // A's audit history arrives late: it must not land in B's model or baseline.
    historyADeferred.resolve([{ pgh_label: 'stale update' }] as ZodFlawHistoryItemType[]);
    await flushPromises();
    expect(flaw.value.history).toBeUndefined();
    expect(initialFlaw.value.history).toBeUndefined();
    expect(historyFetchError.value).toBe(false);

    // B's own audit history still lands in model and baseline.
    const bHistory = [{ pgh_label: 'second flaw update' }] as ZodFlawHistoryItemType[];
    historyBDeferred.resolve(bHistory);
    affectsBDeferred.resolve({ data: { results: [] }, response: {} as Response });
    await fetchingB;
    await flushPromises();
    expect(flaw.value.history).toEqual(bHistory);
    expect(initialFlaw.value.history).toEqual(bHistory);
  });

  it('ignores a stale audit history failure after a newer fetchFlaw call', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    runtime.value.flags = { flawHistory: true };
    const flawADeferred = deferred<ZodFlawType>();
    const flawBDeferred = deferred<ZodFlawType>();
    const affectsADeferred = deferred<AffectsResponse>();
    const affectsBDeferred = deferred<AffectsResponse>();
    const historyADeferred = deferred<ZodFlawHistoryItemType[]>();
    const historyBDeferred = deferred<ZodFlawHistoryItemType[]>();
    mockFetchesPerFlaw(flawADeferred, flawBDeferred, affectsADeferred, affectsBDeferred);
    vi.mocked(getFlawAuditHistory).mockImplementation(
      uuid => (uuid === 'flaw-uuid-1' ? historyADeferred.promise : historyBDeferred.promise),
    );

    const { fetchFlaw, historyFetchError } = useFetchFlaw();
    fetchFlaw(FLAW_A_CVE);
    flawADeferred.resolve(serverFlaw());
    await flushPromises();

    const fetchingB = fetchFlaw(FLAW_B_CVE);
    flawBDeferred.resolve(serverFlawB());
    await flushPromises();
    expect(flaw.value.uuid).toBe('flaw-uuid-2');

    // A's audit history request fails late: no error flag, no empty-history write into B.
    historyADeferred.reject(new Error('stale history failure'));
    await flushPromises();
    expect(historyFetchError.value).toBe(false);
    expect(flaw.value.history).toBeUndefined();

    // B's own audit history failure is still handled.
    historyBDeferred.reject(new Error('second flaw history failure'));
    affectsBDeferred.resolve({ data: { results: [] }, response: {} as Response });
    await fetchingB;
    await flushPromises();
    expect(historyFetchError.value).toBe(true);
    expect(flaw.value.history).toEqual([]);
    consoleError.mockRestore();
  });

  it('ignores stale affects resolved while the newer fetch is still loading affects', async () => {
    const flawADeferred = deferred<ZodFlawType>();
    const flawBDeferred = deferred<ZodFlawType>();
    const affectsADeferred = deferred<AffectsResponse>();
    const affectsBDeferred = deferred<AffectsResponse>();
    mockFetchesPerFlaw(flawADeferred, flawBDeferred, affectsADeferred, affectsBDeferred);

    const { fetchFlaw, isFetchingAffects } = useFetchFlaw();
    const fetchingA = fetchFlaw(FLAW_A_CVE);
    flawADeferred.resolve(serverFlaw());
    await flushPromises();

    const fetchingB = fetchFlaw(FLAW_B_CVE);
    flawBDeferred.resolve(serverFlawB());
    await flushPromises();
    expect(flaw.value.uuid).toBe('flaw-uuid-2');

    // A's affects resolve after B's flaw landed but while B's affects are still loading.
    const affectsA = [{ uuid: 'affect-uuid-a-1' }, { uuid: 'affect-uuid-a-2' }] as ZodAffectType[];
    affectsADeferred.resolve({ data: { results: affectsA }, response: {} as Response });
    await fetchingA;
    await flushPromises();

    expect(isFetchingAffects.value).toBe(true);
    expect(flaw.value.affects).toEqual([]);
    expect(initialFlaw.value.affects).toEqual([]);

    const affectsB = [{ uuid: 'affect-uuid-b-1' }] as ZodAffectType[];
    affectsBDeferred.resolve({ data: { results: affectsB }, response: {} as Response });
    await fetchingB;
    await flushPromises();
    expect(isFetchingAffects.value).toBe(false);
    expect(flaw.value.affects).toEqual(affectsB);
    expect(initialFlaw.value.affects).toEqual(affectsB);
  });

  it('does not fail or reset the current flaw when a stale flaw fetch rejects', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const flawADeferred = deferred<ZodFlawType>();
    const flawBDeferred = deferred<ZodFlawType>();
    const affectsADeferred = deferred<AffectsResponse>();
    const affectsBDeferred = deferred<AffectsResponse>();
    mockFetchesPerFlaw(flawADeferred, flawBDeferred, affectsADeferred, affectsBDeferred);

    const { didFetchFail, fetchFlaw } = useFetchFlaw();
    const fetchingA = fetchFlaw(FLAW_A_CVE);
    await flushPromises();

    const fetchingB = fetchFlaw(FLAW_B_CVE);
    flawBDeferred.resolve(serverFlawB());
    affectsBDeferred.resolve({ data: { results: [] }, response: {} as Response });
    await fetchingB;
    await flushPromises();
    expect(flaw.value.uuid).toBe('flaw-uuid-2');
    expect(didFetchFail.value).toBe(false);

    flawADeferred.reject(new Error('stale flaw fetch failed'));
    await fetchingA;
    await flushPromises();

    expect(didFetchFail.value).toBe(false);
    expect(flaw.value.uuid).toBe('flaw-uuid-2');
    expect(flaw.value.cve_description).toBe('Second flaw description');
    expect(initialFlaw.value.uuid).toBe('flaw-uuid-2');
    expect(mockAddToast).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('does not fail or reset the current flaw when a stale affects fetch rejects', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const flawADeferred = deferred<ZodFlawType>();
    const flawBDeferred = deferred<ZodFlawType>();
    const affectsADeferred = deferred<AffectsResponse>();
    const affectsBDeferred = deferred<AffectsResponse>();
    mockFetchesPerFlaw(flawADeferred, flawBDeferred, affectsADeferred, affectsBDeferred);

    const { didFetchFail, fetchFlaw } = useFetchFlaw();
    const fetchingA = fetchFlaw(FLAW_A_CVE);
    flawADeferred.resolve(serverFlaw());
    await flushPromises();

    const fetchingB = fetchFlaw(FLAW_B_CVE);
    flawBDeferred.resolve(serverFlawB());
    affectsBDeferred.resolve({ data: { results: [] }, response: {} as Response });
    await fetchingB;
    await flushPromises();
    expect(flaw.value.uuid).toBe('flaw-uuid-2');

    affectsADeferred.reject(new Error('stale affects fetch failed'));
    await fetchingA;
    await flushPromises();

    expect(didFetchFail.value).toBe(false);
    expect(flaw.value.uuid).toBe('flaw-uuid-2');
    expect(flaw.value.cve_description).toBe('Second flaw description');
    expect(mockAddToast).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('still fails and resets when the current fetch rejects while an older one is pending', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const flawADeferred = deferred<ZodFlawType>();
    const flawBDeferred = deferred<ZodFlawType>();
    const affectsADeferred = deferred<AffectsResponse>();
    const affectsBDeferred = deferred<AffectsResponse>();
    mockFetchesPerFlaw(flawADeferred, flawBDeferred, affectsADeferred, affectsBDeferred);

    const { didFetchFail, fetchFlaw } = useFetchFlaw();
    fetchFlaw(FLAW_A_CVE);
    await flushPromises();

    const fetchingB = fetchFlaw(FLAW_B_CVE);
    flawBDeferred.reject(new Error('current flaw fetch failed'));
    await fetchingB;
    await flushPromises();

    expect(didFetchFail.value).toBe(true);
    expect(flaw.value.uuid).toBe('');
    expect(mockAddToast).toHaveBeenCalledTimes(1);
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Error loading Flaw' }),
    );

    // The older fetch resolving afterwards must not resurrect its data or clear the failure.
    flawADeferred.resolve(serverFlaw());
    await flushPromises();
    expect(flaw.value.uuid).toBe('');
    expect(didFetchFail.value).toBe(true);
    expect(mockAddToast).toHaveBeenCalledTimes(1);
    consoleError.mockRestore();
  });
});
