#!/bin/sh

access_log=/var/log/nginx/access.log
error_log=/var/log/nginx/error.log

if [ "${OSIM_ENV}" = "dev" ]; then
    access_log=/dev/stdout
    error_log=/dev/stderr
fi

ln -sf -- "$access_log" /tmp/logs/nginx.access.log
ln -sf -- "$error_log" /tmp/logs/nginx.error.log
