# Stage 1: Install dependencies
FROM node:20-slim AS deps
WORKDIR /app

# Install bun
RUN npm install -g bun

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

# Stage 2: Build the application
FROM node:20-slim AS build
WORKDIR /app

# Install bun for build
RUN npm install -g bun

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bun run build

# Stage 3: Production runtime
FROM node:20-slim AS runtime
WORKDIR /app

# Install runtime dependencies: libvips for sharp, bun for drizzle-kit migrations
RUN apt-get update && \
    apt-get install -y libvips && \
    npm install -g bun && \
    rm -rf /var/lib/apt/lists/*

# Copy standalone build output
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Copy drizzle config and schema for migrations
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/src/db/schema.ts ./src/db/schema.ts

# Install drizzle-kit and drizzle-orm for migrations (minimal install)
COPY --from=build /app/package.json ./package.json
RUN bun install drizzle-kit drizzle-orm better-sqlite3

# Copy entrypoint
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Environment defaults
ENV DATABASE_PATH=/data/sqlite.db
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

# Volumes for persistent data
VOLUME ["/data", "/app/generated-images"]

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
