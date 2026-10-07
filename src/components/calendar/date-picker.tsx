"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate, shiftMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ThaiCalendar, type DayMarker } from "./thai-calendar";

/**
 * ช่องเลือกวันที่ภาษาไทย: แสดง "7 ต.ค. 2569" กดแล้วเปิดปฏิทิน CalendarJS
 * ค่าที่ส่งไปกับฟอร์มอยู่ใน hidden input เป็น "YYYY-MM-DD" (ค.ศ.) เหมือนเดิม
 */
export function DatePicker({
  id,
  name,
  value,
  onChange,
  today,
  min,
  max,
  holidays,
  invalid,
}: {
  id?: string;
  name: string;
  value: string;
  onChange: (date: string) => void;
  today: string;
  /** วันแรก / วันสุดท้ายที่เลือกได้ "YYYY-MM-DD" */
  min?: string;
  max?: string;
  /** วันหยุดนักขัตฤกษ์ { "YYYY-MM-DD": "ชื่อวันหยุด" } */
  holidays?: Record<string, string>;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const markers: Record<string, DayMarker> = Object.fromEntries(
    Object.entries(holidays ?? {}).map(([d, name]) => [d, { holiday: name }]),
  );

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-invalid={invalid || undefined}
            className={cn("w-full justify-start font-normal", !value && "text-muted-foreground")}
          >
            <CalendarDays className="text-muted-foreground" />
            {value ? formatDate(value) : "เลือกวันที่"}
            {value && holidays?.[value] && <span className="ml-auto truncate text-xs text-red-600">{holidays[value]}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <ThaiCalendar
            value={value}
            today={today}
            markers={markers}
            minMonth={min?.slice(0, 7) ?? shiftMonth(today.slice(0, 7), -24)}
            maxMonth={max?.slice(0, 7) ?? shiftMonth(today.slice(0, 7), 24)}
            isDisabled={(d) => Boolean((min && d < min) || (max && d > max))}
            onSelect={(d) => {
              onChange(d);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
