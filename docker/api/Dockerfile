# Etapa 1: instala as dependencias e empacota a API em um unico arquivo JS
FROM node:22-alpine AS construcao

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN npm ci --workspace @precos/api --include-workspace-root --ignore-scripts

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run build --workspace @precos/api

# Etapa 2: imagem final com apenas as dependencias de execucao
FROM node:22-alpine AS execucao

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN npm ci --omit=dev --workspace @precos/api --include-workspace-root --ignore-scripts \
  && npm cache clean --force

COPY --from=construcao /app/apps/api/dist apps/api/dist

USER node

EXPOSE 3333

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3333/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "apps/api/dist/server.js"]
