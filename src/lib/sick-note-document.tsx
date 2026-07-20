import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { PracticeSetting, SickNote, User } from "@prisma/client";
import { DocumentBrand, DocumentSignature } from "@/lib/document-brand";

type Note = SickNote & { patient: { fullName: string; patientNumber: string; identityNumber: string | null }; doctor: Pick<User, "name"> };

const s = StyleSheet.create({
  page: { padding: 42, fontFamily: "Onest", fontSize: 9.5, color: "#18332d", lineHeight: 1.45 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: "#d9e3df" },
  headerBrand: { width: "40%" },
  practice: { width: "60%", marginTop: 6, fontSize: 7.5, lineHeight: 1.35, color: "#60736d", textAlign: "right" },
  eyebrow: { marginTop: 26, fontFamily: "Inter Tight", fontSize: 7.5, color: "#8c6526", letterSpacing: 1.1, fontWeight: 600 },
  titleRow: { marginTop: 6, minHeight: 30, flexDirection: "row", alignItems: "flex-end" },
  title: { fontFamily: "Inter Tight", fontSize: 23, lineHeight: 1.15, fontWeight: 700 },
  titleDescriptor: { marginLeft: 9, marginBottom: 4, fontSize: 7.5, lineHeight: 1, color: "#60736d", letterSpacing: .45 },
  number: { marginTop: 5, fontSize: 8.5, lineHeight: 1.3, color: "#60736d" },
  status: { marginTop: 12, padding: 8, backgroundColor: "#fff1d6", color: "#7a4b00", borderRadius: 4, fontWeight: 700 },
  grid: { marginTop: 20, flexDirection: "row", flexWrap: "wrap", borderWidth: 1, borderColor: "#d9e3df", borderRadius: 8 },
  cell: { width: "50%", padding: 10, borderBottomWidth: 1, borderBottomColor: "#e6eeeb" },
  label: { fontSize: 7, textTransform: "uppercase", letterSpacing: .8, color: "#60736d" },
  value: { marginTop: 3, fontSize: 10.5, fontWeight: 700 },
  section: { marginTop: 20 },
  sectionTitle: { fontFamily: "Inter Tight", fontSize: 12, fontWeight: 700, marginBottom: 6 },
  prose: { padding: 14, borderRadius: 7, backgroundColor: "#f4f8f6", fontSize: 10.5, lineHeight: 1.55 },
  footerRow: { marginTop: 26, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  verify: { width: 160, alignItems: "center" },
  qr: { width: 74, height: 74 },
  verifyTitle: { marginTop: 6, fontSize: 7.2, fontWeight: 700, color: "#18332d", textAlign: "center" },
  verifyMeta: { marginTop: 2, fontSize: 6.4, lineHeight: 1.35, color: "#60736d", textAlign: "center" },
  footer: { position: "absolute", left: 42, right: 42, bottom: 26, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#d9e3df", fontSize: 6.8, color: "#60736d", flexDirection: "row", justifyContent: "space-between" },
});

const displayDate = (value: Date) => new Intl.DateTimeFormat("en-NA", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(value);
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
const verificationHost = (value?: string) => value?.replace(/^https?:\/\//, "").split("/")[0] || "";

export function SickNoteDocument({ note, practice, qrDataUrl, verificationUrl }: { note: Note; practice: PracticeSetting; qrDataUrl?: string; verificationUrl?: string }) {
  return <Document title={`${note.certificateNumber} medical certificate`} author={practice.practiceName}>
    <Page size="A4" style={s.page}>
      <View style={s.header}>
        <View style={s.headerBrand}><DocumentBrand /></View>
        <Text style={s.practice}>{practice.practiceName}{"\n"}Practice no: {practice.practiceNumber}{"\n"}{practice.address}{"\n"}{practice.phone} · {practice.email}</Text>
      </View>
      <Text style={s.eyebrow}>OFFICIAL DOCUMENT</Text>
      <View style={s.titleRow} wrap={false}><Text style={s.title}>Medical certificate</Text><Text style={s.titleDescriptor}>Sick note</Text></View>
      <Text style={s.number}>{note.certificateNumber}</Text>
      {note.status === "REVOKED" && <Text style={s.status}>REVOKED — THIS CERTIFICATE IS NO LONGER VALID</Text>}
      {note.status === "DRAFT" && <Text style={s.status}>DRAFT PREVIEW — NOT VALID UNTIL ISSUED</Text>}
      <View style={s.grid}>
        <View style={s.cell}><Text style={s.label}>Patient</Text><Text style={s.value}>{note.patient.fullName}</Text></View>
        <View style={s.cell}><Text style={s.label}>Patient number</Text><Text style={s.value}>{note.patient.patientNumber}</Text></View>
        <View style={s.cell}><Text style={s.label}>Consultation date</Text><Text style={s.value}>{displayDate(note.consultationDate)}{note.consultationTime ? ` · ${note.consultationTime}` : ""}</Text></View>
        <View style={s.cell}><Text style={s.label}>Purpose</Text><Text style={s.value}>{label(note.purpose)}</Text></View>
        <View style={s.cell}><Text style={s.label}>Leave period</Text><Text style={s.value}>{displayDate(note.leaveFrom)} – {displayDate(note.leaveTo)}</Text></View>
        <View style={s.cell}><Text style={s.label}>Expected return</Text><Text style={s.value}>{displayDate(note.returnDate)}</Text></View>
        <View style={s.cell}><Text style={s.label}>Fitness status</Text><Text style={s.value}>{label(note.fitnessStatus)}</Text></View>
        <View style={s.cell}><Text style={s.label}>Issued</Text><Text style={s.value}>{note.issuedAt ? displayDate(note.issuedAt) : "Not issued"}</Text></View>
      </View>
      <View style={s.section}><Text style={s.sectionTitle}>Certification</Text><Text style={s.prose}>{note.certificateWording}</Text></View>
      {note.restrictions && <View style={s.section}><Text style={s.sectionTitle}>Temporary restrictions</Text><Text>{note.restrictions}</Text></View>}
      {note.diagnosisDisclosure === "CONSENTED" && note.diagnosisPlainText && <View style={s.section}><Text style={s.sectionTitle}>Diagnosis disclosed with patient consent</Text><Text>{note.diagnosisPlainText}</Text></View>}
      <View style={s.footerRow}>
        <DocumentSignature name={note.doctor.name} title={practice.signatureTitle} />
        <View style={s.verify}>
          {qrDataUrl && verificationUrl ? <>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- React PDF Image has no alt prop in its API. */}
          <Image src={qrDataUrl} style={s.qr} />
          <Text style={s.verifyTitle}>Scan to verify this sick note</Text>
          <Text style={s.verifyMeta}>{note.certificateNumber}{"\n"}{verificationHost(verificationUrl)}</Text>
          </> : <><Text style={s.verifyTitle}>Draft preview only</Text><Text style={s.verifyMeta}>No verification record has been issued.</Text></>}
        </View>
      </View>
      <View style={s.footer}><Text>{practice.practiceName} · {practice.registrationNumber}</Text><Text>Issued securely by Mondesa Health</Text></View>
    </Page>
  </Document>;
}
