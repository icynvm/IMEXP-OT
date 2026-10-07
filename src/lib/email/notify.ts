import "server-only";
import { env } from "@/lib/env";
import { PERIOD_LABELS, STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatHours, formatTime, fullName } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ApprovalStatus, OtPeriod, Role } from "@/lib/types";
import { sendEmail } from "./send";
import { renderEmail } from "./template";

/**
 * การแจ้งเตือนทางอีเมล
 *   - พนักงานยื่นคำขอ   -> ส่งหาหัวหน้าผู้อนุมัติ → ถ้าไม่มี ส่งหาหัวหน้าแผนก → ถ้าไม่มี ส่งหา admin ทุกคน
 *   - หัวหน้ายื่นเอง   -> อนุมัติอัตโนมัติ ไม่ต้องส่งอีเมล
 *   - หัวหน้าพิจารณาแล้ว -> ส่งหาพนักงานเจ้าของคำขอ
 *
 * ใช้ admin client เพราะต้องอ่านอีเมลของคนอื่น (ผู้ใช้ทั่วไปอ่านไม่ได้ตาม RLS)
 */

type Person = {
  id: string;
  first_name: string;
  last_name: string;
  employee_code: string;
  email: string;
  role: Role;
  is_active: boolean;
  supervisor_id: string | null;
  department_id: string | null;
};

const PERSON_FIELDS = "id, first_name, last_name, employee_code, email, role, is_active, supervisor_id, department_id";
const APPROVER_ROLE_NAMES: Role[] = ["supervisor", "department_head", "admin"];

async function getPerson(id: string): Promise<Person | null> {
  const { data } = await createAdminClient()
    .from("profiles")
    .select(PERSON_FIELDS)
    .eq("id", id)
    .maybeSingle<Person>();
  return data ?? null;
}

/** อีเมลผู้อนุมัติของพนักงานคนนี้ */
async function getApproverEmails(employee: Person): Promise<string[]> {
  // 1) หัวหน้าผู้อนุมัติ
  if (employee.supervisor_id) {
    const supervisor = await getPerson(employee.supervisor_id);
    if (supervisor?.is_active && APPROVER_ROLE_NAMES.includes(supervisor.role)) {
      return [supervisor.email];
    }
  }
  // 2) หัวหน้าแผนก
  if (employee.department_id) {
    const { data: dept } = await createAdminClient()
      .from("departments")
      .select("head_id")
      .eq("id", employee.department_id)
      .maybeSingle<{ head_id: string | null }>();
    const head = dept?.head_id && dept.head_id !== employee.id ? await getPerson(dept.head_id) : null;
    if (head?.is_active) return [head.email];
  }
  // 3) admin ทุกคน
  const { data: admins } = await createAdminClient()
    .from("profiles")
    .select("email")
    .eq("role", "admin")
    .eq("is_active", true)
    .neq("id", employee.id);
  return (admins ?? []).map((a) => a.email as string);
}

function employeeLabel(p: Person) {
  return `${fullName(p)} (${p.employee_code})`;
}

// ---------------------------------------------------------------------------
// คำขอทำ OT
// ---------------------------------------------------------------------------
type OtRequestRow = {
  employee_id: string;
  request_date: string;
  work_date: string;
  period: OtPeriod;
  start_time: string;
  end_time: string;
  hours: number;
  description: string;
  status: ApprovalStatus;
  review_note: string | null;
  reviewed_by: string | null;
};

async function getOtRequest(id: string) {
  const { data } = await createAdminClient()
    .from("ot_requests")
    .select("employee_id, request_date, work_date, period, start_time, end_time, hours, description, status, review_note, reviewed_by")
    .eq("id", id)
    .maybeSingle<OtRequestRow>();
  return data;
}

function otRequestRows(r: OtRequestRow): [string, string][] {
  return [
    ["วันที่ขอ", formatDate(r.request_date)],
    ["วันที่ทำงาน", formatDate(r.work_date)],
    ["ช่วงเวลา", `${PERIOD_LABELS[r.period]} ${formatTime(r.start_time)}-${formatTime(r.end_time)}`],
    ["จำนวน", formatHours(r.hours)],
    ["รายละเอียดงาน", r.description],
  ];
}

export async function notifyOtRequestSubmitted(requestId: string) {
  const request = await getOtRequest(requestId);
  if (!request || request.status !== "pending") return; // อนุมัติอัตโนมัติแล้ว ไม่ต้องแจ้งใคร
  const employee = await getPerson(request.employee_id);
  if (!employee) return;

  const { html, text } = renderEmail({
    heading: "มีคำขอทำ OT ใหม่รออนุมัติ",
    intro: `${employeeLabel(employee)} ได้ยื่นคำขอทำ OT`,
    rows: [["พนักงาน", employeeLabel(employee)], ...otRequestRows(request)],
    buttonText: "ไปหน้าอนุมัติ",
    buttonUrl: `${env.siteUrl}/approvals`,
  });
  await sendEmail({
    to: await getApproverEmails(employee),
    subject: `[OT] คำขอทำ OT ใหม่: ${fullName(employee)} วันที่ ${formatDate(request.work_date)}`,
    html,
    text,
  });
}

export async function notifyOtRequestReviewed(requestId: string) {
  const request = await getOtRequest(requestId);
  if (!request) return;
  const [employee, reviewer] = await Promise.all([
    getPerson(request.employee_id),
    request.reviewed_by ? getPerson(request.reviewed_by) : null,
  ]);
  if (!employee) return;

  const status = STATUS_LABELS[request.status];
  const { html, text } = renderEmail({
    heading: `คำขอทำ OT ของคุณ: ${status}`,
    intro: `คำขอทำ OT วันที่ ${formatDate(request.work_date)} ได้รับการพิจารณาแล้ว`,
    rows: [
      ...otRequestRows(request),
      ["ผลการพิจารณา", status],
      ["ผู้พิจารณา", reviewer ? fullName(reviewer) : "-"],
      ["หมายเหตุ", request.review_note ?? "-"],
    ],
    buttonText: "ดูคำขอ OT ของฉัน",
    buttonUrl: `${env.siteUrl}/ot-requests`,
  });
  await sendEmail({
    to: [employee.email],
    subject: `[OT] คำขอทำ OT วันที่ ${formatDate(request.work_date)}: ${status}`,
    html,
    text,
  });
}

// ---------------------------------------------------------------------------
// คำขอใช้ OT
// ---------------------------------------------------------------------------
type OtUsageRow = {
  employee_id: string;
  use_date: string;
  hours: number;
  reason: string | null;
  status: ApprovalStatus;
  review_note: string | null;
  reviewed_by: string | null;
  allocations: { hours: number; ot_request: { work_date: string } | null }[];
};

async function getOtUsage(id: string) {
  const { data } = await createAdminClient()
    .from("ot_usages")
    .select(
      "employee_id, use_date, hours, reason, status, review_note, reviewed_by, allocations:ot_usage_allocations(hours, ot_request:ot_requests(work_date))",
    )
    .eq("id", id)
    .maybeSingle<OtUsageRow>();
  return data;
}

function otUsageRows(u: OtUsageRow): [string, string][] {
  const sources = u.allocations
    .map((a) => `OT ${formatDate(a.ot_request?.work_date)} (${formatHours(a.hours)})`)
    .join(", ");
  return [
    ["วันที่ต้องการใช้", formatDate(u.use_date)],
    ["จำนวน", formatHours(u.hours)],
    ["ตัดจาก", sources || "-"],
    ["เหตุผล", u.reason ?? "-"],
  ];
}

export async function notifyOtUsageSubmitted(usageId: string) {
  const usage = await getOtUsage(usageId);
  if (!usage || usage.status !== "pending") return; // อนุมัติอัตโนมัติแล้ว ไม่ต้องแจ้งใคร
  const employee = await getPerson(usage.employee_id);
  if (!employee) return;

  const { html, text } = renderEmail({
    heading: "มีคำขอใช้ชั่วโมง OT ใหม่รออนุมัติ",
    intro: `${employeeLabel(employee)} ขอใช้ชั่วโมง OT สะสม`,
    rows: [["พนักงาน", employeeLabel(employee)], ...otUsageRows(usage)],
    buttonText: "ไปหน้าอนุมัติ",
    buttonUrl: `${env.siteUrl}/approvals`,
  });
  await sendEmail({
    to: await getApproverEmails(employee),
    subject: `[OT] คำขอใช้ OT ใหม่: ${fullName(employee)} วันที่ ${formatDate(usage.use_date)}`,
    html,
    text,
  });
}

export async function notifyOtUsageReviewed(usageId: string) {
  const usage = await getOtUsage(usageId);
  if (!usage) return;
  const [employee, reviewer] = await Promise.all([
    getPerson(usage.employee_id),
    usage.reviewed_by ? getPerson(usage.reviewed_by) : null,
  ]);
  if (!employee) return;

  const status = STATUS_LABELS[usage.status];
  const { html, text } = renderEmail({
    heading: `คำขอใช้ OT ของคุณ: ${status}`,
    intro:
      usage.status === "approved"
        ? "ระบบได้ตัดชั่วโมงจากยอด OT สะสมของคุณแล้ว"
        : "ชั่วโมงที่จองไว้ได้คืนกลับเข้ายอดคงเหลือของคุณแล้ว",
    rows: [
      ...otUsageRows(usage),
      ["ผลการพิจารณา", status],
      ["ผู้พิจารณา", reviewer ? fullName(reviewer) : "-"],
      ["หมายเหตุ", usage.review_note ?? "-"],
    ],
    buttonText: "ดูการใช้ OT ของฉัน",
    buttonUrl: `${env.siteUrl}/ot-usages`,
  });
  await sendEmail({
    to: [employee.email],
    subject: `[OT] คำขอใช้ OT วันที่ ${formatDate(usage.use_date)}: ${status}`,
    html,
    text,
  });
}
