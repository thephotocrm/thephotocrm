# Multi-stage build for Node.js Express + Vite application
# Stage 1: Builder - Build both frontend and backend
FROM node:20-alpine AS builder

WORKDIR /app

# Install build tools for native modules (bcrypt, etc.)
RUN apk add --no-cache python3 make g++

# Copy package files first (for better layer caching)
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy all source code
COPY . .

# Build both:
# 1. Vite frontend -> server/public
# 2. esbuild server bundle -> dist/index.js
RUN npm run build

# Stage 2: Production - Minimal runtime image
FROM node:20-alpine

WORKDIR /app

# Install build tools for native modules (bcrypt needs this at runtime too)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Copy the built server bundle from builder
COPY --from=builder /app/dist ./dist

# Copy the built frontend static files from builder
COPY --from=builder /app/server/public ./server/public

# Copy necessary runtime files
COPY server/vite.ts ./server/vite.ts
COPY shared ./shared
COPY migrations ./migrations

# Expose port (Railway will use PORT env var)
EXPOSE 5000

# Start the Express server (runs dist/index.js)
CMD ["npm", "start"]
