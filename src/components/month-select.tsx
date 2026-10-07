"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMonth, shiftMonth } from "@/lib/format";

/**
 * ช่องเลือกเดือนแบบไทย ("ตุลาคม 2569") แทนช่อง <input type="month"> ของเบราว์เซอร์
 * ซึ่งแสดงเป็นภาษาอังกฤษ / ปี ค.ศ. ตามเครื่องผู้ใช้
 * ค่าที่ส่งไปกับฟอร์มยังเป็นรูปแบบ "YYYY-MM" (ค.ศ.) เหมือนเดิม
 */
export function MonthSelect({
  id,
  name,
  defaultValue,
  current,
  monthsBack = 24,
  monthsForward = 6,
}: {
  id?: string;
  name: string;
  defaultValue: string;
  /** เดือนปัจจุบัน "YYYY-MM" ใช้เป็นจุดอ้างอิงของรายการ */
  current: string;
  monthsBack?: number;
  monthsForward?: number;
}) {
  const months: string[] = [];
  for (let i = monthsForward; i >= -monthsBack; i--) months.push(shiftMonth(current, i));
  if (!months.includes(defaultValue)) months.push(defaultValue);

  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {months.map((m) => (
          <SelectItem key={m} value={m}>
            {formatMonth(m)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
