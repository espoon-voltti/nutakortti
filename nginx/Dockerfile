ARG NGINX_VERSION=1.31.6

FROM nginx:${NGINX_VERSION}

ARG GOMPLATE_VERSION=v3.11.2
ARG GOMPLATE_SHA256="53858f4c6b68a0bea0a66430760eb0948c7745f6d3052a395507e6bb9c6964a9"

RUN curl -sSfL "https://github.com/hairyhenderson/gomplate/releases/download/${GOMPLATE_VERSION}/gomplate_linux-amd64" -o /bin/gomplate \
 && echo "${GOMPLATE_SHA256}  /bin/gomplate" | sha256sum -c - \
 && chmod +x /bin/gomplate

RUN apt-get -y update \
 && apt-get -y dist-upgrade \
 && rm -rf /var/lib/apt/lists/*

COPY conf.d/default.conf.template /etc/nginx/conf.d/default.conf.template
COPY entrypoint.sh /

ENTRYPOINT ["/entrypoint.sh"]

ARG build=none
ARG commit=none
ENV APP_BUILD="$build" \
    APP_COMMIT="$commit"
