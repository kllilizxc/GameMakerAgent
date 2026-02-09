FROM oven/bun:1 as builder

WORKDIR /app

# Copy root package files
COPY package.client.json ./package.json
COPY bun.lock ./

# Copy workspace package.json files for dependency resolution
COPY apps/client/package.json ./apps/client/package.json
COPY packages/common/package.json ./packages/common/package.json

# Install dependencies (only client + common)
RUN bun install

# Copy source code
COPY packages/common ./packages/common
COPY apps/client ./apps/client

# Build
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL
RUN bun run --cwd apps/client build

# Serve stage
FROM oven/bun:1

WORKDIR /app

# Copy built assets and server script
COPY --from=builder /app/apps/client/dist ./dist
COPY --from=builder /app/apps/client/server.ts ./server.ts

# Install only production dependencies if needed (none needed for native bun serve)
# But we might need standard headers/mime types if not using bun serve
# We are using bun serve which is built-in

EXPOSE 3000

CMD ["bun", "run", "server.ts"]
