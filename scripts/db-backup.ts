import { chmod, mkdir, mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { completed, opensslDecryptArgs, opensslEncryptArgs, pipeCommands, postgresEnv, required, run } from "./db-backup-common";

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
  const verificationDirectory=await mkdtemp(join(tmpdir(),"mondesahealth-backup-check-"));
  const decryptedBackup=join(verificationDirectory,"backup.dump");
  try{
    const decrypt=run("openssl",[...opensslDecryptArgs(output),"-out",decryptedBackup],{stdio:["ignore","ignore","inherit"]});
    await completed(decrypt,"backup decryption check");
    await chmod(decryptedBackup,0o600);
    const inspect=run("pg_restore",["--list",decryptedBackup],{stdio:["ignore","ignore","inherit"]});
    await completed(inspect,"pg_restore verification");
  }finally{
    await rm(verificationDirectory,{recursive:true,force:true});
  }
  console.log(`Encrypted backup created and verified: ${output}`);
}

main().catch(error=>{console.error(error instanceof Error?error.message:"Backup failed.");process.exitCode=1});
