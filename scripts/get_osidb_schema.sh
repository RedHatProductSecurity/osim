#!/usr/bin/env bash
# download OSIDB OpenAPI schema file from specified ref

# Get OSIDB OpenAPI schema from github API
# $1: version (defaults to "master")
get_osidb_schema() {
    local version=${1:-master}

    echo "Downloading OSIDB schema version "
    local response=$(curl -s "https://raw.githubusercontent.com/RedHatProductSecurity/osidb/${version}/openapi.yml" \
    -o openapi-osidb.yml -f -w 'HTTPSTATUS:%{http_code}\n')

    local status=$(echo ${response} | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')

    if [ ! ${status} -eq 200 ]; then
        echo "Error accessing \"https://raw.githubusercontent.com/RedHatProductSecurity/osidb/${version}/openapi.yml\" [HTTP status: ${status}]"
        exit 1
    fi
}

get_osidb_schema ${1}
