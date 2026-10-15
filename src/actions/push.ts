"use server";

import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { toThaiMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { pushSubscriptionSchema } from "@/lib/validation";

/**
 * เปิด / ปิด การแจ้งเตือนแบบ Push บนอุปกรณ์นี้
 * หน้าเว็บขอสิทธิ์จากเบราว์เซอร์ก่อน แล้วส่ง "ที่อยู่สำหรับส่งแจ้งเตือน" มาบันทึกผ่านฟังก์ชันในฐานข้อมูล
 */
export async function savePushSubscription(subscription: unknown): Promise<{ ok: boolean; message?: string }> {
  await requireUser();
  const parsed = pushSubscriptionSchema.safeParse(subscription);
  if (!parsed.success) return { ok: false, message: "ข้อมูลการแจ้งเตือนไม่ถูกต้อง" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.keys.p256dh,
    p_auth: parsed.data.keys.auth,
    p_user_agent: (await headers()).get("user-agent"),
  });
  if (error) return { ok: false, message: toThaiMessage(error) };
  return { ok: true };
}

export async function deletePushSubscription(endpoint: unknown): Promise<{ ok: boolean }> {
  await requireUser();
  if (typeof endpoint !== "string" || endpoint.length > 1000) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_push_subscription", { p_endpoint: endpoint });
  return { ok: !error };
}
