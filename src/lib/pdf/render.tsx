import fs from "fs";
import path from "path";
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type {
  DocumentRow,
  Profile,
  Project,
  AppSettings,
} from "@/lib/types/database";
import { getTemplate } from "@/lib/document-templates";
import type {
  AnvendteNormerValue,
  ContactSubformValue,
  FieldDef,
  PersonItem,
  RiskAssessmentResponse,
  RiskColumn,
  RiskItem,
  RiskLevel,
  RiskRow,
  ScopeSubformValue,
  YnaMeasurementResponse,
  YnaResponse,
} from "@/lib/document-templates/types";

const SECTION_BG = "#F4F4F4";
const BORDER = "#D0D0D0";
const TEXT_DARK = "#111111";
const TEXT_MUTED = "#666666";
const RISK_GREEN = "#1F9D55";
const RISK_YELLOW = "#D49A14";
const RISK_RED = "#D43831";

// Lager logo-data-URL én gang
let cachedLogo: string | null = null;
function getLogoDataUrl(): string | null {
  if (cachedLogo !== null) return cachedLogo;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo-dark.png");
    const buf = fs.readFileSync(logoPath);
    cachedLogo = `data:image/png;base64,${buf.toString("base64")}`;
    return cachedLogo;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 110,
    paddingBottom: 36,
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: TEXT_DARK,
  },
  // Fixed header
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 28,
    paddingLeft: 40,
    paddingRight: 40,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  logo: { width: 130, height: 30, objectFit: "contain" },
  brandText: { fontSize: 22, fontWeight: 700, color: TEXT_DARK, letterSpacing: 1 },
  brandSub: { fontSize: 7, color: TEXT_MUTED, marginTop: 2 },
  companyInfo: { alignItems: "flex-end" },
  companyLine: { fontSize: 8, color: TEXT_DARK, lineHeight: 1.35 },

  // Footer
  footer: {
    position: "absolute",
    bottom: 18,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#AAA",
    textAlign: "center",
  },

  // Title block
  titleBlock: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 700, color: TEXT_DARK, marginBottom: 6 },
  description: { fontSize: 9, color: TEXT_DARK, lineHeight: 1.45 },

  // Meta two-column (Skjemadetaljer / Statistikk)
  metaRow: { flexDirection: "row", gap: 30, marginBottom: 18 },
  metaCol: { flex: 1 },
  metaColTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: TEXT_DARK,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: "row",
    fontSize: 8,
    marginBottom: 2,
  },
  metaLabel: { width: 110, color: TEXT_DARK },
  metaValue: { flex: 1, color: TEXT_DARK },

  // Section
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: TEXT_DARK,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 8,
    color: TEXT_MUTED,
    fontStyle: "italic",
    marginBottom: 6,
  },

  // Question row
  questionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: 8,
    gap: 12,
  },
  questionLabel: {
    flex: 1,
    fontSize: 9,
    fontWeight: 700,
    color: TEXT_DARK,
    lineHeight: 1.35,
  },
  questionDescription: {
    fontSize: 8,
    color: TEXT_MUTED,
    marginTop: 2,
    lineHeight: 1.35,
  },
  questionAnswerLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: TEXT_DARK,
    marginTop: 6,
  },
  answerText: {
    fontSize: 8,
    color: TEXT_DARK,
    lineHeight: 1.4,
    marginTop: 2,
  },
  questionSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    marginTop: 8,
  },

  // Inline value (right side)
  inlineValue: { fontSize: 9, color: TEXT_DARK, textAlign: "right" },

  // Badges
  badge: {
    fontSize: 8,
    fontWeight: 700,
    paddingTop: 3,
    paddingBottom: 3,
    paddingLeft: 10,
    paddingRight: 10,
    color: "#FFFFFF",
    textAlign: "center",
    minWidth: 70,
  },
  badgeGreen: { backgroundColor: RISK_GREEN },
  badgeYellow: { backgroundColor: RISK_YELLOW },
  badgeRed: { backgroundColor: RISK_RED },
  badgeMuted: { backgroundColor: "#999", color: "#FFFFFF" },

  // YNA table
  ynaTable: {
    borderWidth: 1,
    borderColor: BORDER,
    marginTop: 6,
    marginBottom: 6,
  },
  ynaHeaderRow: {
    flexDirection: "row",
    backgroundColor: SECTION_BG,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  ynaHeaderCell: {
    fontSize: 7,
    fontWeight: 700,
    color: TEXT_DARK,
    padding: 4,
  },
  ynaRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: BORDER,
    minHeight: 18,
  },
  ynaCellQuestion: { flex: 1, padding: 4, fontSize: 8 },
  ynaCellCheck: {
    width: 26,
    padding: 4,
    fontSize: 11,
    textAlign: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
  },
  ynaCellComment: {
    width: "26%",
    padding: 4,
    fontSize: 7,
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
    color: TEXT_DARK,
  },
  ynaCellValue: {
    width: "14%",
    padding: 4,
    fontSize: 8,
    borderLeftWidth: 1,
    borderLeftColor: BORDER,
    color: TEXT_DARK,
    fontWeight: 700,
  },

  // Info box (e.g. anleggsbeskrivelse)
  infoBox: {
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 6,
  },
  infoBoxHeader: {
    backgroundColor: SECTION_BG,
    fontSize: 8,
    fontWeight: 700,
    color: TEXT_DARK,
    padding: 4,
  },
  infoBoxBody: { padding: 6, fontSize: 9 },

  // Signatures block
  sigSection: { marginTop: 24 },
  sigTitle: { fontSize: 13, fontWeight: 700, marginBottom: 10 },
  sigRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
    gap: 12,
  },
  sigLeft: { width: 200 },
  sigLeftText: { fontSize: 8, color: TEXT_DARK, lineHeight: 1.4 },
  sigBox: {
    flex: 1,
    height: 60,
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: "dashed",
    padding: 4,
  },
  sigImage: { height: 50, objectFit: "contain" },

  // Fontuavhengig avkryssingsboks (ikke glyph — Standard-14-fonter mangler ☑/☐)
  checkboxBox: {
    minWidth: 16,
    height: 9,
    paddingHorizontal: 1,
    borderWidth: 1,
    borderColor: TEXT_DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxMark: {
    fontSize: 7,
    fontWeight: 700,
    lineHeight: 1,
  },

  // Inline radio block
  radioBlock: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 4,
  },
  radioItem: { flexDirection: "row", alignItems: "center" },
});

export interface PdfParticipant {
  name: string;
  signedAt: string | null;
  signature: string | null;
}

interface Args {
  document: DocumentRow & { signature_snapshot?: string | null };
  project: Project | null;
  signer: Profile;
  settings: AppSettings;
  participants?: PdfParticipant[];
}

export async function renderDocumentPdf({
  document,
  project,
  signer,
  settings,
  participants = [],
}: Args): Promise<Buffer> {
  const data = (document.data ?? {}) as Record<string, unknown>;
  const storedVariant = typeof data._variant === "string" ? data._variant : undefined;
  const storedTemplateId =
    typeof data._template_id === "string" ? data._template_id : undefined;
  let variant: string | undefined;
  if (document.kind === "samsvarserklaering") {
    variant = storedVariant ?? project?.installation_type ?? "bolig";
  } else if (document.kind === "sja") {
    variant =
      storedVariant ??
      (project?.installation_type === "telecom" ? "telekom" : "standard");
  } else if (document.kind === "custom") {
    variant = storedTemplateId;
  }
  const template = await getTemplate(document.kind, variant);
  const logo = getLogoDataUrl();

  const totalQuestions = template.sections.reduce(
    (n, s) => n + s.fields.filter((f) => f.kind !== "info").length,
    0,
  );

  return await renderToBuffer(
    <Document
      title={`${template.title}${project ? ` – ${project.project_number}` : ""}`}
      author={signer.full_name ?? signer.email}
    >
      <Page size="A4" style={styles.page} wrap>
        {/* Fixed header med logo og firma-info */}
        <View style={styles.header} fixed>
          <View>
            {logo ? (
              <Image src={logo} style={styles.logo} />
            ) : (
              <>
                <Text style={styles.brandText}>
                  {settings.firma.split(" ")[0]?.toUpperCase() ?? "BEDRIFT"}
                </Text>
                <Text style={styles.brandSub}>{settings.firma}</Text>
              </>
            )}
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyLine}>{settings.firma}</Text>
            {settings.org_nr && (
              <Text style={styles.companyLine}>{settings.org_nr}</Text>
            )}
            {settings.selskap_adresse && (
              <Text style={styles.companyLine}>{settings.selskap_adresse}</Text>
            )}
            <Text style={styles.companyLine}>
              {[settings.selskap_postnr, settings.selskap_sted]
                .filter(Boolean)
                .join(" ")}
            </Text>
            {settings.selskap_telefon && (
              <Text style={styles.companyLine}>
                Tlf: {settings.selskap_telefon}
              </Text>
            )}
            <Text
              style={styles.companyLine}
              render={({ pageNumber, totalPages }) =>
                `Side ${pageNumber} av ${totalPages}`
              }
            />
          </View>
        </View>

        {/* Tittel + beskrivelse (kun på første side) */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>
            {project ? `${template.title} — ${project.project_number}` : template.title}
          </Text>
          {template.description && (
            <Text style={styles.description}>{template.description}</Text>
          )}
        </View>

        {/* Skjemadetaljer + Statistikk */}
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaColTitle}>Skjemadetaljer</Text>
            <Meta label="Kategori:" value={template.subtitle} />
            <Meta label="Mal-versjon:" value={template.revision} />
            <Meta
              label="Opprettet:"
              value={new Date(document.created_at).toLocaleString("no-NO", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
            <Meta
              label="Opprettet av:"
              value={signer.full_name ?? signer.email}
            />
            <Meta label="Ansvarlig:" value={signer.full_name ?? signer.email} />
            <Meta
              label="Prosjektnummer:"
              value={project?.project_number ?? "—"}
            />
            <Meta label="Prosjekt:" value={project?.title ?? "Frittstående skjema"} />
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaColTitle}>Statistikk</Text>
            <Meta label="Totalt antall spørsmål:" value={`${totalQuestions} spørsmål`} />
            <Meta label="Versjon av dokument:" value={`v${document.version}`} />
            <Meta
              label="Status:"
              value={document.status === "signert" ? "Signert" : "Utkast"}
            />
            {document.signed_at && (
              <Meta
                label="Signert:"
                value={new Date(document.signed_at).toLocaleString("no-NO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              />
            )}
          </View>
        </View>

        {/* Seksjoner */}
        {template.sections.map((section, i) => (
          <View key={i} break={false} wrap>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.description && (
              <Text style={styles.sectionDesc}>{section.description}</Text>
            )}
            {section.fields.map((field, fi) => (
              <RenderField
                key={field.key}
                field={field}
                data={data}
                qNumber={`${i + 1}.${fi + 1}`}
              />
            ))}
          </View>
        ))}

        {/* Signaturer */}
        <View style={styles.sigSection} wrap={false} break>
          <Text style={styles.sigTitle}>Signaturer</Text>
          <View style={styles.sigRow}>
            <View style={styles.sigLeft}>
              <Text style={styles.sigLeftText}>
                Signert{document.signature_snapshot ? " elektronisk" : ""} av{" "}
                {signer.full_name ?? signer.email}
                {document.signed_at
                  ? `,\nden ${new Date(document.signed_at).toLocaleString("no-NO", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}.`
                  : "."}
              </Text>
            </View>
            <View style={styles.sigBox}>
              {document.signature_snapshot && (
                <Image src={document.signature_snapshot} style={styles.sigImage} />
              )}
            </View>
          </View>

          {participants.length > 0 && (
            <>
              <Text style={styles.sigTitle}>Deltakere</Text>
              {participants.map((p, i) => (
                <View key={i} style={styles.sigRow}>
                  <View style={styles.sigLeft}>
                    <Text style={styles.sigLeftText}>
                      {p.signature
                        ? `Signert elektronisk av ${p.name}${
                            p.signedAt
                              ? `,\nden ${new Date(p.signedAt).toLocaleString("no-NO", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}.`
                              : "."
                          }`
                        : `${p.name} — ikke signert digitalt.`}
                    </Text>
                  </View>
                  <View style={styles.sigBox}>
                    {p.signature && (
                      <Image src={p.signature} style={styles.sigImage} />
                    )}
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Footer */}
        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `${template.title} · v${document.version} · ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>,
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  // Boksen tegnes alltid som primitiv (fontuavhengig). Merket er ren ASCII ("[X]"),
  // ikke et Unicode-glyph — samme rotårsak som Ω-manko i tegnstøtte-fiksen,
  // og gir i tillegg et entydig tekstuttrekkbart svar for golden-testene.
  return (
    <View style={styles.checkboxBox}>
      {checked && <Text style={styles.checkboxMark}>[X]</Text>}
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value || "–"}</Text>
    </View>
  );
}

function RenderField({
  field,
  data,
  qNumber,
}: {
  field: FieldDef;
  data: Record<string, unknown>;
  qNumber: string;
}) {
  const value = data[field.key];

  if (field.kind === "info") {
    return (
      <View style={{ marginTop: 6, marginBottom: 6 }}>
        <Text
          style={{ fontSize: 9, fontStyle: "italic", color: TEXT_DARK, lineHeight: 1.4 }}
        >
          {String(field.defaultValue ?? "")}
        </Text>
      </View>
    );
  }

  if (field.kind === "yna_group") {
    return (
      <YnaTable
        items={field.items ?? []}
        value={(value as Record<string, YnaResponse>) ?? {}}
      />
    );
  }

  if (field.kind === "yna_measurement_group") {
    return (
      <YnaMeasurementTable
        items={field.items ?? []}
        header={field.measurementHeader ?? "Verdi"}
        value={(value as Record<string, YnaMeasurementResponse>) ?? {}}
      />
    );
  }

  if (field.kind === "risk_assessment_group") {
    return (
      <RiskAssessmentBlock
        items={field.riskItems ?? []}
        value={(value as Record<string, RiskAssessmentResponse>) ?? {}}
        qNumberBase={qNumber}
      />
    );
  }

  if (field.kind === "yes_no") {
    const v = value as string | undefined;
    const tone =
      v === "JA"
        ? styles.badgeGreen
        : v === "NEI"
          ? styles.badgeRed
          : styles.badgeMuted;
    return (
      <View>
        <View style={styles.questionRow} wrap={false}>
          <Text style={styles.questionLabel}>
            {qNumber} {field.label}
          </Text>
          <Text style={[styles.badge, tone]}>{v || "—"}</Text>
        </View>
        <View style={styles.questionSeparator} />
      </View>
    );
  }

  if (field.kind === "contact_subform") {
    const v = (value as ContactSubformValue) ?? {
      rolle: null,
      navn: "",
      telefon: "",
      epost: "",
    };
    return (
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxHeader}>{field.label}</Text>
        <View style={styles.infoBoxBody}>
          <Text>Rolle: {v.rolle ?? "–"}</Text>
          <Text>Navn: {v.navn || "–"}</Text>
          <Text>Telefon: {v.telefon || "–"}</Text>
          <Text>E-post: {v.epost || "–"}</Text>
        </View>
      </View>
    );
  }

  if (field.kind === "scope_subform") {
    const v = (value as ScopeSubformValue) ?? { type: null, anleggsdel: "" };
    return (
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxHeader}>{field.label}</Text>
        <View style={styles.infoBoxBody}>
          <Text>
            {v.type === "hele"
              ? "Hele anlegget"
              : v.type === "del"
                ? `Anleggsdel: ${v.anleggsdel || ""}`
                : "–"}
          </Text>
        </View>
      </View>
    );
  }

  if (field.kind === "anvendte_normer_subform") {
    const v = (value as AnvendteNormerValue) ?? {
      nek400: false,
      nek400_utg: "",
      annet: "",
    };
    return (
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxHeader}>{field.label}</Text>
        <View style={styles.infoBoxBody}>
          <Text>
            NEK 400: {v.nek400 ? `Ja (utg. ${v.nek400_utg || "–"})` : "Nei"}
          </Text>
          {v.annet && <Text>Annet: {v.annet}</Text>}
        </View>
      </View>
    );
  }

  if (field.kind === "people_list") {
    const people = (value as PersonItem[]) ?? [];
    return (
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxHeader}>{field.label}</Text>
        <View style={styles.infoBoxBody}>
          {people.length === 0 ? (
            <Text style={{ color: TEXT_MUTED }}>Ingen oppført.</Text>
          ) : (
            people.map((p, i) => (
              <Text key={i}>
                {p.navn}
                {p.rolle ? ` · ${p.rolle}` : ""}
              </Text>
            ))
          )}
        </View>
      </View>
    );
  }

  if (field.kind === "risk_table") {
    return (
      <RiskTablePdf
        columns={field.columns ?? []}
        value={(value as RiskRow[]) ?? []}
      />
    );
  }

  if (field.kind === "checkmark_group") {
    const arr = ((value as string[]) ?? []) as string[];
    return (
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxHeader}>
          {qNumber} {field.label}
        </Text>
        <View style={[styles.infoBoxBody, { flexDirection: "row", flexWrap: "wrap" }]}>
          {field.options?.map((o) => (
            <View
              key={o}
              style={{
                width: "50%",
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 2,
              }}
            >
              <Checkbox checked={arr.includes(o)} />
              <Text style={{ fontSize: 8, marginLeft: 4 }}>{o}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (field.kind === "radio") {
    return (
      <View>
        <View style={styles.questionRow} wrap={false}>
          <View style={{ flex: 1 }}>
            <Text style={styles.questionLabel}>
              {qNumber} {field.label}
            </Text>
            <View style={styles.radioBlock}>
              {field.options?.map((o) => (
                <View key={o} style={styles.radioItem}>
                  <Checkbox checked={value === o} />
                  <Text style={{ fontSize: 8, marginLeft: 4 }}>{o}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <View style={styles.questionSeparator} />
      </View>
    );
  }

  if (field.kind === "checkbox") {
    return (
      <View>
        <View style={styles.questionRow} wrap={false}>
          <Text style={styles.questionLabel}>
            {qNumber} {field.label}
          </Text>
          <Text style={[styles.badge, value ? styles.badgeGreen : styles.badgeMuted]}>
            {value ? "JA" : "—"}
          </Text>
        </View>
        <View style={styles.questionSeparator} />
      </View>
    );
  }

  // Standard text/number/date/textarea — label + value
  let display = "–";
  if (value !== undefined && value !== null && value !== "") {
    display = String(value);
  }

  if (field.kind === "textarea") {
    return (
      <View wrap>
        <Text style={styles.questionLabel}>
          {qNumber} {field.label}
        </Text>
        <Text style={styles.questionAnswerLabel}>Besvarelse</Text>
        <Text style={styles.answerText}>{display}</Text>
        <View style={styles.questionSeparator} />
      </View>
    );
  }

  return (
    <View>
      <View style={styles.questionRow} wrap={false}>
        <Text style={styles.questionLabel}>
          {qNumber} {field.label}
        </Text>
        <Text style={styles.inlineValue}>{display}</Text>
      </View>
      <View style={styles.questionSeparator} />
    </View>
  );
}

function YnaTable({
  items,
  value,
}: {
  items: { key: string; label: string }[];
  value: Record<string, YnaResponse>;
}) {
  return (
    <View style={styles.ynaTable}>
      <View style={styles.ynaHeaderRow}>
        <Text style={[styles.ynaHeaderCell, { flex: 1 }]}>Spørsmål</Text>
        <Text style={[styles.ynaHeaderCell, { width: 26, textAlign: "center" }]}>
          Ja
        </Text>
        <Text style={[styles.ynaHeaderCell, { width: 26, textAlign: "center" }]}>
          Nei
        </Text>
        <Text style={[styles.ynaHeaderCell, { width: 26, textAlign: "center" }]}>
          Uakt.
        </Text>
        <Text style={[styles.ynaHeaderCell, { width: "26%" }]}>Kommentar</Text>
      </View>
      {items.map((item) => {
        const r = value[item.key] ?? { svar: null, kommentar: "" };
        return (
          <View key={item.key} style={styles.ynaRow} wrap={false}>
            <Text style={styles.ynaCellQuestion}>{item.label}</Text>
            <View style={styles.ynaCellCheck}>
              <Checkbox checked={r.svar === "ja"} />
            </View>
            <View style={styles.ynaCellCheck}>
              <Checkbox checked={r.svar === "nei"} />
            </View>
            <View style={styles.ynaCellCheck}>
              <Checkbox checked={r.svar === "uakt"} />
            </View>
            <Text style={styles.ynaCellComment}>{r.kommentar || ""}</Text>
          </View>
        );
      })}
    </View>
  );
}

function YnaMeasurementTable({
  items,
  header,
  value,
}: {
  items: { key: string; label: string }[];
  header: string;
  value: Record<string, YnaMeasurementResponse>;
}) {
  return (
    <View style={styles.ynaTable}>
      <View style={styles.ynaHeaderRow}>
        <Text style={[styles.ynaHeaderCell, { flex: 1 }]}>Spørsmål</Text>
        <Text style={[styles.ynaHeaderCell, { width: 26, textAlign: "center" }]}>
          Ja
        </Text>
        <Text style={[styles.ynaHeaderCell, { width: 26, textAlign: "center" }]}>
          Nei
        </Text>
        <Text style={[styles.ynaHeaderCell, { width: 26, textAlign: "center" }]}>
          Uakt.
        </Text>
        <Text style={[styles.ynaHeaderCell, { width: "22%" }]}>Kommentar</Text>
        <Text style={[styles.ynaHeaderCell, { width: "14%" }]}>{header}</Text>
      </View>
      {items.map((item) => {
        const r = value[item.key] ?? { svar: null, kommentar: "", verdi: "" };
        return (
          <View key={item.key} style={styles.ynaRow} wrap={false}>
            <Text style={styles.ynaCellQuestion}>{item.label}</Text>
            <View style={styles.ynaCellCheck}>
              <Checkbox checked={r.svar === "ja"} />
            </View>
            <View style={styles.ynaCellCheck}>
              <Checkbox checked={r.svar === "nei"} />
            </View>
            <View style={styles.ynaCellCheck}>
              <Checkbox checked={r.svar === "uakt"} />
            </View>
            <Text style={styles.ynaCellComment}>{r.kommentar || ""}</Text>
            <Text style={styles.ynaCellValue}>{r.verdi || ""}</Text>
          </View>
        );
      })}
    </View>
  );
}

function RiskAssessmentBlock({
  items,
  value,
  qNumberBase,
}: {
  items: RiskItem[];
  value: Record<string, RiskAssessmentResponse>;
  qNumberBase: string;
}) {
  function levelBadge(level: RiskLevel) {
    if (level === "lav") return { tone: styles.badgeGreen, text: "Lav Risiko" };
    if (level === "middels")
      return { tone: styles.badgeYellow, text: "Middels Risiko" };
    if (level === "hoey") return { tone: styles.badgeRed, text: "Høy Risiko" };
    if (level === "ikke_aktuelt")
      return { tone: styles.badgeMuted, text: "Ikke aktuelt" };
    return { tone: styles.badgeMuted, text: "—" };
  }

  return (
    <View>
      {items.map((item, idx) => {
        const r = value[item.key] ?? { level: null, besvarelse: "" };
        const b = levelBadge(r.level);
        return (
          <View key={item.key} wrap={false} style={{ marginTop: 8 }}>
            <View style={styles.questionRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.questionLabel}>
                  {qNumberBase}.{idx + 1} {item.label}
                </Text>
                {item.description && (
                  <Text style={styles.questionDescription}>
                    {item.description}
                  </Text>
                )}
              </View>
              <Text style={[styles.badge, b.tone]}>{b.text}</Text>
            </View>
            {r.besvarelse && (
              <>
                <Text style={styles.questionAnswerLabel}>Besvarelse</Text>
                <Text style={styles.answerText}>{r.besvarelse}</Text>
              </>
            )}
            <View style={styles.questionSeparator} />
          </View>
        );
      })}
    </View>
  );
}

function RiskTablePdf({
  columns,
  value,
}: {
  columns: RiskColumn[];
  value: RiskRow[];
}) {
  const colWidth = (w: RiskColumn["width"]) => {
    if (w === "narrow") return 30;
    if (w === "wide") return 0;
    return 70;
  };
  return (
    <View style={styles.ynaTable}>
      <View style={styles.ynaHeaderRow}>
        {columns.map((c) => {
          const w = colWidth(c.width);
          return (
            <Text
              key={c.key}
              style={[
                styles.ynaHeaderCell,
                w === 0 ? { flex: 1 } : { width: w },
              ]}
            >
              {c.label}
            </Text>
          );
        })}
      </View>
      {value.length === 0 && (
        <View style={styles.ynaRow}>
          <Text
            style={{
              flex: 1,
              padding: 4,
              fontSize: 8,
              color: TEXT_MUTED,
              textAlign: "center",
            }}
          >
            Ingen rader oppført.
          </Text>
        </View>
      )}
      {value.map((row, i) => (
        <View key={i} style={styles.ynaRow} wrap={false}>
          {columns.map((c) => {
            const w = colWidth(c.width);
            return (
              <Text
                key={c.key}
                style={[
                  { padding: 4, fontSize: 7, color: TEXT_DARK },
                  w === 0 ? { flex: 1 } : { width: w },
                ]}
              >
                {row[c.key] || ""}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export type RenderDocumentArgs = Args;
