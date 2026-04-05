FROM oven/bun:latest AS base

RUN apt-get update && apt-get install -y tzdata && \
  cp /usr/share/zoneinfo/Asia/Tokyo /etc/localtime && \
  echo "Asia/Tokyo" > /etc/timezone && \
  rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile

CMD ["bun", "src/main.ts"]
