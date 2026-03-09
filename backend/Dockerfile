# --- Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# --- Production stage ---
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src

RUN mkdir -p uploads/quotes uploads/invoices

RUN addgroup -g 1001 -S crm && \
    adduser -S crm -u 1001 && \
    chown -R crm:crm /app

USER crm

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "src/index.js"]
