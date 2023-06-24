#!/bin/sh

if [ "x$OSIM_BACKEND" = x ]; then
    printf '%s\n' 'OSIM_BACKEND not in environment. Setting default backend.json contents.'
    OSIM_BACKEND='{"osidb":"http://osidb-service:8000"}'
fi

# Store to /dev/shm because /var/www/nginx/html is read-only and /tmp might get messy
printf '%s\n%s\n' 'Writing /dev/shm/backend.json:' "$OSIM_BACKEND"
printf '%s\n' "$OSIM_BACKEND" >/dev/shm/backend.json
chmod 444 /dev/shm/backend.json
