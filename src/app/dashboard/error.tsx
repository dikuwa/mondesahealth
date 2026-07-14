"use client";
import { AlertTriangle, RotateCcw } from "lucide-react";
export default function DashboardError({reset}:{error:Error&{digest?:string};reset:()=>void}){return <div className="card dashboard-error"><AlertTriangle size={28}/><h2>We could not load this page</h2><p>Your data was not changed. Check the connection and try again.</p><button className="btn btn-primary" onClick={reset}><RotateCcw size={17}/> Try again</button></div>}
