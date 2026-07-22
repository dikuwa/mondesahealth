"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/custom-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { PRACTICE_SUPPORT_SCOPES, practiceSupportScopeLabels, type PracticeSupportScope } from "@/lib/practice-support";

type RequestItem={id:string;practice:string;reason:string;scopes:PracticeSupportScope[];durationMinutes:number;status:string;expiresAt:string|null;revokedAt:string|null;createdAt:string};

export function PlatformPracticeSupportManager({practices,requests}:{practices:{id:string;name:string}[];requests:RequestItem[]}){
  const router=useRouter();
  const[practiceId,setPracticeId]=useState(practices[0]?.id||"");
  const[duration,setDuration]=useState("60");
  const[scopes,setScopes]=useState<PracticeSupportScope[]>(["OPERATIONAL_DIAGNOSTICS"]);
  const[busy,setBusy]=useState(false);
  const toggle=(scope:PracticeSupportScope)=>setScopes(value=>value.includes(scope)?value.filter(item=>item!==scope):[...value,scope]);
  async function create(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);const toastId=toast.loading("Sending request to the practice owner…");
    try{const form=new FormData(event.currentTarget);const response=await fetch("/api/platform/practice-support",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({practiceId,durationMinutes:Number(duration),scopes,reason:form.get("reason")})});const data=await response.json();if(!response.ok)throw new Error(data.error);toast.success("Support request sent for owner approval",{id:toastId});router.refresh();}
    catch(error){toast.error(error instanceof Error?error.message:"Could not request access",{id:toastId});}finally{setBusy(false)}
  }
  async function act(id:string,action:"ENTER"|"REVOKE"){
    setBusy(true);const toastId=toast.loading(action==="ENTER"?"Opening approved support session…":"Revoking request…");
    try{const response=await fetch(action==="ENTER"?"/api/platform/practice-support":`/api/platform/practice-support?id=${id}`,action==="ENTER"?{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,action})}:{method:"DELETE"});const data=await response.json();if(!response.ok)throw new Error(data.error);if(action==="ENTER")window.location.assign(data.destination);else{toast.success("Support request revoked",{id:toastId});router.refresh();}}
    catch(error){toast.error(error instanceof Error?error.message:"Action failed",{id:toastId});setBusy(false)}
  }
  return <>
    <form className="card dashboard-card panel-card" onSubmit={create}><div className="panel-heading"><div><h2>Request practice administration access</h2><p>The independent owner must approve this request. Patient, clinical, claims and finance access are excluded.</p></div></div><div className="panel-body"><div className="form-grid"><label className="field"><span>Practice</span><CustomSelect value={practiceId} onChange={setPracticeId} options={practices.map(item=>({value:item.id,label:item.name}))}/></label><label className="field"><span>Duration after approval</span><CustomSelect value={duration} onChange={setDuration} options={[30,60,120,240,480].map(value=>({value:String(value),label:`${value} minutes`}))}/></label><fieldset className="field field-span-2"><legend>Requested scope</legend><div className="support-scope-grid">{PRACTICE_SUPPORT_SCOPES.map(scope=><label className="custom-checkbox" key={scope}><input type="checkbox" checked={scopes.includes(scope)} onChange={()=>toggle(scope)}/><span>{practiceSupportScopeLabels[scope]}</span></label>)}</div></fieldset><label className="field field-span-2"><span>Reason the practice owner will see</span><textarea className="input" name="reason" minLength={10} rows={4} required/></label></div></div><div className="panel-actions"><button className="btn btn-primary" disabled={busy||!practiceId||!scopes.length}>Send approval request</button></div></form>
    <section className="card dashboard-card panel-card"><div className="panel-heading"><div><h2>Administration support requests</h2><p>Approval never creates permanent membership and automatically expires.</p></div></div><div className="record-stack">{requests.map(item=>{const active=item.status==="APPROVED"&&!item.revokedAt&&item.expiresAt&&new Date(item.expiresAt)>new Date();return <article className="record-row" key={item.id}><div><div className="record-row-title"><b>{item.practice}</b><StatusBadge value={item.revokedAt?"REVOKED":item.status}/></div><p>{item.reason}</p><small>{item.scopes.map(scope=>practiceSupportScopeLabels[scope]).join(" · ")} · {item.durationMinutes} minutes</small></div><div className="table-actions">{active&&<button className="btn btn-primary" disabled={busy} onClick={()=>act(item.id,"ENTER")}>Open scoped session</button>}{!item.revokedAt&&["PENDING","APPROVED"].includes(item.status)&&<button className="btn btn-light" disabled={busy} onClick={()=>act(item.id,"REVOKE")}>Revoke</button>}</div></article>})}{!requests.length&&<div className="dashboard-empty"><h3>No administration requests</h3><p>Create one only when a practice asks for help.</p></div>}</div></section>
  </>;
}
