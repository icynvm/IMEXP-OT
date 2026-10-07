import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ApprovalStatus,
  Department,
  EmployeeOtSummary,
  LeaveCalendarEntry,
  PublicHoliday,
  OtRequest,
  OtRequestBalance,
  OtUsage,
  Profile,
} from "@/lib/types";

/**
 * รวมคำสั่งอ่านข้อมูลทั้งหมดของหน้าเว็บไว้ที่นี่
 * ทุกคำสั่งรันด้วยสิทธิ์ของผู้ใช้ที่ login อยู่ -> RLS ในฐานข้อมูลกรองข้อมูลให้แล้ว
 * (พนักงานเห็นแค่ของตัวเอง / หัวหน้าเห็นลูกทีม / admin เห็นทั้งหมด)
 */

// ส่วน select ที่ใช้ซ้ำ  (employee:profiles!... = ดึงชื่อพนักงานมาด้วย)
// reviewer_name = ชื่อผู้อนุมัติ (ฟังก์ชันในฐานข้อมูล อ่านได้แม้ไม่มีสิทธิ์ดูโปรไฟล์ของผู้อนุมัติ เช่น admin)
const PERSON = "first_name, last_name, employee_code";
const OT_REQUEST_FIELDS = `
  id, employee_id, request_date, work_date, period, start_time, end_time, hours,
  description, status, reviewed_at, review_note, created_at,
  employee:profiles!ot_requests_employee_id_fkey(${PERSON}),
  reviewer_name
`;
const OT_USAGE_FIELDS = `
  id, employee_id, request_date, use_date, hours, reason, status, reviewed_at, review_note, created_at,
  employee:profiles!ot_usages_employee_id_fkey(${PERSON}),
  reviewer_name,
  allocations:ot_usage_allocations(
    ot_request_id, hours,
    ot_request:ot_requests(work_date, period, start_time, end_time, description)
  )
`;

function check<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) {
    console.error(`[data] ${what}:`, result.error);
    throw new Error(`โหลดข้อมูล${what}ไม่สำเร็จ`);
  }
  return result.data as T;
}

// ---------------------------------------------------------------------------
// ข้อมูลของตัวเอง
// ---------------------------------------------------------------------------
export async function getMyOtRequests(userId: string): Promise<OtRequest[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("ot_requests")
    .select(OT_REQUEST_FIELDS)
    .eq("employee_id", userId)
    .order("work_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(500);
  return check(result, "คำขอ OT") as unknown as OtRequest[];
}

export async function getMyOtUsages(userId: string): Promise<OtUsage[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("ot_usages")
    .select(OT_USAGE_FIELDS)
    .eq("employee_id", userId)
    .order("use_date", { ascending: false })
    .limit(500);
  return check(result, "การใช้ OT") as unknown as OtUsage[];
}

/** คำขอ OT ที่อนุมัติแล้วและยังมีชั่วโมงเหลือ (ใช้ในฟอร์มขอใช้ OT) */
export async function getMyAvailableBalances(userId: string): Promise<OtRequestBalance[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("ot_request_balances")
    .select("*")
    .eq("employee_id", userId)
    .gt("remaining_hours", 0)
    .order("work_date", { ascending: true });
  return check(result, "ยอดคงเหลือ") as OtRequestBalance[];
}

export async function getMySummary(userId: string): Promise<EmployeeOtSummary | null> {
  const supabase = await createClient();
  const result = await supabase
    .from("employee_ot_summary")
    .select("*")
    .eq("employee_id", userId)
    .maybeSingle();
  return check(result, "สรุปยอด") as EmployeeOtSummary | null;
}

export async function getProfileById(id: string | null): Promise<Profile | null> {
  if (!id) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  return data ?? null;
}

// ---------------------------------------------------------------------------
// สำหรับหัวหน้าทีม / หัวหน้าแผนก / admin
// ---------------------------------------------------------------------------
/** รายการรออนุมัติ (ไม่รวมของตัวเอง เพราะอนุมัติตัวเองไม่ได้) */
export async function getPendingApprovals(userId: string) {
  const supabase = await createClient();
  const [requests, usages] = await Promise.all([
    supabase
      .from("ot_requests")
      .select(OT_REQUEST_FIELDS)
      .eq("status", "pending")
      .neq("employee_id", userId)
      .order("work_date", { ascending: true }),
    supabase
      .from("ot_usages")
      .select(OT_USAGE_FIELDS)
      .eq("status", "pending")
      .neq("employee_id", userId)
      .order("use_date", { ascending: true }),
  ]);
  return {
    requests: check(requests, "คำขอ OT รออนุมัติ") as unknown as OtRequest[],
    usages: check(usages, "คำขอใช้ OT รออนุมัติ") as unknown as OtUsage[],
  };
}

/** แผนกที่ผู้ใช้คนนี้เป็นหัวหน้าแผนก */
async function getHeadedDepartmentIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("departments").select("id").eq("head_id", userId);
  return (data ?? []).map((d) => d.id as string);
}

/**
 * ยอดคงเหลือของคนที่ตัวเองดูแล
 *   admin        = ทุกคน
 *   หัวหน้าแผนก  = ทุกคนในแผนก + คนที่ตั้งตัวเองเป็นหัวหน้า (ไม่รวมตัวเอง)
 *   หัวหน้าทีม   = ลูกทีม
 */
export async function getManagedSummaries(viewer: Profile): Promise<EmployeeOtSummary[]> {
  const supabase = await createClient();
  let query = supabase.from("employee_ot_summary").select("*");
  if (viewer.role === "supervisor") {
    query = query.eq("supervisor_id", viewer.id);
  } else if (viewer.role === "department_head") {
    const deptIds = await getHeadedDepartmentIds(viewer.id);
    const filters = [`supervisor_id.eq.${viewer.id}`, ...(deptIds.length ? [`department_id.in.(${deptIds.join(",")})`] : [])];
    query = query.or(filters.join(",")).neq("employee_id", viewer.id);
  }
  const result = await query.order("employee_code", { ascending: true });
  return check(result, "สรุปยอดพนักงาน") as EmployeeOtSummary[];
}

export type HistoryFilter = {
  from: string;
  to: string;
  status?: ApprovalStatus;
  employeeId?: string;
};

/** ประวัติคำขอ OT + คำขอใช้ OT ในช่วงวันที่ (ใช้ในหน้าภาพรวม และ export CSV) */
export async function getHistory(viewer: Profile, filter: HistoryFilter) {
  const supabase = await createClient();

  let requests = supabase
    .from("ot_requests")
    .select(OT_REQUEST_FIELDS)
    .gte("work_date", filter.from)
    .lte("work_date", filter.to);
  let usages = supabase
    .from("ot_usages")
    .select(OT_USAGE_FIELDS)
    .gte("use_date", filter.from)
    .lte("use_date", filter.to);

  if (filter.status) {
    requests = requests.eq("status", filter.status);
    usages = usages.eq("status", filter.status);
  }
  if (filter.employeeId) {
    requests = requests.eq("employee_id", filter.employeeId);
    usages = usages.eq("employee_id", filter.employeeId);
  }
  // หัวหน้าทีม/แผนก: ไม่รวมรายการของตัวเองในภาพรวม
  if (viewer.role === "supervisor" || viewer.role === "department_head") {
    requests = requests.neq("employee_id", viewer.id);
    usages = usages.neq("employee_id", viewer.id);
  }

  const [r, u] = await Promise.all([
    requests.order("work_date", { ascending: true }).limit(2000),
    usages.order("use_date", { ascending: true }).limit(2000),
  ]);
  return {
    requests: check(r, "ประวัติคำขอ OT") as unknown as OtRequest[],
    usages: check(u, "ประวัติการใช้ OT") as unknown as OtUsage[],
  };
}

// ---------------------------------------------------------------------------
// สำหรับ admin
// ---------------------------------------------------------------------------
export async function getAllProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const result = await supabase
    .from("profiles")
    .select("id, employee_code, first_name, last_name, email, role, supervisor_id, department_id, is_active")
    .order("employee_code", { ascending: true });
  return check(result, "รายชื่อผู้ใช้") as Profile[];
}

/** รายชื่อแผนกทั้งหมด (ทุกคนอ่านได้) */
export async function getDepartments(): Promise<Department[]> {
  const supabase = await createClient();
  const result = await supabase.from("departments").select("id, name, head_id").order("name");
  return check(result, "รายชื่อแผนก") as Department[];
}

// ---------------------------------------------------------------------------
// ตารางวันหยุด
// ---------------------------------------------------------------------------
/** ทุกคนเห็นวันที่ + ชื่อ ของการใช้ OT ที่อนุมัติแล้ว (ฟังก์ชัน leave_calendar ในฐานข้อมูล) */
export async function getLeaveCalendar(from: string, to: string): Promise<LeaveCalendarEntry[]> {
  const supabase = await createClient();
  const result = await supabase.rpc("leave_calendar", { p_from: from, p_to: to });
  return check(result, "ตารางวันหยุด") as LeaveCalendarEntry[];
}

/** รายละเอียดการใช้ OT — RLS ส่งกลับเฉพาะรายการที่ผู้ใช้มีสิทธิ์ดู (ของตัวเอง / คนที่ตัวเองดูแล) */
export async function getLeaveDetails(usageIds: string[]): Promise<OtUsage[]> {
  if (usageIds.length === 0) return [];
  const supabase = await createClient();
  const result = await supabase.from("ot_usages").select(OT_USAGE_FIELDS).in("id", usageIds);
  return check(result, "รายละเอียดวันหยุด") as unknown as OtUsage[];
}

/** วันหยุดนักขัตฤกษ์ (ทุกคนอ่านได้) — ไม่ระบุช่วง = ทั้งหมด */
export async function getHolidays(from?: string, to?: string): Promise<PublicHoliday[]> {
  const supabase = await createClient();
  let query = supabase.from("public_holidays").select("holiday_date, name");
  if (from) query = query.gte("holiday_date", from);
  if (to) query = query.lte("holiday_date", to);
  const result = await query.order("holiday_date");
  return check(result, "วันหยุดนักขัตฤกษ์") as PublicHoliday[];
}

/** แปลงรายการวันหยุดเป็น { "YYYY-MM-DD": "ชื่อวันหยุด" } สำหรับปฏิทิน */
export function holidayMap(holidays: PublicHoliday[]): Record<string, string> {
  return Object.fromEntries(holidays.map((h) => [h.holiday_date, h.name]));
}
