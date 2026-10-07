/**
 * ตรวจว่าตั้งค่า Environment Variables ที่จำเป็นครบหรือยัง
 * ถ้าไม่ครบ เว็บจะแสดงหน้าบอกชื่อค่าที่ขาด (แทนหน้า "Internal Server Error" ที่ไม่บอกอะไรเลย)
 *
 * หมายเหตุ: ค่าที่ขึ้นต้นด้วย NEXT_PUBLIC_ ถูกฝังลงในเว็บ "ตอน build"
 * ดังนั้นตั้งค่าใน Vercel แล้ว ต้องกด Redeploy ทุกครั้งจึงจะมีผล
 */
export function findConfigProblems(): string[] {
  const problems: string[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!url) {
    problems.push("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL");
  } else if (!/^https?:\/\/[^/\s]+\/?$/.test(url)) {
    problems.push(
      "NEXT_PUBLIC_SUPABASE_URL รูปแบบไม่ถูกต้อง: ต้องเป็นแค่ https://xxxx.supabase.co (ไม่มี /rest/v1 หรือข้อความอื่นต่อท้าย)",
    );
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    problems.push("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  if (!process.env.SUPABASE_SECRET_KEY) {
    problems.push("ยังไม่ได้ตั้งค่า SUPABASE_SECRET_KEY");
  }
  return problems;
}

/** หน้าแจ้งปัญหาการตั้งค่า (HTML ล้วน ไม่พึ่ง Supabase) — แสดงเฉพาะ "ชื่อ" ค่าที่ขาด ไม่แสดงค่าจริง */
export function configErrorPage(problems: string[]): string {
  const items = problems.map((p) => `<li>${p}</li>`).join("");
  return `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ตั้งค่าระบบยังไม่ครบ</title></head>
<body style="font-family:Tahoma,Arial,sans-serif;background:#f9fafb;color:#111827;padding:24px">
<div style="max-width:640px;margin:40px auto;background:#fff;border:1px solid #fecaca;border-radius:8px;padding:24px">
<h1 style="font-size:20px;margin:0 0 12px;color:#b91c1c">ตั้งค่าระบบยังไม่ครบ</h1>
<ul style="line-height:1.8">${items}</ul>
<p><b>วิธีแก้ (Vercel):</b> Project → Settings → Environment Variables → เพิ่ม/แก้ค่าให้ครบ
(ติ๊ก Production, Preview, Development) → ไปที่ Deployments → ⋯ → <b>Redeploy</b></p>
<p style="color:#6b7280;font-size:13px">ต้อง Redeploy ทุกครั้งหลังแก้ค่า เพราะค่าบางตัวถูกฝังลงในเว็บตอน build — ดูรายละเอียดใน docs/SETUP.md ขั้นที่ 3</p>
</div></body></html>`;
}
