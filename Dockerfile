FROM oven/bun:alpine AS base

# Step 1 - install dependencies
FROM base AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Step 2 - rebuild the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Step 3 - copy all the files and run server
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY . .
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/.vinxi ./.vinxi
COPY --from=deps /app/node_modules ./node_modules
# COPY --from=builder /app/.next/standalone ./
# COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["bun", "run", "start"]
