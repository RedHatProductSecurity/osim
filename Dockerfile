# Use a multi-stage build to separate the build environment from the production environment
# Build stage
FROM node:latest AS dev
WORKDIR /app
COPY . /app
RUN yarn
RUN yarn build  # Use "yarn build" to create a production build

# Production stage
FROM httpd:2.4
COPY --from=dev /app/dist /usr/local/apache2/htdocs/  # Copy the built files to the default Nginx directory
RUN mv /usr/local/apache2/htdocs/dist /usr/local/apache2/htdocs/public_html
