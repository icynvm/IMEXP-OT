/**
 * ชนิดข้อมูลที่ใช้ทั้งระบบ (ตรงกับตารางใน supabase/migrations)
 * ถ้าเพิ่มคอลัมน์ในฐานข้อมูล ให้มาเพิ่มที่นี่ด้วย
 */

export type Role = "admin" | "supervisor" | "employee";
export type OtPeriod = "before_work" | "after_work";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "cancelled";

export type Profile = {
  id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  email: string;
  role: Role;
  supervisor_id: string | null;
  is_active: boolean;
};

/** ข้อมูลพนักงานแบบย่อ (ใช้แสดงชื่อในตาราง) */
export type PersonRef = Pick<Profile, "first_name" | "last_name" | "employee_code">;

/** คำขอทำ OT */
export type OtRequest = {
  id: string;
  employee_id: string;
  request_date: string; // YYYY-MM-DD
  work_date: string;
  period: OtPeriod;
  start_time: string; // HH:MM:SS
  end_time: string;
  hours: number;
  description: string;
  status: ApprovalStatus;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  employee?: PersonRef | null;
  reviewer?: PersonRef | null;
};

/** การตัดชั่วโมงจากคำขอ OT หนึ่งรายการ */
export type OtUsageAllocation = {
  ot_request_id: string;
  hours: number;
  ot_request?: Pick<OtRequest, "work_date" | "period" | "start_time" | "end_time" | "description"> | null;
};

/** คำขอใช้ OT */
export type OtUsage = {
  id: string;
  employee_id: string;
  request_date: string;
  use_date: string;
  hours: number;
  reason: string | null;
  status: ApprovalStatus;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  employee?: PersonRef | null;
  reviewer?: PersonRef | null;
  allocations?: OtUsageAllocation[];
};

/** ยอดคงเหลือต่อคำขอ OT ที่อนุมัติแล้ว (view: ot_request_balances) */
export type OtRequestBalance = {
  ot_request_id: string;
  employee_id: string;
  request_date: string;
  work_date: string;
  period: OtPeriod;
  start_time: string;
  end_time: string;
  description: string;
  hours: number;
  used_hours: number;
  reserved_hours: number;
  remaining_hours: number;
};

/** ยอดรวมต่อพนักงาน (view: employee_ot_summary) */
export type EmployeeOtSummary = {
  employee_id: string;
  employee_code: string;
  first_name: string;
  last_name: string;
  role: Role;
  supervisor_id: string | null;
  is_active: boolean;
  earned_hours: number;
  used_hours: number;
  reserved_hours: number;
  remaining_hours: number;
};

/** ผลลัพธ์ที่ Server Action ส่งกลับไปให้ฟอร์มแสดง */
export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  values?: Record<string, string>;
};
