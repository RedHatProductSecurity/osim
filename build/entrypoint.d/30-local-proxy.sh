#!/bin/sh

# Default OSIDB API root URL
OSIDB_BACKEND="${OSIDB_BACKEND:-http://osidb-service:8000}"

# Ensure no trailing slash in variable
OSIDB_BACKEND="${OSIDB_BACKEND%/}"

# Add OSIDB endpoint
cat <<EOF >/etc/nginx/default.d/osidb-proxy.conf
location /osidb/ {
    # Trailing slash in proxy_pass strips the location directive prefix from the downstream URL
    proxy_pass ${OSIDB_BACKEND}/;
}
EOF
