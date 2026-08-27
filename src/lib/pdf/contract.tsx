import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

// Løst typet mot employment_contracts-raden (finnes ikke i generert Database-
// type ennå). Kun feltene PDF-en bruker.
export interface ContractPdfData {
  employee_name: string;
  stilling: string | null;
  ansettelsesform: string;
  stillingsprosent: number;
  arbeidssted: string | null;
  start_date: string | null;
  provetid_mnd: number;
  provetid_slutt: string | null;
  lonn_type: string;
  lonn_belop: number | null;
  oppsigelsestid_mnd: number;
  terms: Record<string, string> | null;
  employer_signed_at?: string | null;
  employer_signature_snapshot?: string | null;
  employee_signed_at?: string | null;
  employee_signed_name?: string | null;
  employee_signature_snapshot?: string | null;
  organisasjon?: string | null;
}

const ANSETTELSESFORM: Record<string, string> = {
  fast: "Fast ansettelse",
  midlertidig: "Midlertidig",
  vikariat: "Vikariat",
  laerling: "Lærling",
};

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, color: "#111111", lineHeight: 1.5 },
  h1: { fontSize: 18, marginBottom: 4, fontWeight: 700 },
  org: { fontSize: 11, color: "#666666", marginBottom: 20 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottom: "1px solid #E5E5E5",
  },
  label: { color: "#666666" },
  value: { fontWeight: 500 },
  sectionTitle: { fontSize: 13, marginTop: 20, marginBottom: 6, fontWeight: 700 },
  terms: { marginTop: 6, color: "#222222" },
  sigWrap: { flexDirection: "row", marginTop: 40, gap: 24 },
  sigBox: { flex: 1 },
  sigImg: { height: 60, marginBottom: 4, objectFit: "contain" },
  sigLine: { borderTop: "1px solid #111111", paddingTop: 4 },
  sigName: { fontSize: 10 },
  sigMeta: { fontSize: 9, color: "#666666" },
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export async function renderContractPdf(args: {
  contract: ContractPdfData;
}): Promise<Buffer> {
  const c = args.contract;
  const lonn =
    c.lonn_belop != null
      ? `${c.lonn_belop.toLocaleString("no-NO")} kr ${
          c.lonn_type === "timelonn" ? "per time" : "per år"
        }`
      : "—";

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>Arbeidsavtale</Text>
        {c.organisasjon ? <Text style={styles.org}>{c.organisasjon}</Text> : null}

        <Row label="Ansatt" value={c.employee_name} />
        <Row label="Stilling" value={c.stilling ?? "—"} />
        <Row
          label="Ansettelsesform"
          value={ANSETTELSESFORM[c.ansettelsesform] ?? c.ansettelsesform}
        />
        <Row label="Stillingsprosent" value={`${c.stillingsprosent} %`} />
        <Row label="Arbeidssted" value={c.arbeidssted ?? "—"} />
        <Row label="Tiltredelsesdato" value={c.start_date ?? "—"} />
        <Row
          label="Prøvetid"
          value={
            c.provetid_mnd > 0
              ? `${c.provetid_mnd} mnd (til ${c.provetid_slutt ?? "—"})`
              : "Ingen"
          }
        />
        <Row label="Lønn" value={lonn} />
        <Row label="Oppsigelsestid" value={`${c.oppsigelsestid_mnd} mnd`} />

        {c.terms?.tilleggsvilkaar ? (
          <View>
            <Text style={styles.sectionTitle}>Tilleggsvilkår</Text>
            <Text style={styles.terms}>{c.terms.tilleggsvilkaar}</Text>
          </View>
        ) : null}

        <View style={styles.sigWrap}>
          <View style={styles.sigBox}>
            {c.employer_signature_snapshot ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image style={styles.sigImg} src={c.employer_signature_snapshot} />
            ) : (
              <View style={styles.sigImg} />
            )}
            <View style={styles.sigLine}>
              <Text style={styles.sigName}>Arbeidsgiver</Text>
              {c.employer_signed_at ? (
                <Text style={styles.sigMeta}>
                  Signert {c.employer_signed_at.slice(0, 10)}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={styles.sigBox}>
            {c.employee_signature_snapshot ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image style={styles.sigImg} src={c.employee_signature_snapshot} />
            ) : (
              <View style={styles.sigImg} />
            )}
            <View style={styles.sigLine}>
              <Text style={styles.sigName}>
                {c.employee_signed_name ?? c.employee_name}
              </Text>
              {c.employee_signed_at ? (
                <Text style={styles.sigMeta}>
                  Signert {c.employee_signed_at.slice(0, 10)}
                </Text>
              ) : null}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );

  return renderToBuffer(doc);
}
