#!/bin/sh

# Commented because we prefer nginx.conf not to be editable...
## Disable ipv6 if the kernel doesn't support it, so that nginx can start.
#if ! [ -e /proc/net/if_inet6 ]; then
#    sed -i.ipv6 '/listen.*\[::\]/d' /etc/nginx/nginx.conf
#fi

# Set the runtime backend service configuration
if [ "x$OSIM_RUNTIME" = x ]; then
    printf '%s\n' 'OSIM_RUNTIME not in environment. Setting default runtime.json contents.'
    OSIM_RUNTIME='{"backends":{"osidb":"http://osidb-service:8000","bugzilla":"http://bugzilla-service:8001"},"osimVersion":{"rev":"dev","tag":"dev","timestamp":"1970-01-01T00:00:00Z","dirty":true},"env":"dev"}'
fi

if [ -f "/osim_build.json" ]; then
    # Add the OSIM build info
    # File format:
    # {"rev":"dev","tag":"dev","timestamp":0,"dirty":true}
    OSIM_RUNTIME="${OSIM_RUNTIME%'"osimVersion":'*}"
    # {"backends":{},
    OSIM_RUNTIME="${OSIM_RUNTIME}\"osimVersion\":$(cat /osim_build.json)"
    # {"backends":{},"osimVersion":{}
fi

OSIM_RUNTIME="${OSIM_RUNTIME%',"env":'*}"
OSIM_RUNTIME="${OSIM_RUNTIME},\"env\":\"${OSIM_ENV}\"}"

# Store to /dev/shm because /var/www/nginx/html is read-only and /tmp might get messy
printf '%s\n%s\n' 'Writing /dev/shm/runtime.json:' "$OSIM_RUNTIME"
printf '%s\n' "$OSIM_RUNTIME" >/dev/shm/runtime.json
chmod 444 /dev/shm/runtime.json
