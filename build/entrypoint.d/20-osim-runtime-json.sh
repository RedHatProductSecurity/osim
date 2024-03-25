#!/bin/bash

# Commented because we prefer nginx.conf not to be editable...
## Disable ipv6 if the kernel doesn't support it, so that nginx can start.
#if ! [ -e /proc/net/if_inet6 ]; then
#    sed -i.ipv6 '/listen.*\[::\]/d' /etc/nginx/nginx.conf
#fi

# Set the runtime backend service configuration
OSIM_ENV="${OSIM_ENV:-dev}"
OSIM_BACKENDS_OSIDB="${OSIM_BACKENDS_OSIDB:-http://osidb-service:8000}"
OSIM_BACKENDS_OSIDB_AUTH="${OSIM_BACKENDS_OSIDB_AUTH:-kerberos}"
OSIM_BACKENDS_BUGZILLA="${OSIM_BACKENDS_BUGZILLA:-http://bugzilla-service:8001}"
OSIM_BACKENDS_JIRA="${OSIM_BACKENDS_JIRA:-http://jira-service:8002}"
OSIM_VERSION='{"rev":"dev","tag":"dev","timestamp":"1970-01-01T00:00:00Z","dirty":true}'

if [ -f "/osim_build.json" ]; then
    # Add the OSIM build info
    # File format:
    # {"rev":"dev","tag":"dev","timestamp":0,"dirty":true}
    IFS= read -r -d '' OSIM_VERSION <"/osim_build.json" || :
fi

IFS= read -r -d '' OSIM_RUNTIME <<EOF || :
{
  "env": "${OSIM_ENV}",
  "backends": {
    "osidb": "${OSIM_BACKENDS_OSIDB}",
    "osidbAuth": "${OSIM_BACKENDS_OSIDB_AUTH}",
    "bugzilla": "${OSIM_BACKENDS_BUGZILLA}",
    "jira": "${OSIM_BACKENDS_JIRA}"
  },
  "osimVersion": ${OSIM_VERSION}
}
EOF

# Store to /dev/shm because /var/www/nginx/html is read-only and /tmp might get messy
printf '%s\n%s\n' 'Writing /dev/shm/runtime.json:' "$OSIM_RUNTIME"
printf '%s\n' "$OSIM_RUNTIME" >/dev/shm/runtime.json
chmod 444 /dev/shm/runtime.json
