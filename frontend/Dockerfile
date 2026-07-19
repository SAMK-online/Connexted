# Build stage — Vite bakes VITE_* values into the bundle at build time,
# so API URL/token must be passed as build args, not runtime env.
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_API_AUTH_TOKEN=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_AUTH_TOKEN=$VITE_API_AUTH_TOKEN

RUN npm run build

# Serve stage
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
