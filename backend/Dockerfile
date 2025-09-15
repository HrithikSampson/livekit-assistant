FROM node:20.11.0-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm
RUN pnpm install
# Install platform-specific dependencies
RUN pnpm rebuild

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm
RUN pnpm build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

# Create a non-root user
RUN addgroup --system --gid 1001 livekit
RUN adduser --system --uid 1001 livekit

# Copy built application
COPY --from=builder --chown=livekit:livekit /app/dist ./dist
COPY --from=builder --chown=livekit:livekit /app/node_modules ./node_modules
COPY --from=builder --chown=livekit:livekit /app/package.json ./package.json

USER livekit

EXPOSE 8080

# Use the built agent
CMD ["node", "dist/agent.js"]
