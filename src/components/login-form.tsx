"use client";

import { useState } from "react";
import { Loader2, LockKeyhole } from "lucide-react";
import toast from "react-hot-toast";

const notices:Record<string,string>={
  "session-expired":"Your session expired. Please sign in again.",
  "password-changed":"Your password was changed. Please sign in again.",
};

export function LoginForm({reason}:{reason?:string}){
  const[loading,setLoading]=useState(false);
  const notice=reason?notices[reason]:undefined;

  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    setLoading(true);
    const toastId=toast.loading("Signing you in…");
    try{
      const form=new FormData(event.currentTarget);
      const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:form.get("email"),password:form.get("password")})});
      const data=await response.json();
      if(!response.ok)throw new Error(data.error);
      toast.success("Welcome back",{id:toastId});
      window.location.assign(data.destination || "/dashboard");
    }catch(error){
      toast.error(error instanceof Error?error.message:"Could not sign in",{id:toastId});
    }finally{setLoading(false)}
  }

  return <main id="main-content" style={{minHeight:"75vh",display:"grid",placeItems:"center",background:"#f7f4ed",padding:30}}>
    <form method="post" action="/api/auth/login" onSubmit={submit} className="card login-card" style={{width:"min(440px,100%)",padding:38}}>
      <span style={{width:48,height:48,borderRadius:14,display:"grid",placeItems:"center",background:"#dcece6"}}><LockKeyhole/></span>
      <h1 className="display" style={{fontSize:42,margin:"22px 0 8px"}}>Staff sign in</h1>
      <p style={{color:"#63756f",fontSize:14,marginBottom:25}}>Access is restricted to authorised Mondesa Health staff.</p>
      {notice&&<p className="notice-warning" role="status">{notice}</p>}
      <div className="field"><label htmlFor="staff-email">Email</label><input id="staff-email" name="email" type="email" autoComplete="username" className="input" required/></div>
      <div className="field" style={{marginTop:16}}><label htmlFor="staff-password">Password</label><input id="staff-password" name="password" type="password" autoComplete="current-password" className="input" required/></div>
      <button className="btn btn-primary" disabled={loading} style={{width:"100%",marginTop:24}}>{loading?<Loader2 className="toast-spinner" size={18}/>:null} Sign in</button>
    </form>
  </main>;
}
