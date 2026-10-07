import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * ปลายทางของลิงก์ในอีเมลจาก Supabase (ยืนยันอีเมลตอนสมัคร / ตั้งรหัสผ่านใหม่)
 * รองรับทั้ง 2 รูปแบบ:
 *   ?token_hash=...&type=signup|recovery   (แนะนำ ดู docs/SETUP.md หัวข้อ Email Templates)
 *   ?code=...                              (ค่าเริ่มต้นของ Supabase)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  const fail = (message: string) =>
    NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, origin));

  if (searchParams.get("error_description")) {
    return fail("ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาลองใหม่อีกครั้ง");
  }

  const supabase = await createClient();
  let error: unknown = null;

  if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    return fail("ลิงก์ไม่ถูกต้อง");
  }

  if (error) {
    console.error("[auth/confirm]", error);
    return fail("ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว (ถ้าเพิ่งสมัคร ลองเข้าสู่ระบบได้เลย)");
  }
  return NextResponse.redirect(new URL(next, origin));
}
