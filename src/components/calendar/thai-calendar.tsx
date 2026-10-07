"use client";

import { Calendar } from "@calendarjs/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { THAI_MONTHS } from "@/lib/constants";
import { formatMonth, shiftMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import "./thai-calendar.css";

/**
 * ปฏิทินภาษาไทย (ใช้ไลบรารี CalendarJS — https://calendarjs.com)
 *
 * สิ่งที่ห่อเพิ่มจากไลบรารี:
 *  - หัวปฏิทินเป็นเดือนไทย + ปี พ.ศ. พร้อมปุ่มเลื่อนเดือน และช่องเลือกเดือน (ไลบรารีแสดงปี ค.ศ.)
 *  - ชื่อวันในสัปดาห์ภาษาไทย (อา จ อ พ พฤ ศ ส) — ทำใน thai-calendar.css
 *  - ทำเครื่องหมายวันหยุดนักขัตฤกษ์ / วันที่มีคนหยุด (ไลบรารีรุ่นนี้ยังทำเองไม่ได้)
 *  - เลื่อนเดือนในเครื่องทันที ไม่ต้องรอ server
 */

// แปลข้อความของไลบรารีเป็นภาษาไทย (ไลบรารีอ่านจาก document.dictionary)
if (typeof document !== "undefined") {
  const doc = document as Document & { dictionary?: Record<string, string> };
  const en = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  doc.dictionary = {
    ...doc.dictionary,
    ...Object.fromEntries(en.map((m, i) => [m, THAI_MONTHS[i]])),
    Sunday: "อาทิตย์", Monday: "จันทร์", Tuesday: "อังคาร", Wednesday: "พุธ",
    Thursday: "พฤหัสบดี", Friday: "ศุกร์", Saturday: "เสาร์",
    Reset: "ล้าง", Done: "ตกลง", Update: "ตกลง",
  };
}

/** เครื่องหมายบนวัน: holiday = ชื่อวันหยุด, count = จำนวนคนที่หยุด */
export type DayMarker = { holiday?: string; count?: number };


export function ThaiCalendar({
  value,
  onSelect,
  markers = {},
  today,
  minMonth,
  maxMonth,
  isDisabled,
  showMonthSelect = false,
  onMonthChange,
  className,
}: {
  /** วันที่ที่เลือก "YYYY-MM-DD" */
  value?: string;
  onSelect?: (date: string) => void;
  markers?: Record<string, DayMarker>;
  /** วันนี้ "YYYY-MM-DD" (เวลาไทย) */
  today: string;
  /** เลื่อนได้ตั้งแต่เดือน "YYYY-MM" ถึงเดือน "YYYY-MM" */
  minMonth?: string;
  maxMonth?: string;
  /** วันที่เลือกไม่ได้ */
  isDisabled?: (date: string) => boolean;
  /** แสดงช่องเลือกเดือน (สำหรับปฏิทินใหญ่) */
  showMonthSelect?: boolean;
  onMonthChange?: (month: string) => void;
  className?: string;
}) {
  const ref = useRef<React.ComponentRef<typeof Calendar>>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState((value ?? today).slice(0, 7));
  // เก็บเดือนที่แสดงอยู่ไว้ใน ref ด้วย เพื่อให้ฟังก์ชันที่ไลบรารีเรียกกลับอ่านค่าล่าสุดได้
  const viewRef = useRef(view);
  useLayoutEffect(() => {
    viewRef.current = view;
  }, [view]);

  // เลื่อนไลบรารีไปเดือนที่ต้องการ (เรียก next/prev ทีละเดือน)
  const goTo = useCallback(
    (target: string) => {
      const inst = ref.current;
      if (!inst) return;
      const diff = monthDiff(viewRef.current, target);
      for (let i = 0; i < Math.abs(diff); i++) (diff > 0 ? inst.next : inst.prev)?.();
      viewRef.current = target;
      setView(target);
      onMonthChange?.(target);
    },
    [onMonthChange],
  );

  // ทำเครื่องหมายบนช่องวัน ทุกครั้งที่ไลบรารีวาดปฏิทินใหม่
  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;
    let frame = 0;
    const decorate = () => {
      root.querySelectorAll<HTMLElement>(".lm-calendar-content > div").forEach((cell) => {
        const grey = cell.getAttribute("data-grey") === "true";
        const date = grey ? null : `${viewRef.current}-${(cell.textContent ?? "").trim().padStart(2, "0")}`;
        const marker = date ? markers[date] : undefined;
        toggle(cell, "data-holiday", Boolean(marker?.holiday));
        toggle(cell, "data-leave", Boolean(marker?.count));
        toggle(cell, "data-today", date === today);
        toggle(cell, "data-blocked", Boolean(date && isDisabled?.(date)));
        cell.title = marker?.holiday ?? "";
      });
    };
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(decorate);
    });
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["data-grey"] });
    decorate();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [markers, today, view, isDisabled]);

  const onChange = useCallback(
    (selected: unknown) => {
      const date = String(selected ?? "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
      if (isDisabled?.(date)) return;
      // กดวันของเดือนข้างเคียง -> ปฏิทินเลื่อนไปเดือนนั้น
      if (date.slice(0, 7) !== viewRef.current) {
        viewRef.current = date.slice(0, 7);
        setView(date.slice(0, 7));
        onMonthChange?.(date.slice(0, 7));
      }
      onSelect?.(date);
    },
    [isDisabled, onMonthChange, onSelect],
  );

  const canPrev = !minMonth || view > minMonth;
  const canNext = !maxMonth || view < maxMonth;
  const monthOptions = showMonthSelect ? monthsBetween(minMonth ?? shiftMonth(view, -24), maxMonth ?? shiftMonth(view, 24)) : [];

  return (
    <div className={cn("thai-calendar grid gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        {showMonthSelect ? (
          <Select value={view} onValueChange={goTo}>
            <SelectTrigger className="w-44 font-semibold" aria-label="เลือกเดือน">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {monthOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {formatMonth(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="px-1 text-sm font-semibold">{formatMonth(view)}</span>
        )}
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon-sm" disabled={!canPrev} onClick={() => goTo(shiftMonth(view, -1))} aria-label="เดือนก่อน">
            <ChevronLeft />
          </Button>
          {showMonthSelect && (
            <Button type="button" variant="outline" size="sm" onClick={() => goTo(today.slice(0, 7))}>
              เดือนนี้
            </Button>
          )}
          <Button type="button" variant="outline" size="icon-sm" disabled={!canNext} onClick={() => goTo(shiftMonth(view, 1))} aria-label="เดือนถัดไป">
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div ref={wrapperRef}>
        <Calendar ref={ref} type="inline" value={value} footer={false} wheel={false} startingDay={0} onChange={onChange} />
      </div>
    </div>
  );
}

function toggle(el: HTMLElement, attr: string, on: boolean) {
  if (on) {
    if (el.getAttribute(attr) !== "true") el.setAttribute(attr, "true");
  } else if (el.hasAttribute(attr)) {
    el.removeAttribute(attr);
  }
}

function monthDiff(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function monthsBetween(from: string, to: string) {
  const list: string[] = [];
  for (let m = from; m <= to; m = shiftMonth(m, 1)) list.push(m);
  return list;
}
