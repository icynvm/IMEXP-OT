import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { isApprover, requireUser } from "@/lib/auth";
import { getHolidays, getLeaveCalendar, getLeaveDetails, holidayMap } from "@/lib/data";
import { monthRange, shiftMonth, todayTH } from "@/lib/format";
import { LeaveCalendar, type CalendarItem } from "./leave-calendar";

export const metadata: Metadata = { title: "ตารางวันหยุด" };

/** โหลดข้อมูลล่วงหน้า 12 เดือนก่อน-หลัง ครั้งเดียว -> เลื่อนเดือนในปฏิทินได้ทันทีไม่ต้องรอ */
const MONTHS_AROUND = 12;

export default async function CalendarPage() {
  const user = await requireUser();
  const today = todayTH();
  const thisMonth = today.slice(0, 7);
  const minMonth = shiftMonth(thisMonth, -MONTHS_AROUND);
  const maxMonth = shiftMonth(thisMonth, MONTHS_AROUND);
  const from = monthRange(minMonth).from;
  const to = monthRange(maxMonth).to;

  const [entries, holidays] = await Promise.all([getLeaveCalendar(from, to), getHolidays(from, to)]);

  // รายละเอียด: เฉพาะหัวหน้าทีมขึ้นไป และเฉพาะคนที่ตัวเองดูแล (RLS กรองให้อีกชั้น)
  const approver = isApprover(user);
  const details = approver ? await getLeaveDetails(entries.filter((e) => e.can_view_detail).map((e) => e.usage_id)) : [];
  const detailById = new Map(details.map((d) => [d.id, d]));

  const items: CalendarItem[] = entries.map((e) => {
    const d = detailById.get(e.usage_id);
    return {
      id: e.usage_id,
      date: e.use_date,
      name: `${e.first_name} ${e.last_name}`,
      department: e.department_name,
      isMine: e.employee_id === user.id,
      detail: d
        ? {
            hours: Number(d.hours),
            reason: d.reason,
            reviewer: d.reviewer ? `${d.reviewer.first_name} ${d.reviewer.last_name}` : null,
            reviewNote: d.review_note,
            sources: (d.allocations ?? []).map((a) => ({ workDate: a.ot_request?.work_date ?? "", hours: Number(a.hours) })),
          }
        : null,
    };
  });

  return (
    <>
      <PageHeader
        title="ตารางวันหยุด"
        description={
          approver
            ? "วันหยุดนักขัตฤกษ์ และวันที่พนักงานใช้ชั่วโมง OT หยุดงาน · กดชื่อเพื่อดูรายละเอียดของคนที่คุณดูแล"
            : "วันหยุดนักขัตฤกษ์ และวันที่พนักงานใช้ชั่วโมง OT หยุดงาน"
        }
      />
      <LeaveCalendar
        today={today}
        minMonth={minMonth}
        maxMonth={maxMonth}
        items={items}
        holidays={holidayMap(holidays)}
      />
    </>
  );
}
