#!/bin/sh

# Nginx does not support loading environment variables in the configuration files.
# So we need to generate the configuration files with the environment variables.
cat <<EOF >/tmp/osim-nginx-csp.conf
add_header Content-Security-Policy-Report-Only "default-src 'self'; img-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; upgrade-insecure-requests; frame-ancestors 'none'; connect-src 'self' $OSIM_BACKENDS_OSIDB $OSIM_BACKENDS_JIRA; style-src 'self' 'unsafe-inline';";
EOF
