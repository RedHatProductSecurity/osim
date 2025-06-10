# Use a multi-stage build to separate the build environment from the production environment
# App build stage
FROM registry.access.redhat.com/ubi9/nodejs-20:9.6 AS dev
RUN npm install -g yarn
COPY . .
RUN yarn
RUN yarn build
RUN --mount=target=/mnt \
    cd /mnt \
    && git config --global --add safe.directory /mnt \
    && printf '{"rev":"%s","tag":"%s","timestamp":"%s"}' >/opt/app-root/src/osim_build.json \
    "$(git rev-parse --verify HEAD)" \
    "$(git describe --always --tags --match 'v[0-9]*')" \
    "$(date --utc --date=@"$(git show --quiet --format=%ct)" +%FT%TZ)"

# Nginx service stage
FROM registry.access.redhat.com/ubi9/ubi-minimal:9.6 AS nginx-base

EXPOSE 8080
ENV OSIM_ENV=dev

STOPSIGNAL SIGQUIT

RUN microdnf --nodocs --noplugins --setopt install_weak_deps=0 -y install nginx \
    && microdnf clean all \
# Set up unprivileged nginx
    && sed -i '/^user nginx;$/d' /etc/nginx/nginx.conf \
    && sed -i '/^pid \/run\/nginx.pid;$/c pid /tmp/nginx.pid;' /etc/nginx/nginx.conf \
# Log to symlinks in tmp
    && sed -i 's,/var/log/nginx/access.log,/tmp/logs/nginx.access.log,' /etc/nginx/nginx.conf \
    && sed -i 's,/var/log/nginx/error.log,/tmp/logs/nginx.error.log,' /etc/nginx/nginx.conf \
# Create new dir in tmp to avoid sticky bit
    && mkdir -p /tmp/logs \
# Allow non root user to change log target
    && chmod 777 /tmp/logs \
# Create default log target
    && ln -sf /var/log/nginx/access.log /tmp/logs/nginx.access.log \
    && ln -sf /var/log/nginx/error.log /tmp/logs/nginx.error.log \
# Set permissions for nginx user to write log files
    && install -o999 -g999 /dev/null /var/log/nginx/access.log \
    && install -o999 -g999 /dev/null /var/log/nginx/error.log \
# Create resolver stub file to be updated in entrypoint
    && install -o999 -g0 /dev/null /etc/nginx/conf.d/resolvers.conf \
# OpenShift randomizes uid & gid=0; allow the OpenShift group
# to write the config file in entrypoint
    && chmod 664 /etc/nginx/conf.d/resolvers.conf \
#
# Replace port 80 with 8080 for unprivileged nginx.
# osim-entrypoint.sh wants to delete the ipv6 line if ipv6 is not supported,
# but we don't want the config to be editable, so it is cleaner to just put the listen
# directives in default.d and hardcode ipv4 only...
#    && sed -i -E 's/^(\s*listen.*)\b80([^.:])/\18080\2/' /etc/nginx/nginx.conf
#
    && sed -i '/^\s*listen\b/d' /etc/nginx/nginx.conf \
    && true

# Final image stage
FROM nginx-base

COPY ./build/nginx-default.d-osim.conf /etc/nginx/default.d/osim.conf
COPY ./build/nginx-conf.d-fix-random-uid.conf /etc/nginx/conf.d/fix-random-uid.conf

RUN mkdir -p /entrypoint.d/
COPY ./build/osim-entrypoint.sh /
COPY ./build/entrypoint.d/*.sh /entrypoint.d/

ENTRYPOINT ["/osim-entrypoint.sh"]

# Copy the built files to the default Nginx directory
COPY --from=dev /opt/app-root/src/dist /usr/share/nginx/html
COPY --from=dev /opt/app-root/src/osim_build.json /
COPY --from=dev /opt/app-root/src/CHANGELOG.md /usr/share/nginx/html

# nginx:x:999:999:Nginx web server:/var/lib/nginx:/sbin/nologin
USER 999

CMD ["nginx", "-g", "daemon off;"]
