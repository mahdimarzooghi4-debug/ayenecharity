# Ayene Charity

سامانه «مرکز نیکوکاری آینه» شامل سایت عمومی، پنل ادمین و API مرکزی است.

## Architecture

V1 به‌صورت Modular Monolith توسعه داده می‌شود:

- `apps/web`: سایت عمومی و پنل ادمین با Next.js
- `apps/api`: API مرکزی با NestJS
- PostgreSQL + Prisma: مدل داده اصلی سامانه
- Object Storage: در Issue #4 اضافه می‌شود

## Requirements

- Node.js 22+
- pnpm 10+
- Docker / Docker Compose برای PostgreSQL محلی

## Local development

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm dev
```

سایت روی پورت 3000 و API روی پورت 3001 اجرا می‌شود.

## Database

Schema اصلی:

```
apps/api/prisma/schema.prisma
```

دستورات:

```bash
pnpm db:validate
pnpm db:generate
pnpm db:migrate
pnpm db:migrate:deploy
pnpm db:down
```

زمان‌ها در دیتابیس به‌صورت UTC/Timestamptz نگهداری می‌شوند. مبلغ مشارکت با `BigInt` و واحد ریال ذخیره می‌شود.

## Quality commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Environment

```bash
cp .env.example .env
```

هیچ Secret نباید در Git commit شود.

## Repository workflow

1. هر Issue روی Branch مستقل پیاده‌سازی شود.
2. تغییرات از طریق Pull Request وارد `main` شوند.
3. CI باید قبل از Merge سبز باشد.
4. بعد از Code Review، تغییرات ابتدا روی Stage بررسی شوند.

## Product source of truth

- UI/UX: فایل Figma پروژه Ayene Charity
- Product backlog: GitHub Issues
- Technical direction: Modular Monolith, TypeScript, Next.js, NestJS, PostgreSQL
