# Use a multi-stage build to separate the build environment from the production environment
# Build stage
FROM registry.access.redhat.com/ubi9/nodejs-20-minimal AS dev
RUN npm install -g yarn
COPY . .
RUN yarn
RUN yarn build

# Production stage
FROM registry.access.redhat.com/ubi9/ubi-minimal

EXPOSE 8080

STOPSIGNAL SIGQUIT

RUN microdnf --nodocs --noplugins --setopt install_weak_deps=0 -y install nginx \
    && microdnf clean all \
# Set up container logging
    && ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log \
    && chmod 755 /var/log/nginx \
# Set up unprivileged nginx
    && sed -i '/^user nginx;$/d' /etc/nginx/nginx.conf \
    && sed -i '/^pid \/run\/nginx.pid;$/c pid /tmp/nginx.pid;' /etc/nginx/nginx.conf \
#
# Replace port 80 with 8080 for unprivileged nginx.
# osim-entrypoint.sh wants to delete the ipv6 line if ipv6 is not supported,
# but we don't want the config to be editable, so it is cleaner to just put the listen
# directives in default.d and hardcode ipv4 only...
#    && sed -i -E 's/^(\s*listen.*)\b80([^.:])/\18080\2/' /etc/nginx/nginx.conf
#
    && sed -i '/^\s*listen\b/d' /etc/nginx/nginx.conf \
    && true

COPY ./build/nginx-default.d-osim.conf /etc/nginx/default.d/osim.conf
COPY ./build/nginx-conf.d-fix-random-uid.conf /etc/nginx/conf.d/fix-random-uid.conf

RUN mkdir -p /entrypoint.d/
COPY ./build/osim-entrypoint.sh /
COPY ./build/entrypoint.d/20-osim-runtime-json.sh /entrypoint.d/
COPY ./build/entrypoint.d/30-local-proxy.sh /entrypoint.d/

ENTRYPOINT ["/osim-entrypoint.sh"]

# Copy the built files to the default Nginx directory
COPY --from=dev /opt/app-root/src/dist /usr/share/nginx/html

# Allow the local dockerfile to use root
# nginx:x:999:999:Nginx web server:/var/lib/nginx:/sbin/nologin
#USER 999

CMD ["nginx", "-g", "daemon off;"]
