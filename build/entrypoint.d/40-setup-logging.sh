#!/bin/sh

ACCESS_LOG=/var/log/nginx/access.log
ERROR_LOG=/var/log/nginx/error.log

if [ "${OSIM_ENV}" = "dev" ]; then
    ACCESS_LOG=/dev/stdout
    ERROR_LOG=/dev/stderr
fi

sed -i "s|access_log  /var/log/nginx/access.log  main;|access_log ${ACCESS_LOG} main;\n    error_log ${ERROR_LOG};|" /etc/nginx/nginx.conf
