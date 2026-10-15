import "server-only";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * จำกัดจำนวนครั้ง (กันเดารหัสผ่าน / สมัครถี่ / ส่งอีเมลลืมรหัสผ่านถี่) — เก็บในฐานข้อมูล (ตาราง auth_rate_limits)
 *
 * ทำไมต้องทำเอง: ทุกคน login ผ่าน server ของเรา Supabase จึงเห็น IP เดียวกันหมด แยกคนไม่ได้
 * IP จริงของผู้ใช้มาจาก header ที่ Vercel ใส่ให้ (Vercel เขียนทับค่าที่ผู้ใช้ปลอมมา)
 */
export type Limit = { key: string; max: number; windowSeconds: number };

export const LIMITS = {
  /** login ผิด: ต่อ IP+บัญชี 8 ครั้ง / 15 นาที (ไม่ล็อกบัญชีจาก IP อื่น กันคนแกล้งล็อกบัญชีเพื่อน) */
  loginPerAccount: (ip: string, identifier: string): Limit => ({ key: `login:${ip}:${identifier.toLowerCase()}`, max: 8, windowSeconds: 900 }),
  /** login ผิด: ต่อ IP 30 ครั้ง / 15 นาที (กันไล่เดาหลายบัญชี — ออฟฟิศที่ใช้ IP เดียวกันยังพอ) */
  loginPerIp: (ip: string): Limit => ({ key: `login:${ip}`, max: 30, windowSeconds: 900 }),
  /** สมัคร: ต่อ IP 20 ครั้ง / ชั่วโมง (วันเปิดใช้งานทั้งออฟฟิศสมัครพร้อมกันได้) */
  signupPerIp: (ip: string): Limit => ({ key: `signup:${ip}`, max: 20, windowSeconds: 3600 }),
  /** ลืมรหัสผ่าน: ต่อ IP 10 ครั้ง / ชั่วโมง และต่ออีเมล 3 ครั้ง / ชั่วโมง (กันยิงอีเมลใส่คนอื่น) */
  resetPerIp: (ip: string): Limit => ({ key: `reset:${ip}`, max: 10, windowSeconds: 3600 }),
  resetPerEmail: (email: string): Limit => ({ key: `reset-email:${email.toLowerCase()}`, max: 3, windowSeconds: 3600 }),
};

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** true = ถูกบล็อก (ครบจำนวนแล้ว) — ฐานข้อมูลมีปัญหาให้ผ่านไป (ไม่ทำให้ทุกคน login ไม่ได้) */
export async function isRateLimited(limits: Limit[]): Promise<boolean> {
  const admin = createAdminClient();
  const results = await Promise.all(
    limits.map((l) => admin.rpc("rate_limit_allowed", { p_key: l.key, p_max: l.max, p_window_seconds: l.windowSeconds })),
  );
  return results.some((r) => {
    if (r.error) console.error("[rate-limit]", r.error);
    return r.data === false;
  });
}

/** นับ 1 ครั้ง */
export async function recordAttempt(limits: Limit[]): Promise<void> {
  const { error } = await createAdminClient().rpc("rate_limit_record", { p_keys: limits.map((l) => l.key) });
  if (error) console.error("[rate-limit]", error);
}
