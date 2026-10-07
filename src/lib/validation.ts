import { z } from "zod";
import { WORK_END_TIME, WORK_START_TIME } from "@/lib/constants";
import { hoursBetween } from "@/lib/format";
import type { ActionState } from "@/lib/types";

/**
 * กฎตรวจข้อมูลฟอร์ม (ตรวจก่อนส่งเข้าฐานข้อมูล เพื่อแจ้ง error เป็นภาษาไทยที่อ่านง่าย)
 * หมายเหตุ: ฐานข้อมูลตรวจซ้ำอีกชั้นเสมอ ต่อให้ข้ามหน้านี้ไปได้ก็บันทึกข้อมูลผิดไม่ได้
 */

const dateField = (label: string) =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `กรุณาเลือก${label}`);
const timeField = (label: string) =>
  z.string().regex(/^([01]\d|2[0-3]):(00|30)$/, `กรุณาเลือก${label} (ทีละ 30 นาที)`);

const passwordField = z
  .string()
  .min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
  .max(72, "รหัสผ่านยาวเกินไป")
  .regex(/[A-Za-z]/, "รหัสผ่านต้องมีตัวอักษรภาษาอังกฤษอย่างน้อย 1 ตัว")
  .regex(/\d/, "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว");

const employeeCodeField = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{1,30}$/, "รหัสพนักงานใช้ได้เฉพาะ A-Z, 0-9, - และ _ (ไม่เกิน 30 ตัว)");

const nameField = (label: string) =>
  z.string().trim().min(1, `กรุณากรอก${label}`).max(100, `${label}ยาวเกินไป`);

// ---------------------------------------------------------------------------
// สมัครสมาชิก / เข้าสู่ระบบ
// ---------------------------------------------------------------------------
export const registerSchema = z
  .object({
    first_name: nameField("ชื่อ"),
    last_name: nameField("นามสกุล"),
    email: z.string().trim().toLowerCase().pipe(z.email("รูปแบบอีเมลไม่ถูกต้อง")),
    employee_code: employeeCodeField,
    password: passwordField,
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    path: ["confirm_password"],
    message: "รหัสผ่านทั้งสองช่องไม่ตรงกัน",
  });

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("รูปแบบอีเมลไม่ถูกต้อง")),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("รูปแบบอีเมลไม่ถูกต้อง")),
});

export const resetPasswordSchema = z
  .object({ password: passwordField, confirm_password: z.string() })
  .refine((d) => d.password === d.confirm_password, {
    path: ["confirm_password"],
    message: "รหัสผ่านทั้งสองช่องไม่ตรงกัน",
  });

// ---------------------------------------------------------------------------
// คำขอทำ OT
// ---------------------------------------------------------------------------
export const otRequestSchema = z
  .object({
    request_date: dateField("วันที่ขอ"),
    work_date: dateField("วันที่ทำงาน"),
    period: z.enum(["before_work", "after_work"], "กรุณาเลือกช่วงเวลา"),
    start_time: timeField("เวลาเริ่ม"),
    end_time: timeField("เวลาสิ้นสุด"),
    description: z
      .string()
      .trim()
      .min(1, "กรุณาระบุรายละเอียดงาน")
      .max(1000, "รายละเอียดยาวเกินไป (ไม่เกิน 1000 ตัวอักษร)"),
  })
  .superRefine((d, ctx) => {
    if (d.end_time <= d.start_time) {
      ctx.addIssue({ code: "custom", path: ["end_time"], message: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม" });
      return;
    }
    if (d.period === "before_work" && d.end_time > WORK_START_TIME) {
      ctx.addIssue({
        code: "custom",
        path: ["end_time"],
        message: `OT ก่อนเริ่มงานต้องสิ้นสุดไม่เกิน ${WORK_START_TIME}`,
      });
    }
    if (d.period === "after_work" && d.start_time < WORK_END_TIME) {
      ctx.addIssue({
        code: "custom",
        path: ["start_time"],
        message: `OT หลังเลิกงานต้องเริ่มตั้งแต่ ${WORK_END_TIME} เป็นต้นไป`,
      });
    }
    if (hoursBetween(d.start_time, d.end_time) <= 0) {
      ctx.addIssue({ code: "custom", path: ["end_time"], message: "จำนวนชั่วโมงต้องมากกว่า 0" });
    }
  });

// ---------------------------------------------------------------------------
// คำขอใช้ OT
// ---------------------------------------------------------------------------
export const otUsageSchema = z.object({
  use_date: dateField("วันที่ต้องการใช้"),
  reason: z.string().trim().max(1000, "เหตุผลยาวเกินไป").optional(),
  allocations: z
    .array(
      z.object({
        ot_request_id: z.uuid(),
        hours: z
          .number()
          .positive()
          .refine((h) => Number.isInteger(h * 2), "จำนวนชั่วโมงต้องเป็นทีละ 0.5"),
      }),
    )
    .min(1, "กรุณาระบุจำนวนชั่วโมงที่จะใช้อย่างน้อย 1 รายการ"),
});

// ---------------------------------------------------------------------------
// อนุมัติ / จัดการผู้ใช้
// ---------------------------------------------------------------------------
export const reviewSchema = z.object({
  id: z.uuid(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500, "หมายเหตุยาวเกินไป").optional(),
});

export const adminUserSchema = z.object({
  user_id: z.uuid(),
  first_name: nameField("ชื่อ"),
  last_name: nameField("นามสกุล"),
  employee_code: employeeCodeField,
  role: z.enum(["admin", "department_head", "supervisor", "employee"], "กรุณาเลือกบทบาท"),
  // "none" = ไม่มีหัวหน้า (ค่าจากช่องเลือกในฟอร์ม)
  supervisor_id: z.union([z.uuid(), z.literal(""), z.literal("none")]).transform((v) => (v && v !== "none" ? v : null)),
  // "none" = ไม่มีแผนก
  department_id: z.union([z.uuid(), z.literal(""), z.literal("none")]).transform((v) => (v && v !== "none" ? v : null)),
  is_active: z.boolean(),
});

export const holidaySchema = z.object({
  holiday_date: dateField("วันที่"),
  name: z.string().trim().min(1, "กรุณากรอกชื่อวันหยุด").max(200, "ชื่อวันหยุดยาวเกินไป"),
});

export const departmentSchema = z.object({
  id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  name: z.string().trim().min(1, "กรุณากรอกชื่อแผนก").max(100, "ชื่อแผนกยาวเกินไป"),
  head_id: z.union([z.uuid(), z.literal(""), z.literal("none")]).transform((v) => (v && v !== "none" ? v : null)),
});

// ---------------------------------------------------------------------------
// ตัวช่วย
// ---------------------------------------------------------------------------
/** แปลงผลตรวจที่ไม่ผ่าน เป็น state สำหรับแสดงในฟอร์ม */
export function invalid(error: z.ZodError, values?: Record<string, string>): ActionState {
  return {
    ok: false,
    message: "กรุณาตรวจสอบข้อมูลที่กรอก",
    errors: z.flattenError(error).fieldErrors as Record<string, string[]>,
    values,
  };
}

/** ดึงค่าจากฟอร์มเป็น string (ไม่เอาค่าที่เป็นไฟล์) */
export function formValues(formData: FormData, omit: string[] = []): Record<string, string> {
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string" && !key.startsWith("$ACTION") && !omit.includes(key)) {
      values[key] = value;
    }
  });
  return values;
}
