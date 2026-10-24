# syntax=docker/dockerfile:1
# Production images of the monorepo. Built by deploy/deploy.sh on the server;
# see docs/despliegue.md.

# Debian-based (not Alpine): bcrypt ships prebuilt binaries for glibc.
FROM node:24-slim AS deps
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

# Compiled API, with the Prisma CLI and the migrations: also the image of the
# one-off "migrate" service.
FROM deps AS backend-build
COPY backend backend
RUN npm run build --workspace=backend
WORKDIR /app/backend
CMD ["npm", "run", "db:deploy"]

FROM deps AS frontend-build
# Baked into the bundle at build time.
ARG VITE_API_URL
COPY frontend frontend
RUN VITE_API_URL="$VITE_API_URL" npm run build --workspace=frontend

# Only the static files, exported to the host with `docker buildx build --output`.
FROM scratch AS web
COPY --from=frontend-build /app/frontend/dist /

FROM node:24-slim AS api
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace=backend --include-workspace-root \
  && npm cache clean --force
COPY --from=backend-build /app/backend/dist backend/dist
WORKDIR /app/backend
USER node
EXPOSE 3000
CMD ["node", "dist/main"]
