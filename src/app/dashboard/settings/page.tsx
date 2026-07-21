import { PageHeading } from "@/components/dashboard";
import { db } from "@/lib/db";
import { SettingsManager } from "@/components/settings-manager";
import { getSession } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function Settings() {
  const session = await getSession();
  if (!session) return null;
  const [s, funds, claimStorage, intakeStorage, emergencyContacts] =
    await Promise.all([
      db.practiceSetting.findUnique({
        where: { practiceId: session.practiceId },
      }),
      db.medicalAid.findMany({ orderBy: { sortOrder: "asc" } }),
      db.claimAttachment.aggregate({
        _count: { _all: true },
        _sum: { fileSize: true },
        where: { claim: { practiceId: session.practiceId } },
      }),
      db.patientIntakeImage.aggregate({
        _count: { _all: true },
        _sum: { fileSize: true },
        where: { intake: { practiceId: session.practiceId } },
      }),
      db.emergencyContact.findMany({
        where: { practiceId: session.practiceId },
        orderBy: [{ primary: "desc" }, { sortOrder: "asc" }, { label: "asc" }],
      }),
    ]);
  if (!s) return null;
  return (
    <>
      <PageHeading eyebrow="Practice configuration" title="Settings" />
      <SettingsManager
        setting={{
          practiceName: s.practiceName,
          doctorName: s.doctorName,
          practiceNumber: s.practiceNumber,
          registrationNumber: s.registrationNumber,
          phone: s.phone,
          whatsapp: s.whatsapp,
          email: s.email,
          address: s.address,
          currency: s.currency,
          signatureName: s.signatureName,
          signatureTitle: s.signatureTitle,
          vatEnabled: s.vatEnabled,
          tagline: s.tagline,
          publicDescription: s.publicDescription,
          locationNote: s.locationNote,
          mapsUrl: s.mapsUrl,
          mapLatitude: s.mapLatitude,
          mapLongitude: s.mapLongitude,
          publicHours: s.publicHours,
          showEmail: s.showEmail,
          showWhatsapp: s.showWhatsapp,
          claimContactName: s.claimContactName,
          claimPhone: s.claimPhone,
          claimEmail: s.claimEmail,
          claimPostalAddress: s.claimPostalAddress,
          consentWording: s.consentWording,
          aiIntakeEnabled: s.aiIntakeEnabled,
          aiImageEnabled: s.aiImageEnabled,
        }}
        funds={funds.map((f) => ({
          id: f.id,
          name: f.name,
          abbreviation: f.abbreviation,
          administrator: f.administrator,
          public: f.public,
          active: f.active,
        }))}
        isOwner={session.role === "OWNER"}
        storage={{
          count: claimStorage._count._all + intakeStorage._count._all,
          bytes:
            (claimStorage._sum.fileSize || 0) +
            (intakeStorage._sum.fileSize || 0),
          limitMb: Number(process.env.ATTACHMENT_STORAGE_LIMIT_MB || 1024),
        }}
        emergencyContacts={emergencyContacts.map(
          ({
            id,
            label,
            phone,
            description,
            region,
            sortOrder,
            active,
            primary,
          }) => ({
            id,
            label,
            phone,
            description,
            region,
            sortOrder,
            active,
            primary,
          }),
        )}
      />
    </>
  );
}
