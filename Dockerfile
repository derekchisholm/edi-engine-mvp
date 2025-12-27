# --- Stage 1: Builder ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install ALL dependencies (including dev) to run the build
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the TypeScript code (outputs to /dist)
RUN npm run build

# --- Stage 2: Runner ---
FROM node:20-alpine

WORKDIR /app

# Copy package files again
COPY package*.json ./

# Install ONLY production dependencies (keeps image small)
RUN npm ci --omit=dev

# Copy the compiled JS from the builder stage
COPY --from=builder /app/dist ./dist

# Create a non-root user for security (Best Practice for Azure)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose the Fastify port
EXPOSE 3000

# Start the server using raw Node (not ts-node)
CMD ["node", "dist/server.js"]