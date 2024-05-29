#!/bin/sh

# Skip creating proxy file if no proxies are configured
if [ -z "$OSIM_NGINX_PROXY_JIRA" ]; then
    exit 0;
fi

# Get proxy certificate
curl --xattr $OSIM_NGINX_PROXY_CA -o /tmp/Proxy-CA.crt

# Ensure no trailing slash in variable, so no duplicate trailing slash is added in proxy_pass
OSIM_NGINX_PROXY_JIRA="${OSIM_NGINX_PROXY_JIRA%/}"

echo resolver "$(awk -v ORS=' ' '$1=="nameserver" {print $2}' /etc/resolv.conf)" ";" >/etc/nginx/conf.d/resolvers.conf

# Add JIRA reverse proxy endpoint
cat <<EOF >/tmp/osim-nginx-proxy.conf
location /proxy/jira/ {
    # Trailing slash in proxy_pass strips the location directive prefix from the downstream URL
    proxy_pass ${OSIM_NGINX_PROXY_JIRA}/;

    proxy_ssl_trusted_certificate /tmp/Proxy-CA.crt;
    proxy_ssl_session_reuse on; # try off if connection issues
    proxy_ssl_server_name on; # required
EOF
cat <<'EOF' >>/tmp/osim-nginx-proxy.conf
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
}
EOF
