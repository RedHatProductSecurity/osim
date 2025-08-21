#!/usr/bin/env bash
# download Aegis-AI OpenAPI schema file for the new API from specified ref

# Get Aegis-AI OpenAPI schema from github API
# $1: version (defaults to "main")
get_aegis_ai_schema() {
    local version=${1:-main}
    local repo="RedHatProductSecurity/aegis-ai"
    local github_url="https://raw.githubusercontent.com/${repo}/${version}/docs/openapi.yml"
    local output_file="openapi-aegis-ai.yml"

    echo "Downloading Aegis-AI schema version ${version} from ${repo}"
    local response=$(curl -s "${github_url}" \
    -o ${output_file} -f -w 'HTTPSTATUS:%{http_code}\n')

    local status=$(echo ${response} | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

    if [ ! ${status} -eq 200 ]; then
        echo "Error accessing \"${github_url}\" [HTTP status: ${status}]"
        exit 1
    fi
}

get_aegis_ai_schema ${1}
