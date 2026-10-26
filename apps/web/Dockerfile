FROM node:20-bookworm-slim AS build
WORKDIR /app

ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/carbon-engine/package.json ./packages/carbon-engine/
COPY packages/reporting/package.json ./packages/reporting/

RUN npm ci

COPY packages/carbon-engine ./packages/carbon-engine
COPY apps/web ./apps/web

RUN npx playwright install --with-deps chromium
RUN npm run build -w @newcarboscan/web

FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
