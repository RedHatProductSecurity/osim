import { useNetworkQueue } from '../useNetworkQueue';

describe('useNetworkQueue', () => {
  let networkQueue: ReturnType<typeof useNetworkQueue>;

  beforeEach(() => {
    networkQueue = useNetworkQueue();
  });

  it('should execute all tasks in the queue successfully', async () => {
    const task1 = vi.fn().mockResolvedValue('Result 1');
    const task2 = vi.fn().mockResolvedValue('Result 2');
    const task3 = vi.fn().mockResolvedValue('Result 3');

    const result = await networkQueue.execute(task1, task2, task3);

    expect(task1).toHaveBeenCalled();
    expect(task2).toHaveBeenCalled();
    expect(task3).toHaveBeenCalled();
    expect(result).toBe('Result 3');
    expect(networkQueue.successfulCalls.value).toBe(3);
    expect(networkQueue.unsuccessfulCalls.value).toBe(0);
    expect(networkQueue.pendingCalls.value).toBe(0);
    expect(networkQueue.activeCalls.value).toBe(0);
  });

  it('should handle errors in the queue and throw an error', async () => {
    const task1 = vi.fn().mockResolvedValue('Result 1');
    const task2 = vi.fn().mockRejectedValue(new Error('Task 2 failed'));
    const task3 = vi.fn().mockResolvedValue('Result 3');

    await expect(networkQueue.execute(task1, task2, task3)).rejects.toThrow(
      'Failed to execute all tasks queue on action',
    );

    expect(task1).toHaveBeenCalled();
    expect(task2).toHaveBeenCalled();
    expect(task3).not.toHaveBeenCalled();
    expect(networkQueue.successfulCalls.value).toBe(4);
    expect(networkQueue.unsuccessfulCalls.value).toBe(1);
    expect(networkQueue.pendingCalls.value).toBe(0);
    expect(networkQueue.activeCalls.value).toBe(0);
  });
});
