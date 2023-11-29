#!/bin/bash

set -x

command -v jq >/dev/null || { printf >&2 'Install the jq package\n'; exit 1; }

# cd to repo root; do not use `git rev-parse --show-cdup` in case this was extracted from an archive tarball
while ! [[ -f Dockerfile.local ]]; do cd .. || exit; echo "$PWD"; done

[[ "$(cat ./public/runtime.json | jq -r .backends.osidb)" != null ]] || { printf >&2 'Create the public/runtime.json file\n'; exit 1; }

docker="$(command -v podman || command -v docker)"

set -x

"$docker" build -f Dockerfile.local -t osim:local
"$docker" run --rm -p 8080:8080 --env OSIM_RUNTIME='{"backends":{"osidb":"/osidb","bugzilla":"http://bugzilla-service:8001"},"osimVersion":"0"}' --env OSIDB_BACKEND="$(cat ./public/runtime.json | jq -r .backends.osidb)" osim:local
