# Liberty Field App — API Dockerfile
FROM node:20-alpine AS base

WORKDIR /app
COPY package.json ./
RUN npm install

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=base /app/dist ./dist
COPY --from=base /app/prisma ./prisma

ENV NODE_ENV=production
EXPOSE 3000

CMD sh -c "npx prisma migrate deploy && node dist/index.js"
