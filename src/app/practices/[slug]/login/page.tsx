import { notFound } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { db } from "@/lib/db";

export default async function PracticeLoginPage({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{reason?:string}>}){
  const [{slug},{reason}]=await Promise.all([params,searchParams]);
  const practice=await db.practice.findUnique({where:{slug},select:{name:true}});
  if(!practice)notFound();
  return <LoginForm portal="PRACTICE" practiceSlug={slug} practiceName={practice.name} reason={reason}/>;
}
