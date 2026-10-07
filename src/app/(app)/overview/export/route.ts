import { requireUser } from "@/lib/auth";
import { APPROVER_ROLES, PERIOD_SHORT_LABELS, ROLE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { getHistory, getManagedSummaries } from "@/lib/data";
import { parseOverviewFilters } from "@/lib/filters";
import { formatTime, fullName } from "@/lib/format";

/**
 * ดาวน์โหลดข้อมูลเป็นไฟล์ CSV (เปิดด้วย Excel ได้ ภาษาไทยไม่เพี้ยน)
 *   /overview/export?type=requests&month=2026-10
 *   /overview/export?type=usages&month=2026-10
 *   /overview/export?type=balances
 */
function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (value: string | number | null | undefined) => {
    let text = value === null || value === undefined ? "" : String(value);
    // กันสูตร Excel อันตราย (CSV injection) เช่น =HYPERLINK(...)
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  // ﻿ = BOM ให้ Excel อ่านภาษาไทยถูกต้อง
  return "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

export async function GET(request: Request) {
  const user = await requireUser(APPROVER_ROLES);
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filters = parseOverviewFilters(params);
  const type = params.type;

  let rows: (string | number | null | undefined)[][];
  let name: string;

  if (type === "balances") {
    const summaries = await getManagedSummaries(user);
    name = "ot-balances";
    rows = [
      ["รหัสพนักงาน", "ชื่อ-นามสกุล", "บทบาท", "สถานะบัญชี", "ได้รับอนุมัติ (ชม.)", "ใช้แล้ว (ชม.)", "จองไว้ (ชม.)", "คงเหลือ (ชม.)"],
      ...summaries.map((s) => [
        s.employee_code,
        fullName(s),
        ROLE_LABELS[s.role],
        s.is_active ? "ใช้งาน" : "ปิดใช้งาน",
        s.earned_hours,
        s.used_hours,
        s.reserved_hours,
        s.remaining_hours,
      ]),
    ];
  } else if (type === "requests" || type === "usages") {
    const history = await getHistory(user, filters);
    if (type === "requests") {
      name = `ot-requests-${filters.month}`;
      rows = [
        ["รหัสพนักงาน", "ชื่อ-นามสกุล", "วันที่ขอ", "วันที่ทำงาน", "ช่วงเวลา", "เวลาเริ่ม", "เวลาสิ้นสุด", "ชั่วโมง", "รายละเอียดงาน", "สถานะ", "ผู้พิจารณา", "หมายเหตุ"],
        ...history.requests.map((r) => [
          r.employee?.employee_code,
          fullName(r.employee),
          r.request_date,
          r.work_date,
          PERIOD_SHORT_LABELS[r.period],
          formatTime(r.start_time),
          formatTime(r.end_time),
          r.hours,
          r.description,
          STATUS_LABELS[r.status],
          r.reviewer ? fullName(r.reviewer) : "",
          r.review_note,
        ]),
      ];
    } else {
      name = `ot-usages-${filters.month}`;
      rows = [
        ["รหัสพนักงาน", "ชื่อ-นามสกุล", "วันที่ยื่น", "วันที่ใช้", "ชั่วโมง", "ตัดจาก OT วันที่", "เหตุผล", "สถานะ", "ผู้พิจารณา", "หมายเหตุ"],
        ...history.usages.map((u) => [
          u.employee?.employee_code,
          fullName(u.employee),
          u.request_date,
          u.use_date,
          u.hours,
          u.allocations?.map((a) => `${a.ot_request?.work_date} (${a.hours} ชม.)`).join("; "),
          u.reason,
          STATUS_LABELS[u.status],
          u.reviewer ? fullName(u.reviewer) : "",
          u.review_note,
        ]),
      ];
    }
  } else {
    return new Response("type ต้องเป็น requests, usages หรือ balances", { status: 400 });
  }

  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
