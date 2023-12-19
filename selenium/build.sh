#!/bin/bash

docker="$(command -v podman || command -v docker)"
"$docker" build -t osim-selenium -f Dockerfile

