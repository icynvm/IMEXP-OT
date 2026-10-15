import type { NextRequest } from "next/server";
import { buildCsp } from "@/lib/csp";
import { updateSession } from "@/lib/supabase/proxy";

// Proxy (เดิมชื่อ middleware) ทำงานก่อนทุก request — ดูรายละเอียดใน lib/supabase/proxy.ts
export async function proxy(request: NextRequest) {
  // CSP: nonce สุ่มใหม่ทุกครั้ง ส่งให้ Next.js (ผ่าน request header) ใส่ใน <script> ของหน้า
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, {
    isDev: process.env.NODE_ENV === "development",
    https: request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https",
  });
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);

  const response = await updateSession(request);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // ไม่ต้องทำงานกับไฟล์ static (รูป, css, js)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
