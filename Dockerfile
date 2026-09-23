FROM node:24.21.0-trixie-slim AS build

ARG CACHE_BUST=none

ADD ./backend /backend

ADD ./frontend /frontend
WORKDIR /frontend
ENV REACT_APP_ENDPOINT=/api
RUN npm ci && npm run build && cp -r ./build ../backend/public

ADD ./admin-frontend /admin-frontend
WORKDIR /admin-frontend
ENV VITE_ENDPOINT=/api
ENV VITE_ADMIN_FRONTEND_URL=/nuorisotyontekijat
RUN npm ci && npm uninstall rollup && npm install rollup && npm run build && cp -r ./dist ../backend/public-admin

WORKDIR /backend
# prune leaves only production dependencies behind for the runtime stage to copy
RUN npm ci && npm run build && npm prune --omit=dev

# Runtime stage. Only the compiled backend, its production dependencies and the
# built static assets are carried over -- the frontend and admin-frontend build
# toolchains and the backend devDependencies stay in the build stage and never
# reach the shipped image.
FROM node:24.21.0-trixie-slim

ENV TZ=Europe/Helsinki

RUN rm -f /etc/localtime && ln -s /usr/share/zoneinfo/$TZ /etc/localtime \
 && apt-get update \
 && apt-get -y dist-upgrade \
 && rm -rf /var/lib/apt/lists/*

# Must be /backend: sso.service.ts reads the SAML IDP certificates through
# relative paths ('certs/...'), and routers.middleware.ts checks 'public/index.html'
# relatively. main.ts resolves its static roots from __dirname, so it is unaffected.
WORKDIR /backend

COPY --from=build /backend/package.json /backend/package-lock.json ./
COPY --from=build /backend/node_modules ./node_modules
COPY --from=build /backend/dist ./dist
COPY --from=build /backend/public ./public
COPY --from=build /backend/public-admin ./public-admin
COPY --from=build /backend/certs ./certs

EXPOSE 3000
CMD ["node", "dist/main"]
