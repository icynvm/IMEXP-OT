import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * Supabase client สำหรับฝั่ง server (หน้าเว็บ / Server Actions)
 * ทำงานด้วยสิทธิ์ของ "ผู้ใช้ที่ login อยู่"  ->  RLS ในฐานข้อมูลจะจำกัดข้อมูลให้อัตโนมัติ
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // ถูกเรียกจาก Server Component ซึ่งเขียน cookie ไม่ได้
          // ไม่เป็นไร เพราะ src/proxy.ts ต่ออายุ session ให้ทุก request อยู่แล้ว
        }
      },
    },
  });
}
