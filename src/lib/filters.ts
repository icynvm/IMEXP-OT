import { STATUS_LABELS } from "@/lib/constants";
import { monthRange, todayTH } from "@/lib/format";
import type { ApprovalStatus } from "@/lib/types";

/**
 * อ่านตัวกรองจาก URL ของหน้าภาพรวม (?month=2026-10&status=approved&employee=<id>)
 * ค่าที่ไม่ถูกต้องจะถูกเปลี่ยนเป็นค่าเริ่มต้น (กันการส่งค่าแปลก ๆ เข้าฐานข้อมูล)
 */
export function parseOverviewFilters(params: Record<string, string | string[] | undefined>) {
  const pick = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : "");

  const monthParam = pick("month");
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : todayTH().slice(0, 7);

  const statusParam = pick("status");
  const status = statusParam in STATUS_LABELS ? (statusParam as ApprovalStatus) : undefined;

  const employeeParam = pick("employee");
  const employeeId = /^[0-9a-f-]{36}$/i.test(employeeParam) ? employeeParam : undefined;

  return { month, status, employeeId, ...monthRange(month) };
}
