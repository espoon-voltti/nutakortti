# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository structure

Monorepo with three separately-built apps bundled into one Docker image:
- `backend/` — NestJS API server (port 3000), also statically serves the two frontends
- `frontend/` — React + Redux-Saga app for youth users (port 3001 in dev)
- `admin-frontend/` — React Admin + Vite app for youth workers (port 3002 in dev)

## Commands

### Local development

Start infrastructure, then each app in its own terminal:

```bash
docker-compose up -d db redis                              # PostgreSQL + Redis

cd backend && npm install && ./run-dev.sh                  # API on :3000 (sets AD_MOCK=true etc.)
cd frontend && npm install && PORT=3001 npm start          # Youth app on :3001
cd admin-frontend && npm install && PORT=3002 npm run dev  # Worker app on :3002
```

### Backend

```bash
cd backend
npm run start:dev    # Watch mode
npm run build        # Compile TypeScript → dist/
npm run test         # Jest unit tests; needs a reachable PostgreSQL (docker-compose db,
                     # or point RDS_HOSTNAME/RDS_PORT elsewhere). Tests use their own
                     # nuta_test database, dropped clean at every suite start.
npm run test:watch   # Jest watch
npm run test:e2e     # E2E tests
npm run lint         # TSLint
npm run lint:fix
npm run format       # Prettier
```

Run a single test file:
```bash
cd backend && npx jest path/to/file.spec.ts
```

### Frontend / Admin-frontend

```bash
npm run lint         # frontend: TSLint  |  admin-frontend: ESLint --max-warnings 0
npm run lint:fix     # admin-frontend only
npm run build        # production bundle
```

## Architecture

### Single-container deployment

The Dockerfile builds both React apps first (frontend → `backend/public/`, admin-frontend → `backend/public/nuorisotyontekijat/`), then builds the NestJS backend. At runtime a single Node process serves the API and both frontends. The docker-compose `app` service represents the whole stack.

### Dual authentication model

Two completely separate SSO flows coexist:

**Suomi.fi SAML** (`backend/src/sso/`) — for youth end-users
- Uses `saml2-js`; certificates come from env vars: `SUOMIFI_IDP_CERT_<year>` (IdP certs, one per signing-key year), `SP_CERT` (own certificate) and `SP_PKEY` (own private key), all provisioned by nutakortti-infra
- No certificates are committed to this repo; for local development, files placed in the gitignored `backend/certs/` act as a fallback (`CERT_SELECTION` picks the `test`/`prod` file names — see `backend/certs/README.md`)
- After ACS callback, a `securityContext` JWT is base64-encoded into a redirect query param; the frontend stores it client-side

**Azure AD SAML** (`backend/src/ad-sso/`) — for youth workers (admins)
- Uses `@node-saml/node-saml`; IDP cert and SP private key come from env vars (`AD_SAML_*`)
- Session data (nameId, sessionIndex) encrypted with AES-256-CBC (`CRYPTO_SECRET_KEY`) and stored in a signed httpOnly cookie (`COOKIE_SECRET`)
- `AD_MOCK=true` enables a fake-login endpoint for local development
- On successful callback, backend upserts the admin record, then issues a JWT

### JWT usage differs by user type

- **Youth workers (admins):** JWT issued into an httpOnly cookie; refresh via `GET /api/admin/refresh`
- **Youth users (juniors):** JWT sent as Bearer token in Authorization header

Guards: `JwtAuthGuard` validates the token; `RolesGuard` checks the role (JUNIOR / ADMIN / SUPERUSER) against the endpoint's `@AllowedRoles()` decorator.

### QR check-in flow

`POST /api/club/check-in` has **no authentication guard by design** — it must be callable by the admin-frontend camera scanner without a pre-authenticated context. The QR code payload contains the junior's identity.

### Database

TypeORM with `synchronize: true` — schema is auto-updated from entity classes on every startup. No migration files. Core entities: `Admin`, `Junior`, `Club`, `CheckIn`, `Lockout`. A nightly cron job (`@Cron`) deletes `CheckIn` rows older than 14 days.

### State management (frontend only)

The `frontend/` uses Redux + Redux-Saga for all async API calls. The `admin-frontend/` relies on React Admin's built-in data provider pattern instead.
