FROM oven/bun:1.3-alpine

WORKDIR /app

COPY package.json bun.lock ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
	bun install --frozen-lockfile --production

COPY tsconfig.json drizzle.config.ts ./
COPY ./src ./src
COPY ./drizzle ./drizzle

ENV NODE_ENV=production

USER bun

EXPOSE 3000

CMD ["sh", "-c", "./node_modules/.bin/drizzle-kit migrate && bun run src/index.ts"]
