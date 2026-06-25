FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json tsconfig.json drizzle.config.ts ./

RUN npm ci

COPY ./src ./src
COPY ./drizzle ./drizzle

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npm run db:migrate && npm run start"]
