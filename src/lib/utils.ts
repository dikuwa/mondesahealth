import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("264")) return `+${digits}`;
  if (digits.startsWith("0")) return `+264${digits.slice(1)}`;
  return `+264${digits}`;
}

export function validNamibianPhone(value: string) {
  return /^(?:\+264|264|0)(?:6\d|8\d)\d{6,7}$/.test(value.replace(/[\s()-]/g, ""));
}

export function money(value: number) {
  return new Intl.NumberFormat("en-NA", { style: "currency", currency: "NAD" }).format(value);
}

export function mask(value?: string | null) {
  if (!value) return "—";
  return `${"•".repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
}

export function ref(prefix: string) {
  const now = new Date();
  return `${prefix}-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
}
