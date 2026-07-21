import type { Prisma } from "@prisma/client";

export function activityWhere(params: URLSearchParams, practiceId: string): Prisma.ActivityLogWhereInput {
  const q=params.get("q")?.trim(),action=params.get("action")?.trim(),userId=params.get("userId")?.trim(),from=params.get("from"),to=params.get("to");
  return { practiceId, ...(q?{OR:[{summary:{contains:q,mode:"insensitive"}},{action:{contains:q,mode:"insensitive"}},{entityType:{contains:q,mode:"insensitive"}}]}:{}),...(action?{action}:{}),...(userId?{userId}:{}),...(from||to?{createdAt:{...(from?{gte:new Date(`${from}T00:00:00`)}:{}),...(to?{lte:new Date(`${to}T23:59:59.999`)}:{})}}:{}) };
}
