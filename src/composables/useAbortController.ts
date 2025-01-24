const signalMap = new Map();

export function useAbortControllerFor(key: any, willCancelPrevious = true) {
  const isAlreadyRegistered = signalMap.has(key);
  let controller: AbortController;
  let signal: AbortSignal;

  if (!isAlreadyRegistered) {
    register(key);
  }

  controller = signalMap.get(key).controller ?? register(key);
  signal = controller.signal;

  if (willCancelPrevious && isAlreadyRegistered) {
    controller.abort();
    controller = register(key);
    signal = controller.signal;
  }

  function register(key: any) {
    const newController = new AbortController();
    signalMap.set(key, newController);
    return newController;
  }

  function abort() {
    controller.abort();
  }

  return { signal, abort, isAlreadyRegistered };
}
