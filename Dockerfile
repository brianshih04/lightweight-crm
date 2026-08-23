# syntax=docker/dockerfile:1.7

ARG NODE_IMAGE=node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94

FROM ${NODE_IMAGE} AS base
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM dependencies AS builder
COPY . .
ENV NODE_ENV=production
RUN export DATABASE_URL='postgresql://build:build@127.0.0.1:5432/build?schema=public' \
    APP_ORIGIN='http://127.0.0.1:3000' \
    AUDIT_HASH_SECRET='build-only-audit-secret-with-at-least-32-characters' \
    NEXT_OUTPUT='standalone' \
    && npm run db:pg:check \
    && npx prisma generate --schema prisma/postgresql/schema.prisma \
    && npm run build

FROM builder AS migrator
ENV NODE_ENV=production \
    CONTAINER_ROLE=migrate \
    HOME=/tmp
USER node
ENTRYPOINT ["node", "scripts/container-entrypoint.mjs"]
CMD ["./node_modules/.bin/prisma", "migrate", "deploy", "--schema", "prisma/postgresql/schema.prisma"]

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    CONTAINER_ROLE=app \
    HOME=/tmp

RUN groupadd --system --gid 1001 nextjs \
    && useradd --system --uid 1001 --gid nextjs --create-home nextjs

COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/scripts/container-entrypoint.mjs ./container-entrypoint.mjs

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=4 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
ENTRYPOINT ["node", "container-entrypoint.mjs"]
CMD ["node", "server.js"]
