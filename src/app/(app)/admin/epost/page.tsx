import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerT } from "@/lib/i18n/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { EmailTestForm } from "./test-form";

export default async function EmailAdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/dashboard");

  const { t, locale } = await getServerT();

  const { data: recentLog } = await supabase
    .from("email_log")
    .select(
      "id, recipient, subject, category, status, error, sent_at, provider_message_id",
    )
    .order("sent_at", { ascending: false })
    .limit(50);

  // Sjekk om RESEND_API_KEY er satt (server-side)
  const apiKeyConfigured = Boolean(process.env.RESEND_API_KEY);
  const fromAddress = process.env.EMAIL_FROM ?? "Echoo <noreply@echoo.no>";
  const dateLocale = locale === "no" ? "no-NO" : "en-GB";

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Mail className="size-6 text-text-2" />
          {t("adm_email_title")}
        </h1>
        <p className="text-text-2 text-sm">{t("adm_email_subtitle")}</p>
      </header>

      {/* KONFIGURASJONS-STATUS */}
      <Card
        className={
          apiKeyConfigured
            ? "border-green/30 bg-green/5"
            : "border-yellow/30 bg-yellow/5"
        }
      >
        <CardBody className="flex items-start gap-3">
          {apiKeyConfigured ? (
            <CheckCircle2 className="size-5 text-green mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="size-5 text-yellow mt-0.5 shrink-0" />
          )}
          <div className="flex-1 text-sm">
            {apiKeyConfigured ? (
              <>
                <p className="font-medium text-text-1">
                  {t("adm_email_configured")}
                </p>
                <p className="text-text-2 mt-1">
                  {t("adm_email_sender")}{" "}
                  <code className="text-xs">{fromAddress}</code>
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-text-1">
                  {t("adm_email_not_configured")}
                </p>
                <p className="text-text-2 mt-1">{t("adm_email_env_intro")}</p>
                <ol className="mt-2 space-y-1 list-decimal list-inside text-text-2">
                  <li>
                    {t("adm_email_step_1_pre")}{" "}
                    <a
                      href="https://resend.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-orange hover:underline"
                    >
                      resend.com
                    </a>{" "}
                    {t("adm_email_step_1_post")}
                  </li>
                  <li>
                    {t("adm_email_step_2_pre")}{" "}
                    <code className="text-xs">echoo.no</code>{" "}
                    {t("adm_email_step_2_post")}
                  </li>
                  <li>
                    {t("adm_email_step_3_pre")}{" "}
                    <code className="text-xs">re_xxxx...</code>
                  </li>
                  <li>
                    {t("adm_email_step_4")}
                    <pre className="bg-card border border-border rounded p-2 mt-1 text-xs">
{`RESEND_API_KEY=re_xxxxxxxxxx
EMAIL_FROM=Echoo <noreply@echoo.no>`}
                    </pre>
                  </li>
                  <li>{t("adm_email_step_5")}</li>
                </ol>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* TEST-SEND */}
      <Card>
        <CardHeader>
          <CardTitle>{t("adm_email_send_test_title")}</CardTitle>
        </CardHeader>
        <CardBody>
          <EmailTestForm defaultRecipient={me?.email ?? ""} />
        </CardBody>
      </Card>

      {/* AUDIT-LOG */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t("adm_email_log_title").replace(
              "{n}",
              String(recentLog?.length ?? 0),
            )}
          </CardTitle>
        </CardHeader>
        <CardBody className="!p-0">
          {!recentLog || recentLog.length === 0 ? (
            <div className="p-6 text-center text-text-3 text-sm">
              {t("adm_email_log_empty")}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-surface text-text-3 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2">{t("adm_email_col_time")}</th>
                  <th className="text-left px-4 py-2">
                    {t("adm_email_col_recipient")}
                  </th>
                  <th className="text-left px-4 py-2 hidden md:table-cell">
                    {t("adm_email_col_subject")}
                  </th>
                  <th className="text-left px-4 py-2">{t("adm_email_col_type")}</th>
                  <th className="text-left px-4 py-2">
                    {t("adm_email_col_status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentLog.map((l) => (
                  <tr key={l.id} className="hover:bg-card-hover">
                    <td className="px-4 py-2 text-xs text-text-3 font-mono whitespace-nowrap">
                      {new Date(l.sent_at).toLocaleString(dateLocale, {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2 text-text-2">{l.recipient}</td>
                    <td className="px-4 py-2 hidden md:table-cell text-text-1 truncate max-w-[280px]">
                      {l.subject}
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone="neutral">{l.category}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      {l.status === "sent" ? (
                        <Badge tone="green">{t("adm_email_status_sent")}</Badge>
                      ) : (
                        <span title={l.error ?? ""}>
                          <Badge tone="red">{t("adm_email_status_failed")}</Badge>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
