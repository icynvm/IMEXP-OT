/**
 * แปลง error จาก Supabase / ฐานข้อมูล ให้เป็นข้อความภาษาไทยที่ผู้ใช้เข้าใจ
 */
type DbError = { message?: string; code?: string } | null | undefined;

const CONSTRAINT_MESSAGES: Record<string, string> = {
  ot_requests_period_window: "ช่วงเวลาไม่ถูกต้อง: ก่อนงานต้องจบไม่เกิน 09:00 / หลังงานต้องเริ่มตั้งแต่ 18:00",
  ot_requests_time_order: "เวลาสิ้นสุดต้องหลังเวลาเริ่ม",
  ot_requests_half_hour: "เวลาต้องเป็นทีละ 30 นาที (เช่น 18:00, 18:30)",
  ot_requests_description_len: "รายละเอียดงานต้องมี 1-1000 ตัวอักษร",
  ot_usages_half_hour: "จำนวนชั่วโมงต้องเป็นทีละ 0.5",
  profiles_employee_code_key: "รหัสพนักงานนี้มีผู้ใช้แล้ว",
  profiles_email_key: "อีเมลนี้มีผู้ใช้แล้ว",
  profiles_employee_code_format: "รหัสพนักงานใช้ได้เฉพาะ A-Z, 0-9, - และ _",
  departments_name_key: "มีแผนกชื่อนี้อยู่แล้ว",
  departments_head_key: "ผู้ใช้นี้เป็นหัวหน้าของแผนกอื่นอยู่แล้ว",
  departments_name_len: "ชื่อแผนกต้องมี 1-100 ตัวอักษร",
  public_holidays_name_len: "ชื่อวันหยุดต้องมี 1-200 ตัวอักษร",
};

/** ข้อความ error ที่เขียนเป็นภาษาไทยมาจากฟังก์ชันในฐานข้อมูลอยู่แล้ว */
const THAI = /[฀-๿]/;

export function toThaiMessage(error: DbError, fallback = "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"): string {
  const message = error?.message ?? "";
  if (THAI.test(message)) return message;

  for (const [constraint, thai] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (message.includes(constraint)) return thai;
  }
  if (error?.code === "42501") return "คุณไม่มีสิทธิ์ทำรายการนี้";

  console.error("[db-error]", error);
  return fallback;
}

/** แปลง error จากระบบ Login (Supabase Auth) */
export function toThaiAuthMessage(error: { code?: string; message?: string } | null | undefined): string {
  switch (error?.code) {
    case "invalid_credentials":
      return "อีเมล/รหัสพนักงาน หรือรหัสผ่านไม่ถูกต้อง";
    case "email_not_confirmed":
      return "กรุณายืนยันอีเมลก่อน (ตรวจสอบกล่องจดหมายของคุณ)";
    case "user_already_exists":
    case "email_exists":
      return "อีเมลนี้ถูกใช้สมัครแล้ว";
    case "weak_password":
      return "รหัสผ่านไม่ปลอดภัยพอ กรุณาตั้งให้ซับซ้อนขึ้น";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
    case "same_password":
      return "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม";
    default:
      if (error?.message?.includes("Database error")) {
        return "บันทึกข้อมูลผู้ใช้ไม่สำเร็จ (รหัสพนักงานหรืออีเมลอาจซ้ำ)";
      }
      console.error("[auth-error]", error);
      return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
  }
}
