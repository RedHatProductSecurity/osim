#!/bin/bash

# Function to run concurrently and trap exit signal

yarn run-p "dev-server" "test:unit" &
osim_dev_pid=$!

trap "kill $osim_dev_pid" EXIT
wait $osim_dev_pid
