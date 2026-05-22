# --- Stage 1: Build & Compilation ---
FROM node:22-slim AS builder

WORKDIR /app

# Copy package configurations
COPY package*.json ./
# Remove package-lock.json to enforce correct platform-specific binary installations
RUN rm -f package-lock.json && npm install

# Copy codebase
COPY . .

# Compile application assets and server bundles
RUN npm run build

# --- Stage 2: Production Container ---
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy packages configuration
COPY package*.json ./

# Install only production dependencies cleanly
RUN rm -f package-lock.json && npm install --omit=dev

# Copy production compiled bundles and client assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json
COPY --from=builder /app/firestore.rules ./firestore.rules

# Expose port and start standard full-stack Express + Vite server
EXPOSE 3000

CMD ["node", "dist/server.cjs"]
