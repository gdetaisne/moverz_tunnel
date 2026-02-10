FROM node:20-bullseye-slim AS builder

WORKDIR /usr/src/app

# Variables d'environnement NEXT_PUBLIC_* (injectées au build time)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WHATSAPP_NUMBER
ARG NEXT_PUBLIC_PAYPAL_PAYMENT_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER
ENV NEXT_PUBLIC_PAYPAL_PAYMENT_URL=$NEXT_PUBLIC_PAYPAL_PAYMENT_URL

# 1) Installer les dépendances (y compris dev, nécessaires au build: Tailwind, TypeScript, etc.)
COPY package*.json ./
RUN npm ci --include=dev

# 2) Copier le code applicatif
COPY . .

# 3) Nettoyer les anciens builds et générer Prisma Client, appliquer les migrations SQLite et builder Next
RUN rm -rf .next \
  && npx prisma generate \
  && DATABASE_URL="file:./prisma/dev.db" npx prisma migrate deploy \
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
COPY --from=builder /usr/src/app/public ./public
# Note: dev.db est dans prisma/ (copié avec le dossier prisma)

EXPOSE 3000

# Rendre la DB SQLite accessible en écriture et démarrer
CMD ["/bin/sh", "-c", "chmod 666 ./prisma/dev.db 2>/dev/null || true && npm start"]


