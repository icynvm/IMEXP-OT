import type { ApprovalStatus, OtPeriod, Role } from "@/lib/types";

/** เวลาเข้า-เลิกงาน (ต้องตรงกับกฎใน supabase/migrations: ot_requests_period_window) */
export const WORK_START_TIME = "09:00";
export const WORK_END_TIME = "18:00";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "ผู้ดูแลระบบ",
  supervisor: "หัวหน้างาน",
  employee: "พนักงาน",
};

export const PERIOD_LABELS: Record<OtPeriod, string> = {
  before_work: `ก่อนเริ่มงาน (ก่อน ${WORK_START_TIME})`,
  after_work: `หลังเลิกงาน (หลัง ${WORK_END_TIME})`,
};

export const PERIOD_SHORT_LABELS: Record<OtPeriod, string> = {
  before_work: "ก่อนงาน",
  after_work: "หลังงาน",
};

export const STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ไม่อนุมัติ",
  cancelled: "ยกเลิก",
};

/** ตัวเลือกเวลา ทีละ 30 นาที สำหรับช่องเลือกเวลา */
function halfHourSlots(from: string, to: string): string[] {
  const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const slots: string[] = [];
  for (let m = toMinutes(from); m <= toMinutes(to); m += 30) {
    slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return slots;
}

export const TIME_SLOTS: Record<OtPeriod, string[]> = {
  before_work: halfHourSlots("00:00", WORK_START_TIME),
  after_work: halfHourSlots(WORK_END_TIME, "23:30"),
};
