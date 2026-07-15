import Link from "next/link";
import { ArrowUpRight, CalendarPlus, Plus, ReceiptText, UserPlus } from "lucide-react";
export function PageHeading({eyebrow,title,action}:{eyebrow:string,title:string,action?:React.ReactNode}){return <div className="dashboard-page-heading"><div><div className="eyebrow">{eyebrow}</div><h1 className="dashboard-page-title">{title}</h1></div>{action}</div>}
export function Stat({label,value,note}:{label:string,value:string|number,note?:string}){return <div className="card dashboard-stat"><span className="dashboard-stat-label">{label}</span><b className="dashboard-stat-value">{value}</b>{note&&<small className="dashboard-stat-note">{note}</small>}</div>}
export function Status({value}:{value:string}){const colors:valueColor={["CONFIRMED"]:"#e0f2e8",["COMPLETED"]:"#dcebec",["CANCELLED"]:"#f6e3e0",["NEW_REQUEST"]:"#fff0d5",["DRAFT"]:"#ece9e2",["READY_FOR_REVIEW"]:"#e4e8f6"};return <span className="dashboard-status" style={{background:colors[value]||"#edf1ef"}}>{value.replaceAll("_"," ")}</span>}
type valueColor=Record<string,string>;
export function Empty({title,text}:{title:string,text:string}){return <div className="dashboard-inline-empty"><b>{title}</b><p>{text}</p></div>}
export const quick=[{label:"Add appointment",href:"/dashboard/appointments",icon:CalendarPlus},{label:"Add patient",href:"/dashboard/patients",icon:UserPlus},{label:"Record payment",href:"/dashboard/finance",icon:ReceiptText},{label:"Prepare claim",href:"/dashboard/claims",icon:Plus}];
export function QuickActions(){return <div className="dashboard-quick-actions">{quick.map(({label,href,icon:Icon})=><Link key={label} className="btn btn-light dashboard-quick-action" href={href}><Icon size={15}/>{label}<ArrowUpRight size={13}/></Link>)}</div>}
