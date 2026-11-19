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
OSIM_BACKENDS_AEGISAI="${OSIM_BACKENDS_AEGISAI:-http://aegis-ai-service:8005}"
OSIM_BACKENDS_TRACKER_AUTOMANAGER="${OSIM_BACKENDS_TRACKER_AUTOMANAGER:-}"
OSIM_BACKENDS_JIRA_DISPLAY="${OSIM_BACKENDS_JIRA_DISPLAY:-http://jira-service:8002}"
OSIM_VERSION='{"rev":"dev","tag":"dev","timestamp":"1970-01-01T00:00:00Z"}'
OSIM_READONLY_MODE=${OSIM_READONLY_MODE:-false}
OSIM_TELEMETRY_OTLP_ENDPOINT=${OSIM_TELEMETRY_OTLP_ENDPOINT:-}
OSIM_TELEMETRY_SAMPLE_RATE=${OSIM_TELEMETRY_SAMPLE_RATE-0.1}
OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT=${OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT:-}
OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT="${OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT//\$(HOST_IP)/$HOST_IP}"
agent_valid=false
if [[ "$OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT" =~ ^https?://([a-zA-Z0-9][a-zA-Z0-9.-]*)(:([0-9]+))?$ ]]; then
    agent_host=${BASH_REMATCH[1]}
    agent_port=${BASH_REMATCH[3]}
    if [ -z "$agent_port" ] || { [ "${#agent_port}" -le 5 ] && [ "$((10#$agent_port))" -ge 1 ] && [ "$((10#$agent_port))" -le 65535 ]; }; then
        agent_valid=true
    fi
fi
if [ -n "$OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT" ] && ! $agent_valid; then
    printf 'Warning: invalid OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT; OTLP proxy disabled\n' >&2
fi

telemetry_config='null'
if [[ ! "$OSIM_TELEMETRY_SAMPLE_RATE" =~ ^(0(\.[0-9]+)?|1(\.0+)?)$ ]]; then
    printf 'Warning: invalid OSIM_TELEMETRY_SAMPLE_RATE; telemetry disabled\n' >&2
elif [ -n "$OSIM_TELEMETRY_OTLP_ENDPOINT" ]; then
    if [[ "$OSIM_TELEMETRY_OTLP_ENDPOINT" =~ ^https?://[^[:space:][:cntrl:]\"\\]+$ ]] ||
       { [ "$OSIM_TELEMETRY_OTLP_ENDPOINT" = '/proxy/otlp/v1/traces' ] && $agent_valid; }; then
        # The URL must contain no characters requiring JSON escaping.
        telemetry_config="{\"otlpEndpoint\": \"${OSIM_TELEMETRY_OTLP_ENDPOINT}\", \"sampleRate\": ${OSIM_TELEMETRY_SAMPLE_RATE}}"
    else
        printf 'Warning: invalid OSIM_TELEMETRY_OTLP_ENDPOINT; telemetry disabled\n' >&2
    fi
elif $agent_valid; then
    telemetry_config="{\"otlpEndpoint\": \"/proxy/otlp/v1/traces\", \"sampleRate\": ${OSIM_TELEMETRY_SAMPLE_RATE}}"
fi

if $agent_valid; then
    echo resolver "$(awk -v ORS=' ' '$1=="nameserver" {print $2 ~ /:/ ? "[" $2 "]" : $2}' /etc/resolv.conf)" ";" >/etc/nginx/conf.d/resolvers.conf
    otlp_tls_config=''
    if [[ "$OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT" == https://* ]]; then
        # Use the image trust store or the CA already configured for the HTTPS proxies.
        otlp_ca=/etc/pki/tls/certs/ca-bundle.crt
        if [ -n "$OSIM_NGINX_PROXY_CA" ]; then
            if ! curl -fsS --max-time 30 --xattr "$OSIM_NGINX_PROXY_CA" -o /tmp/Proxy-CA.crt ||
               ! openssl crl2pkcs7 -nocrl -certfile /tmp/Proxy-CA.crt 2>/dev/null |
                   openssl pkcs7 -print_certs -noout 2>/dev/null | grep -q '^subject=' ||
               ! python3 - /tmp/Proxy-CA.crt <<'PY'
import re
import sys

with open(sys.argv[1], 'rb') as bundle:
    data = bundle.read()
if not re.fullmatch(rb'\s*(?:-----BEGIN CERTIFICATE-----\s*[A-Za-z0-9+/=\s]+-----END CERTIFICATE-----\s*)+', data):
    sys.exit(1)
PY
            then
                printf 'Warning: invalid OSIM_NGINX_PROXY_CA; OTLP proxy disabled\n' >&2
                agent_valid=false
                rm -f /tmp/Proxy-CA.crt
            else
                otlp_ca=/tmp/Proxy-CA.crt
            fi
        fi
        if $agent_valid; then
            otlp_tls_config="proxy_ssl_verify on;
    proxy_ssl_trusted_certificate ${otlp_ca};
    proxy_ssl_server_name on;
    proxy_ssl_name ${agent_host};"
            if [[ "$agent_host" =~ ^[0-9]+(\.[0-9]+){3}$ ]]; then
                # NGINX verifies the IP SAN with an IP literal as proxy_ssl_name.
                otlp_tls_config="${otlp_tls_config/proxy_ssl_server_name on;/proxy_ssl_server_name off;}"
            fi
        fi
    fi
fi

if [ "$telemetry_config" != 'null' ] && [[ "$telemetry_config" == *'"otlpEndpoint": "/proxy/otlp/v1/traces"'* ]] && ! $agent_valid; then
    telemetry_config='null'
fi

if [ -f "/osim_build.json" ]; then
    # Add the OSIM build info
    # File format:
    # {"rev":"dev","tag":"dev","timestamp":0}
    IFS= read -r -d '' OSIM_VERSION <"/osim_build.json" || :
fi

feature_flags="{"
for var in "${!OSIM_FLAG_@}"; do
    flag_name=$(echo "$var" |
      sed -E 's/^OSIM_FLAG_//'  | # remove prefix
      sed -E 's/([A-Z])/\L\1/g' | # to lowercase
      sed -E 's/_([a-z])/\U\1/g'  # to camelCase
    )
    flag_value="${!var}"
    feature_flags+="\"${flag_name}\": ${flag_value},"
done
feature_flags="${feature_flags%,}}" # remove trailing comma and close the JSON object

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
    "mitre": "${OSIM_BACKENDS_MITRE}",
    "aegisai": "${OSIM_BACKENDS_AEGISAI}",
    "trackerAutomanager": "${OSIM_BACKENDS_TRACKER_AUTOMANAGER}"
  },
  "osimVersion": ${OSIM_VERSION},
  "readOnly": ${OSIM_READONLY_MODE},
  "telemetry": ${telemetry_config},
  "flags": ${feature_flags}
}
EOF

if $agent_valid; then
    # Variable proxy_pass resolves the collector on requests, not when NGINX starts.
    otlp_proxy_config=$(cat <<EOF
location = /proxy/otlp/v1/traces {
    if (\$request_method != POST) { return 405; }
    set \$otlp_upstream ${OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT};
    proxy_pass \$otlp_upstream/v1/traces;
    ${otlp_tls_config}
    proxy_http_version 1.1;
    proxy_set_header Cookie "";
    proxy_set_header Referer "";
}
EOF
    )
    printf '%s\n' "$otlp_proxy_config" >/tmp/osim-nginx-otlp-proxy.conf
else
    : >/tmp/osim-nginx-otlp-proxy.conf
fi

# Store to /dev/shm because /var/www/nginx/html is read-only and /tmp might get messy
printf '%s\n%s\n' 'Writing /dev/shm/runtime.json:' "$OSIM_RUNTIME"
printf '%s\n' "$OSIM_RUNTIME" >/dev/shm/runtime.json
chmod 444 /dev/shm/runtime.json
