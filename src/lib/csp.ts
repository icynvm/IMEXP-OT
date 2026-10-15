/**
 * Content-Security-Policy: บอกเบราว์เซอร์ว่าหน้าเว็บเราโหลด/รันอะไรได้บ้าง
 * ถ้ามีคนแอบฝังโค้ดเข้ามาได้ (XSS) เบราว์เซอร์จะไม่ยอมรัน เพราะไม่มี nonce ที่ถูกต้อง
 *
 * - script: เฉพาะไฟล์ของเว็บเราที่มี nonce (สุ่มใหม่ทุก request) — ห้าม inline script / script จากเว็บอื่น
 * - style: อนุญาต inline style เพราะ Radix / ปฏิทินกำหนดตำแหน่งด้วย style="..." (ความเสี่ยงต่ำกว่า script มาก)
 * - รูป: เว็บเรา + Supabase (รูปโปรไฟล์) / เชื่อมต่อ: เฉพาะเว็บเรา (ทุกอย่างผ่าน server)
 * - ห้ามถูกฝังใน iframe, ห้ามส่งฟอร์มไปเว็บอื่น, ห้าม <object>/<embed>
 */
export function buildCsp(nonce: string, options: { isDev: boolean; https: boolean }) {
  const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data: ${supabase}`,
    "font-src 'self'",
    `connect-src 'self'${options.isDev ? " ws: wss:" : ""}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  // บังคับ https เฉพาะตอนใช้งานจริง (ในเครื่องเป็น http://localhost)
  if (options.https) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}
