import { type App } from 'vue';

import { flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import { useFlawModel } from '@/composables/useFlawModel';
import { useAegisMetadataTracking } from '@/composables/aegis/useAegisMetadataTracking';

import sampleFlawFull from '@/__tests__/__fixtures__/sampleFlawFull.json';
import { withSetup, router } from '@/__tests__/helpers';
import type { ZodFlawType } from '@/types';
import { getFlaw, putFlaw, putFlawReference } from '@/services/FlawService';
import { deepCopyFromRaw } from '@/utils/helpers';
import { useToastStore } from '@/stores/ToastStore';

import { useFlaw } from '../useFlaw';
import { useAffectsModel } from '../useAffectsModel';
import { useFlawLabels } from '../useFlawLabels';

vi.mock('@/composables/useFlawCommentsModel', () => ({
  useFlawCommentsModel: vi.fn(),
}));

// The real useFlawAttributionsModel is under test here; only its services are mocked.
const sendProgrammaticFeedbackMock = vi.fn();
vi.mock('@/services/AegisAIService', () => ({
  AegisAIService: vi.fn().mockImplementation(function () {
    return {
      sendProgrammaticFeedback: sendProgrammaticFeedbackMock,
    };
  }),
}));

vi.mock('@/services/FlawService', () => ({
  getFlaw: vi.fn(),
  getFlawBugzillaLink: vi.fn().mockResolvedValue({}),
  getFlawOsimLink: vi.fn().mockResolvedValue({}),
  postFlaw: vi.fn().mockResolvedValue({}),
  putFlaw: vi.fn().mockResolvedValue({}),
  putFlawCvssScores: vi.fn().mockResolvedValue({}),
  deleteFlawCvssScores: vi.fn().mockResolvedValue({}),
  postFlawReference: vi.fn().mockResolvedValue(undefined),
  putFlawReference: vi.fn().mockResolvedValue(undefined),
  deleteFlawReference: vi.fn().mockResolvedValue(undefined),
  postFlawAcknowledgment: vi.fn().mockResolvedValue(undefined),
  putFlawAcknowledgment: vi.fn().mockResolvedValue(undefined),
  deleteFlawAcknowledgment: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/LabelsService', () => ({
  createLabel: vi.fn().mockResolvedValue({}),
  deleteLabel: vi.fn().mockResolvedValue({}),
  fetchLabels: vi.fn().mockResolvedValue([]),
  updateLabel: vi.fn().mockResolvedValue({}),
}));

function flawData(): ZodFlawType {
  return deepCopyFromRaw(sampleFlawFull as ZodFlawType);
}

describe('useFlawModel attribution collisions', () => {
  let app: App;
  const { resetFlaw: globalResetFlaw } = useFlaw();
  const { initializeAffects } = useAffectsModel().actions;

  const mountFlawModel = () => {
    const pinia = createTestingPinia();
    const [composable, _app] = withSetup(() => ({ ...useFlawModel() }), [router, pinia]);
    app = _app;
    return composable;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    globalResetFlaw();
    useAegisMetadataTracking().setAegisMetadata({});
    initializeAffects([]);
    useFlawLabels([]);
  });

  afterEach(() => {
    app?.unmount();
  });

  it('keeps unsaved reference edits across a flaw save and folds disjoint server changes', async () => {
    const { flaw, initialFlaw, isFlawUpdated, setFlaw } = useFlaw();
    const data = flawData();
    setFlaw(data);

    const loadedReference = { ...data.references[0] };
    flaw.value.references[0].url = 'https://example.com/edited';
    const serverAcknowledgment = {
      ...data.acknowledgments[0],
      name: 'Server Name',
      updated_dt: '2024-06-01T00:00:00Z',
    };
    vi.mocked(putFlaw).mockResolvedValue({
      ...flawData(),
      updated_dt: '2024-06-01T00:00:00Z',
      references: [loadedReference],
      acknowledgments: [serverAcknowledgment],
    });

    const model = mountFlawModel();
    await model.updateFlaw();
    await flushPromises();

    expect(putFlaw).toHaveBeenCalledTimes(1);
    // The local reference edit survives the flaw-level save untouched.
    expect(flaw.value.references[0].url).toBe('https://example.com/edited');
    // The server-side acknowledgment change folded in.
    expect(flaw.value.acknowledgments[0].name).toBe('Server Name');
    expect(initialFlaw.value.acknowledgments[0].name).toBe('Server Name');
    // Only the local reference edit stays dirty against the server baseline.
    expect(initialFlaw.value.references[0].url).toBe('https://example.com');
    expect(isFlawUpdated.value).toBe(true);
    expect(model.showCollisionDialog.value).toBe(false);
    expect(vi.mocked(useToastStore().addToast)).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Flaw saved with newer changes',
      body: expect.stringContaining('Server Name'),
    }));
  });

  /** Saves a flaw whose server reference copy conflicts with the local edit. */
  async function stageFlawSaveReferenceConflict() {
    const { flaw, setFlaw } = useFlaw();
    const data = flawData();
    setFlaw(data);
    flaw.value.references[0].url = 'https://example.com/edited';

    const serverReference = {
      ...data.references[0],
      url: 'https://example.com/server',
      updated_dt: '2024-06-01T00:00:00Z',
    };
    vi.mocked(putFlaw).mockResolvedValue({
      ...data,
      updated_dt: '2024-06-01T00:00:00Z',
      references: [serverReference],
    });

    const model = mountFlawModel();
    await model.updateFlaw();
    await flushPromises();
    return { data, model, serverReference };
  }

  it('re-opens the collision dialog as reference rows when a flaw save conflicts with local edits', async () => {
    const { data, model } = await stageFlawSaveReferenceConflict();
    const referenceUuid = data.references[0].uuid;

    expect(model.showCollisionDialog.value).toBe(true);
    expect(model.collisionConflicts.value).toEqual([{
      id: `reference:${referenceUuid}`,
      label: 'Reference · https://example.com/edited',
      mine: 'Link URL: https://example.com/edited',
      server: 'Link URL: https://example.com/server',
    }]);
    expect(putFlawReference).not.toHaveBeenCalled();
    expect(useFlaw().flaw.value.references[0].url).toBe('https://example.com/edited');
  });

  it('saves the kept reference with the server concurrency token on confirm', async () => {
    const { data, model } = await stageFlawSaveReferenceConflict();

    vi.mocked(putFlawReference).mockResolvedValue({
      data: { ...data.references[0], url: 'https://example.com/edited', updated_dt: '2024-06-02T00:00:00Z' },
    } as any);
    vi.mocked(getFlaw).mockResolvedValue({
      ...flawData(),
      references: [{ ...data.references[0], url: 'https://example.com/edited', updated_dt: '2024-06-02T00:00:00Z' }],
    });

    await model.confirmCollisionDialog({ [`reference:${data.references[0].uuid}`]: 'mine' });
    await flushPromises();

    expect(putFlawReference).toHaveBeenCalledWith(
      data.uuid,
      data.references[0].uuid,
      expect.objectContaining({ url: 'https://example.com/edited', updated_dt: '2024-06-01T00:00:00Z' }),
      undefined,
    );
    expect(model.showCollisionDialog.value).toBe(false);
    expect(model.pendingAttributionConflict.value).toBeNull();
    expect(useFlaw().flaw.value.references[0].url).toBe('https://example.com/edited');
  });

  it('dismisses the staged reference conflict on cancel, keeping the local edit', async () => {
    const { model } = await stageFlawSaveReferenceConflict();

    model.cancelCollisionDialog();

    expect(model.showCollisionDialog.value).toBe(false);
    expect(model.collisionConflicts.value).toEqual([]);
    expect(useFlaw().flaw.value.references[0].url).toBe('https://example.com/edited');
  });

  it('folds server collection additions when confirming a flaw-field conflict', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { flaw, setFlaw } = useFlaw();
    const data = flawData();
    setFlaw(data);
    flaw.value.title = 'analyst title';

    const addedReference = {
      ...data.references[0],
      uuid: 'added-on-server',
      url: 'https://example.com/added',
      updated_dt: '2024-06-01T00:00:00Z',
    };
    const serverFlawState = {
      ...data,
      title: 'bot title',
      updated_dt: '2024-06-01T00:00:00Z',
      references: [data.references[0], addedReference],
    };
    vi.mocked(putFlaw).mockRejectedValueOnce({ response: { status: 409 } });
    vi.mocked(getFlaw).mockResolvedValue(serverFlawState);

    const model = mountFlawModel();
    await model.updateFlaw();
    await flushPromises();

    expect(model.showCollisionDialog.value).toBe(true);
    expect(model.collisionConflicts.value).toEqual([{
      id: 'title',
      label: 'Title',
      mine: 'analyst title',
      server: 'bot title',
    }]);

    vi.mocked(putFlaw).mockResolvedValueOnce(serverFlawState);
    await model.confirmCollisionDialog({ title: 'server' });
    await flushPromises();

    expect(flaw.value.title).toBe('bot title');
    expect(flaw.value.references).toEqual([data.references[0], addedReference]);
    expect(model.showCollisionDialog.value).toBe(false);
    expect(vi.mocked(useToastStore().addToast)).toHaveBeenCalledWith(expect.objectContaining({
      body: expect.stringContaining('https://example.com/added'),
    }));
  });
});
