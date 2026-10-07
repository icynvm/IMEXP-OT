import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Proxy (เดิมชื่อ middleware) ทำงานก่อนทุก request — ดูรายละเอียดใน lib/supabase/proxy.ts
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // ไม่ต้องทำงานกับไฟล์ static (รูป, css, js)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
