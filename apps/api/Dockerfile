# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root files
COPY package*.json ./
COPY prisma ./prisma/
COPY tsconfig.base.json ./

# Copy apps
COPY apps/api ./apps/api

# Install dependencies
RUN npm ci

# Generate Prisma client
RUN npm run db:generate

# Build NestJS app
RUN npm --prefix apps/api run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy root files
COPY package*.json ./
COPY prisma ./prisma/

# Copy only necessary files from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3003

CMD ["node", "apps/api/dist/main.js"]
