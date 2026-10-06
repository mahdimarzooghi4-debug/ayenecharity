FROM node:22-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable \
  && corepack prepare pnpm@10.17.1 --activate

WORKDIR /app

COPY . .

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_MEDIA_BASE_URL

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_MEDIA_BASE_URL=$NEXT_PUBLIC_MEDIA_BASE_URL

RUN pnpm install --frozen-lockfile \
  && pnpm --filter @ayene/web build \
  && chown -R node:node /app

ENV NODE_ENV=production

USER node

EXPOSE 3000

CMD ["pnpm", "--filter", "@ayene/web", "start"]
