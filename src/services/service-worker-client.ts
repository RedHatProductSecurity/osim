const connectedStores: { [key: string]: (value: object) => any } = {};

// track stores that completed registration
const promises: { [key: string]: () => void } = {};

export function listen(key: string, handler: (value: object) => any): Promise<unknown> {
    connectedStores[key] = handler;
    navigator.serviceWorker?.controller?.postMessage({_register: key});
    return new Promise<void>(resolve => {
        promises[key] = resolve;
    });
}

export function put(key: string, value: object) {
    navigator.serviceWorker?.controller?.postMessage({key, value});
}

const serviceWorkerClient = {
    listen,
    put,
};
export default serviceWorkerClient;

navigator.serviceWorker?.register('/service-worker.js')
    .then(registration => {
        console.log('crossTabVolatileStore Service Worker registered with scope', registration.scope);
    })
    .catch(error => {
        console.error('crossTabVolatileStore Service Worker registration failed', error);
    });
// Top-level await is not available in the configured target environment "es2020"
// await navigator.serviceWorker.ready;

navigator.serviceWorker?.addEventListener('message', event => {
    if ('_log' in event.data) {
        let args = event.data._log;
        try {
            args = JSON.parse(event.data._log);
        } catch (e) {
            // do nothing
        }
        if (typeof args === 'object') {
            console.log('Service Worker: ', ...args);
        } else {
            console.log('Service Worker: ', args);
        }
        return;
    }
    const {key, value} = event.data;
    console.log('received message', {key, value});

    if (promises[key]) {
        promises[key]();
        delete promises[key];
    }

    const handler: (value: object) => any = connectedStores[key] ?? (() => {
    });
    handler(value);
});
