# Stage 1: Build the React SPA
FROM node:22-alpine AS builder

WORKDIR /app

# Allow passing API base URL at build time (defaults to /api/v1 for reverse proxy)
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve with production-grade Nginx
FROM nginx:alpine

# Replace default configuration with custom SPA config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend assets
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Health check probe
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -qO- http://localhost:80/health || exit 1

CMD ["nginx", "-g", "daemon off;"]