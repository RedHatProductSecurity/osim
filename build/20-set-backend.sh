#!/bin/sh

if [ "x$OSIM_BACKEND" = x ]; then
    printf '%s\n' 'OSIM_BACKEND not in environment. Setting default backend.json contents.'
    OSIM_BACKEND='{"osidb":"http://osidb-service:8000"}'
fi
printf '%s\n%s\n' 'Writing /usr/share/nginx/html/backend.json:' "$OSIM_BACKEND"
printf '%s\n' "$OSIM_BACKEND" >/usr/share/nginx/html/backend.json
