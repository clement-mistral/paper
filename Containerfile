# Paper: production image (podman build -t paper .)
#
# Stage 1 builds the app (TypeScript + Vite) with every dependency,
# stage 2 keeps only the compiled output and production dependencies.

FROM docker.io/library/node:24-alpine AS build
WORKDIR /app
RUN npm install --global pnpm@12.16.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN node ace build

FROM docker.io/library/node:24-alpine AS runtime
# Commit the image is built from, shown on « Nouveautés » (set by the CI).
ARG APP_COMMIT=""
ENV APP_COMMIT=$APP_COMMIT \
    NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3333 \
    TZ=UTC
WORKDIR /app
RUN npm install --global pnpm@12.16.1
COPY --from=build /app/build ./
COPY --from=build /app/pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile && npm uninstall --global pnpm
USER node
EXPOSE 3333
# The health check lives in compose.prod.yaml (podman ignores HEALTHCHECK
# in OCI images).
# Pending migrations run at every start (forward only, never a rollback).
CMD ["sh", "-c", "node ace migration:run --force && node bin/server.js"]
