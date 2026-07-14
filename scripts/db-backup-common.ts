import { spawn, type ChildProcess } from "node:child_process";

export function required(name:string){const value=process.env[name]?.trim();if(!value)throw new Error(`${name} is required.`);return value}

export function postgresEnv(connection:string){
  const url=new URL(connection);
  if(url.protocol!=="postgresql:"&&url.protocol!=="postgres:")throw new Error("Expected a PostgreSQL connection string.");
  return {...process.env,PGHOST:url.hostname,PGPORT:url.port||"5432",PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGDATABASE:decodeURIComponent(url.pathname.slice(1)),PGSSLMODE:url.searchParams.get("sslmode")||"require",PGCHANNELBINDING:url.searchParams.get("channel_binding")||"prefer"};
}

export function targetIdentity(connection:string){const url=new URL(connection);return `${url.hostname}:${url.port||"5432"}/${decodeURIComponent(url.pathname.slice(1))}`}

export function run(command:string,args:string[],options:{env?:NodeJS.ProcessEnv;stdio?:["ignore"|"pipe","ignore"|"pipe"|"inherit","inherit"]}={}){
  return spawn(command,args,{env:options.env||process.env,stdio:options.stdio||["ignore","ignore","inherit"]});
}

export function completed(child:ChildProcess,label:string){return new Promise<void>((resolve,reject)=>{child.once("error",error=>reject(new Error(`${label} could not start: ${error.message}`)));child.once("close",code=>code===0?resolve():reject(new Error(`${label} failed with exit code ${code}.`)))})}

export async function pipeCommands(source:ChildProcess,destination:ChildProcess,sourceLabel:string,destinationLabel:string){
  if(!source.stdout||!destination.stdin)throw new Error("Backup pipeline could not be created.");
  source.stdout.pipe(destination.stdin);
  await Promise.all([completed(source,sourceLabel),completed(destination,destinationLabel)]);
}

export const opensslEncryptArgs=(output:string)=>["enc","-aes-256-cbc","-salt","-pbkdf2","-iter","200000","-pass","env:BACKUP_ENCRYPTION_KEY","-out",output];
export const opensslDecryptArgs=(input:string)=>["enc","-d","-aes-256-cbc","-pbkdf2","-iter","200000","-pass","env:BACKUP_ENCRYPTION_KEY","-in",input];
