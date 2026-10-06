import { AdminRole, AdminUserStatus, PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

import { PASSWORD_HASH_ROUNDS } from "../auth/auth.constants";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const username = (process.env.BOOTSTRAP_ADMIN_USERNAME?.trim().toLowerCase() || "admin");
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const fullName = process.env.BOOTSTRAP_ADMIN_NAME?.trim();

  if (!email || !password || !fullName) {
    throw new Error(
      "BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_PASSWORD and BOOTSTRAP_ADMIN_NAME are required.",
    );
  }

  if (password.length < 12) {
    throw new Error("BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.");
  }

  const existing = await prisma.adminUser.findFirst({
    where: { OR: [{ username }, { email }] },
  });
  if (existing) {
    throw new Error("An admin user with this username or email already exists.");
  }

  const passwordHash = await hash(password, PASSWORD_HASH_ROUNDS);

  const user = await prisma.adminUser.create({
    data: {
      username,
      email,
      passwordHash,
      fullName,
      role: AdminRole.SUPER_ADMIN,
      status: AdminUserStatus.ACTIVE,
    },
    select: {
      id: true,
      username: true,
      email: true,
      fullName: true,
      role: true,
    },
  });

  process.stdout.write(
    "Created bootstrap admin " +
      user.username + " (" + user.email + ")" +
      " [" +
      user.id +
      "] with role " +
      user.role +
      ".\n",
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown bootstrap error.";
    process.stderr.write(message + "\n");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
