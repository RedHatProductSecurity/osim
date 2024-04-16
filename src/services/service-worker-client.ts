
// TODO delete this file after 2024-06-01
// In the future, create a self-destructing service worker to make cleanup easy.
navigator.serviceWorker.getRegistrations().then(registrations => {
  for (const registration of registrations) {
    registration.unregister();
  }
});
