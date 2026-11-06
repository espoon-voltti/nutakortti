FROM node:24.22.1-trixie-slim AS build

ARG CACHE_BUST=none

ADD ./backend /backend

WORKDIR /backend
# prune leaves only production dependencies behind for the runtime stage to copy
RUN npm ci && npm run build && npm prune --omit=dev

# Runtime stage. Only the compiled backend and its production dependencies are
# carried over; the backend devDependencies stay in the build stage and never
# reach the shipped image. The frontends are built into the proxy image
# (nginx/Dockerfile).
FROM node:24.22.1-trixie-slim

ENV TZ=Europe/Helsinki

RUN rm -f /etc/localtime && ln -s /usr/share/zoneinfo/$TZ /etc/localtime \
 && apt-get update \
 && apt-get -y dist-upgrade \
 && rm -rf /var/lib/apt/lists/*

# Must be /backend: sso.service.ts reads the SAML IDP certificates through
# relative paths ('certs/...').
WORKDIR /backend

COPY --from=build /backend/package.json /backend/package-lock.json ./
COPY --from=build /backend/node_modules ./node_modules
COPY --from=build /backend/dist ./dist
COPY --from=build /backend/certs ./certs

EXPOSE 3000
CMD ["node", "dist/main"]
