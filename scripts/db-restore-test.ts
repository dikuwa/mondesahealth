import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { opensslDecryptArgs, pipeCommands, postgresEnv, required, run, targetIdentity } from "./db-backup-common";

async function main(){
  const source=required("DIRECT_URL"),target=required("RESTORE_DATABASE_URL"),key=required("BACKUP_ENCRYPTION_KEY");
  if(process.env.CONFIRM_RESTORE!=="mondesahealth-restore-test")throw new Error("Set CONFIRM_RESTORE=mondesahealth-restore-test to confirm the destructive restore drill.");
  if(targetIdentity(source)===targetIdentity(target))throw new Error("RESTORE_DATABASE_URL must point to a separate disposable database.");
  if(key.length<32)throw new Error("BACKUP_ENCRYPTION_KEY must be at least 32 characters.");
  const input=resolve(process.argv[2]||"");
  if(!process.argv[2])throw new Error("Pass the encrypted backup file path as the first argument.");
  await access(input);
  const decrypt=run("openssl",opensslDecryptArgs(input),{stdio:["ignore","pipe","inherit"]});
  const targetEnv=postgresEnv(target);
  const restore=run("pg_restore",["--clean","--if-exists","--no-owner","--no-privileges","--exit-on-error","--dbname",targetEnv.PGDATABASE!],{env:targetEnv,stdio:["pipe","inherit","inherit"]});
  await pipeCommands(decrypt,restore,"backup decryption","database restore");
  console.log(`Restore drill completed successfully against ${targetIdentity(target)}.`);
}

main().catch(error=>{console.error(error instanceof Error?error.message:"Restore drill failed.");process.exitCode=1});
