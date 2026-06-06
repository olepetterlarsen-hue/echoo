import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderDocumentPdf } from "@/lib/pdf/render";
import { getAppSettings } from "@/lib/settings";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: doc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Hvis PDF allerede lagret: stream fra storage
  if (doc.pdf_path) {
    const { data: file, error } = await supabase.storage
      .from("documents")
      .download(doc.pdf_path);
    if (!error && file) {
      const arr = await file.arrayBuffer();
      return new NextResponse(arr, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${doc.kind}-v${doc.version}.pdf"`,
        },
      });
    }
  }

  // Fallback: regenerer PDF on-the-fly (utkast / mangler i storage)
  let project = null;
  if (doc.project_id) {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", doc.project_id)
      .single();
    project = data;
  }
  const { data: signerProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", doc.signed_by ?? user.id)
    .single();
  if (!signerProfile) {
    return NextResponse.json({ error: "Missing signer" }, { status: 404 });
  }

  const settings = await getAppSettings();
  const buffer = await renderDocumentPdf({
    document: doc,
    project,
    signer: signerProfile,
    settings,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.kind}-v${doc.version}.pdf"`,
    },
  });
}
