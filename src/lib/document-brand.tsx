import path from "node:path";
import { Font, Image, StyleSheet, Text, View } from "@react-pdf/renderer";

const onestPath = path.join(process.cwd(), "public/fonts/Onest-Variable.ttf");
const interTightSemiBoldPath = path.join(process.cwd(), "public/fonts/InterTight-SemiBold.ttf");
const interTightBoldPath = path.join(process.cwd(), "public/fonts/InterTight-Bold.ttf");
const alluraPath = path.join(process.cwd(), "public/fonts/Allura-Regular.ttf");
const markPath = path.join(process.cwd(), "public/images/mondesa-mark.svg");

Font.register({ family: "Onest", fonts: [{ src: onestPath, fontWeight: 400 }, { src: onestPath, fontWeight: 700 }] });
Font.register({ family: "Inter Tight", fonts: [{ src: interTightSemiBoldPath, fontWeight: 600 }, { src: interTightBoldPath, fontWeight: 700 }] });
Font.register({ family: "Allura", src: alluraPath });

const styles = StyleSheet.create({
  logo: { flexDirection: "row", alignItems: "center", gap: 9 },
  mark: { width: 41, height: 41 },
  wordmark: { gap: 0 },
  brandLine: { fontFamily: "Inter Tight", fontSize: 9.8, fontWeight: 700, lineHeight: .9, letterSpacing: .15, color: "#18332d" },
  brandHealth: { color: "#8c6526" },
  brandSub: { marginTop: 2.7, fontFamily: "Inter Tight", fontSize: 4.7, fontWeight: 600, letterSpacing: 1.08, lineHeight: 1, color: "#60736d" },
  signatureBlock: { width: 180 },
  signatureLabel: { fontFamily: "Onest", fontSize: 8.5, color: "#18332d" },
  signatureName: { marginTop: 8, marginBottom: 7, fontFamily: "Allura", fontSize: 19, letterSpacing: -.55, lineHeight: 1.08, color: "#18332d", transform: "rotate(-3deg)" },
  signatureTitle: { fontFamily: "Onest", fontSize: 8, lineHeight: 1.2, color: "#526a62" },
});

export function DocumentBrand() {
  return (
    <View style={styles.logo}>
      {/* eslint-disable-next-line jsx-a11y/alt-text -- React PDF Image has no alt prop in its type/API. */}
      <Image src={markPath} style={styles.mark} />
      <View style={styles.wordmark}>
        <Text style={styles.brandLine}>MONDESA</Text>
        <Text style={[styles.brandLine, styles.brandHealth]}>HEALTH</Text>
        <Text style={styles.brandSub}>POLYCLINIC</Text>
      </View>
    </View>
  );
}

export function DocumentSignature({ name, title }: { name: string; title: string }) {
  return (
    <View style={styles.signatureBlock} wrap={false}>
      <Text style={styles.signatureLabel}>Authorised signatory</Text>
      <Text style={styles.signatureName}>{name}</Text>
      <Text style={styles.signatureTitle}>{title}</Text>
    </View>
  );
}
