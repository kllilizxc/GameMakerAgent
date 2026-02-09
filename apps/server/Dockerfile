# apps/server/Dockerfile
# Use the official Bun image
# We use the root context to ensure all package/ workspace dependencies are available
FROM oven/bun:1 AS base
WORKDIR /app

# Install git for dependency installation (needed for git submodule update in postinstall)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Copy the entire monorepo
# This is the simplest way to support workspaces without complex filtering
COPY . .

# Install dependencies (including devDependencies if needed for build, 
# though for production we might want --production, but often workspaces need compilation)
RUN bun install

# Switch to the server directory logic
WORKDIR /app/apps/server

# Build not strictly necessary for simple Bun apps if purely TS, 
# but if there are build steps, run them here.
# RUN bun run build 

# Expose the port the app runs on
# Render sets the PORT environment variable, which the code respects.
EXPOSE 3000 3001

# Command to run the server
# We run from the app directory, but relying on the installed node_modules at root
CMD ["bun", "src/index.ts"]
