FROM oven/bun:1.3-alpine

WORKDIR /app

COPY package.json bun.lock tsconfig.json drizzle.config.ts ./

RUN bun install --frozen-lockfile

COPY ./src ./src
COPY ./drizzle ./drizzle

ENV NODE_ENV=production

USER bun

EXPOSE 3000

CMD ["sh", "-c", "bunx drizzle-kit migrate && bun run src/index.ts"]
