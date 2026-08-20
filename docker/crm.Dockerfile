FROM oven/bun:1.3.12 AS deps
WORKDIR /app

COPY package.json bun.lock ./
COPY apps/website/package.json apps/website/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/portal/package.json apps/portal/package.json
COPY apps/crm/package.json apps/crm/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN bun install --frozen-lockfile

FROM deps AS builder
WORKDIR /app

COPY . .

RUN bun run build:crm

FROM oven/bun:1.3.12-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY package.json bun.lock ./
COPY apps/website/package.json apps/website/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/portal/package.json apps/portal/package.json
COPY apps/crm/package.json apps/crm/package.json
COPY apps/crm/scripts apps/crm/scripts
COPY packages/config packages/config
COPY packages/shared packages/shared
COPY packages/ui packages/ui

RUN bun install --production --frozen-lockfile

COPY --from=builder /app/apps/crm/build /app/apps/crm/build
COPY --from=builder /app/apps/crm/scripts /app/apps/crm/scripts

WORKDIR /app/apps/crm

EXPOSE 3000

CMD ["bun", "build/index.js"]
