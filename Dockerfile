# Use a multi-stage build to separate the build environment from the production environment
# Build stage
FROM node:latest AS dev
WORKDIR /app
COPY . /app
RUN yarn
RUN yarn build

# Production stage
FROM nginxinc/nginx-unprivileged:latest
COPY ./build/nginx-osim.conf /etc/nginx/conf.d/default.conf
COPY ./build/20-set-backend.sh /docker-entrypoint.d/
# Copy the built files to the default Nginx directory
COPY --from=dev /app/dist /usr/share/nginx/html
