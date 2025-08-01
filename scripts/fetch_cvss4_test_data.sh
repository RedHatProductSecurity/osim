#!/bin/bash

# Script to fetch CVSS4 test data from Red Hat Product Security's CVSS repository
# Source: https://github.com/RedHatProductSecurity/cvss

set -e

# Configuration
REPO_URL="https://github.com/RedHatProductSecurity/cvss"
RAW_BASE_URL="https://raw.githubusercontent.com/RedHatProductSecurity/cvss/master/tests"
TARGET_DIR="src/utils/__tests__/cvss4-test-data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to download a file
download_file() {
    local filename=$1
    local url="${RAW_BASE_URL}/${filename}"
    local target_path="${TARGET_DIR}/${filename}"
    
    print_status "Downloading ${filename}..."
    
    if curl -s -f -o "${target_path}" "${url}"; then
        print_status "Successfully downloaded ${filename}"
    else
        print_error "Failed to download ${filename}"
        return 1
    fi
}

# Main script
main() {
    print_status "Starting CVSS4 test data download..."
    
    # Create target directory if it doesn't exist
    if [ ! -d "${TARGET_DIR}" ]; then
        print_status "Creating target directory: ${TARGET_DIR}"
        mkdir -p "${TARGET_DIR}"
    fi
    
    # List of CVSS4 test data files to download
    # These are the files ending in "4" from the Red Hat CVSS repo
    declare -a files=(
        "vectors_base4"
        "vectors_modified4"
        "vectors_random4"
        "vectors_security4"
        "vectors_supplemental4"
        "vectors_threat4"
    )
    
    # Download each file
    local failed_downloads=0
    for file in "${files[@]}"; do
        if ! download_file "$file"; then
            ((failed_downloads++))
        fi
    done
    
    # Summary
    if [ $failed_downloads -eq 0 ]; then
        print_status "All CVSS4 test data files downloaded successfully!"
        print_status "Files downloaded to: ${TARGET_DIR}"
    else
        print_error "${failed_downloads} file(s) failed to download"
        exit 1
    fi
}
  
# Run main function
main "$@" 