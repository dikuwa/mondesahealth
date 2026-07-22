"use client";

import { CustomSelect } from "@/components/ui/custom-select";
import { PRACTICE_TYPE_OPTIONS } from "@/lib/practice-registration-options";

type RegistrationFieldNames = {
  practiceName: string;
  practiceType: string;
  ownerName: string;
  email: string;
  phone: string;
  registrationNumber: string;
  town: string;
  region: string;
};

const publicNames: RegistrationFieldNames = {
  practiceName: "practiceName",
  practiceType: "practiceType",
  ownerName: "ownerName",
  email: "email",
  phone: "phone",
  registrationNumber: "registrationNumber",
  town: "town",
  region: "region",
};

const platformNames: RegistrationFieldNames = {
  practiceName: "name",
  practiceType: "type",
  ownerName: "ownerName",
  email: "ownerEmail",
  phone: "phone",
  registrationNumber: "registrationNumber",
  town: "town",
  region: "region",
};

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <span>{children}{required && <> <b className="required-marker" aria-hidden="true">*</b></>}</span>;
}

export function PracticeRegistrationFields({
  context,
  practiceType,
  onPracticeTypeChange,
}: {
  context: "public" | "platform";
  practiceType: string;
  onPracticeTypeChange: (value: string) => void;
}) {
  const names = context === "public" ? publicNames : platformNames;
  return <>
    <label className="field">
      <Label required>Practice name</Label>
      <input className="input" name={names.practiceName} autoComplete="organization" placeholder="e.g. Coastal Family Practice" required />
    </label>
    <label className="field">
      <Label required>Practice type</Label>
      <CustomSelect name={names.practiceType} value={practiceType} onChange={onPracticeTypeChange} options={[{ value: "", label: "Select practice type", disabled: true }, ...PRACTICE_TYPE_OPTIONS]} ariaLabel="Practice type" />
    </label>
    <label className="field">
      <Label required>Primary owner name</Label>
      <input className="input" name={names.ownerName} autoComplete="name" placeholder="Full name" required />
    </label>
    <label className="field">
      <Label required>Owner email</Label>
      <input className="input" name={names.email} type="email" autoComplete="email" placeholder="owner@practice.com" required />
    </label>
    <label className="field">
      <Label required>Phone number</Label>
      <input className="input" name={names.phone} type="tel" autoComplete="tel" placeholder="e.g. +264 81 000 0000" required />
    </label>
    <label className="field">
      <Label>Practice registration number</Label>
      <input className="input" name={names.registrationNumber} placeholder="Optional business or practice number" />
    </label>
    <label className="field">
      <Label required>Town or city</Label>
      <input className="input" name={names.town} autoComplete="address-level2" placeholder="e.g. Swakopmund" required />
    </label>
    <label className="field">
      <Label required>Region</Label>
      <input className="input" name={names.region} autoComplete="address-level1" placeholder="e.g. Erongo" required />
    </label>
  </>;
}
