# Liberty Field App — API Dockerfile
FROM node:20-alpine AS base

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production=false

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma
COPY --from=base /app/package.json ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
