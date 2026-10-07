# โครงสร้างโปรเจกต์ (สำหรับผู้ดูแลต่อ)

เอกสารนี้เขียนสำหรับคนที่ **อาจไม่เคยเขียนโปรแกรมมาก่อน**
อ่านหัวข้อ "อยากแก้ X ไปที่ไหน" ก่อนได้เลย ถ้าต้องการแก้เรื่องเฉพาะ

## ภาพรวม: ระบบทำงานอย่างไร

```
 เบราว์เซอร์ (ผู้ใช้)
      │  1. เปิดหน้าเว็บ / กดส่งฟอร์ม
      ▼
 src/proxy.ts ─────────── ยังไม่ login? → ส่งไปหน้า /login
      ▼
 src/app/...  (หน้าเว็บ)  ─── อ่านข้อมูลผ่าน src/lib/data.ts
      │  2. กดส่งฟอร์ม
      ▼
 src/actions/... (Server Actions) ─── ตรวจข้อมูล (src/lib/validation.ts)
      │  3. เรียกฟังก์ชันในฐานข้อมูล
      ▼
 Supabase (PostgreSQL) ─── ตรวจสิทธิ์ + กฎธุรกิจ แล้วบันทึก
      │  4. สำเร็จ
      ▼
 src/lib/email/notify.ts ─── ส่งอีเมลผ่าน Resend (หลังตอบผู้ใช้แล้ว)
```

**หลักความปลอดภัย 3 ชั้น**
1. `proxy.ts` — คนที่ไม่ได้ login เข้าหน้าไหนไม่ได้เลย (ยกเว้นหน้า login/สมัคร)
2. `requireUser()` ใน `src/lib/auth.ts` — ทุกหน้า/ทุก action เช็กบทบาทซ้ำ
3. **ฐานข้อมูล** (สำคัญที่สุด) — Row Level Security จำกัดว่าใครเห็นข้อมูลไหน และการเขียนข้อมูลต้องผ่านฟังก์ชันที่ตรวจสิทธิ์เท่านั้น
   ต่อให้หน้าเว็บมีบั๊ก ก็ไม่สามารถอนุมัติแทนคนอื่นหรือดูข้อมูลคนอื่นได้

## แผนที่ไฟล์

```
├── supabase/
│   ├── migrations/                         ★ ฐานข้อมูล (รันตามลำดับชื่อไฟล์ ไฟล์ละครั้ง)
│   │   ├── 20261007000000_init.sql         ตาราง, กฎ, สิทธิ์, ฟังก์ชันหลัก
│   │   ├── 20261010000000_departments_…    แผนก, หัวหน้าแผนก, อนุมัติอัตโนมัติ, ตารางวันหยุด
│   │   └── 20261012000000_public_holidays  วันหยุดนักขัตฤกษ์ (ข้อมูลปี 2569–2570)
│   ├── snippets/assign-roles.sql           สคริปต์ตั้งบทบาท/แผนก/หัวหน้า หลายคนพร้อมกัน
│   ├── templates/                          แม่แบบอีเมลยืนยันสมัคร / ลืมรหัสผ่าน (ภาษาไทย)
│   └── config.toml                         ค่าตั้งค่าสำหรับรัน Supabase ในเครื่อง (ไม่มีผลกับของจริง)
│
├── src/
│   ├── proxy.ts                            ด่านแรกของทุก request (เช็ก login)
│   │
│   ├── app/                                ★ หน้าเว็บ — ชื่อโฟลเดอร์ = URL
│   │   ├── (auth)/                         หน้าที่ไม่ต้อง login  (วงเล็บ = ไม่อยู่ใน URL)
│   │   │   ├── login/                      /login
│   │   │   ├── register/                   /register
│   │   │   └── forgot-password/            /forgot-password
│   │   ├── auth/
│   │   │   ├── confirm/route.ts            ปลายทางลิงก์ในอีเมลยืนยัน / ลืมรหัสผ่าน
│   │   │   ├── reset-password/             /auth/reset-password  ตั้งรหัสผ่านใหม่
│   │   │   └── inactive/                   หน้าแจ้งว่าบัญชีถูกปิด
│   │   └── (app)/                          หน้าที่ต้อง login
│   │       ├── layout.tsx                  โหลดผู้ใช้ + ครอบด้วยเมนู (components/app-shell.tsx)
│   │       ├── dashboard/                  /dashboard        หน้าหลัก + ยอดคงเหลือ
│   │       ├── ot-requests/                /ot-requests      รายการคำขอทำ OT
│   │       │   └── new/                    /ot-requests/new  ฟอร์มขอทำ OT
│   │       ├── ot-usages/                  /ot-usages        รายการใช้ OT
│   │       │   └── new/                    /ot-usages/new    ฟอร์มขอใช้ OT
│   │       ├── calendar/                   /calendar         ตารางวันหยุด (ทุกคน)
│   │       ├── approvals/                  /approvals        หน้าอนุมัติ (หัวหน้า/admin)
│   │       ├── overview/                   /overview         ภาพรวม + ตัวกรอง
│   │       │   └── export/route.ts         ดาวน์โหลด CSV
│   │       ├── admin/users/                /admin/users      จัดการผู้ใช้ (admin)
│   │       ├── admin/departments/          /admin/departments จัดการแผนก (admin)
│   │       └── admin/holidays/             /admin/holidays   จัดการวันหยุดนักขัตฤกษ์ (admin)
│   │
│   ├── actions/                            ★ สิ่งที่เกิดขึ้นเมื่อกดปุ่ม "ส่ง" (ทำงานฝั่ง server)
│   │   ├── auth.ts                         login / สมัคร / logout / ลืมรหัสผ่าน
│   │   ├── ot-requests.ts                  ยื่น / ยกเลิก คำขอทำ OT
│   │   ├── ot-usages.ts                    ยื่น / ยกเลิก คำขอใช้ OT
│   │   ├── approvals.ts                    อนุมัติ / ไม่อนุมัติ
│   │   └── admin.ts                        แก้ไขผู้ใช้
│   │
│   ├── components/                         ชิ้นส่วนหน้าจอที่ใช้ซ้ำ
│   │   ├── ui/                             ★ คอมโพเนนต์พื้นฐานจาก shadcn/ui (ปุ่ม, ช่องกรอก, การ์ด, ตาราง, Dialog …)
│   │   ├── calendar/                       ★ ปฏิทินทั้งหมด (ใช้ไลบรารี CalendarJS)
│   │   │   ├── thai-calendar.tsx           ปฏิทินภาษาไทย + เครื่องหมายวันหยุด/คนหยุด
│   │   │   ├── thai-calendar.css           หน้าตาปฏิทิน (สีวันหยุด, จุดคนหยุด, ชื่อวันภาษาไทย)
│   │   │   └── date-picker.tsx             ช่องเลือกวันที่ ("7 ต.ค. 2569") ใช้ในทุกฟอร์ม
│   │   ├── app-shell.tsx                   เมนูซ้าย (จอใหญ่) / เมนูเลื่อนออก (มือถือ) + ไอคอนเมนู
│   │   ├── confirm-dialog.tsx              กล่องยืนยันก่อนทำรายการ (ยกเลิก / อนุมัติ / ไม่อนุมัติ)
│   │   ├── flash-dialog.tsx                กล่องแจ้ง "สำเร็จ" หลังบันทึก
│   │   ├── action-form.tsx                 ฟอร์มที่ไม่ล้างค่าหลังบันทึกไม่สำเร็จ (ใช้กับฟอร์มที่มีช่องเลือก)
│   │   └── ot-tables.tsx                   ตารางคำขอ OT / การใช้ OT / ยอดคงเหลือ
│   │
│   └── lib/                                ★ ตัวช่วยและค่าตั้งค่า
│       ├── constants.ts                    เวลาเข้า-เลิกงาน, ชื่อบทบาท/สถานะภาษาไทย
│       ├── validation.ts                   กฎตรวจฟอร์ม + ข้อความ error
│       ├── errors.ts                       แปลง error จากฐานข้อมูลเป็นภาษาไทย
│       ├── data.ts                         คำสั่งอ่านข้อมูลทั้งหมด
│       ├── auth.ts                         ดึงผู้ใช้ปัจจุบัน + requireUser()
│       ├── format.ts                       จัดรูปแบบวันที่/เวลา/ชั่วโมงภาษาไทย
│       ├── types.ts                        ชนิดข้อมูล (ต้องตรงกับฐานข้อมูล)
│       ├── env.ts                          อ่านค่า Environment Variables
│       ├── email/                          ส่งอีเมล: notify.ts (ส่งเมื่อไหร่/ถึงใคร), template.ts (หน้าตา)
│       └── supabase/                       ตัวเชื่อมต่อ Supabase (ปกติไม่ต้องแก้)
│
├── docs/                                   เอกสาร (ภาษาไทย)
└── .env.example                            ตัวอย่างค่าตั้งค่า
```

ไฟล์ชื่อ `page.tsx` = หน้าเว็บ, `layout.tsx` = กรอบที่ครอบหลายหน้า, `route.ts` = URL ที่ไม่ใช่หน้าเว็บ (เช่น ดาวน์โหลดไฟล์),
`*-form.tsx` = ฟอร์มของหน้านั้น (อยู่โฟลเดอร์เดียวกับหน้าที่ใช้)

## อยากแก้ X ไปที่ไหน

| อยากแก้ | ไฟล์ |
| --- | --- |
| ข้อความ/คำบนหน้าจอ | `page.tsx` หรือ `*-form.tsx` ของหน้านั้นใน `src/app/` |
| ชื่อบทบาท / ชื่อสถานะ / ชื่อช่วงเวลา | `src/lib/constants.ts` |
| เนื้อหา/หัวเรื่องอีเมลแจ้งเตือน | `src/lib/email/notify.ts` (หน้าตา: `template.ts`) |
| อีเมลยืนยันสมัคร / ลืมรหัสผ่าน | `supabase/templates/*.html` แล้ววางใน Supabase Dashboard |
| ข้อความ error ของฟอร์ม | `src/lib/validation.ts` |
| สีหลักของเว็บ | `--primary` ใน `src/app/globals.css` |
| หน้าตาปุ่ม / การ์ด / ตาราง | `src/components/ui/` (ใช้ [Tailwind CSS](https://tailwindcss.com/docs) — ชื่อ class เช่น `bg-blue-600` = พื้นสีน้ำเงิน) |
| เมนู / ไอคอนเมนู | `src/components/app-shell.tsx` (เลือกไอคอนได้ที่ [lucide.dev/icons](https://lucide.dev/icons)) |
| ข้อความในกล่องยืนยัน / กล่องแจ้งเตือน | `title` / `description` ที่ส่งให้ `ConfirmDialog` ในแต่ละหน้า / ข้อความใน `setFlash(...)` ใน `src/actions/` |
| **เวลาเข้า-เลิกงาน (09:00 / 18:00)** | 3 ที่: `src/lib/constants.ts` + constraint `ot_requests_period_window` ในฐานข้อมูล (ทำ migration ใหม่) + ข้อความใน `src/lib/errors.ts` |
| กฎการใช้ OT (เช่น เพิ่มวันหมดอายุ) | ฟังก์ชัน `submit_ot_usage` ในฐานข้อมูล (ทำ migration ใหม่) |

## ตัวอย่าง: แก้ฐานข้อมูลอย่างปลอดภัย

**อย่าแก้ไฟล์ migration ที่รันไปแล้ว** ให้สร้างไฟล์ใหม่ เช่น เปลี่ยนเวลาเลิกงานเป็น 17:30:

`supabase/migrations/20270115000000_change_work_end_time.sql`
```sql
alter table public.ot_requests drop constraint ot_requests_period_window;
alter table public.ot_requests add constraint ot_requests_period_window check (
  (period = 'before_work' and end_time <= time '09:00')
  or (period = 'after_work' and start_time >= time '17:30')
);
```

จากนั้น
1. รันไฟล์นี้ใน Supabase **SQL Editor**
2. แก้ `WORK_END_TIME` ใน `src/lib/constants.ts` เป็น `"17:30"`
3. แก้ข้อความ `ot_requests_period_window` ใน `src/lib/errors.ts`
4. `npm run check` และ `npm run build` ต้องผ่าน → push ขึ้น GitHub

## หน้าตาเว็บ (UI)

| ใช้อะไร | ทำอะไร |
| --- | --- |
| [shadcn/ui](https://ui.shadcn.com) | คอมโพเนนต์พื้นฐาน อยู่ใน `src/components/ui/` เป็นโค้ดของเราเอง แก้ได้ตรง ๆ |
| [Radix UI](https://www.radix-ui.com) | กล่อง Dialog / ช่องเลือก / เมนูมือถือ (shadcn ใช้ Radix อยู่ข้างใน) |
| [Lucide](https://lucide.dev/icons) | ไอคอนทั้งเว็บ เช่น `import { Clock3 } from "lucide-react"` |
| [CalendarJS](https://calendarjs.com) | ปฏิทินทั้งหมด (ตารางวันหยุด + ช่องเลือกวันที่) ห่อไว้ใน `src/components/calendar/` |

อยากได้คอมโพเนนต์ shadcn เพิ่ม: `npx shadcn@latest add <ชื่อ>` (เช่น `tooltip`) แล้วไฟล์จะมาอยู่ใน `src/components/ui/`

## ตารางในฐานข้อมูล

| ตาราง / view | เก็บอะไร |
| --- | --- |
| `profiles` | ผู้ใช้: รหัสพนักงาน, ชื่อ, อีเมล, บทบาท, หัวหน้า, แผนก, เปิด/ปิดบัญชี |
| `departments` | แผนก + หัวหน้าแผนก |
| `public_holidays` | วันหยุดนักขัตฤกษ์ (admin แก้ได้ที่เมนู "วันหยุดนักขัตฤกษ์") |
| `ot_requests` | คำขอทำ OT |
| `ot_usages` | คำขอใช้ OT |
| `ot_usage_allocations` | คำขอใช้ OT แต่ละรายการ ตัดจากคำขอ OT ไหน กี่ชั่วโมง |
| `ot_request_balances` (view) | ยอดคงเหลือต่อคำขอ OT (คำนวณสด) |
| `employee_ot_summary` (view) | ยอดรวมต่อพนักงาน (คำนวณสด) |

ดูข้อมูลได้ที่ Supabase → **Table Editor** (ดูได้ แต่ **ไม่ควรแก้ตรง** ๆ ที่นั่น ยกเว้นตอนตั้ง admin คนแรก)

## ใช้ AI ช่วยแก้โค้ด

ไฟล์ `AGENTS.md` / `CLAUDE.md` มีคำแนะนำสำหรับ AI (เช่น Claude Code) ให้เข้าใจโปรเจกต์นี้
ทุกครั้งที่ให้ AI แก้ ให้สั่งรัน `npm run check` และ `npm run build` ให้ผ่านก่อน push
