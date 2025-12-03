FROM node:20-bullseye-slim AS builder

WORKDIR /usr/src/app

ENV NODE_ENV=production

# 1) Installer les dépendances
COPY package*.json ./
RUN npm ci

# 2) Copier le code applicatif
COPY . .

# 3) Générer Prisma Client, appliquer les migrations SQLite et builder Next
RUN npx prisma generate \
  && DATABASE_URL="file:./dev.db" npx prisma migrate deploy \
  && npm run build \
  && npm prune --omit=dev


FROM node:20-bullseye-slim AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3000

# 1) Copier le runtime minimal depuis le builder
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/next.config.* ./
COPY --from=builder /usr/src/app/prisma ./prisma

EXPOSE 3000

CMD ["npm", "start"]


