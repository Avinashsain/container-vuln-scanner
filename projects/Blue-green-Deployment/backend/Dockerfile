# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# ---- Runtime Stage ----
FROM node:20-alpine

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy installed modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY . .

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:8000/health || exit 1

# Start the app
CMD ["node", "server.js"]