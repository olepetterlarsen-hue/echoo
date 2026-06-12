import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/origin";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const origin = await getAppOrigin();
  return NextResponse.redirect(new URL("/login", origin), { status: 303 });
}
