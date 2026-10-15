# ทดสอบทั้งระบบ (E2E)

ทดสอบเหมือนผู้ใช้จริงกดหน้าเว็บ (เปิด Chrome อัตโนมัติ) บน **Supabase ในเครื่อง** เท่านั้น
— ห้ามชี้ไปที่ฐานข้อมูลจริง (สคริปต์จะไม่ยอมรันถ้า `DB_URL` ไม่ใช่ localhost)

| คำสั่ง | ทดสอบอะไร |
| --- | --- |
| `npm run test:e2e` | **ใช้งานจริงตั้งแต่ต้น**: สมัคร → ยืนยันอีเมล → admin ตั้งบทบาท/แผนก → ขอทำ OT → อนุมัติ → ขอใช้ OT (แบ่งอัตโนมัติ/เลือกเอง) → ภาพรวม/CSV → ตารางวันหยุด → วันหยุดนักขัตฤกษ์ → ปิดบัญชี → ลืมรหัสผ่าน → login ด้วยรหัสพนักงาน → โปรไฟล์/รูป · ถ้าหน้าเว็บมี error (JavaScript / console / HTTP 5xx) ถือว่าไม่ผ่าน |
| `npm run test:security` | **จำลองผู้ไม่หวังดี** ยิงตรงไปที่ API (ข้ามหน้าเว็บ): อ่าน/แก้ข้อมูลคนอื่น, แอบตั้งตัวเองเป็น admin, อนุมัติเอง, ใช้ชั่วโมงของคนอื่น, ข้อมูลผิดกฎ, อัปโหลดไฟล์อันตราย, XSS, open redirect, security headers, เดารหัสผ่าน |
| `npm run test:notifications` | PWA (manifest/ไอคอน/service worker/หน้า offline), กระดิ่งแจ้งเตือน, แจ้งเตือนที่มุมจอ, Web Push จริงแบบเข้ารหัสไปยังบริการ Push จำลอง (เปิดเว็บเองที่พอร์ต 3100 / ต้องมี openssl) |
| `npm run test:mobile` | ทุกหน้าที่ความกว้างมือถือ 390px ต้องไม่ล้นจอ |
| `npm run test:perf` | เวลาโหลดแต่ละหน้า + เวลากดเมนูเปลี่ยนหน้า (ใช้เทียบก่อน/หลังแก้) |
| `npm run test:outage` | หยุด API ของฐานข้อมูลชั่วคราว: ผู้ใช้ต้องเห็นหน้า "โหลดข้อมูลไม่สำเร็จ" และกด "ลองใหม่" แล้วกลับมาใช้ได้ |

## วิธีรัน

ต้องมี Docker, Google Chrome และ `psql` (PostgreSQL client)

```bash
npx supabase start                 # ครั้งแรกนานหน่อย / .env.local ต้องชี้มาที่ Supabase ในเครื่อง
npx supabase db reset              # ล้างฐานข้อมูล (test:e2e ต้องเริ่มจากฐานข้อมูลว่าง)
npm run build && npm run start     # เปิดเว็บแบบเดียวกับของจริง (อีกหน้าต่างหนึ่ง)

npm run test:e2e                   # รันก่อนเสมอ (สร้างผู้ใช้ที่ test อื่นใช้)
npm run test:notifications
npm run test:security
npm run test:mobile
npm run test:perf
npm run test:outage
```

ตัวเลือกเพิ่มเติม (ตั้งเป็น Environment Variable): `SHOTS=./shots` เก็บภาพหน้าจอ,
`CHROMIUM_PATH=...` ใช้ Chromium แทน Chrome, `BASE_URL` / `DB_URL` / `MAILPIT_URL` ดูใน `e2e/lib.mjs`

## สิ่งที่ยังต้องตั้งค่าเพิ่มบนระบบจริง (การทดสอบตรวจพบ)

- **เดารหัสผ่านซ้ำ ๆ ไม่ถูกบล็อก** (`test:security` แจ้ง WARN): Supabase จำกัดตาม IP แต่ทุกคนล็อกอินผ่าน server ของ Vercel
  จึงใช้ IP ร่วมกัน → แนะนำเปิด **CAPTCHA (Cloudflare Turnstile)** ที่ Supabase → Authentication → Attack Protection
  (ต้องเพิ่มโค้ดส่ง captcha token ในหน้า login/สมัคร/ลืมรหัสผ่านด้วย)
