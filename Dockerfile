FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
ARG VCS_REF
LABEL org.opencontainers.image.source="https://github.com/Abdulhadi13/personal-site" \
      org.opencontainers.image.revision="${VCS_REF}"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/
EXPOSE 80
