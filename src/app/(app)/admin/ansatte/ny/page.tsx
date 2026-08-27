import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ContractForm } from "../contract-form";

export default async function NyAnsattPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/dashboard");

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto space-y-6">
      <header className="space-y-1">
        <Link
          href="/admin/ansatte"
          className="text-sm text-text-3 hover:text-text-1"
        >
          ← Ansatte
        </Link>
        <h1 className="text-2xl font-semibold">Ny ansatt — arbeidsavtale</h1>
        <p className="text-text-2 text-sm">
          Fyll ut avtalen, kjør en AI-sjekk for selvmotsigelser, signer og send
          til den ansatte. Brukerkonto opprettes automatisk når de har signert.
        </p>
      </header>
      <ContractForm />
    </div>
  );
}
