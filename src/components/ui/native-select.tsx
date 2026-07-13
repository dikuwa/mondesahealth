"use client";

import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function NativeSelect({ className, children, disabled, ...props }, ref) {
    return <span className={cn("select-wrap", disabled && "is-disabled")}>
      <select ref={ref} className={cn("input native-select", className)} disabled={disabled} {...props}>
        {children}
      </select>
      <ChevronDown className="select-chevron" size={18} strokeWidth={2} aria-hidden="true" />
    </span>;
  },
);
