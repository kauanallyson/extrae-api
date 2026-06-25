FROM node:22-alpine

WORKDIR /app

USER node

COPY --chown=node:node package.json package-lock.json tsconfig.json drizzle.config.ts ./

RUN npm ci

COPY --chown=node:node ./src ./src
COPY --chown=node:node ./drizzle ./drizzle

ENV NODE_ENV=production

EXPOSE 3000

CMD ["sh", "-c", "npm run db:migrate && npm run start"]
