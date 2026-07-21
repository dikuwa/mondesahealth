import { PageHeading, Stat } from "@/components/dashboard";
import { FinanceManager } from "@/components/finance-manager";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { money } from "@/lib/utils";
export const dynamic = "force-dynamic";
export default async function Finance() {
  const session = await getSession();
  if (!session) return null;
  const [invoices, patients] = await Promise.all([
    db.invoice.findMany({
      where: { practiceId: session.practiceId },
      include: {
        patient: true,
        payments: { include: { receipt: true }, orderBy: { paidAt: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.patient.findMany({
      where: { practiceId: session.practiceId, archivedAt: null },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);
  const active = invoices.filter((i) => i.status !== "VOID"),
    total = active.reduce((n, i) => n + i.total, 0),
    paid = active.reduce((n, i) => n + i.patientPaid + i.medicalAidPaid, 0);
  return (
    <>
      <PageHeading eyebrow="Billing & payments" title="Finance" />
      <div className="dashboard-stats" style={{ marginBottom: 18 }}>
        <Stat label="Total invoiced" value={money(total)} />
        <Stat label="Payments received" value={money(paid)} />
        <Stat
          label="Patient outstanding"
          value={money(
            active.reduce(
              (n, i) =>
                n + Math.max(0, i.patientResponsibility - i.patientPaid),
              0,
            ),
          )}
        />
        <Stat
          label="Medical aid outstanding"
          value={money(
            active.reduce(
              (n, i) =>
                n + Math.max(0, i.medicalAidResponsibility - i.medicalAidPaid),
              0,
            ),
          )}
        />
      </div>
      <FinanceManager
        patients={patients}
        invoices={invoices.map((i) => ({
          id: i.id,
          number: i.number,
          patient: i.patient.fullName,
          total: i.total,
          paid: i.patientPaid + i.medicalAidPaid,
          status: i.status,
          patientPhone: i.patient.phone,
          patientWhatsapp: i.patient.whatsapp,
          patientEmail: i.patient.email,
          receipt: i.payments.find((p) => p.receipt)?.receipt || null,
        }))}
      />
    </>
  );
}
