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
OSIM_BACKENDS_ERRATA="${OSIM_BACKENDS_ERRATA:-http://errata-service:8003}"
OSIM_BACKENDS_MITRE="${OSIM_BACKENDS_MITRE:-http://mitre-service:8003}"
OSIM_BACKENDS_JIRA_DISPLAY="${OSIM_BACKENDS_JIRA_DISPLAY:-http://jira-service:8002}"
OSIM_VERSION='{"rev":"dev","tag":"dev","timestamp":"1970-01-01T00:00:00Z"}'
OSIM_READONLY_MODE=${OSIM_READONLY_MODE:-false}

if [ -f "/osim_build.json" ]; then
    # Add the OSIM build info
    # File format:
    # {"rev":"dev","tag":"dev","timestamp":0}
    IFS= read -r -d '' OSIM_VERSION <"/osim_build.json" || :
fi

# Feature flags
OSIM_FLAG_AI_CWE_SUGGESTIONS="${OSIM_FLAG_AI_CWE_SUGGESTIONS:-false}"

IFS= read -r -d '' OSIM_RUNTIME <<EOF || :
{
  "env": "${OSIM_ENV}",
  "backends": {
    "osidb": "${OSIM_BACKENDS_OSIDB}",
    "osidbAuth": "${OSIM_BACKENDS_OSIDB_AUTH}",
    "bugzilla": "${OSIM_BACKENDS_BUGZILLA}",
    "jira": "${OSIM_BACKENDS_JIRA}",
    "errata": "${OSIM_BACKENDS_ERRATA}",
    "jiraDisplay": "${OSIM_BACKENDS_JIRA_DISPLAY}",
    "mitre": "${OSIM_BACKENDS_MITRE}"
  },
  "osimVersion": ${OSIM_VERSION},
  "readOnly": ${OSIM_READONLY_MODE},
  "flags": {
    "aiCweSuggestions": ${OSIM_FLAG_AI_CWE_SUGGESTIONS}
  }
}
EOF

# Store to /dev/shm because /var/www/nginx/html is read-only and /tmp might get messy
printf '%s\n%s\n' 'Writing /dev/shm/runtime.json:' "$OSIM_RUNTIME"
printf '%s\n' "$OSIM_RUNTIME" >/dev/shm/runtime.json
chmod 444 /dev/shm/runtime.json
