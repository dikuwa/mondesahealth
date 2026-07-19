import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Claim, Invoice, Patient, Payment, PracticeSetting, Receipt } from "@prisma/client";

type ReceiptData = Receipt & { payment: Payment & { patient: Patient; invoice: Invoice | null; claim: Claim | null } };
const styles = StyleSheet.create({ page: { fontSize: 10, padding: 42, color: "#18332d" }, header: { borderBottomWidth: 1, borderBottomColor: "#cbd7d1", paddingBottom: 15 }, title: { fontSize: 25, marginTop: 22 }, block: { marginTop: 18, padding: 14, backgroundColor: "#f3f6f4" }, row: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 }, footer: { position: "absolute", bottom: 35, left: 42, right: 42, borderTopWidth: 1, borderTopColor: "#dce4df", paddingTop: 9, color: "#647871" } });

export function ReceiptDocument({ receipt, practice }: { receipt: ReceiptData; practice: PracticeSetting }) {
  const payment = receipt.payment;
  return <Document title={`Receipt ${receipt.number}`} author={practice.practiceName}><Page size="A4" style={styles.page}>
    <View style={styles.header}><Text style={{ fontSize: 16 }}>{practice.practiceName}</Text><Text>{practice.doctorName}</Text><Text>Practice no: {practice.practiceNumber} · Registration no: {practice.registrationNumber}</Text><Text>{practice.address} · {practice.phone} · {practice.email}</Text></View>
    <Text style={styles.title}>RECEIPT</Text><Text>{receipt.number} · Issued {receipt.issuedAt.toLocaleDateString("en-NA")}</Text>
    <View style={styles.block}><Text>Received from</Text><Text style={{ fontSize: 14, marginTop: 5 }}>{payment.patient.fullName}</Text><Text>{payment.patient.patientNumber}</Text></View>
    <View style={{ marginTop: 18 }}><View style={styles.row}><Text>Payment reference</Text><Text>{payment.reference}</Text></View><View style={styles.row}><Text>Invoice / claim</Text><Text>{payment.invoice?.number || payment.claim?.claimNumber || "—"}</Text></View><View style={styles.row}><Text>Payer</Text><Text>{payment.payer.replaceAll("_", " ")}</Text></View><View style={styles.row}><Text>Method</Text><Text>{payment.method.replaceAll("_", " ")}</Text></View><View style={[styles.row, { borderTopWidth: 1, marginTop: 14, paddingTop: 12, fontSize: 16 }]}><Text>Amount received</Text><Text>{practice.currency} {payment.amount.toFixed(2)}</Text></View></View>
    <View style={styles.footer}><Text>{practice.signatureName} · {practice.signatureTitle}</Text><Text>This receipt confirms a payment recorded by the practice management system.</Text></View>
  </Page></Document>;
}
