import { normalizePhone, validNamibianPhone } from "@/lib/utils";

export type PublicEmergencyContact = {
  id: string;
  label: string;
  phone: string;
  description: string | null;
  region: string | null;
  sortOrder: number;
  primary: boolean;
};

export function validEmergencyPhone(value: string) {
  return validNamibianPhone(value);
}

export function canonicalEmergencyPhone(value: string) {
  return normalizePhone(value);
}

export function orderEmergencyContacts<T extends { active: boolean; primary: boolean; sortOrder: number }>(contacts: T[]) {
  return contacts
    .filter((contact) => contact.active)
    .sort((a, b) => Number(b.primary) - Number(a.primary) || a.sortOrder - b.sortOrder);
}

export function primaryEmergencyContact<T extends { active: boolean; primary: boolean; sortOrder: number }>(contacts: T[]) {
  return orderEmergencyContacts(contacts)[0] ?? null;
}

export function emergencyMessage(contact: Pick<PublicEmergencyContact, "label" | "phone"> | null) {
  return contact
    ? `Your description may require urgent medical attention. Do not wait for an online appointment. Call ${contact.label} on ${contact.phone} or go to the nearest emergency facility.`
    : "Your description may require urgent medical attention. Do not wait for an online appointment. Contact your nearest emergency service or go to the nearest emergency facility.";
}

export const neutralEmergencyMessage =
  "For a medical emergency, contact your nearest emergency service or go to the nearest emergency facility.";
