"use client";

import { Calendar } from "@calendarjs/react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { THAI_MONTHS } from "@/lib/constants";
import { formatMonth, shiftMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import "./thai-calendar.css";

/**
 * ปฏิทินภาษาไทย (ใช้ไลบรารี CalendarJS — https://calendarjs.com)
 *
 * การใช้งาน: กดที่ชื่อเดือนด้านบน -> เลือกเดือน (กดที่ปีเพื่อเลือกปี) -> กลับมาหน้าวันที่
 * ใช้มุมมอง "เดือน" และ "ปี" ของไลบรารีเอง ไม่มี dropdown
 *
 * สิ่งที่ห่อเพิ่มจากไลบรารี:
 *  - หัวปฏิทินเป็นภาษาไทย + ปี พ.ศ. (ไลบรารีแสดงปี ค.ศ.)
 *  - ชื่อวัน / ชื่อเดือนย่อ / ปี พ.ศ. ในตาราง — เปลี่ยนข้อความผ่าน CSS (thai-calendar.css)
 *  - ทำเครื่องหมายวันหยุดนักขัตฤกษ์ / วันที่มีคนหยุด (ไลบรารีรุ่นนี้ยังทำเองไม่ได้)
 *  - เลื่อนเดือนในเครื่องทันที ไม่ต้องรอ server
 */

// แปลข้อความของไลบรารีเป็นภาษาไทย (ไลบรารีอ่านจาก document.dictionary)
const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
if (typeof document !== "undefined") {
  const doc = document as Document & { dictionary?: Record<string, string> };
  doc.dictionary = {
    ...doc.dictionary,
    ...Object.fromEntries(EN_MONTHS.map((m, i) => [m, THAI_MONTHS[i]])),
    Sunday: "อาทิตย์", Monday: "จันทร์", Tuesday: "อังคาร", Wednesday: "พุธ",
    Thursday: "พฤหัสบดี", Friday: "ศุกร์", Saturday: "เสาร์",
    Reset: "ล้าง", Done: "ตกลง", Update: "ตกลง",
  };
}

const THAI_MONTHS_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

/** เครื่องหมายบนวัน: holiday = ชื่อวันหยุด, count = จำนวนคนที่หยุด */
export type DayMarker = { holiday?: string; count?: number };

type LibView = "days" | "months" | "years";
type CalendarRef = React.ComponentRef<typeof Calendar> & { view?: LibView; month?: string; year?: number };

export function ThaiCalendar({
  value,
  onSelect,
  markers = {},
  today,
  minMonth,
  maxMonth,
  isDisabled,
  mode = "date",
  onMonthChange,
  showTodayButton = false,
  className,
}: {
  /** วันที่ที่เลือก "YYYY-MM-DD" (โหมดเลือกเดือน: "YYYY-MM") */
  value?: string;
  /** โหมดวันที่: ส่ง "YYYY-MM-DD" / โหมดเดือน: ส่ง "YYYY-MM" */
  onSelect?: (value: string) => void;
  markers?: Record<string, DayMarker>;
  /** วันนี้ "YYYY-MM-DD" (เวลาไทย) */
  today: string;
  /** เลือก/เลื่อนได้ตั้งแต่เดือน "YYYY-MM" ถึงเดือน "YYYY-MM" */
  minMonth?: string;
  maxMonth?: string;
  /** วันที่เลือกไม่ได้ */
  isDisabled?: (date: string) => boolean;
  /** "date" = เลือกวันที่, "month" = เลือกเดือน (เช่น ตัวกรองรายเดือน) */
  mode?: "date" | "month";
  onMonthChange?: (month: string) => void;
  showTodayButton?: boolean;
  className?: string;
}) {
  const ref = useRef<CalendarRef | null>(null);
  // ฟังก์ชันอ่านสถานะ/ทำเครื่องหมายล่าสุด (เรียกตอนไลบรารีพร้อมใช้งานครั้งแรกด้วย)
  const syncRef = useRef<() => void>(() => {});
  const setCalendarRef = useCallback((inst: CalendarRef | null) => {
    ref.current = inst;
    if (inst) requestAnimationFrame(() => syncRef.current());
  }, []);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const initialMonth = (value ?? today).slice(0, 7);

  // สถานะที่อ่านจากไลบรารี: มุมมอง (วัน/เดือน/ปี), เดือนที่แสดง, ปีที่แสดง
  const [libView, setLibView] = useState<LibView>("days");
  // โหมดเลือกเดือน: true เมื่อไลบรารีแสดงตารางเดือนแล้วจริง (กันการนับว่า "เลือกเดือน" ตอนเพิ่งเปิด)
  const monthGridShown = useRef(false);
  const [view, setView] = useState(initialMonth);
  const [year, setYear] = useState(Number(initialMonth.slice(0, 4)));
  const state = useRef({ libView, view, year });
  useLayoutEffect(() => {
    state.current = { libView, view, year };
  }, [libView, view, year]);

  const inRange = useCallback(
    (month: string) => (!minMonth || month >= minMonth) && (!maxMonth || month <= maxMonth),
    [minMonth, maxMonth],
  );

  // อ่านสถานะจากไลบรารี + ทำเครื่องหมาย ทุกครั้งที่ไลบรารีวาดใหม่
  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;
    let frame = 0;

    const sync = () => {
      const inst = ref.current;
      if (!inst) return;
      const prev = state.current;
      const nextView = (inst.view ?? "days") as LibView;
      const monthIndex = Math.max(0, THAI_MONTHS.indexOf(String(inst.month)), EN_MONTHS.indexOf(String(inst.month)));
      const nextYear = Number(inst.year) || prev.year;
      const nextMonth = `${nextYear}-${String(monthIndex + 1).padStart(2, "0")}`;

      // เลือกปีเสร็จ -> ไปหน้าเลือกเดือน (ไลบรารีจะข้ามไปหน้าวันที่เลย)
      if (prev.libView === "years" && nextView === "days") {
        inst.setView?.("months");
        return;
      }
      if (mode === "month") {
        if (nextView === "months") monthGridShown.current = true;
        if (nextView === "days") {
          // เลือกเดือนเสร็จ -> ส่งค่ากลับ / ตอนเพิ่งเปิด -> แค่สลับไปตารางเดือน
          if (monthGridShown.current && prev.libView === "months" && inRange(nextMonth)) onSelect?.(nextMonth);
          inst.setView?.("months");
          return;
        }
      }

      if (nextView !== prev.libView) setLibView(nextView);
      if (nextYear !== prev.year) setYear(nextYear);
      if (nextView === "days" && nextMonth !== prev.view) {
        setView(nextMonth);
        onMonthChange?.(nextMonth);
      }
      decorate(root, nextView, nextView === "days" ? nextMonth : prev.view, nextYear);
    };

    const decorate = (el: HTMLElement, v: LibView, month: string, y: number) => {
      const cells = el.querySelectorAll<HTMLElement>(".lm-calendar-content > div");
      cells.forEach((cell, i) => {
        const text = (cell.textContent ?? "").trim();
        if (v === "days") {
          const grey = cell.getAttribute("data-grey") === "true";
          const date = grey ? null : `${month}-${text.padStart(2, "0")}`;
          const marker = date ? markers[date] : undefined;
          setAttr(cell, "data-label", null);
          setAttr(cell, "data-holiday", marker?.holiday ? "true" : null);
          setAttr(cell, "data-leave", marker?.count ? "true" : null);
          setAttr(cell, "data-today", date === today ? "true" : null);
          setAttr(cell, "data-blocked", date && (isDisabled?.(date) || !inRange(date.slice(0, 7))) ? "true" : null);
          cell.title = marker?.holiday ?? "";
        } else {
          // ตารางเดือน: ม.ค. ... ธ.ค. / ตารางปี: ปี พ.ศ.
          const cellMonth = v === "months" ? `${y}-${String(i + 1).padStart(2, "0")}` : null;
          const cellYear = v === "years" ? Number(text) : null;
          setAttr(cell, "data-label", v === "months" ? THAI_MONTHS_SHORT[i] : String((cellYear ?? 0) + 543));
          setAttr(cell, "data-holiday", null);
          setAttr(cell, "data-leave", null);
          setAttr(cell, "data-today", (cellMonth ?? String(cellYear)) === (cellMonth ? today.slice(0, 7) : today.slice(0, 4)) ? "true" : null);
          const blocked = cellMonth
            ? !inRange(cellMonth)
            : (minMonth && `${cellYear}-12` < minMonth) || (maxMonth && `${cellYear}-01` > maxMonth);
          setAttr(cell, "data-blocked", blocked ? "true" : null);
          cell.title = "";
        }
      });
    };

    syncRef.current = sync;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    });
    observer.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["data-grey", "data-view", "data-selected"] });
    sync();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [markers, today, isDisabled, inRange, minMonth, maxMonth, mode, onSelect, onMonthChange]);

  const onChange = useCallback(
    (selected: unknown) => {
      if (mode === "month") return;
      const date = String(selected ?? "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || isDisabled?.(date) || !inRange(date.slice(0, 7))) return;
      onSelect?.(date);
    },
    [mode, isDisabled, inRange, onSelect],
  );

  // เลื่อนไปเดือนที่ต้องการในหน้าวันที่ (เรียก next/prev ของไลบรารีทีละเดือน)
  const goToMonth = (target: string) => {
    const inst = ref.current;
    if (!inst) return;
    if (state.current.libView !== "days") inst.setView?.("days");
    const diff = monthDiff(state.current.view, target);
    for (let i = 0; i < Math.abs(diff); i++) (diff > 0 ? inst.next : inst.prev)?.();
  };

  const prev = () => (libView === "days" ? goToMonth(shiftMonth(view, -1)) : ref.current?.prev?.());
  const next = () => (libView === "days" ? goToMonth(shiftMonth(view, 1)) : ref.current?.next?.());
  const canPrev = libView !== "days" || !minMonth || view > minMonth;
  const canNext = libView !== "days" || !maxMonth || view < maxMonth;

  // ข้อความบนหัวปฏิทิน: วัน -> "ตุลาคม 2569" / เดือน -> "2569" / ปี -> "2559 – 2574"
  const firstYear = year - ((year - 2016) % 16 + 16) % 16;
  const label =
    libView === "days" ? formatMonth(view) : libView === "months" ? String(year + 543) : `${firstYear + 543} – ${firstYear + 15 + 543}`;
  const labelHint = libView === "days" ? "เลือกเดือนและปี" : libView === "months" ? "เลือกปี" : "";

  return (
    <div className={cn("thai-calendar grid gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="px-2 text-sm font-semibold"
          aria-label={labelHint ? `${label} (${labelHint})` : label}
          data-calendar-label
          onClick={() => {
            if (libView === "days") ref.current?.setView?.("months");
            else if (libView === "months") ref.current?.setView?.("years");
          }}
          disabled={libView === "years"}
        >
          {label}
          {libView !== "years" && <ChevronDown className="text-muted-foreground" />}
        </Button>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon-sm" disabled={!canPrev} onClick={prev} aria-label={libView === "days" ? "เดือนก่อน" : "ก่อนหน้า"}>
            <ChevronLeft />
          </Button>
          {showTodayButton && (
            <Button type="button" variant="outline" size="sm" onClick={() => goToMonth(today.slice(0, 7))}>
              เดือนนี้
            </Button>
          )}
          <Button type="button" variant="outline" size="icon-sm" disabled={!canNext} onClick={next} aria-label={libView === "days" ? "เดือนถัดไป" : "ถัดไป"}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div ref={wrapperRef}>
        <Calendar
          ref={setCalendarRef}
          type="inline"
          value={mode === "month" ? `${value ?? today.slice(0, 7)}-01` : value}
          footer={false}
          wheel={false}
          startingDay={0}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function setAttr(el: HTMLElement, attr: string, value: string | null) {
  if (value === null) {
    if (el.hasAttribute(attr)) el.removeAttribute(attr);
  } else if (el.getAttribute(attr) !== value) {
    el.setAttribute(attr, value);
  }
}

function monthDiff(from: string, to: string) {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}
