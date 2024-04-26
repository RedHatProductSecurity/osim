#!/bin/sh

# Skip creating proxy file if no proxies are configured
if [ -z "$OSIM_NGINX_PROXY_JIRA" ]; then
    exit 0;
fi

# Ensure no trailing slash in variable
OSIM_NGINX_PROXY_JIRA="${OSIM_NGINX_PROXY_JIRA%/}"

# Add JIRA reverse proxy endpoint
cat <<EOF >/tmp/osim-nginx-proxy.conf
location /jira/ {
    # Trailing slash in proxy_pass strips the location directive prefix from the downstream URL
    proxy_pass ${OSIM_NGINX_PROXY_JIRA}/;
}
EOF
