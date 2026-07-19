import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

const types = ["MEDICAL_AID_CARD", "CONSENT_FORM", "REFERRAL", "PRE_AUTHORISATION", "CLINICAL_SUPPORT", "SUBMISSION_PROOF", "REMITTANCE", "REJECTION_NOTICE", "OTHER"] as const;
export async function POST(request: Request) {
  const form = await request.formData(), file = form.get("file"), parsed = z.object({ claimId: z.string().optional(), batchId: z.string().optional(), patientMedicalAidId: z.string().optional(), attachmentType: z.enum(types) }).refine((value) => [value.claimId, value.batchId, value.patientMedicalAidId].filter(Boolean).length === 1, { message: "Choose exactly one attachment target." }).safeParse(Object.fromEntries(form));
  if (!(file instanceof File) || !parsed.success) return NextResponse.json({ error: "Choose a file and attachment type." }, { status: 400 });
  const permission = parsed.data.patientMedicalAidId ? "MANAGE_MEMBERSHIPS" : parsed.data.batchId ? "MANAGE_CLAIM_BATCHES" : "EDIT_CLAIMS";
  const session = await requirePermission(permission); if (!session) return NextResponse.json({ error: "You do not have permission to upload this file." }, { status: 403 });
  if (file.size > 10 * 1024 * 1024 || !["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return NextResponse.json({ error: "Use a PDF, JPG or PNG smaller than 10 MB." }, { status: 400 });
  // Verify the target exists before storing the medical document. Besides producing a
  // useful 404, this prevents arbitrary foreign keys from being attached by a caller.
  const target = parsed.data.claimId
    ? await db.claim.findUnique({ where: { id: parsed.data.claimId }, select: { id: true } })
    : parsed.data.batchId
      ? await db.claimBatch.findUnique({ where: { id: parsed.data.batchId }, select: { id: true } })
      : await db.patientMedicalAid.findUnique({ where: { id: parsed.data.patientMedicalAidId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Attachment target was not found." }, { status: 404 });
  const limitMb=Number(process.env.ATTACHMENT_STORAGE_LIMIT_MB||1024);if(!Number.isFinite(limitMb)||limitMb<=0)return NextResponse.json({error:"Attachment storage is not configured safely."},{status:500});
  const data=Buffer.from(await file.arrayBuffer());let attachment;
  try{attachment=await db.$transaction(async tx=>{const usage=await tx.claimAttachment.aggregate({_sum:{fileSize:true}});if((usage._sum.fileSize||0)+file.size>limitMb*1024*1024)throw new Error("QUOTA");return tx.claimAttachment.create({ data: { ...parsed.data, filename: file.name, mimeType: file.type, fileSize: file.size, data, uploadedByUserId: session.id } })},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable})}catch(error){if(error instanceof Error&&error.message==="QUOTA")return NextResponse.json({error:`Protected attachment storage limit (${limitMb} MB) would be exceeded.`},{status:413});if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2034")return NextResponse.json({error:"Storage usage changed during upload. Try again."},{status:409});return NextResponse.json({error:"The attachment could not be stored."},{status:500})}
  await db.activityLog.create({ data: { userId: session.id, action: parsed.data.attachmentType === "SUBMISSION_PROOF" ? "SUBMISSION_PROOF_UPLOADED" : "CLAIM_ATTACHMENT_UPLOADED", entityType: "ClaimAttachment", entityId: attachment.id, summary: `${parsed.data.attachmentType.replaceAll("_", " ").toLowerCase()} uploaded` } }); return NextResponse.json({ id: attachment.id, filename: attachment.filename });
}

export async function GET(request: Request) {
  const session = await requirePermission("VIEW_CLAIMS"); if (!session) return NextResponse.json({ error: "You do not have permission to view claim files." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id"); if (!id) return NextResponse.json({ error: "Attachment is required." }, { status: 400 });
  const attachment = await db.claimAttachment.findUnique({ where: { id } }); if (!attachment) return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  await db.activityLog.create({ data: { userId: session.id, action: "CLAIM_ATTACHMENT_VIEWED", entityType: "ClaimAttachment", entityId: id, summary: "Protected claim attachment viewed" } });
  const safeFilename = attachment.filename.replace(/[\r\n"\\]/g, "_");
  return new NextResponse(attachment.data, { headers: { "Content-Type": attachment.mimeType, "Content-Disposition": `inline; filename="${safeFilename}"`, "Cache-Control": "private, no-store" } });
}
