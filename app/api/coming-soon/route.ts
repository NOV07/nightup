import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "../../lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Basic server-side validation
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const trimmed = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed) || trimmed.length > 254) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from("coming_soon_emails")
      .upsert({ email: trimmed }, { onConflict: "email" });

    if (error) {
      console.error("[coming-soon] Supabase error:", error.message);
      // Don't expose DB errors to client — still return success to avoid enumeration
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
