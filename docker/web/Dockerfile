# Etapa 1: build do site (Vite + React + Tailwind)
FROM node:22-alpine AS construcao

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN npm ci --workspace @precos/web --include-workspace-root --ignore-scripts

COPY packages/shared packages/shared
COPY apps/web apps/web

RUN npm run build --workspace @precos/web

# Etapa 2: nginx servindo os arquivos estaticos e fazendo proxy da API
FROM nginx:1.27-alpine AS execucao

COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=construcao /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=5 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
