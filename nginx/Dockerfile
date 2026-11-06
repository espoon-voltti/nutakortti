ARG NGINX_VERSION=1.31.8

FROM node:24.22.1-trixie-slim AS frontend

ARG CACHE_BUST=none

WORKDIR /frontend
COPY ./frontend ./
ENV REACT_APP_ENDPOINT=/api
RUN npm ci && npm run build

FROM node:24.22.1-trixie-slim AS admin-frontend

ARG CACHE_BUST=none

WORKDIR /admin-frontend
COPY ./admin-frontend ./
ENV VITE_ENDPOINT=/api
ENV VITE_ADMIN_FRONTEND_URL=/nuorisotyontekijat
RUN npm ci && npm uninstall rollup && npm install rollup && npm run build

FROM nginx:${NGINX_VERSION}

ARG GOMPLATE_VERSION=v3.11.2
ARG GOMPLATE_SHA256="53858f4c6b68a0bea0a66430760eb0948c7745f6d3052a395507e6bb9c6964a9"

RUN curl -sSfL "https://github.com/hairyhenderson/gomplate/releases/download/${GOMPLATE_VERSION}/gomplate_linux-amd64" -o /bin/gomplate \
 && echo "${GOMPLATE_SHA256}  /bin/gomplate" | sha256sum -c - \
 && chmod +x /bin/gomplate

RUN apt-get -y update \
 && apt-get -y dist-upgrade \
 && rm -rf /var/lib/apt/lists/*

# Both apps are built for the site root, so their files share one directory. The frontend is
# copied last and wins where names collide (favicon, manifest); the admin app's index.html is
# served from its own route by default.conf.template.
COPY --from=admin-frontend /admin-frontend/dist /static
COPY --from=frontend /frontend/build /static
COPY --from=admin-frontend /admin-frontend/dist/index.html /static/nuorisotyontekijat/index.html

COPY nginx/conf.d/default.conf.template /etc/nginx/conf.d/default.conf.template
COPY nginx/entrypoint.sh /

ENTRYPOINT ["/entrypoint.sh"]

ARG build=none
ARG commit=none
ENV APP_BUILD="$build" \
    APP_COMMIT="$commit"
