#!/bin/bash

# Nginx does not support loading environment variables in the configuration files.
# So we need to generate the configuration files with the environment variables.
telemetry_source=''
if [[ "${OSIM_TELEMETRY_SAMPLE_RATE-0.1}" =~ ^(0(\.[0-9]+)?|1(\.0+)?)$ &&
      "$OSIM_TELEMETRY_OTLP_ENDPOINT" =~ ^https?://[^[:space:][:cntrl:]\"\\]+$ ]]; then
    # Match the browser's URL origin, including decoded hostnames and default ports.
    telemetry_source=$(python3 - "$OSIM_TELEMETRY_OTLP_ENDPOINT" <<'PY'
import re
import sys
from urllib.parse import unquote, urlsplit

try:
    url = urlsplit(sys.argv[1])
    host = unquote(url.hostname).encode('idna').decode('ascii').lower()
    port = url.port
    if url.scheme in ('http', 'https') and (re.fullmatch(r'[a-z0-9-]+(?:\.[a-z0-9-]+)*', host)
                                           or re.fullmatch(r'[0-9a-f:.]+', host)):
        default_port = 80 if url.scheme == 'http' else 443
        origin = f'{url.scheme}://{f"[{host}]" if ":" in host else host}'
        print(origin + (f':{port}' if port and port != default_port else ''), end='')
except (ValueError, AttributeError, UnicodeError):
    pass
PY
    )
fi
cat <<EOF >/tmp/osim-nginx-csp.conf
add_header Content-Security-Policy-Report-Only "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; upgrade-insecure-requests; frame-ancestors 'none'; connect-src 'self' $OSIM_BACKENDS_OSIDB $OSIM_BACKENDS_JIRA $telemetry_source; style-src 'self' 'unsafe-inline';";
EOF
