import "server-only";
import { Resend } from "resend";
import { env } from "@/lib/env";

let client: Resend | null = null;

/**
 * ส่งอีเมลผ่าน Resend
 * - ถ้ายังไม่ได้ตั้งค่า RESEND_API_KEY จะแค่บันทึก log (ระบบอื่นยังทำงานปกติ)
 * - ถ้าส่งไม่สำเร็จ จะบันทึก log แต่ไม่ทำให้การอนุมัติ/ยื่นคำขอล้มเหลว
 */
export async function sendEmail(input: { to: string[]; subject: string; html: string; text: string }) {
  const to = [...new Set(input.to.filter(Boolean))];
  if (to.length === 0) return;

  if (!env.resendApiKey) {
    console.warn(`[email] ข้ามการส่ง (ยังไม่ตั้งค่า RESEND_API_KEY): "${input.subject}" -> ${to.join(", ")}`);
    return;
  }

  client ??= new Resend(env.resendApiKey);
  try {
    const { error } = await client.emails.send({
      from: env.emailFrom,
      to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    if (error) console.error("[email] ส่งไม่สำเร็จ:", error);
  } catch (err) {
    console.error("[email] ส่งไม่สำเร็จ:", err);
  }
}
