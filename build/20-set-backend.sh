#!/bin/sh

if [ "x$OSIM_BACKENDS" = x ]; then
    printf '%s\n' 'OSIM_BACKENDS not in environment. Setting default backends.json contents.'
    OSIM_BACKENDS='{"osidb":"http://osidb-service:8000"}'
fi

# Store to /dev/shm because /var/www/nginx/html is read-only and /tmp might get messy
printf '%s\n%s\n' 'Writing /dev/shm/backends.json:' "$OSIM_BACKENDS"
printf '%s\n' "$OSIM_BACKENDS" >/dev/shm/backends.json
chmod 444 /dev/shm/backends.json
