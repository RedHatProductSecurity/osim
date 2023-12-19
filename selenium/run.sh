#!/bin/bash

docker="$(command -v podman || command -v docker)"
cmd=(
  "$docker" run
  #-d
  -p 4444:4444
  -p 7900:7900
  --shm-size="2g"
  -v ./keytabs:/keytabs:ro
  #--rm -it
  osim-selenium
  #/bin/tmux
)
set -x
"${cmd[@]}"
