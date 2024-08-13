import { ref } from 'vue';

const pendingCalls = ref(0);
const activeCalls = ref(0);
const successfulCalls = ref(0);
const unsuccessfulCalls = ref(0);

type QueueTask = () => Promise<any>;

export function useNetworkQueue() {

  async function execute(...queue: QueueTask[]) {

    let lastResult;
    let remainingTasks = queue.length;
    pendingCalls.value += remainingTasks;

    for (const action of queue) {
      ++activeCalls.value;

      try {
        lastResult = await action();
      } catch (error) {
        console.error('useNetworkQueue::execute() Error executing action in queue', error);
        ++unsuccessfulCalls.value;
        pendingCalls.value -= remainingTasks;
        throw new Error(`Failed to execute all tasks queue on action ${action}`);
      } finally {
        --activeCalls.value;
      }

      --remainingTasks;
      --pendingCalls.value;
      ++successfulCalls.value;
    }
    return lastResult;
  }

  return {
    successfulCalls,
    unsuccessfulCalls,
    pendingCalls,
    activeCalls,
    execute,
  };
}
