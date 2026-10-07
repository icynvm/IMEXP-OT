"use client";

import { CalendarOff, PartyPopper } from "lucide-react";
import { useMemo, useState } from "react";
import { ThaiCalendar, type DayMarker } from "@/components/calendar/thai-calendar";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatHours, formatMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

/** 1 คนที่หยุดในวันนั้น — detail = null แปลว่าไม่มีสิทธิ์ดูรายละเอียด (กดไม่ได้) */
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

const WEEKDAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const weekday = (date: string) => WEEKDAY_NAMES[new Date(`${date}T12:00:00Z`).getUTCDay()];

export function LeaveCalendar({
  today,
  minMonth,
  maxMonth,
  items,
  holidays,
}: {
  today: string;
  minMonth: string;
  maxMonth: string;
  items: CalendarItem[];
  holidays: Record<string, string>;
}) {
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [detailItem, setDetailItem] = useState<CalendarItem | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) map.set(item.date, [...(map.get(item.date) ?? []), item]);
    return map;
  }, [items]);

  // เครื่องหมายบนปฏิทิน: วันหยุดนักขัตฤกษ์ + จำนวนคนที่หยุด
  const markers = useMemo(() => {
    const result: Record<string, DayMarker> = {};
    for (const [date, name] of Object.entries(holidays)) result[date] = { holiday: name };
    for (const [date, list] of byDate) result[date] = { ...result[date], count: list.length };
    return result;
  }, [holidays, byDate]);

  // รายการทั้งเดือนที่กำลังดู (วันที่มีคนหยุด หรือวันหยุดนักขัตฤกษ์)
  const monthDates = useMemo(
    () => Object.keys(markers).filter((d) => d.startsWith(month)).sort(),
    [markers, month],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_1fr]">
      <Card>
        <CardContent>
          <ThaiCalendar
            value={selected}
            today={today}
            markers={markers}
            minMonth={minMonth}
            maxMonth={maxMonth}
            showMonthSelect
            onSelect={setSelected}
            onMonthChange={setMonth}
          />
          <div className="text-muted-foreground mt-3 flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-red-50 ring-1 ring-red-200" /> วันหยุดนักขัตฤกษ์
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-primary size-1.5 rounded-full" /> มีคนหยุด
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid content-start gap-6">
        <DayCard date={selected} holiday={holidays[selected]} list={byDate.get(selected) ?? []} onOpen={setDetailItem} />

        <Card>
          <CardHeader>
            <CardTitle>ทั้งเดือน {formatMonth(month)}</CardTitle>
            <CardDescription>กดที่วันเพื่อเลือกดูในปฏิทิน</CardDescription>
          </CardHeader>
          <CardContent>
            {monthDates.length === 0 ? (
              <EmptyState icon={CalendarOff}>ไม่มีวันหยุดและไม่มีคนหยุดในเดือนนี้</EmptyState>
            ) : (
              <ul className="divide-y">
                {monthDates.map((date) => {
                  const list = byDate.get(date) ?? [];
                  return (
                    <li key={date}>
                      <button
                        type="button"
                        onClick={() => setSelected(date)}
                        className={cn(
                          "hover:bg-muted/50 flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left",
                          date === selected && "bg-primary/5",
                        )}
                      >
                        <div className="w-24 shrink-0">
                          <p className={cn("text-sm font-medium", holidays[date] && "text-red-600")}>{formatDate(date)}</p>
                          <p className="text-muted-foreground text-xs">{weekday(date)}</p>
                        </div>
                        <div className="min-w-0 flex-1 text-sm">
                          {holidays[date] && <p className="text-red-600">{holidays[date]}</p>}
                          {list.length > 0 && (
                            <p className="text-muted-foreground truncate">
                              หยุด {list.length} คน: {list.map((i) => i.name).join(", ")}
                            </p>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailItem !== null} onOpenChange={(open) => !open && setDetailItem(null)}>
        <DialogContent>
          {detailItem?.detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detailItem.name}</DialogTitle>
                <DialogDescription>
                  หยุดวันที่ {formatDate(detailItem.date)} · {detailItem.department ?? "ไม่มีแผนก"}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid gap-2 text-sm">
                <Row label="จำนวน">{formatHours(detailItem.detail.hours)}</Row>
                <Row label="ตัดจาก OT">
                  {detailItem.detail.sources.map((s) => (
                    <div key={s.workDate}>
                      {formatDate(s.workDate)} · {formatHours(s.hours)}
                    </div>
                  ))}
                </Row>
                <Row label="เหตุผล">{detailItem.detail.reason ?? "-"}</Row>
                <Row label="อนุมัติโดย">
                  {detailItem.detail.reviewer ?? "-"}
                  {detailItem.detail.reviewNote && <span className="text-muted-foreground"> · {detailItem.detail.reviewNote}</span>}
                </Row>
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** การ์ดวันที่เลือก: วันหยุด + รายชื่อคนหยุด (กดดูรายละเอียดได้เฉพาะคนที่มีสิทธิ์) */
function DayCard({
  date,
  holiday,
  list,
  onOpen,
}: {
  date: string;
  holiday?: string;
  list: CalendarItem[];
  onOpen: (item: CalendarItem) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          วัน{weekday(date)}ที่ {formatDate(date)}
        </CardTitle>
        {holiday && (
          <CardDescription className="flex items-center gap-1.5 text-red-600">
            <PartyPopper className="size-4" />
            {holiday}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-muted-foreground text-sm">ไม่มีพนักงานหยุดในวันนี้</p>
        ) : (
          <ul className="grid gap-2">
            {list.map((item) => {
              const content = (
                <>
                  <div className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                    {item.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.name}
                      {item.isMine && <span className="text-primary"> (คุณ)</span>}
                    </p>
                    <p className="text-muted-foreground text-xs">{item.department ?? "ไม่มีแผนก"}</p>
                  </div>
                  {item.detail && <Badge variant="secondary">{formatHours(item.detail.hours)}</Badge>}
                </>
              );
              return (
                <li key={item.id}>
                  {item.detail ? (
                    <button
                      type="button"
                      onClick={() => onOpen(item)}
                      className="hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 rounded-lg border p-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
