import { redirect } from "next/navigation";
import { PageHeading } from "@/components/dashboard";
import { ProfileForm } from "@/components/profile-form";
import { requirePlatformOwner } from "@/lib/auth";

export default async function PlatformProfile() {
  const session = await requirePlatformOwner();
  if (!session) redirect("/login");
  return <><PageHeading eyebrow="Platform account" title="Profile & security" /><ProfileForm user={session} /></>;
}
