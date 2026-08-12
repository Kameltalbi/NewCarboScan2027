FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/carbon-engine/package.json ./packages/carbon-engine/

RUN npm ci

COPY packages/carbon-engine ./packages/carbon-engine
COPY apps/api ./apps/api

RUN npm run build -w @newcarboscan/carbon-engine \
 && npm run build -w @newcarboscan/api

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/carbon-engine/package.json ./packages/carbon-engine/

RUN npm ci --omit=dev

COPY --from=build /app/packages/carbon-engine/dist ./packages/carbon-engine/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
