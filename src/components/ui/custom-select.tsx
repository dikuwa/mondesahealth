"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption={value:string;label:string;disabled?:boolean};
export function CustomSelect({value,onChange,options,placeholder="Select",disabled=false,name,id,ariaLabel,className}:{value:string;onChange:(value:string)=>void;options:SelectOption[];placeholder?:string;disabled?:boolean;name?:string;id?:string;ariaLabel?:string;className?:string}){
  const generated=useId(),controlId=id||generated;const[open,setOpen]=useState(false);const[index,setIndex]=useState(Math.max(0,options.findIndex(o=>o.value===value)));const root=useRef<HTMLDivElement>(null);
  useEffect(()=>{const close=(event:MouseEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close)},[]);
  const selected=options.find(option=>option.value===value);
  function choose(option:SelectOption){if(option.disabled)return;onChange(option.value);setOpen(false)}
  function keyDown(event:React.KeyboardEvent){if(disabled)return;if(event.key==="Escape")setOpen(false);if(event.key==="Enter"||event.key===" "){event.preventDefault();if(open)choose(options[index]);else setOpen(true)}if(["ArrowDown","ArrowUp"].includes(event.key)){event.preventDefault();setOpen(true);let next=index;do{next=(next+(event.key==="ArrowDown"?1:-1)+options.length)%options.length}while(options[next]?.disabled&&next!==index);setIndex(next)}}
  return <div className={cn("custom-select",open&&"is-open",disabled&&"is-disabled",className)} ref={root}>{name&&<input type="hidden" name={name} value={value}/>}<button id={controlId} type="button" className="custom-select-trigger input" disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={()=>setOpen(!open)} onKeyDown={keyDown}><span className={!selected?"is-placeholder":undefined}>{selected?.label||placeholder}</span><ChevronDown size={18}/></button>{open&&<div className="custom-select-menu" role="listbox" aria-labelledby={controlId}>{options.map((option,optionIndex)=><button type="button" role="option" aria-selected={option.value===value} disabled={option.disabled} className={cn("custom-select-option",optionIndex===index&&"is-focused")} key={option.value} onMouseEnter={()=>setIndex(optionIndex)} onClick={()=>choose(option)}><span>{option.label}</span>{option.value===value&&<Check size={17}/>}</button>)}</div>}</div>
}
