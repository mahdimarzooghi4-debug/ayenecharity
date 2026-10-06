FROM node:22-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN apk add --no-cache openssl \
  && corepack enable \
  && corepack prepare pnpm@10.17.1 --activate

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile \
  && pnpm db:generate \
  && pnpm --filter @ayene/api build \
  && chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3001

USER node

EXPOSE 3001

CMD ["pnpm", "--filter", "@ayene/api", "start"]
