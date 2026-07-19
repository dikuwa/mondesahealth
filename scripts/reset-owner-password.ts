import { hash } from "bcryptjs";
import { db } from "../src/lib/db";
import { passwordSchema } from "../src/lib/password";
import { roleDefaults } from "../src/lib/permissions";

async function main() {
  if (!process.env.OWNER_EMAIL || !process.env.OWNER_PASSWORD)
    throw new Error("OWNER_EMAIL and OWNER_PASSWORD must be supplied explicitly.");
  const email = process.env.OWNER_EMAIL.toLowerCase();
  const password = process.env.OWNER_PASSWORD;

  passwordSchema.parse(password);

  const owner = await db.user.findUnique({ where: { email } });
  if (!owner || owner.role !== "OWNER")
    throw new Error("No existing Owner account matches OWNER_EMAIL. Confirm the exact login under Staff users; no account was changed.");

  await db.user.update({
    where: { id: owner.id },
    data: {
      passwordHash: await hash(password, 12),
      permissions: JSON.stringify(roleDefaults.OWNER),
      active: true,
      mustChangePassword: false,
      sessionVersion: { increment: 1 },
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
