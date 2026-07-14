"use client";

import { Children, isValidElement, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from "react";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";

type Props=Omit<SelectHTMLAttributes<HTMLSelectElement>,"onChange">&{children:ReactNode;onChange?:(event:ChangeEvent<HTMLSelectElement>)=>void};
function text(node:ReactNode):string{return Children.toArray(node).map(item=>typeof item==="string"||typeof item==="number"?String(item):isValidElement(item)?text((item.props as {children?:ReactNode}).children):"").join("")}
export function NativeSelect({children,value,defaultValue,onChange,disabled,name,id,"aria-label":ariaLabel,className}:Props){
  const options=Children.toArray(children).filter(isValidElement).map(child=>{const props=child.props as {value?:string|number;children?:ReactNode;disabled?:boolean};const label=text(props.children);return{value:String(props.value??label),label,disabled:props.disabled} satisfies SelectOption});
  const current=String(value??defaultValue??options[0]?.value??"");
  return <CustomSelect id={id} name={name} ariaLabel={ariaLabel} className={className} value={current} options={options} disabled={disabled} onChange={next=>onChange?.({target:{value:next}} as ChangeEvent<HTMLSelectElement>)}/>;
}
