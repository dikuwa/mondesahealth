"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, Clipboard, ExternalLink, RotateCcw, Send, ShieldCheck } from "lucide-react";

type CredentialSet={
  platform:{email:string;password:string;loginUrl:string};
  practice:{email:string;password:string;loginUrl:string;invitationUrl:string};
};

const stages=["DRAFT","OWNER_INVITED","OWNER_ACTIVATED","READY","COMPLETED"] as const;
const labels=["Prepare practice","Invite owner","Owner activates account","Verify setup","Complete handover"];

export function PracticeOwnershipTransfer({
  practiceId,practiceName,registeredEmail,independentOwnerReady,canFinalize,handoverStatus,publicUrl,isPrimaryPlatformOwner,
}:{
  practiceId:string;practiceName:string;registeredEmail:string|null;independentOwnerReady:boolean;canFinalize:boolean;
  handoverStatus:string;publicUrl:string;isPrimaryPlatformOwner:boolean;
}){
  const router=useRouter();
  const[busy,setBusy]=useState(false);
  const[sendEmail,setSendEmail]=useState(false);
  const[inviteUrl,setInviteUrl]=useState("");
  const[preview,setPreview]=useState<Record<string,number>|null>(null);
  const[password,setPassword]=useState("");
  const[credentials,setCredentials]=useState<CredentialSet|null>(null);
  const current=Math.max(0,stages.indexOf(handoverStatus as typeof stages[number]));

  async function action(body:Record<string,unknown>){
    setBusy(true);
    try{
      const response=await fetch("/api/platform/practices/transfer-owner",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({practiceId,...body})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error);
      return data;
    }finally{setBusy(false)}
  }
  async function invite(){
    const toastId=toast.loading("Creating owner invitation…");
    try{const data=await action({action:"INVITE",sendInvitationEmail:sendEmail});setInviteUrl(data.inviteUrl);toast.success("Owner invitation created",{id:toastId});router.refresh();}
    catch(error){toast.error(error instanceof Error?error.message:"Could not create invitation",{id:toastId});}
  }
  async function markReady(){
    const toastId=toast.loading("Verifying setup…");
    try{await action({action:"READY"});toast.success("Setup verified",{id:toastId});router.refresh();}
    catch(error){toast.error(error instanceof Error?error.message:"Could not verify setup",{id:toastId});}
  }
  async function finalize(){
    const toastId=toast.loading("Completing handover…");
    try{await action({action:"FINALIZE",confirmation:"SEPARATE PLATFORM AND PRACTICE"});toast.success("Handover completed",{id:toastId});window.location.assign("/platform/login?reason=session-expired");}
    catch(error){toast.error(error instanceof Error?error.message:"Could not complete handover",{id:toastId});}
  }
  async function loadPreview(){
    try{const data=await action({action:"ROLLBACK_PREVIEW"});setPreview(data.preservedRecords);}
    catch(error){toast.error(error instanceof Error?error.message:"Could not preview reset");}
  }
  async function reset(){
    const toastId=toast.loading("Resetting handover safely…");
    try{const data=await action({action:"ROLLBACK",password,confirmation:"RESET HANDOVER SAFELY"});setCredentials(data.credentials);setPreview(data.preservedRecords);setPassword("");toast.success("Handover reset. Copy both one-time credentials now.",{id:toastId,duration:8000});}
    catch(error){toast.error(error instanceof Error?error.message:"Could not reset handover",{id:toastId});}
  }
  const copy=(value:string)=>navigator.clipboard.writeText(value).then(()=>toast.success("Copied"));

  return <section className="card dashboard-card handover-wizard" aria-labelledby="handover-title">
    <header className="ownership-transfer-header"><span className="ownership-transfer-icon"><ShieldCheck size={24}/></span><div className="ownership-transfer-heading"><span className="eyebrow">Guided ownership handover</span><h2 id="handover-title">Separate {practiceName} from the platform</h2><p>Follow each numbered step. Clinical and operational records are never moved or deleted.</p></div></header>
    <div className="handover-url"><div><span className="ownership-transfer-label">Permanent public URL</span><strong>{publicUrl}</strong></div><div><button className="btn btn-light" onClick={()=>copy(`${window.location.origin}${publicUrl}`)}><Clipboard size={15}/>Copy</button><Link className="btn btn-light" href={publicUrl} target="_blank">Open<ExternalLink size={15}/></Link></div></div>
    <ol className="handover-steps">
      {labels.map((label,index)=><li key={label} className={index<current||handoverStatus==="COMPLETED"?"is-complete":index===current?"is-current":""}><span>{index<current||handoverStatus==="COMPLETED"?<Check size={17}/>:index+1}</span><div><strong>{label}</strong><small>{index===1?(registeredEmail||"Add the practice owner email"):index===2?(independentOwnerReady?"Owner account is active":"Waiting for owner activation"):index===3?"Platform staff confirm the site and portal work":index===4?"Permanent platform membership is removed":"Practice details and public URL are ready"}</small></div></li>)}
    </ol>
    <div className="handover-actions">
      {(handoverStatus==="DRAFT"||handoverStatus==="ROLLED_BACK")&&<><label className="custom-checkbox"><input type="checkbox" checked={sendEmail} onChange={event=>setSendEmail(event.target.checked)}/><span>Email the invitation</span></label><button className="btn btn-primary" disabled={busy||!registeredEmail} onClick={invite}><Send size={16}/>Create owner invitation</button></>}
      {handoverStatus==="OWNER_INVITED"&&<p className="notice-info">Waiting for the owner to activate the account from the secure invitation.</p>}
      {handoverStatus==="OWNER_ACTIVATED"&&<button className="btn btn-primary" disabled={busy} onClick={markReady}>Verify setup and continue</button>}
      {handoverStatus==="READY"&&canFinalize&&<button className="btn btn-danger" disabled={busy} onClick={finalize}>Complete handover and remove platform access</button>}
      {handoverStatus==="COMPLETED"&&<p className="notice-success">Handover is complete. Platform access now requires an owner-approved temporary support request.</p>}
    </div>
    {inviteUrl&&<div className="password-copy-banner"><div><b>Secure owner invitation</b><code>{inviteUrl}</code></div><button className="btn btn-light" onClick={()=>copy(`${window.location.origin}${inviteUrl}`)}><Clipboard size={16}/>Copy</button></div>}
    {isPrimaryPlatformOwner&&<details className="handover-reset"><summary><RotateCcw size={16}/>Reset this handover safely</summary><p>This restores temporary platform membership, signs out both owners, expires old invitations, and creates a fresh owner invitation. All listed records remain unchanged.</p>{!preview?<button className="btn btn-light" disabled={busy} onClick={loadPreview}>Preview affected state</button>:<><div className="reset-counts">{Object.entries(preview).map(([key,value])=><span key={key}><strong>{value}</strong>{key}</span>)}</div><label className="field"><span>Confirm with your current platform password</span><input className="input" type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="current-password"/></label><button className="btn btn-danger" disabled={busy||!password} onClick={reset}>Reset handover and generate credentials</button></>}</details>}
    {credentials&&<div className="one-time-credentials" role="alert"><h3>Copy these one-time credentials now</h3><p>They are displayed once and both accounts must replace them immediately.</p>{([['Platform Portal',credentials.platform],['Practice Portal',credentials.practice]] as const).map(([label,item])=><article key={label}><strong>{label}</strong><code>{item.email}</code><code>{item.password}</code><div><button className="btn btn-light" onClick={()=>copy(item.email)}>Copy email</button><button className="btn btn-light" onClick={()=>copy(item.password)}>Copy password</button><Link className="btn btn-primary" href={item.loginUrl}>Open login</Link></div>{'invitationUrl' in item&&<p>Activation link: <code>{item.invitationUrl}</code></p>}</article>)}</div>}
  </section>;
}
