import "server-only";
import webpush from "web-push";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/** ข้อความแจ้งเตือน: tag เดียวกัน = แทนที่การแจ้งเตือนเดิม (ไม่เด้งซ้ำ เช่น กระดิ่งในเว็บกับ Push เรื่องเดียวกัน) */
export type PushPayload = { title: string; body: string; url: string; tag?: string };

let configured = false;

/**
 * ส่ง Push ไปทุกอุปกรณ์ของผู้ใช้ที่ระบุ (ที่กดเปิดแจ้งเตือนไว้)
 * - ยังไม่ตั้งค่า VAPID -> ข้าม (ระบบอื่นทำงานปกติ)
 * - อุปกรณ์ที่ถอนสิทธิ์/หมดอายุ (404, 410) -> ลบทิ้งอัตโนมัติ
 * - ส่งไม่สำเร็จ -> บันทึก log เท่านั้น ไม่ทำให้การยื่น/อนุมัติล้มเหลว (เรียกผ่าน after() เหมือนอีเมล)
 */
export async function sendPush(userIds: string[], payload: PushPayload) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return;
  if (!env.vapidPublicKey || !env.vapidPrivateKey) {
    console.warn(`[push] ข้าม (ยังไม่ตั้งค่า VAPID): "${payload.title}"`);
    return;
  }
  if (!configured) {
    webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
    configured = true;
  }

  // ใช้ secret key เพราะต้องอ่านที่อยู่ Push ของคนอื่น (เหมือนการอ่านอีเมลผู้รับ)
  const admin = createAdminClient();
  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", ids);
  if (error) {
    console.error("[push] อ่านอุปกรณ์ไม่สำเร็จ:", error);
    return;
  }

  const body = JSON.stringify(payload);
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          TTL: 60 * 60 * 24, // ถ้าอุปกรณ์ปิดอยู่ เก็บไว้ส่งภายใน 1 วัน
          urgency: "high",
        });
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin.rpc("remove_expired_push_subscription", { p_endpoint: s.endpoint });
        } else {
          console.error("[push] ส่งไม่สำเร็จ:", status ?? err);
        }
      }
    }),
  );
}
