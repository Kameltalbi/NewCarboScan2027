FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/carbon-engine/package.json ./packages/carbon-engine/
COPY packages/reporting/package.json ./packages/reporting/

RUN npm ci

COPY packages/carbon-engine ./packages/carbon-engine
COPY packages/reporting ./packages/reporting
COPY apps/api ./apps/api

RUN npm run build -w @newcarboscan/carbon-engine \
 && npm run build -w @newcarboscan/reporting \
 && npm run build -w @newcarboscan/api

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/carbon-engine/package.json ./packages/carbon-engine/
COPY packages/reporting/package.json ./packages/reporting/

RUN npm ci --omit=dev

COPY services/pdf/requirements.txt ./services/pdf/requirements.txt
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 python3-venv \
      libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b \
      libcairo2 libgdk-pixbuf-2.0-0 libffi8 shared-mime-info \
 && python3 -m venv /opt/pdf-venv \
 && /opt/pdf-venv/bin/pip install --no-cache-dir -r /app/services/pdf/requirements.txt \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/packages/carbon-engine/dist ./packages/carbon-engine/dist
COPY --from=build /app/packages/reporting/dist ./packages/reporting/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY services/pdf/render.py ./services/pdf/render.py
COPY services/pdf/templates ./services/pdf/templates
COPY services/pdf/static ./services/pdf/static
COPY services/pdf/fonts ./services/pdf/fonts

ENV REPORT_PDF_PYTHON=/opt/pdf-venv/bin/python

WORKDIR /app/apps/api
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/index.js"]
