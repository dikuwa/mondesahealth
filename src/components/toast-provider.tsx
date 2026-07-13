"use client";

import { AlertCircle, CheckCircle2, Info, LoaderCircle, X } from "lucide-react";
import toast, { Toaster, ToastBar } from "react-hot-toast";

export function ToastProvider() {
  return <Toaster
    position="top-center"
    gutter={10}
    containerStyle={{ top: 18 }}
    toastOptions={{
      duration: 4200,
      style: {
        maxWidth: 460,
        padding: 0,
        borderRadius: 14,
        border: "1px solid #dce4df",
        background: "#ffffff",
        color: "#18332d",
        boxShadow: "0 18px 48px rgba(24,51,45,.18)",
      },
      success: { duration: 3600 },
      error: { duration: 5600 },
    }}
  >
    {(item) => <ToastBar toast={item}>
      {({ message }) => <div className="toast-content" data-type={item.type}>
        <span className="toast-icon" aria-hidden="true">
          {item.type === "success" ? <CheckCircle2 size={20}/> : item.type === "error" ? <AlertCircle size={20}/> : item.type === "loading" ? <LoaderCircle className="toast-spinner" size={20}/> : <Info size={20}/>}
        </span>
        <div className="toast-message">{message}</div>
        {item.type !== "loading" && <button className="toast-close" type="button" onClick={() => toast.dismiss(item.id)} aria-label="Dismiss notification"><X size={17}/></button>}
      </div>}
    </ToastBar>}
  </Toaster>;
}
