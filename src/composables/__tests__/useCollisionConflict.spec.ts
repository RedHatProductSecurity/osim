import sampleFlawRequired from '@/__tests__/__fixtures__/sampleFlawRequired.json';
import type { ZodFlawType } from '@/types';
import { deepCopyFromRaw } from '@/utils/helpers';

import { useCollisionConflict } from '../useCollisionConflict';

function flaw(overrides: Partial<ZodFlawType> = {}): ZodFlawType {
  return {
    ...deepCopyFromRaw(sampleFlawRequired as ZodFlawType),
    ...overrides,
  };
}

const conflict = { response: { status: 409 } };

describe('useCollisionConflict', () => {
  it('returns the first save when the server accepts it', async () => {
    const saved = flaw({ title: 'analyst title', updated_dt: '2024-02-01T00:00:00Z' });
    const save = vi.fn().mockResolvedValue(saved);
    const { adopted, conflicts, resolveFlawSave } = useCollisionConflict();

    await expect(resolveFlawSave(flaw(), flaw({ title: 'analyst title' }), save, vi.fn(), vi.fn()))
      .resolves.toBe(saved);

    expect(save).toHaveBeenCalledTimes(1);
    expect(conflicts.value).toEqual([]);
    expect(adopted.value).toEqual([]);
  });

  it('saves again with the server fields the form did not edit', async () => {
    const base = flaw();
    const mine = flaw({ title: 'analyst title' });
    const server = flaw({ statement: 'bot statement', updated_dt: '2024-06-01T00:00:00Z' });
    const save = vi.fn()
      .mockRejectedValueOnce(conflict)
      .mockResolvedValueOnce(server);
    const onUnresolved = vi.fn();
    const { adopted, conflicts, resolveFlawSave } = useCollisionConflict();

    await resolveFlawSave(base, mine, save, async () => server, onUnresolved);

    expect(onUnresolved).not.toHaveBeenCalled();
    expect(conflicts.value).toEqual([]);
    expect(adopted.value).toEqual(['statement']);
    expect(save).toHaveBeenNthCalledWith(2, expect.objectContaining({
      title: 'analyst title',
      statement: 'bot statement',
      updated_dt: '2024-06-01T00:00:00Z',
    }), false);
  });

  it('tracks overlapping fields and does not save again', async () => {
    const base = flaw();
    const mine = flaw({ title: 'analyst title' });
    const server = flaw({ title: 'bot title', updated_dt: '2024-06-01T00:00:00Z' });
    const save = vi.fn().mockRejectedValueOnce(conflict);
    const onUnresolved = vi.fn();
    const { conflicts, resolveFlawSave } = useCollisionConflict();

    await expect(resolveFlawSave(base, mine, save, async () => server, onUnresolved)).rejects.toBe(conflict);

    expect(save).toHaveBeenCalledTimes(1);
    expect(conflicts.value).toEqual([{
      field: 'title',
      mine: 'analyst title',
      server: 'bot title',
    }]);
    expect(onUnresolved).not.toHaveBeenCalled();
  });

  it('keeps the current warning when the reload fails', async () => {
    const save = vi.fn().mockRejectedValueOnce(conflict);
    const onUnresolved = vi.fn();
    const { conflicts, resolveFlawSave } = useCollisionConflict();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(resolveFlawSave(
      flaw(),
      flaw({ title: 'analyst title' }),
      save,
      async () => {
        throw new Error('network');
      },
      onUnresolved,
    )).rejects.toBe(conflict);

    expect(save).toHaveBeenCalledTimes(1);
    expect(conflicts.value).toEqual([]);
    expect(onUnresolved).toHaveBeenCalledWith(conflict);
  });
});
