#!/usr/bin/env bash
# download Aegis-AI OpenAPI schema file for the new API from specified ref

# Get Aegis-AI OpenAPI schema from github API
# $1: version (defaults to "main")
get_aegis_ai_schema() {
    local version=${1:-main}

    echo "Downloading Aegis-AI schema version ${version}"
    local response=$(curl -s "https://raw.githubusercontent.com/RedHatProductSecurity/aegis-ai/${version}/docs/openapi.yml" \
    -o openapi-aegis-ai.yml -f -w 'HTTPSTATUS:%{http_code}\n')

    local status=$(echo ${response} | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

    if [ ! ${status} -eq 200 ]; then
        echo "Error accessing \"https://raw.githubusercontent.com/RedHatProductSecurity/aegis-ai/${version}/docs/openapi.yml\" [HTTP status: ${status}]"
        exit 1
    fi
}

get_aegis_ai_schema ${1}