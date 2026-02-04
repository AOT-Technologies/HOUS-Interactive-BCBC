# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy all package.json files for dependency installation
COPY packages/bcbc-parser/package.json ./packages/bcbc-parser/
COPY packages/constants/package.json ./packages/constants/
COPY packages/content-chunker/package.json ./packages/content-chunker/
COPY packages/data/package.json ./packages/data/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/search-indexer/package.json ./packages/search-indexer/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Copy source data for asset generation
COPY data/source ./data/source

# Generate search indexes and content chunks
RUN pnpm generate-assets

# Build the application (Next.js static export)
RUN pnpm build

# Production stage
FROM nginx:1.25-alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder stage (Next.js static export output)
COPY --from=builder /app/apps/web/out /usr/share/nginx/html

# Expose port 8080 (OpenShift runs containers as non-root)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:8080/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]