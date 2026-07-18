import { cn } from "@/lib/utils";

const labelMap: Record<string, string> = {
  ACKNOWLEDGED: "Accepted",
  COMING_SOON: "Coming Soon",
  NEEDS_INFORMATION: "Needs information",
  PARTIALLY_PAID: "Partially paid",
  READY_TO_SUBMIT: "Ready",
  RESUBMISSION_REQUIRED: "Resubmission required",
};

const success = new Set(["ACTIVE", "ENABLED", "PAID", "COMPLETE", "COMPLETED", "CURRENT", "READY", "READY_TO_SUBMIT", "ACKNOWLEDGED"]);
const info = new Set(["PUBLISHED", "SUBMITTED", "BATCHED", "ISSUED"]);
const warning = new Set(["DRAFT", "FUTURE", "NEEDS_INFORMATION", "INCOMPLETE", "PARTIALLY_PAID", "SETUP_NEEDED", "BASELINE_REFERENCE"]);
const danger = new Set(["COMING_SOON", "REJECTED", "RESUBMISSION_REQUIRED", "FAILED", "ERROR"]);
const neutral = new Set(["DISABLED", "HIDDEN", "PRIVATE", "HISTORICAL"]);

export type StatusTone = "success" | "info" | "warning" | "danger" | "neutral";

export function statusLabel(value: string) {
  return labelMap[value] || value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function statusTone(value: string): StatusTone {
  const key = value.trim().toUpperCase().replaceAll(" ", "_").replaceAll("-", "_");
  if (success.has(key)) return "success";
  if (info.has(key)) return "info";
  if (warning.has(key)) return "warning";
  if (danger.has(key)) return "danger";
  if (neutral.has(key)) return "neutral";
  return "neutral";
}

export function StatusBadge({ value, label, tone, className }: { value: string; label?: string; tone?: StatusTone; className?: string }) {
  return <span className={cn("status-badge", className)} data-tone={tone || statusTone(value)}>{label || statusLabel(value)}</span>;
}
