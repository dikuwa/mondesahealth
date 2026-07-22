export function normalizePracticeHostname(value:string){
  const input=value.trim().toLowerCase().replace(/^https?:\/\//,"").split("/")[0].replace(/\.$/,"");
  if(!/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(input))return null;
  return input;
}

export function isPlatformHostname(hostname:string){
  const configured=process.env.NEXT_PUBLIC_APP_URL?new URL(process.env.NEXT_PUBLIC_APP_URL).hostname.toLowerCase():null;
  return hostname==="localhost"||hostname.endsWith(".localhost")||hostname.endsWith(".vercel.app")||hostname===configured;
}
