// Echoo e-post-sender via Resend.com.
// Bruker fetch direkte mot deres REST API for å unngå ny dep.
// Logger ALLE forsøk til email_log-tabellen, både vellykket og feilet.

import { createClient } from "@/lib/supabase/server";

interface SendInput {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  category: EmailCategory;
  related_project_id?: string | null;
  related_deviation_id?: string | null;
  sent_by?: string | null;
}

export type EmailCategory =
  | "test"
  | "deviation_assigned"
  | "comment_added"
  | "task_assigned"
  | "daily_digest";

interface SendResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

const RESEND_API = "https://api.resend.com/emails";

// Lest fra env. RESEND_API_KEY settes i Vercel Project → Settings → Environment.
// EMAIL_FROM må matche en verifisert avsender i Resend (SPF + DKIM på echoo.no).
function getApiKey(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? "Echoo <noreply@echoo.no>";
}

export async function sendEmail(input: SendInput): Promise<SendResult> {
  const apiKey = getApiKey();
  const supabase = await createClient();

  // Hvis ingen API-key er konfigurert: logg som "failed" og returner feil
  if (!apiKey) {
    await logEmail(supabase, input, {
      status: "failed",
      error: "RESEND_API_KEY mangler. Sett env-variabel i Netlify.",
    });
    return {
      ok: false,
      error:
        "E-post-tjenesten er ikke konfigurert ennå. Admin må sette RESEND_API_KEY.",
    };
  }

  const recipients = Array.isArray(input.to) ? input.to : [input.to];

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getFromAddress(),
        to: recipients,
        subject: input.subject,
        text: input.text,
        html: input.html ?? wrapHtml(input.text ?? "", input.subject),
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      await logEmail(supabase, input, {
        status: "failed",
        error: `HTTP ${res.status}: ${errorText.slice(0, 500)}`,
      });
      return { ok: false, error: `Resend feilet (${res.status})` };
    }

    const data = (await res.json()) as { id?: string };
    await logEmail(supabase, input, {
      status: "sent",
      provider_message_id: data.id ?? null,
    });
    return { ok: true, messageId: data.id };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await logEmail(supabase, input, { status: "failed", error });
    return { ok: false, error };
  }
}

async function logEmail(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  input: SendInput,
  result: {
    status: "sent" | "failed";
    provider_message_id?: string | null;
    error?: string | null;
  },
) {
  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  // Logg én rad pr. mottaker
  await supabase.from("email_log").insert(
    recipients.map((r) => ({
      recipient: r,
      subject: input.subject,
      body_text: input.text ?? null,
      body_html: input.html ?? null,
      category: input.category,
      related_project_id: input.related_project_id ?? null,
      related_deviation_id: input.related_deviation_id ?? null,
      status: result.status,
      provider_message_id: result.provider_message_id ?? null,
      error: result.error ?? null,
      sent_by: input.sent_by ?? null,
    })),
  );
}

// Default HTML-wrapper (mørk header, lys body).
export function wrapHtml(body: string, title: string): string {
  const safeBody = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escape(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#333;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e6e6e6;">
    <tr><td style="background:#0D0D0D;padding:20px 24px;">
      <div style="color:#F47920;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">Echoo</div>
      <div style="color:#fff;font-size:18px;margin-top:4px;">${escape(title)}</div>
    </td></tr>
    <tr><td style="padding:24px;font-size:14px;line-height:1.6;color:#333;">
      ${safeBody}
    </td></tr>
    <tr><td style="background:#fafafa;padding:14px 24px;font-size:11px;color:#888;border-top:1px solid #eee;">
      Echoo — internkontrollsystem for elektroentreprenører. Dette er en automatisk varsling.
    </td></tr>
  </table>
</body></html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
