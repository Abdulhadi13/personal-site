FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG RELEASE_SHA=local
RUN npm run build && printf '%s\n' "$RELEASE_SHA" > dist/release.txt

FROM nginx:stable-alpine AS runtime
ARG RELEASE_SHA=local
LABEL org.opencontainers.image.revision=$RELEASE_SHA
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
HEALTHCHECK --interval=5s --timeout=3s --start-period=5s --retries=6 \
  CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
EXPOSE 80
