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
   - จากนั้นทำแบบเดียวกันกับไฟล์ถัดไปใน `supabase/migrations/` **ตามลำดับชื่อไฟล์** (ไฟล์ละครั้ง):
     [`20261010000000_departments_leave_calendar.sql`](../supabase/migrations/20261010000000_departments_leave_calendar.sql)
     (แผนก, หัวหน้าแผนก, อนุมัติอัตโนมัติ, ตารางวันหยุด)
     แล้วต่อด้วย [`20261012000000_public_holidays.sql`](../supabase/migrations/20261012000000_public_holidays.sql)
     (วันหยุดนักขัตฤกษ์ ปี 2569–2570)
   - ถ้าเคยรันไฟล์แรกไปแล้ว ให้รันเฉพาะไฟล์ที่ยังไม่เคยรัน
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

> ⚠️ **ทุกครั้งที่เพิ่ม/แก้ Environment Variables ต้อง Redeploy** ค่าที่ขึ้นต้น `NEXT_PUBLIC_` ถูกฝังลงในเว็บตอน build
> ถ้า deploy ไปก่อนแล้วค่อยมาใส่ค่า เว็บจะยังไม่เห็นค่าใหม่จนกว่าจะ Redeploy

### ถ้าเปิดเว็บแล้วขึ้น error

| ที่เห็น | สาเหตุ | วิธีแก้ |
| --- | --- | --- |
| หน้า **"ตั้งค่าระบบยังไม่ครบ"** | Environment Variables ขาดหรือผิดรูปแบบ (หน้าจะบอกชื่อตัวที่มีปัญหา) | แก้ค่าตามที่หน้าบอก → **Redeploy** |
| `Internal Server Error` (ตัวหนังสือล้วน) | เว็บเวอร์ชันเก่าก่อนมีหน้าตรวจค่า หรือค่ายังไม่ครบ | Redeploy เวอร์ชันล่าสุด แล้วดูว่าหน้าบอกอะไร / Vercel → **Logs** ดูข้อความ error |
| หน้า **"เกิดข้อผิดพลาด"** มีรหัสอ้างอิง | ฐานข้อมูลยังไม่ได้รันขั้นที่ 1 หรือ key ไม่ตรงโปรเจกต์ | ตรวจขั้นที่ 1 ว่ารัน SQL สำเร็จ / ตรวจว่า URL กับ key มาจากโปรเจกต์เดียวกัน |

`NEXT_PUBLIC_SUPABASE_URL` ต้องเป็นแค่ `https://xxxx.supabase.co` — **ไม่มี** `/rest/v1` หรือ `/` ต่อท้าย

### ใช้ subdomain ของบริษัท (DNS อยู่ที่ Cloudflare)

ตัวอย่างใช้ `ot.your-company.com`

1. **Vercel** → Project → **Settings → Domains** → Add → `ot.your-company.com`
   Vercel จะแสดงค่า CNAME ที่ต้องใช้ (คัดลอกค่าที่ Vercel แสดง **ตรงตัว** — แต่ละโปรเจกต์อาจไม่เหมือนกัน)
2. **Cloudflare** → เลือกโดเมน → **DNS → Records**
   - ลบ record เดิมของชื่อ `ot` (A / AAAA / CNAME) ที่ไม่ใช่ของ Vercel ออกก่อน
   - Add record: Type `CNAME` · Name `ot` · Target = ค่าจาก Vercel · **Proxy status = DNS only (เมฆสีเทา)**
3. รอ 1–10 นาที → กลับไป Vercel Domains ต้องขึ้น **Valid Configuration** และ Vercel จะออก SSL ให้เอง
4. เปลี่ยนค่าเป็นโดเมนใหม่ แล้ว **Redeploy**:
   `NEXT_PUBLIC_SITE_URL=https://ot.your-company.com`
5. Supabase → Authentication → URL Configuration: แก้ **Site URL** และเพิ่ม Redirect URL `https://ot.your-company.com/**` (ขั้นที่ 4)

| อาการ | สาเหตุ | วิธีแก้ |
| --- | --- | --- |
| `DNS_PROBE_FINISHED_NXDOMAIN` / หาโดเมนไม่เจอ | ยังไม่มี record หรือโดเมนไม่ได้ใช้ nameserver ของ Cloudflare | ตรวจ record ข้อ 2 / Cloudflare → Overview สถานะโดเมนต้องเป็น **Active** |
| Vercel ขึ้น **Invalid Configuration** | Target ผิด หรือเปิดเมฆสีส้ม | ใช้ค่าจาก Vercel ตรงตัว + ตั้งเป็น **DNS only** |
| `ERR_TOO_MANY_REDIRECTS` | เปิดเมฆสีส้มคู่กับ SSL แบบ Flexible | ตั้งเป็น DNS only (หรือ Cloudflare → SSL/TLS → **Full (strict)**) |
| `404: DEPLOYMENT_NOT_FOUND` | ยังไม่ได้เพิ่มโดเมนใน Vercel ข้อ 1 | เพิ่มโดเมนใน Vercel |
| เข้าเว็บได้ แต่ลิงก์ในอีเมลพาไป URL เก่า | ยังไม่แก้ข้อ 4–5 | แก้ค่าแล้ว Redeploy |

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

> **ตั้งหลายคนพร้อมกัน:** ใช้สคริปต์ [`supabase/snippets/assign-roles.sql`](../supabase/snippets/assign-roles.sql)
> ใส่อีเมล admin / หัวหน้าแผนก / หัวหน้าทีม / แผนก / สมาชิก แล้วรันใน SQL Editor ได้ในครั้งเดียว
> (ทุกคนต้องสมัครสมาชิกก่อน ถ้ามีอีเมลไหนไม่พบ สคริปต์จะหยุดโดยไม่เปลี่ยนอะไร)

---

## ขั้นที่ 6 — เตรียมใช้งาน

1. ให้หัวหน้าและพนักงานทุกคน **สมัครสมาชิกเอง** ที่หน้าเว็บ
2. admin เข้า **จัดการผู้ใช้** → ตั้งบทบาท **หัวหน้าแผนก** / **หัวหน้าทีม** ให้หัวหน้าแต่ละคน
3. admin เข้า **แผนก** → **สร้างแผนก** → ใส่ชื่อแผนก + เลือกหัวหน้าแผนก
4. admin เข้า **จัดการผู้ใช้** → แก้ไขทีละคน → ตั้ง **แผนก** และ **หัวหน้าผู้อนุมัติ** (หัวหน้าทีมของคนนั้น)
   (ถ้าไม่ตั้งหัวหน้า คำขอจะส่งให้หัวหน้าแผนก หรือ admin พิจารณาแทน — หน้าจัดการผู้ใช้จะเตือนจำนวนคนที่ยังไม่มีหัวหน้า)
   ข้อ 2–4 ทำทีเดียวหลายคนได้ด้วย [`supabase/snippets/assign-roles.sql`](../supabase/snippets/assign-roles.sql)
5. ทดสอบ 1 รอบ: พนักงานขอ OT → หัวหน้าได้อีเมล → อนุมัติ → พนักงานได้อีเมล → ขอใช้ชั่วโมง → ดูในตารางวันหยุด

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
