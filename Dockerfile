FROM oven/bun:alpine

WORKDIR /app

# Copy configuration files
COPY package.json bun.lock tsconfig.json drizzle.config.ts ./

# Install dependencies
RUN bun install

# Copy source code and migrations
COPY ./src ./src
COPY ./drizzle ./drizzle

ENV NODE_ENV=production

CMD ["bun", "run", "src/index.ts"]

EXPOSE 3000