import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isApprover, requireUser } from "@/lib/auth";
import { getLeaveCalendar, getLeaveDetails } from "@/lib/data";
import { formatMonth, monthRange, shiftMonth, todayTH } from "@/lib/format";
import { LeaveCalendar, type CalendarItem } from "./leave-calendar";

export const metadata: Metadata = { title: "ตารางวันหยุด" };

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const user = await requireUser();
  const { month: monthParam } = await searchParams;
  const today = todayTH();
  const month =
    typeof monthParam === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : today.slice(0, 7);
  const { from, to } = monthRange(month);

  // ทุกคนเห็นวันที่ + ชื่อ / รายละเอียดดึงเฉพาะรายการที่มีสิทธิ์ (ของตัวเอง หรือคนที่ตัวเองดูแล)
  const entries = await getLeaveCalendar(from, to);
  const details = await getLeaveDetails(entries.filter((e) => e.can_view_detail).map((e) => e.usage_id));
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
          isApprover(user)
            ? "วันที่พนักงานใช้ชั่วโมง OT หยุดงาน (อนุมัติแล้ว) · กดที่วันเพื่อดูรายละเอียดของคนที่คุณดูแล"
            : "วันที่พนักงานใช้ชั่วโมง OT หยุดงาน (อนุมัติแล้ว) · รายละเอียดดูได้เฉพาะหัวหน้า"
        }
      />
      <Card>
        <CardContent className="grid gap-4">
          {/* เลื่อนเดือน (ชื่อเดือนภาษาไทย ปี พ.ศ.) */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">{formatMonth(month)}</h2>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" asChild>
                <Link href={`/calendar?month=${shiftMonth(month, -1)}`} aria-label="เดือนก่อน" title={formatMonth(shiftMonth(month, -1))}>
                  <ChevronLeft />
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/calendar">เดือนนี้</Link>
              </Button>
              <Button variant="outline" size="icon-sm" asChild>
                <Link href={`/calendar?month=${shiftMonth(month, 1)}`} aria-label="เดือนถัดไป" title={formatMonth(shiftMonth(month, 1))}>
                  <ChevronRight />
                </Link>
              </Button>
            </div>
          </div>
          <LeaveCalendar month={month} today={today} items={items} />
        </CardContent>
      </Card>
    </>
  );
}
