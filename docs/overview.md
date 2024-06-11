# OSIM Developer Guide

## Directory layout

| Dir                     | Purpose                                      |
|-------------------------|----------------------------------------------|
| `index.html`            | The root-level HTML entrypoint               |
| `Dockerfile`            | Builds the deployed image                    |
| `.env.local`            | Local Vue environment variables              |
| `docs/`                 | The docs                                     |
| `features/`             | Selenium tests                               |
| `openshift/`            | OpenShift config (incomplete; for reference) |
| `scripts/`              | Dev utility scripts                          |
| `build/`                | Files to support building the deployed image |
| `dist/`                 | The compiled app                             |
| `public/`               | Static files                                 |
| `public/runtime.json`   | Local backend configuration                  |
| `src/`                  | Main source code                             |
| `src/main.ts`           | The root-level typescript entrypoint         |
| `src/App.vue`           | The root-level Vue component                 |
| `src/assets/`           | Static files (processed by Vue compiler)     |
| `src/components/`       | Composable Vue components                    |
| `src/directives/`       | Vue directives                               |
| `src/router/`           | Application routes                           |
| `src/services/`         | Business logic and data accessors            |
| `src/stores/`           | Stores for cross-component state             |
| `src/views/`            | Vue components directly mounted to routes    |
| `src/generated-client/` | (future) Generated types for the OSIDB API   |

## Patterns & Practices

* Use Vue for all DOM manipulation; no jQuery, etc.
* Use Typescript with the Vue composition API: `<script setup lang="ts">`
* Pages are placed in the `views` directory and named `[Page]View.vue`
* Each page gets a canonical URL as defined in `router/index.ts`
* Pages just wrap reusable components
* Components are placed in the `components` directory
* Prefer props for state when possible; fall back to Pinia in cases where state
  needs to be shared across sibling components
* Data access happens through services in the `services` directory,
  named `[Object]Service.ts`
* All environment variables created for OSIM are all prefixed OSIM_
* `OsidbAuthService` is used to authenticate calls to OSIDB; the OSIDB team
  recommends generating a unique access token per request, and we may interface
  with other backends in the future, so we don't set a global Authentication
  header.
* Use semantic HTML where applicable
* Bootstrap form docs usually do not demonstrate nesting inputs inside labels,
  but this is usually possible by putting the parent classes on the label tag
  and by putting the label classes on a span tag containing the label text
    * This is preferable to using id and for attributes, because ids need to be
      unique on the document, and form components may be included multiple times
      on the document.
    * If nesting the input inside the label is not possible, use
      InputLabelDirective.

## Special Cases

* `stores/osimRuntime.ts` is not a Pinia store:
    * osimRuntime sets runtime values on the initial page load and the values
      never need to be changed again
    * Pinia is useful for tracking values that can change
    * Therefore, Pinia would add complexity in this case without significant
      benefit

## Deployment

* `OSIM_`-prefixed environment variables store static information about the UI
  and backends.
* The runtime configuration is written to `/dev/shm` because that is one of 2
  user-writable directories in the container image.
    * `/tmp` is not used because other junk may be placed there, and some
      separation of concerns can prevent confusion.
* Logs are written to stdout/stderr, but we may log to a file in the future for
  more configurable and secure routing options.

### Environment Variables

```
OSIM_ENV="dev"
OSIM_BACKENDS_OSIDB="http://osidb-service:8000"
OSIM_BACKENDS_OSIDB_AUTH="kerberos"
OSIM_BACKENDS_BUGZILLA="http://bugzilla-service:8001"
OSIM_BACKENDS_JIRA="http://jira-service:8002"
OSIM_BACKENDS_ERRATA="http://errata-service:8003"
OSIM_BACKENDS_JIRA_DISPLAY="http://jira-service:8002"
OSIM_NGINX_PROXY_JIRA=
OSIM_NGINX_PROXY_CA=
```

* `OSIM_NGINX_PROXY_JIRA`: If set, creates a /proxy/jira/ endpoint in the OSIM
  server, to simplify CORS configuration. `OSIM_BACKENDS_JIRA` should be updated
  to point to OSIM's proxy. It might be required to also add the `OSIM_NGINX_PROXY_CA` with the certificate's endpoint for the proxy authorization.

## Local Configuration

* Create `public/runtime.json` with the following contents:
  ```json
    {
      "env": "dev",
      "backends": {
        "osidb": "http://localhost:8000",
        "osidbAuth": "<kerberos|credentials>",
        "bugzilla": "http://localhost:8001",
        "jira": "http://localhost:8002",
        "errata": "http://localhost:8003"
        "jiraDisplay": "http://localhost:8002"
      },
      "osimVersion": {
        "rev":"dev",
        "tag":"dev",
        "timestamp":"1970-01-01T00:00:00Z",
        "dirty":true
      }
    }
  ```
  * **osidbAuth** (default `kerberos`) - authentication method which should be used to authenticate agains OSIDB backend.
                                         `kerberos` is generally used for stage/prod OSIDB instances,
                                         `credentials` is generally used for local OSIDB instances.
