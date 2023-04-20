# Use a multi-stage build to separate the build environment from the production environment
# Build stage
FROM node:latest AS dev
WORKDIR /app
COPY . /app
RUN yarn
RUN yarn build  # Use "yarn build" to create a production build

# Production stage
FROM nginx:latest
COPY --from=dev /app/dist /usr/share/nginx/html  # Copy the built files to the default Nginx directory
