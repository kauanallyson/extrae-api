FROM oven/bun:latest

WORKDIR /app

# Copy configuration files
COPY package.json bun.lock tsconfig.json drizzle.config.ts ./

# Install dependencies
RUN bun install

# Copy source code and migrations
COPY ./src ./src
COPY ./drizzle ./drizzle

ENV NODE_ENV=production

CMD ["sh", "-c", "bun db:migrate && bun run src/index.ts"]

EXPOSE 3000
