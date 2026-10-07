"use client";

import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMonth } from "@/lib/format";
import { ThaiCalendar } from "./thai-calendar";

/**
 * ช่องเลือกเดือน (เช่น ตัวกรองรายเดือน): กดแล้วเปิดตารางเดือนของ CalendarJS
 * กดที่ปีด้านบนเพื่อเปลี่ยนปี · ค่าที่ส่งไปกับฟอร์มเป็น "YYYY-MM" (ค.ศ.)
 */
export function MonthPicker({
  id,
  name,
  defaultValue,
  today,
  minMonth,
  maxMonth,
}: {
  id?: string;
  name: string;
  defaultValue: string;
  today: string;
  minMonth?: string;
  maxMonth?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" className="w-full justify-start font-normal">
            <CalendarDays className="text-muted-foreground" />
            {formatMonth(value)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-3" align="start">
          <ThaiCalendar
            mode="month"
            value={value}
            today={today}
            minMonth={minMonth}
            maxMonth={maxMonth}
            onSelect={(month) => {
              setValue(month);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
