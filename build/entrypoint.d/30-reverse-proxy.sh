#!/bin/sh

# Skip creating proxy file if no proxies are configured
if [ -z "$OSIM_NGINX_PROXY_JIRA" ]; then
    exit 0;
fi

# Get proxy certificate
curl --xattr $OSIM_NGINX_PROXY_CA -o /tmp/Proxy-CA.crt

# Ensure no trailing slash in variable
OSIM_NGINX_PROXY_JIRA="${OSIM_NGINX_PROXY_JIRA%/}"

# Add JIRA reverse proxy endpoint
cat <<EOF >/tmp/osim-nginx-proxy.conf
location /proxy/jira/ {
    # Trailing slash in proxy_pass strips the location directive prefix from the downstream URL
    proxy_pass ${OSIM_NGINX_PROXY_JIRA}/;

    proxy_ssl_trusted_certificate /tmp/Proxy-CA.crt;
    proxy_ssl_session_reuse on; # try off if connection issues
    proxy_ssl_server_name on; # required

}
EOF
