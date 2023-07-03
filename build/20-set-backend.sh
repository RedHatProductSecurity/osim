#!/bin/sh

if [ "x$OSIM_RUNTIME" = x ]; then
    printf '%s\n' 'OSIM_RUNTIME not in environment. Setting default runtime.json contents.'
    OSIM_RUNTIME='{"backends":{"osidb":"http://osidb-service:8000"},"osimVersion":"0"}'
fi

# Store to /dev/shm because /var/www/nginx/html is read-only and /tmp might get messy
printf '%s\n%s\n' 'Writing /dev/shm/runtime.json:' "$OSIM_RUNTIME"
printf '%s\n' "$OSIM_RUNTIME" >/dev/shm/runtime.json
chmod 444 /dev/shm/runtime.json
