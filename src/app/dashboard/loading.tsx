import { Loader2 } from "lucide-react";
export default function DashboardLoading(){return <div className="dashboard-loading" role="status"><Loader2 className="toast-spinner" size={26}/><div><b>Loading workspace</b><span>Fetching the latest practice records…</span></div></div>}
