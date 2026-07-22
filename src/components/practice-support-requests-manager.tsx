"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { StatusBadge } from "@/components/ui/status-badge";
import { practiceSupportScopeLabels, type PracticeSupportScope } from "@/lib/practice-support";

type Item={id:string;requester:string;reason:string;scopes:PracticeSupportScope[];durationMinutes:number;status:string;expiresAt:string|null;revokedAt:string|null;createdAt:string};
export function PracticeSupportRequestsManager({requests}:{requests:Item[]}){
  const router=useRouter();const[busy,setBusy]=useState(false);
  async function decide(id:string,decision:"APPROVE"|"REJECT"|"REVOKE"){
    setBusy(true);const toastId=toast.loading("Updating support request…");
    try{const response=await fetch("/api/practice/support",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,decision})});const data=await response.json();if(!response.ok)throw new Error(data.error);toast.success(decision==="APPROVE"?"Temporary access approved":decision==="REJECT"?"Request rejected":"Access revoked",{id:toastId});router.refresh();}
    catch(error){toast.error(error instanceof Error?error.message:"Could not update request",{id:toastId});}finally{setBusy(false)}
  }
  return <section className="card dashboard-card panel-card"><div className="panel-heading"><div><h2>Platform support requests</h2><p>You control temporary access. These scopes never include patients, clinical records, claims or finance.</p></div></div><div className="record-stack">{requests.map(item=>{const active=item.status==="APPROVED"&&!item.revokedAt&&item.expiresAt&&new Date(item.expiresAt)>new Date();return <article className="record-row" key={item.id}><div><div className="record-row-title"><b>{item.requester}</b><StatusBadge value={item.revokedAt?"REVOKED":item.status}/></div><p>{item.reason}</p><small>{item.scopes.map(scope=>practiceSupportScopeLabels[scope]).join(" · ")} · {item.durationMinutes} minutes requested</small>{item.expiresAt&&<small> · Expires {new Date(item.expiresAt).toLocaleString("en-NA")}</small>}</div><div className="table-actions">{item.status==="PENDING"&&<><button className="btn btn-primary" disabled={busy} onClick={()=>decide(item.id,"APPROVE")}>Approve</button><button className="btn btn-light" disabled={busy} onClick={()=>decide(item.id,"REJECT")}>Reject</button></>}{active&&<button className="btn btn-danger" disabled={busy} onClick={()=>decide(item.id,"REVOKE")}>Revoke now</button>}</div></article>})}{!requests.length&&<div className="dashboard-empty"><h3>No support requests</h3><p>The platform cannot enter this practice unless you approve a scoped request here.</p></div>}</div></section>;
}
