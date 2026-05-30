FROM node:22-slim

RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy monorepo workspace files and lockfile
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/ ./packages/
COPY apps/renderer/ ./apps/renderer/

# Install dependencies for the workspace
RUN pnpm install --frozen-lockfile

# Build the renderer microservice
RUN pnpm --filter @stickman/renderer build

EXPOSE 4001
WORKDIR /app/apps/renderer
CMD ["node", "dist/index.js"]
