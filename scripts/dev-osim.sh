#!/bin/bash

# Function to run concurrently and trap exit signal
start_dev() {
  yarn run-p "$1" "$2" &
  PID=$!

  trap "kill $PID" EXIT
  wait $PID
}


start_dev  "dev-server" "test:unit"
