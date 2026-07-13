import { anthropicClient, guardedMessage, DEFAULT_MODEL } from "@/lib/ai/assistant";

/**
 * Onboarding-skillen ("Kom-i-gang") guider nye Echoo-brukere gjennom de
 * første stegene. Persisterer progress i onboarding_state-tabellen.
 *
 * Stegene er heuristikker — skillen sjekker ekte app-data ved hver tur:
 * hvis brukeren faktisk har opprettet en kunde, regnes steg "kunde" som
 * fullført uansett om de har bedt om hjelp eller ikke.
 */

export const ONBOARDING_STEPS = [
  {
    id: "kunde",
    title: "Opprett din første kunde",
    href: "/kunder/ny",
    detection: "har minst én kunde",
    hint: "Bedriftskunder har orgnr, privatkunder har for-/etternavn. /kunder/ny.",
  },
  {
    id: "prosjekt",
    title: "Opprett ditt første prosjekt",
    href: "/prosjekter/ny",
    detection: "har minst ett prosjekt",
    hint: "Knytt prosjektet til kunden — det gir tydeligere oversikt senere.",
  },
  {
    id: "team",
    title: "Inviter en kollega eller team-medlem",
    href: "/admin/brukere",
    detection: "har minst én team-medlem i org-en (utenom seg selv)",
    hint: "Ubegrenset antall brukere på samme abonnement.",
  },
  {
    id: "kompetanse",
    title: "Last opp ditt første kursbevis",
    href: "/kompetanse",
    detection: "har minst ett kursbevis",
    hint: "Echoo varsler automatisk når sertifikater utløper.",
  },
  {
    id: "rutine",
    title: "Aktiver de viktigste HMS-rutinene",
    href: "/rutiner",
    detection: "har minst én aktiv rutine på org-en",
    hint: "Echoo har et bibliotek med rutiner du kan slå på med ett klikk.",
  },
  {
    id: "dokument",
    title: "Lag ditt første samsvarserklæring/sluttkontroll-utkast",
    href: "/skjemaer",
    detection: "har minst ett dokument-utkast",
    hint: "Du kan signere digitalt med signatur-pad i samme flyt.",
  },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

export interface OnboardingProgress {
  completed_steps: OnboardingStepId[];
  current_step?: OnboardingStepId;
  notes?: string;
  finished: boolean;
}

export interface OnboardingMessage {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(progress: OnboardingProgress): string {
  const stepLines = ONBOARDING_STEPS.map((s) => {
    const done = progress.completed_steps.includes(s.id);
    return `${done ? "✓" : "•"} ${s.id}: ${s.title} (${s.href}) — ${s.hint}`;
  }).join("\n");

  const remaining = ONBOARDING_STEPS.filter(
    (s) => !progress.completed_steps.includes(s.id),
  );

  const nextStep = remaining[0];

  return `Du er Echoo sin "Kom-i-gang"-veileder. Du hjelper en helt ny bruker
gjennom de første stegene i appen. Du er varm, oppmuntrende, og holder
svar kort (3-6 setninger). Norsk bokmål.

BRUKERENS PROGRESS:
${stepLines}
${progress.finished ? "✓ Brukeren har markert onboarding ferdig" : ""}
${progress.notes ? `Notater fra tidligere samtaler: ${progress.notes}` : ""}

DITT ANSVAR:
- Foreslå konkret NESTE STEG. Ikke gjenta steg som allerede er ✓.
${nextStep ? `- Neste steg er: "${nextStep.title}" på ${nextStep.href}` : "- Alle hovedsteg er fullført — gratulér og foreslå å markere ferdig."}
- Når du peker på et steg, bruk markdown-lenker: [${nextStep?.title ?? "neste"}](${nextStep?.href ?? "/dashboard"})
- Spør hva brukerens bransje/situasjon er hvis ukjent, slik at hint blir personlige.
- Husk hva brukeren har fortalt deg tidligere (se notater over).

STIL:
- Markdown OK (## headers, **bold**, [lenker](/path))
- Ingen punktlister på over 5 elementer — kompakt
- Ikke gjenta hilsener ved hver tur. Gå rett på sak etter første tur.
- Ved første tur (ingen messages tidligere): spør hva brukeren ønsker å sette opp først, og nevn de neste 1-2 stegene.

Hvis brukeren skriver noe som hører hjemme i en annen skill (avvik, SJA,
ISO), pek dem dit ("Du kan bytte tab her i AI-assistenten — der er det
en egen skill for X").`;
}

export async function onboardingTurn(args: {
  messages: OnboardingMessage[];
  progress: OnboardingProgress;
}): Promise<{ reply?: string; suggestedNote?: string; error?: string }> {
  const client = anthropicClient();
  if (!client) {
    return {
      error: "AI-assistenten er ikke konfigurert (ANTHROPIC_API_KEY mangler).",
    };
  }
  if (args.messages.length === 0) {
    return { error: "Ingen melding å svare på." };
  }

  try {
    const msg = await guardedMessage({
      model: DEFAULT_MODEL,
      max_tokens: 800,
      system: buildSystemPrompt(args.progress),
      messages: args.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });
    const text = msg.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return { error: "Tomt svar fra AI." };
    }
    return { reply: text.text };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
