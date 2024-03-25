#!/bin/bash

set -x

command -v jq >/dev/null || { printf >&2 'Install the jq package\n'; exit 1; }

# cd to repo root; do not use `git rev-parse --show-cdup` in case this was extracted from an archive tarball
while ! [[ -f local.Dockerfile ]]; do cd .. || exit; echo "$PWD"; done

[[ "$(cat ./public/runtime.json | jq -r .backends.osidb)" != null ]] || { printf >&2 'Create the public/runtime.json file\n'; exit 1; }

docker="$(command -v podman || command -v docker)"

set -x

"$docker" build -f local.Dockerfile -t osim:local
"$docker" run --rm -p 8080:8080 --env OSIM_ENV="dev" --env OSIM_BACKENDS_OSIDB="http://osidb-service:8000" --env OSIM_BACKENDS_BUGZILLA="http://bugzilla-service:8001" --env OSIM_BACKENDS_JIRA="http://jira-service:8002" --env OSIDB_BACKEND="$(cat ./public/runtime.json | jq -r .backends.osidb)" osim:local



