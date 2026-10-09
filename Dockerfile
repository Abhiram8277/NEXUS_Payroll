# ----------------------------------------------------
# Stage 1: Build Frontend SPA
# ----------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ----------------------------------------------------
# Stage 2: Build Backend Engine
# ----------------------------------------------------
FROM node:20-alpine AS backend-builder
WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
COPY prisma/ ./prisma/

RUN npm install

COPY backend/ ./backend/
RUN npm --workspace=backend run build

# ----------------------------------------------------
# Stage 3: Production Runtime
# ----------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY prisma/ ./prisma/

RUN npm install --omit=dev && npx prisma generate --schema=./prisma/schema.prisma

# Copy built backend code and generated frontend static assets
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose production port
EXPOSE 5000

# Start NEXUS API & unified SPA server
CMD ["node", "backend/dist/server.js"]
