const store = {};

// Convenience function; debugging service workers is a pain!
function log(...args) {
    console.log(...args);
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({
                _log: JSON.stringify(args.map(arg => {
                    if (Object(arg) !== arg) {
                        // Primitive type
                        return arg;
                    }
                    // Not a primitive; stringify/toString probably leaves out fields
                    let stringed = {};
                    for (let key in arg) {
                        stringed[key] = arg[key];
                    }
                    return stringed;
                })),
            });
        });
    });
}

self.addEventListener('activate', event => {
    log('Service worker activated', event);
    event.waitUntil(self.clients.claim());
})

self.addEventListener('install', event => {
    log('Service worker installed', event);
    event.waitUntil(self.skipWaiting());
})

self.addEventListener('message', event=> {
    //log('message event', event);
    //log('store', store);
    if ('_register' in event.data) {
        log('Registering tab client');
        event.source.postMessage({
            key: event.data._register,
            value: store[event.data._register],
        });
        return;
    }
    if (JSON.stringify(store[event.data.key]) === JSON.stringify(event.data.value)) {
        // Same value; no update
        return;
    }
    store[event.data.key] = event.data.value;
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            if (client.id !== event.source.id) {
                log('Updating client', client.id);
                client.postMessage({
                    key: event.data.key,
                    value: store[event.data.key],
                });
            } else {
                log('Not updating client', client.id);
            }
        });
    });
});
