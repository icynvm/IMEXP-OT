import "server-only";

/**
 * อ่านค่าตั้งค่าจาก Environment Variables (ไฟล์ .env.local หรือ Vercel Settings)
 * ถ้าลืมตั้งค่า จะแจ้ง error ชัดเจนว่าขาดตัวไหน
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`ยังไม่ได้ตั้งค่า Environment Variable: ${name} (ดู .env.example)`);
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabasePublishableKey() {
    return required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  },
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);
  },
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  /**
   * ไม่บังคับ: การแจ้งเตือนแบบ Push (เด้งที่มุมจอ / มือถือ แม้ปิดเว็บ) — สร้างด้วย `npx web-push generate-vapid-keys`
   * ถ้าไม่ตั้งค่า ระบบยังทำงานได้ แค่ไม่มี Push (กระดิ่งในเว็บยังใช้ได้)
   */
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY,
  vapidSubject: process.env.VAPID_SUBJECT ?? "mailto:admin@example.com",
  /** ไม่บังคับ: ถ้าไม่ตั้งค่า ระบบยังทำงานได้ แค่ไม่ส่งอีเมล */
  resendApiKey: process.env.RESEND_API_KEY,
  emailFrom: process.env.EMAIL_FROM ?? "ระบบ OT <onboarding@resend.dev>",
};
