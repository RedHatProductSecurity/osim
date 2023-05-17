# Use a multi-stage build to separate the build environment from the production environment
# Build stage
FROM node:latest AS dev
WORKDIR /app
COPY . /app
RUN yarn
RUN yarn build  # Use "yarn build" to create a production build
RUN ls -lah /app
RUN ls -lah /app/dist

# Production stage
FROM nginxinc/nginx-unprivileged:latest
RUN ls -lah /usr/share/nginx/html
# Copy the built files to the default Nginx directory
COPY --from=dev /app/dist /usr/share/nginx/html  
