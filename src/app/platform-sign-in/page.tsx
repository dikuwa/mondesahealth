import { LoginForm } from "@/components/login-form";

export default async function PlatformLoginPage({searchParams}:{searchParams:Promise<{reason?:string}>}){
  const {reason}=await searchParams;
  return <LoginForm portal="PLATFORM" reason={reason}/>;
}
