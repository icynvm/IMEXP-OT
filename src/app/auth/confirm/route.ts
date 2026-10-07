import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { flashCookie } from "@/lib/flash";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * ปลายทางของลิงก์ในอีเมลจาก Supabase (ยืนยันอีเมลตอนสมัคร / ตั้งรหัสผ่านใหม่)
 * รองรับทั้ง 2 รูปแบบ:
 *   ?token_hash=...&type=email|recovery    (แนะนำ เปิดจากเครื่องไหนก็ได้ ดู docs/SETUP.md หัวข้อแม่แบบอีเมล)
 *   ?code=...                              (ค่าเริ่มต้นของ Supabase ต้องเปิดในเบราว์เซอร์เดียวกับที่สมัคร)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  // แจ้ง error ผ่าน cookie (กล่องแจ้งเตือนในหน้า login) แทนการต่อท้าย URL
  const fail = (message: string) => {
    const response = NextResponse.redirect(new URL("/login", origin));
    response.cookies.set(flashCookie(message, "error"));
    return response;
  };

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

  // ลิงก์แบบ ?code= (แม่แบบเดิมของ Supabase) ต้องเปิดในเบราว์เซอร์เดียวกับที่สมัคร
  // ถ้าเปิดจากเครื่องอื่น (สมัครบนคอม เปิดอีเมลบนมือถือ) จะแลก session ไม่ได้
  // แต่ Supabase ยืนยันอีเมลให้แล้วตั้งแต่ก่อนส่งกลับมาที่นี่ -> แจ้งให้เข้าสู่ระบบได้เลย
  // (แก้ถาวร: ใช้แม่แบบอีเมลแบบ token_hash ใน supabase/templates/ ดู docs/SETUP.md)
  if (error && code && (error as { code?: string }).code === "pkce_code_verifier_not_found") {
    if (next === "/auth/reset-password") {
      return fail("กรุณาเปิดลิงก์ตั้งรหัสผ่านในเบราว์เซอร์เดียวกับที่กดขอ หรือขอลิงก์ใหม่อีกครั้ง");
    }
    const response = NextResponse.redirect(new URL("/login", origin));
    response.cookies.set(flashCookie("ยืนยันอีเมลเรียบร้อยแล้ว กรุณาเข้าสู่ระบบ"));
    return response;
  }

  if (error) {
    console.error("[auth/confirm]", error);
    return fail("ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว (ถ้าเพิ่งสมัคร ลองเข้าสู่ระบบได้เลย)");
  }
  return NextResponse.redirect(new URL(next, origin));
}
