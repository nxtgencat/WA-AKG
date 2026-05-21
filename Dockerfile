FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY patches ./patches/
COPY prisma ./prisma/
RUN npm ci

# Copy the rest of the application files
COPY . .

# Generate Prisma client and build Next.js application
RUN npx prisma generate
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Copy production files
COPY package*.json ./
COPY node_modules ./node_modules
COPY .next ./.next
COPY src ./src
COPY prisma ./prisma
COPY public ./public
COPY tsconfig.json ./

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && npx tsx src/server/index.ts"]
