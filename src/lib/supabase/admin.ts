import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Supabase client สิทธิ์สูงสุด (ข้าม RLS)
 * !!! ใช้เฉพาะงานที่จำเป็นจริง ๆ ฝั่ง server เท่านั้น:
 *   - ดึงอีเมลผู้รับเพื่อส่งแจ้งเตือน
 *   - เช็กว่ารหัสพนักงานซ้ำหรือไม่ ตอนสมัคร
 *   - หาอีเมลจากรหัสพนักงาน ตอนเข้าสู่ระบบด้วยรหัสพนักงาน
 * ห้ามใช้เพื่อเขียนข้อมูลแทนผู้ใช้ (ให้ใช้ฟังก์ชันในฐานข้อมูลผ่าน createClient() ปกติ)
 */
export function createAdminClient() {
  return createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
