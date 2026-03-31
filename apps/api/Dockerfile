# Liberty Field App — API Dockerfile
FROM node:20-alpine AS base

# OpenSSL needed for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy prisma schema FIRST so postinstall (prisma generate) can find it
COPY package.json ./
COPY prisma/ ./prisma/
RUN npm install

# Build TypeScript
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# Production stage
FROM node:20-alpine AS production

# OpenSSL needed for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Again, copy prisma before npm install so postinstall works
COPY package.json ./
COPY prisma/ ./prisma/
RUN npm install --omit=dev

# Copy generated Prisma client from build stage (prisma CLI is a devDep)
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled JS from build stage
COPY --from=base /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]
