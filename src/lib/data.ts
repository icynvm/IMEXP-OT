import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ApprovalStatus,
  EmployeeOtSummary,
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
const PERSON = "first_name, last_name, employee_code";
const OT_REQUEST_FIELDS = `
  id, employee_id, request_date, work_date, period, start_time, end_time, hours,
  description, status, reviewed_at, review_note, created_at,
  employee:profiles!ot_requests_employee_id_fkey(${PERSON}),
  reviewer:profiles!ot_requests_reviewed_by_fkey(${PERSON})
`;
const OT_USAGE_FIELDS = `
  id, employee_id, request_date, use_date, hours, reason, status, reviewed_at, review_note, created_at,
  employee:profiles!ot_usages_employee_id_fkey(${PERSON}),
  reviewer:profiles!ot_usages_reviewed_by_fkey(${PERSON}),
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
// สำหรับหัวหน้างาน / admin
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

/** ยอดคงเหลือของคนที่ตัวเองดูแล (หัวหน้า = ลูกทีม, admin = ทุกคน) */
export async function getManagedSummaries(viewer: Profile): Promise<EmployeeOtSummary[]> {
  const supabase = await createClient();
  let query = supabase.from("employee_ot_summary").select("*");
  if (viewer.role === "supervisor") query = query.eq("supervisor_id", viewer.id);
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
  // หัวหน้า: ไม่รวมรายการของตัวเองในภาพรวมทีม
  if (viewer.role === "supervisor") {
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
    .select("id, employee_code, first_name, last_name, email, role, supervisor_id, is_active")
    .order("employee_code", { ascending: true });
  return check(result, "รายชื่อผู้ใช้") as Profile[];
}
