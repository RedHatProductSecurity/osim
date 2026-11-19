#!/bin/bash
set -euo pipefail

# The entrypoint writes to /dev/shm and NGINX's configured resolver file.
# Run in a container or a disposable environment.
[ "${1-}" = --allow-system-writes ] || { echo 'Pass --allow-system-writes in a disposable container' >&2; exit 1; }
[ -w /etc/nginx/conf.d/resolvers.conf ] || { echo 'Writable resolver config required' >&2; exit 1; }

script_dir=$(cd "$(dirname "$0")/.." && pwd)
check() {
    rm -f /dev/shm/runtime.json
    env -u OSIM_TELEMETRY_SAMPLE_RATE -u OSIM_TELEMETRY_OTLP_ENDPOINT -u OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT \
        -u OSIM_NGINX_PROXY_CA "$@" bash "$script_dir/entrypoint.d/20-osim-runtime-json.sh" >/dev/null
    python3 -c 'import json; json.load(open("/dev/shm/runtime.json"))'
}

check OSIM_TELEMETRY_OTLP_ENDPOINT='https://collector.example/v1/traces'
python3 -c 'import json; assert json.load(open("/dev/shm/runtime.json"))["telemetry"]["sampleRate"] == 0.1'
check OSIM_TELEMETRY_OTLP_ENDPOINT='https://collector.example/v1/traces' OSIM_TELEMETRY_SAMPLE_RATE=''
python3 -c 'import json; assert json.load(open("/dev/shm/runtime.json"))["telemetry"] is None'

check OSIM_TELEMETRY_OTLP_ENDPOINT=$'https://collector.example/v1/traces\x01'
python3 -c 'import json; assert json.load(open("/dev/shm/runtime.json"))["telemetry"] is None'

check OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT='https://agent.example:4318'
python3 -c 'import json; assert json.load(open("/dev/shm/runtime.json"))["telemetry"]["otlpEndpoint"] == "/proxy/otlp/v1/traces"'
grep -q 'proxy_ssl_verify on;' /tmp/osim-nginx-otlp-proxy.conf
grep -q 'proxy_ssl_name agent.example;' /tmp/osim-nginx-otlp-proxy.conf
grep -q 'proxy_ssl_trusted_certificate /etc/pki/tls/certs/ca-bundle.crt;' /tmp/osim-nginx-otlp-proxy.conf
grep -q 'resolver ' /etc/nginx/conf.d/resolvers.conf

check OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT='http://agent.example:4318'
grep -Fq "set \$otlp_upstream http://agent.example:4318;" /tmp/osim-nginx-otlp-proxy.conf
grep -Fq "proxy_pass \$otlp_upstream/v1/traces;" /tmp/osim-nginx-otlp-proxy.conf
if grep -q 'proxy_ssl_verify on;' /tmp/osim-nginx-otlp-proxy.conf; then exit 1; fi

check OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT='https://agent.example:4318' \
    OSIM_NGINX_PROXY_CA='file:///dev/null'
python3 -c 'import json; assert json.load(open("/dev/shm/runtime.json"))["telemetry"] is None'
[ ! -s /tmp/osim-nginx-otlp-proxy.conf ]
check OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT='https://agent.example:4318' \
    OSIM_NGINX_PROXY_CA='file:///dev/null' OSIM_TELEMETRY_OTLP_ENDPOINT='https://collector.example/v1/traces'
python3 -c 'import json; assert json.load(open("/dev/shm/runtime.json"))["telemetry"]["otlpEndpoint"] == "https://collector.example/v1/traces"'
[ ! -s /tmp/osim-nginx-otlp-proxy.conf ]
check OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT='https://127.0.0.1:4318'
grep -q 'proxy_ssl_verify on;' /tmp/osim-nginx-otlp-proxy.conf
grep -q 'proxy_ssl_name 127.0.0.1;' /tmp/osim-nginx-otlp-proxy.conf
grep -q 'proxy_ssl_server_name off;' /tmp/osim-nginx-otlp-proxy.conf

ca=$(mktemp)
trap 'rm -f "$ca"' EXIT
openssl req -x509 -newkey rsa:2048 -nodes -keyout "${ca}.key" -out "$ca" -days 1 -subj /CN=test >/dev/null 2>&1
trap 'rm -f "$ca" "${ca}.key" "${ca}.der"' EXIT
cat "$ca" "$ca" >"${ca}.bundle"
cp "$ca" "${ca}.mixed"
printf 'not a certificate\n' >>"${ca}.mixed"
trap 'rm -f "$ca" "${ca}.key" "${ca}.der" "${ca}.bundle" "${ca}.mixed"' EXIT
check OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT='https://agent.example:4318' OSIM_NGINX_PROXY_CA="file://${ca}.bundle"
grep -q 'proxy_ssl_trusted_certificate /tmp/Proxy-CA.crt;' /tmp/osim-nginx-otlp-proxy.conf
[ "$(sha256sum "${ca}.bundle" | cut -d' ' -f1)" = "$(sha256sum /tmp/Proxy-CA.crt | cut -d' ' -f1)" ]
for script in 30-jira-proxy.sh 32-mitre-proxy.sh; do
    env OSIM_NGINX_PROXY_JIRA=https://jira.example OSIM_NGINX_PROXY_MITRE=https://mitre.example \
        OSIM_NGINX_PROXY_CA=file:///dev/null sh "$script_dir/entrypoint.d/$script"
    [ "$(sha256sum "${ca}.bundle" | cut -d' ' -f1)" = "$(sha256sum /tmp/Proxy-CA.crt | cut -d' ' -f1)" ]
done
openssl x509 -in "$ca" -outform DER -out "${ca}.der"
check OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT='https://agent.example:4318' OSIM_NGINX_PROXY_CA="file://${ca}.der"
python3 -c 'import json; assert json.load(open("/dev/shm/runtime.json"))["telemetry"] is None'
[ ! -s /tmp/osim-nginx-otlp-proxy.conf ]
check OSIM_OTEL_AGENT_OTLP_HTTP_ENDPOINT='https://agent.example:4318' OSIM_NGINX_PROXY_CA="file://${ca}.mixed"
python3 -c 'import json; assert json.load(open("/dev/shm/runtime.json"))["telemetry"] is None'
[ ! -s /tmp/osim-nginx-otlp-proxy.conf ]

for rate in unset empty; do
    if [ "$rate" = unset ]; then
        env -u OSIM_TELEMETRY_SAMPLE_RATE OSIM_TELEMETRY_OTLP_ENDPOINT='https://collector.example/v1/traces' \
            bash "$script_dir/entrypoint.d/50-nginx-csp.sh"
        grep -q 'https://collector.example;' /tmp/osim-nginx-csp.conf
    else
        OSIM_TELEMETRY_SAMPLE_RATE='' OSIM_TELEMETRY_OTLP_ENDPOINT='https://collector.example/v1/traces' \
            bash "$script_dir/entrypoint.d/50-nginx-csp.sh"
        if grep -q 'https://collector.example;' /tmp/osim-nginx-csp.conf; then exit 1; fi
    fi
done

env -u OSIM_TELEMETRY_SAMPLE_RATE OSIM_TELEMETRY_OTLP_ENDPOINT='https://%65XAMPLE.COM:443/v1/traces' \
    bash "$script_dir/entrypoint.d/50-nginx-csp.sh"
grep -q 'https://example.com;' /tmp/osim-nginx-csp.conf
env -u OSIM_TELEMETRY_SAMPLE_RATE OSIM_TELEMETRY_OTLP_ENDPOINT='https://%3Bcollector.example/v1/traces' \
    bash "$script_dir/entrypoint.d/50-nginx-csp.sh"
if grep -q 'https://.*collector.example;' /tmp/osim-nginx-csp.conf; then exit 1; fi
