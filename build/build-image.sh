#!/bin/bash

set -x

podman build . -f "${1:-Dockerfile}" -t osim:local
