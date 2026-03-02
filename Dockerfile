# Build stage
FROM node:20-alpine AS builder

ARG VITE_LEADS_API_URL=/api/v1/leads

WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund

COPY . .
ENV VITE_LEADS_API_URL=${VITE_LEADS_API_URL}
RUN npm run build

# Runtime stage
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --spider --quiet http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
