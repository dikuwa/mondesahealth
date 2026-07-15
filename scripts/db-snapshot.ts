import { createCipheriv, randomBytes } from "node:crypto";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function serialize(value: unknown): unknown {
  if (typeof value === "bigint") return { $bigint: value.toString() };
  if (value instanceof Date) return { $date: value.toISOString() };
  if (Buffer.isBuffer(value)) return { $bytes: value.toString("base64") };
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, serialize(child)]));
  return value;
}

async function main() {
  const directory = resolve(process.env.BACKUP_DIR || join(homedir(), "MondesaHealthBackups"));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const tables = await db.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  const data: Record<string, unknown> = {};
  for (const { table_name: table } of tables) {
    const safeTable = table.replaceAll('"', '""');
    data[table] = await db.$queryRawUnsafe(`SELECT * FROM "${safeTable}"`);
  }
  const payload = Buffer.from(JSON.stringify(serialize({ createdAt: new Date(), tables: data })));
  const key = randomBytes(32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const output = Buffer.concat([Buffer.from("MHDB1"), iv, cipher.getAuthTag(), encrypted]);
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const snapshotPath = join(directory, `mondesahealth-${stamp}.snapshot.enc`);
  const keyPath = `${snapshotPath}.key`;
  await Promise.all([writeFile(snapshotPath, output, { mode: 0o600 }), writeFile(keyPath, key.toString("hex"), { mode: 0o600 })]);
  await Promise.all([chmod(snapshotPath, 0o600), chmod(keyPath, 0o600)]);
  console.log(`Encrypted database snapshot created: ${snapshotPath}`);
  console.log(`Recovery key created with restricted permissions: ${keyPath}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Snapshot failed."); process.exitCode = 1; }).finally(() => db.$disconnect());
