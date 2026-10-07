"use client";

import { Lock } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";

/** 1 คนที่หยุดในวันนั้น — detail = null แปลว่าไม่มีสิทธิ์ดูรายละเอียด */
export type CalendarItem = {
  id: string;
  date: string;
  name: string;
  department: string | null;
  isMine: boolean;
  detail: {
    hours: number;
    reason: string | null;
    reviewer: string | null;
    reviewNote: string | null;
    sources: { workDate: string; hours: number }[];
  } | null;
};

const WEEKDAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

/** ตารางเดือน: กดที่วันเพื่อดูรายชื่อ (และรายละเอียด ถ้ามีสิทธิ์) */
export function LeaveCalendar({ month, today, items }: { month: string; today: string; items: CalendarItem[] }) {
  const [openDate, setOpenDate] = useState<string | null>(null);

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 0 = อาทิตย์
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDate = new Map<string, CalendarItem[]>();
  for (const item of items) byDate.set(item.date, [...(byDate.get(item.date) ?? []), item]);
  const dayItems = openDate ? (byDate.get(openDate) ?? []) : [];

  return (
    <>
      <div className="overflow-hidden rounded-lg border">
        <div className="bg-muted/50 grid grid-cols-7 border-b text-center text-xs font-medium">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={cn("py-2", (i === 0 || i === 6) && "text-muted-foreground")}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="bg-muted/20 min-h-16 border-r border-b sm:min-h-24" />;
            const list = byDate.get(date) ?? [];
            const weekend = i % 7 === 0 || i % 7 === 6;
            const isToday = date === today;
            return (
              <button
                key={date}
                type="button"
                disabled={list.length === 0}
                onClick={() => setOpenDate(date)}
                aria-label={`${formatDate(date)} หยุด ${list.length} คน`}
                className={cn(
                  "flex min-h-16 flex-col items-stretch gap-1 border-r border-b p-1 text-left align-top sm:min-h-24 sm:p-1.5",
                  weekend && "bg-muted/30",
                  list.length > 0 && "hover:bg-primary/5 cursor-pointer",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs",
                    isToday ? "bg-primary text-primary-foreground font-semibold" : weekend && "text-muted-foreground",
                  )}
                >
                  {Number(date.slice(8))}
                </span>
                {/* จอใหญ่: แสดงชื่อ / มือถือ: แสดงจำนวนคน */}
                <div className="hidden flex-col gap-0.5 sm:flex">
                  {list.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className={cn(
                        "truncate rounded px-1.5 py-0.5 text-[11px]",
                        item.isMine ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                      )}
                    >
                      {item.name}
                    </span>
                  ))}
                  {list.length > 3 && <span className="text-muted-foreground px-1 text-[11px]">+{list.length - 3} คน</span>}
                </div>
                {list.length > 0 && (
                  <span className="bg-primary/10 text-primary mx-auto rounded-full px-1.5 text-[11px] font-medium sm:hidden">
                    {list.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={openDate !== null} onOpenChange={(open) => !open && setOpenDate(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>หยุดวันที่ {openDate ? formatDate(openDate) : ""}</DialogTitle>
            <DialogDescription>{dayItems.length} คน (ใช้ชั่วโมง OT ที่อนุมัติแล้ว)</DialogDescription>
          </DialogHeader>
          <ul className="grid gap-3">
            {dayItems.map((item) => (
              <li key={item.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {item.name}
                      {item.isMine && <span className="text-primary"> (คุณ)</span>}
                    </p>
                    <p className="text-muted-foreground text-xs">{item.department ?? "ไม่มีแผนก"}</p>
                  </div>
                  {item.detail && <Badge variant="secondary">{formatHours(item.detail.hours)}</Badge>}
                </div>
                {item.detail ? (
                  <dl className="mt-3 grid gap-1 text-sm">
                    <div className="grid grid-cols-[96px_1fr] gap-2">
                      <dt className="text-muted-foreground">ตัดจาก OT</dt>
                      <dd>
                        {item.detail.sources.map((s) => (
                          <div key={s.workDate}>
                            {formatDate(s.workDate)} · {formatHours(s.hours)}
                          </div>
                        ))}
                      </dd>
                    </div>
                    <div className="grid grid-cols-[96px_1fr] gap-2">
                      <dt className="text-muted-foreground">เหตุผล</dt>
                      <dd>{item.detail.reason ?? "-"}</dd>
                    </div>
                    <div className="grid grid-cols-[96px_1fr] gap-2">
                      <dt className="text-muted-foreground">อนุมัติโดย</dt>
                      <dd>
                        {item.detail.reviewer ?? "-"}
                        {item.detail.reviewNote && (
                          <span className="text-muted-foreground"> · {item.detail.reviewNote}</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                    <Lock className="size-3" />
                    รายละเอียดดูได้เฉพาะหัวหน้าที่ดูแล
                  </p>
                )}
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
