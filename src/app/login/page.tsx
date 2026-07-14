import { LoginForm } from "@/components/login-form";

export default async function LoginPage({searchParams}:{searchParams:Promise<{reason?:string}>}){
  const {reason}=await searchParams;
  return <LoginForm reason={reason}/>;
}
