#!/bin/bash
# osidb-request.sh

usage() {
    cat <<EOF >&2
Send a curl request to OSIDB with automatic authentication.

Usage: $0 [curl_args] <resource>
       $0 /osidb/api/v1/status
       $0 '/osidb/api/v1/flaws?limit=1'
       $0 'http://osidb/osidb/api/v1/status'

Arguments:
    curl_args: options passed through to curl, like \`-X POST\`

Environment:
    SERVICE_URL: The OSIDB base URL, if not specified. default: http://osidb
EOF
    exit 1
}

curl_args=()
resource_url=
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        /*|http*)
            [[ -z "$resource_url" ]] || usage
            resource_url="$1"
            shift
            ;;
        *)
            curl_args+=("$1")
            shift
            ;;
    esac
done
[[ -n "$resource_url" ]] || usage

#set -x

SERVICE_URL="${SERVICE_URL:-http://osidb}"

service_url_override="$(printf '%s' "$resource_url" | grep -Eo '^https?://[^/]*')"
if [[ -n "$service_url_override" ]]; then
    SERVICE_URL="$service_url_override"
    resource_url="${resource_url:${#SERVICE_URL}}"
fi

#export SSLKEYLOGFILE=/tmp/negotiate.keylog
tokens="$(curl -v -H 'Content-Type: application/json' --negotiate -u : "${SERVICE_URL}/auth/token")"

access="$(jq -r .access <<<"$tokens")"

curl -v -H 'Content-Type: application/json' -H "Authorization: Bearer $access" "${curl_args[@]}" "${SERVICE_URL}/${resource_url#/}"
