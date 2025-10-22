#!/bin/bash
# Usage: get-changed-files.sh <extensions>
# Example: get-changed-files.sh "ts|tsx|vue"

PATTERN="$1"
BASE=$(git merge-base HEAD origin/main)
git diff --name-only --diff-filter=b $BASE | grep -E "\.($PATTERN)$" | xargs || true
