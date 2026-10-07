# ติดตั้งและนำขึ้นใช้งานจริง

ทำตามลำดับ ใช้เวลาประมาณ 30–60 นาที (ส่วนที่นานที่สุดคือรอ DNS ของโดเมนอีเมล)

> **สิ่งที่ต้องมี**: บัญชี GitHub (มีโค้ดนี้อยู่), บัญชี Supabase, บัญชี Resend, บัญชี Vercel และสิทธิ์แก้ DNS ของโดเมนบริษัท (สำหรับส่งอีเมล)

---

## ขั้นที่ 1 — สร้างฐานข้อมูลบน Supabase

1. เข้า <https://supabase.com/dashboard> → **New project**
   - Region: เลือก **Southeast Asia (Singapore)** (ใกล้ไทยที่สุด)
   - ตั้งรหัสผ่านฐานข้อมูลแล้ว **จดเก็บไว้**
2. รอโปรเจกต์สร้างเสร็จ → เมนูซ้าย **SQL Editor** → **New query**
3. คัดลอกไฟล์ [`supabase/migrations/20261007000000_init.sql`](../supabase/migrations/20261007000000_init.sql) **แบบข้อความดิบ**
   - บน GitHub: เปิดไฟล์ → กดปุ่ม **Copy raw file** (ไอคอนสองแผ่นซ้อน มุมขวาบนของไฟล์) หรือกด **Raw** แล้ว `Ctrl+A` → `Ctrl+C`
   - ⚠️ อย่าคัดลอกจากหน้าที่แสดงผลแบบจัดรูปแบบ (เช่น แชต, Notion, เอกสาร) เพราะอาจทำให้เนื้อหาบางส่วนหายไป
4. วางในช่อง SQL ที่ว่างเปล่า → **คลิกที่ว่างในช่อง 1 ครั้งให้ไม่มีข้อความถูกไฮไลต์** → กด **Run**
   - ถ้ามีข้อความถูกไฮไลต์อยู่ Supabase จะรัน **เฉพาะส่วนที่ไฮไลต์** ทำให้เกิด error
   - ต้องขึ้น `Success. No rows returned`
   - ไฟล์นี้สร้างตาราง, กฎสิทธิ์ และฟังก์ชันทั้งหมด — รันสำเร็จ **ครั้งเดียว** เท่านั้น
5. ไปที่ **Project Settings → API Keys** จดค่าเหล่านี้ไว้ใช้ในขั้นที่ 3:
   - **Project URL** (เช่น `https://abcd1234.supabase.co`)
   - **Publishable key** (ขึ้นต้น `sb_publishable_`)
   - **Secret key** (ขึ้นต้น `sb_secret_`) — ⚠️ ห้ามเปิดเผยหรือส่งให้ใคร

### ถ้ากด Run แล้วขึ้น error

| ข้อความ error | สาเหตุ | วิธีแก้ |
| --- | --- | --- |
| `42P13: no function body specified` | SQL ที่วางไม่ครบ (คัดลอกไม่ครบ หรือมีข้อความถูกไฮไลต์อยู่ตอนกด Run) | ลบทุกอย่างในช่อง → คัดลอกใหม่แบบ **Copy raw file** → วาง → คลิกที่ว่างให้ไม่มีไฮไลต์ → Run |
| `syntax error at or near ...` | SQL ที่วางไม่ครบ / ถูกแก้ไข | เหมือนข้างบน |
| `type "user_role" already exists` | เคยรันสำเร็จไปแล้ว | ไม่ต้องรันซ้ำ ไปขั้นต่อไปได้เลย |

ถ้ารันแล้ว error ระบบจะ **ยกเลิกทั้งหมดให้อัตโนมัติ** (ไม่มีอะไรถูกสร้างค้างไว้) จึงแก้แล้วรันใหม่ได้ทันที

---

## ขั้นที่ 2 — ตั้งค่าอีเมลด้วย Resend

ระบบส่งอีเมล 2 แบบ:
- **อีเมลยืนยันสมัคร / ลืมรหัสผ่าน** → Supabase เป็นคนส่ง (ผ่าน SMTP ของ Resend)
- **อีเมลแจ้งเตือนคำขอ OT / ผลอนุมัติ** → ตัวเว็บส่งเองผ่าน Resend API

1. เข้า <https://resend.com> → **Domains → Add Domain** → ใส่โดเมนบริษัท (เช่น `your-company.com`)
2. นำ DNS records ที่ Resend แสดง ไปเพิ่มในระบบจัดการโดเมน แล้วรอสถานะเป็น **Verified**
3. **API Keys → Create API Key** (สิทธิ์ Sending access) → จดค่า (ขึ้นต้น `re_`)
4. กลับไป Supabase → **Authentication → Emails → SMTP Settings** → เปิด **Enable custom SMTP**

   | ช่อง | ค่า |
   | --- | --- |
   | Sender email | `ot@your-company.com` (โดเมนที่ verify แล้ว) |
   | Sender name | `ระบบ OT` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | API key จากข้อ 3 |

   > ⚠️ ถ้าไม่ตั้ง SMTP ของตัวเอง Supabase จะส่งอีเมลยืนยันได้น้อยมาก และอาจส่งได้เฉพาะสมาชิกทีม Supabase เท่านั้น — พนักงานจะสมัครไม่ได้

---

## ขั้นที่ 3 — นำเว็บขึ้น Vercel

1. เข้า <https://vercel.com/new> → **Import** repository นี้จาก GitHub
2. Framework จะถูกตรวจพบเป็น **Next.js** อัตโนมัติ ไม่ต้องแก้ Build settings
3. เปิดหัวข้อ **Environment Variables** แล้วใส่ (รายละเอียดแต่ละตัวอยู่ใน [`.env.example`](../.env.example)):

   | ชื่อ | ค่า |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL จากขั้นที่ 1 |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
   | `SUPABASE_SECRET_KEY` | Secret key |
   | `RESEND_API_KEY` | API key ของ Resend |
   | `EMAIL_FROM` | `ระบบ OT <ot@your-company.com>` |
   | `NEXT_PUBLIC_SITE_URL` | URL ของเว็บ เช่น `https://imexp-ot.vercel.app` (ถ้ายังไม่รู้ ใส่ทีหลังได้ แล้วกด Redeploy) |

4. กด **Deploy** → รอจนเสร็จ จะได้ URL ของเว็บ
5. ถ้า URL จริงไม่ตรงกับ `NEXT_PUBLIC_SITE_URL` ให้แก้ค่าแล้ว **Deployments → ⋯ → Redeploy**

---

## ขั้นที่ 4 — บอก Supabase ว่าเว็บอยู่ที่ไหน

Supabase → **Authentication → URL Configuration**

- **Site URL**: URL ของเว็บ เช่น `https://imexp-ot.vercel.app`
- **Redirect URLs** → Add URL:
  - `https://imexp-ot.vercel.app/**`
  - `http://localhost:3000/**` (สำหรับทดสอบในเครื่อง)

Supabase → **Authentication → Sign In / Providers → Email**

- **Confirm email**: เปิด (แนะนำ เพื่อยืนยันว่าเป็นอีเมลจริงของพนักงาน)
- **Minimum password length**: `8`

### แม่แบบอีเมลภาษาไทย (แนะนำ)

Supabase → **Authentication → Emails → Templates**

| แม่แบบ | Subject | Body (คัดลอกจากไฟล์) |
| --- | --- | --- |
| **Confirm signup** | `ยืนยันอีเมล — ระบบขอ OT` | [`supabase/templates/confirmation.html`](../supabase/templates/confirmation.html) |
| **Reset password** | `ตั้งรหัสผ่านใหม่ — ระบบขอ OT` | [`supabase/templates/recovery.html`](../supabase/templates/recovery.html) |

แม่แบบนี้ใช้ลิงก์แบบ `token_hash` ทำให้ **กดลิงก์จากมือถือได้แม้สมัครจากคอมพิวเตอร์**
(ถ้าใช้แม่แบบเดิมของ Supabase ระบบก็ยังทำงานได้ แต่ลิงก์ตั้งรหัสผ่านใหม่ต้องเปิดในเบราว์เซอร์เดียวกับที่กดขอ)

---

## ขั้นที่ 5 — สร้าง admin คนแรก

1. เปิดเว็บ → **สมัครสมาชิก** ด้วยข้อมูลของคุณ → กดลิงก์ยืนยันในอีเมล
2. Supabase → **SQL Editor** → รันคำสั่งนี้ (แก้อีเมลเป็นของคุณ):

   ```sql
   update public.profiles set role = 'admin' where email = 'you@your-company.com';
   ```

3. Logout แล้ว Login ใหม่ → จะเห็นเมนู **จัดการผู้ใช้**

หลังจากนี้ไม่ต้องใช้ SQL อีก — จัดการทุกอย่างผ่านหน้าเว็บ

---

## ขั้นที่ 6 — เตรียมใช้งาน

1. ให้หัวหน้างานและพนักงาน **สมัครสมาชิกเอง** ที่หน้าเว็บ
2. admin เข้า **จัดการผู้ใช้** →
   - ตั้งบทบาท **หัวหน้างาน** ให้หัวหน้า
   - ตั้ง **หัวหน้าผู้อนุมัติ** ให้พนักงานแต่ละคน
     (ถ้าไม่ตั้ง คำขอของคนนั้นจะส่งให้ admin ทุกคนพิจารณาแทน — หน้าจัดการผู้ใช้จะเตือนจำนวนคนที่ยังไม่มีหัวหน้า)
3. ทดสอบ 1 รอบ: พนักงานขอ OT → หัวหน้าได้อีเมล → อนุมัติ → พนักงานได้อีเมล → ขอใช้ชั่วโมง

---

## การดูแลระบบ

| เรื่อง | ทำที่ไหน |
| --- | --- |
| พนักงานลาออก | จัดการผู้ใช้ → แก้ไข → เอาเครื่องหมาย **เปิดใช้งานบัญชี** ออก (ข้อมูลเก่ายังอยู่ครบ) |
| อีเมลแจ้งเตือนไม่ไป | Vercel → Project → **Logs** ค้นคำว่า `[email]` / Resend → **Emails** ดูสถานะ |
| อีเมลยืนยันสมัครไม่ไป | ตรวจ SMTP ในขั้นที่ 2 / Supabase → **Logs → Auth** |
| สำรองข้อมูล | Supabase → **Database → Backups** (แผน Pro สำรองรายวันอัตโนมัติ) หรือดาวน์โหลด CSV จากหน้า **ภาพรวม** |
| อัปเดตโค้ด | push ขึ้น GitHub branch หลัก → Vercel deploy ให้อัตโนมัติ |

### ถ้าต้องแก้โครงสร้างฐานข้อมูลในอนาคต

**ห้ามแก้ไฟล์ migration เดิมที่รันไปแล้ว** ให้สร้างไฟล์ใหม่ใน `supabase/migrations/` ตั้งชื่อขึ้นต้นด้วยวันเวลา
(เช่น `20270115000000_add_department.sql`) แล้วนำไปรันใน SQL Editor — ดูตัวอย่างใน [STRUCTURE.md](STRUCTURE.md)
