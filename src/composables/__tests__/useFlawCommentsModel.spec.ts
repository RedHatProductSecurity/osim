import { ref } from 'vue';

import { flushPromises } from '@vue/test-utils';

import { getJiraComments, postJiraComment } from '@/services/JiraService';
import { postFlawComment } from '@/services/FlawService';
import { SYSTEM_EMAIL } from '@/constants';
import type { ZodFlawCommentType, ZodFlawType } from '@/types/zodFlaw';

import { useFlawCommentsModel } from '../useFlawCommentsModel';
import { blankFlaw } from '../useFlawModel';

vi.mock('@/services/JiraService');
vi.mock('@/services/FlawService');

describe('useFlawCommentsModel', () => {
  const flaw = ref<ZodFlawType>({
    ...blankFlaw(),
    comments: [],
    task_key: 'TASK-123',
    uuid: 'uuid-123',
    embargoed: false,
  });
  const isSaving = ref(false);
  const afterSaveSuccess = vi.fn();

  it('should initialize correctly', () => {
    const {
      internalComments,
      internalCommentsAvailable,
      isLoadingInternalComments,
      privateComments,
      publicComments,
      systemComments,
    } = useFlawCommentsModel(flaw, isSaving, afterSaveSuccess);

    expect(publicComments.value).toEqual([]);
    expect(privateComments.value).toEqual([]);
    expect(internalComments.value).toEqual([]);
    expect(systemComments.value).toEqual([]);
    expect(isLoadingInternalComments.value).toBe(false);
    expect(internalCommentsAvailable.value).toBe(false);
  });

  it('should filter public comments correctly', () => {
    flaw.value.comments = [{ is_private: false } as ZodFlawCommentType];
    const { publicComments } = useFlawCommentsModel(flaw, isSaving, afterSaveSuccess);

    expect(publicComments.value).toEqual([{ is_private: false }]);
  });

  it('should filter private comments correctly', () => {
    flaw.value.comments = [{ is_private: true, creator: 'user@example.com' } as ZodFlawCommentType];
    const { privateComments } = useFlawCommentsModel(flaw, isSaving, afterSaveSuccess);

    expect(privateComments.value).toEqual([{ is_private: true, creator: 'user@example.com' }]);
  });

  it('should filter system comments correctly', () => {
    flaw.value.comments = [{ creator: SYSTEM_EMAIL } as ZodFlawCommentType];
    const { systemComments } = useFlawCommentsModel(flaw, isSaving, afterSaveSuccess);

    expect(systemComments.value).toEqual([{ creator: SYSTEM_EMAIL }]);
  });

  it('should load internal comments when task_key is present', async () => {
    vi.mocked(getJiraComments, { partial: true }).mockResolvedValue({
      response: { ok: true } as Response,
      data: { comments: [{ author: { name: 'author' }, created: 'date', body: 'body' }] },
    });
    const {
      internalComments,
      internalCommentsAvailable,
      isLoadingInternalComments,
      loadInternalComments,
    } = useFlawCommentsModel(flaw, isSaving, afterSaveSuccess);

    loadInternalComments();
    await flushPromises();

    expect(internalCommentsAvailable.value).toBe(true);
    expect(internalComments.value).toEqual([{ creator: 'author', created_dt: 'date', text: 'body' }]);
    expect(isLoadingInternalComments.value).toBe(false);
  });

  it('should handle error when loading internal comments', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(getJiraComments).mockRejectedValue({ response: { ok: false, status: 404 } });
    const {
      internalCommentsAvailable,
      isLoadingInternalComments,
      loadInternalComments,
    } = useFlawCommentsModel(flaw, isSaving, afterSaveSuccess);

    loadInternalComments();
    await flushPromises();

    expect(internalCommentsAvailable.value).toBe(false);
    expect(isLoadingInternalComments.value).toBe(false);
  });

  it('should add an OSIDB comment', async () => {
    vi.mocked(postFlawComment).mockResolvedValue({});
    const { addFlawComment } = useFlawCommentsModel(flaw, isSaving, afterSaveSuccess);

    addFlawComment('comment', 'creator', 'Public');
    await flushPromises();

    expect(postFlawComment).toHaveBeenCalledWith('uuid-123', 'comment', 'creator', false, false);
    expect(afterSaveSuccess).toHaveBeenCalled();
    expect(isSaving.value).toBe(false);
  });

  it('should add an internal comment', async () => {
    vi.mocked(postJiraComment).mockResolvedValue({});
    const { addFlawComment } = useFlawCommentsModel(flaw, isSaving, afterSaveSuccess);

    addFlawComment('comment', 'creator', 'Internal');
    await flushPromises();

    expect(postJiraComment).toHaveBeenCalledWith('TASK-123', 'comment');
    expect(isSaving.value).toBe(false);
  });
});
