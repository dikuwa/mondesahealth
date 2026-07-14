import { chmod, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { opensslDecryptArgs, opensslEncryptArgs, pipeCommands, postgresEnv, required, run } from "./db-backup-common";

async function main(){
  const connection=required("DIRECT_URL"),key=required("BACKUP_ENCRYPTION_KEY");
  if(key.length<32)throw new Error("BACKUP_ENCRYPTION_KEY must be at least 32 characters.");
  const directory=resolve(process.env.BACKUP_DIR||join(homedir(),"MondesaHealthBackups"));
  await mkdir(directory,{recursive:true,mode:0o700});
  const stamp=new Date().toISOString().replaceAll(":","-").replaceAll(".","-");
  const output=join(directory,`mondesahealth-${stamp}.dump.enc`);
  const dump=run("pg_dump",["--format=custom","--no-owner","--no-privileges"],{env:postgresEnv(connection),stdio:["ignore","pipe","inherit"]});
  const encrypt=run("openssl",opensslEncryptArgs(output),{stdio:["pipe","ignore","inherit"]});
  await pipeCommands(dump,encrypt,"pg_dump","backup encryption");
  await chmod(output,0o600);
  const decrypt=run("openssl",opensslDecryptArgs(output),{stdio:["ignore","pipe","inherit"]});
  const inspect=run("pg_restore",["--list"],{stdio:["pipe","ignore","inherit"]});
  await pipeCommands(decrypt,inspect,"backup decryption check","pg_restore verification");
  console.log(`Encrypted backup created and verified: ${output}`);
}

main().catch(error=>{console.error(error instanceof Error?error.message:"Backup failed.");process.exitCode=1});
