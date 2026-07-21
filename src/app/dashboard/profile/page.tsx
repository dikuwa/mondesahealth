import { PageHeading } from "@/components/dashboard";
import { ProfileForm } from "@/components/profile-form";
import { getPracticeSession } from "@/lib/auth";
import { redirect } from "next/navigation";
export default async function Profile(){const session=await getPracticeSession();if(!session)redirect("/login");return <><PageHeading eyebrow="Your account" title="Profile & security"/><ProfileForm user={session}/></>}
