import { hash } from "bcryptjs";
import { db } from "../src/lib/db";
import { passwordSchema } from "../src/lib/password";
import { roleDefaults } from "../src/lib/permissions";

async function main() {
  const email = (process.env.OWNER_EMAIL || "owner@mondesahealth.na").toLowerCase();
  const password = process.env.OWNER_PASSWORD || "Mondesa2026!";
  const name = process.env.OWNER_NAME || "Practice Owner";

  passwordSchema.parse(password);

  await db.user.upsert({
    where: { email },
    update: {
      passwordHash: await hash(password, 12),
      role: "OWNER",
      permissions: JSON.stringify(roleDefaults.OWNER),
      active: true,
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
    },
    create: {
      name,
      email,
      passwordHash: await hash(password, 12),
      role: "OWNER",
      permissions: JSON.stringify(roleDefaults.OWNER),
      active: true,
      mustChangePassword: false,
    },
  });

  console.log(`Owner login ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
