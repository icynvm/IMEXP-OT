"use client";

import { Moon, Send, Sunrise, Timer } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { submitOtRequest } from "@/actions/ot-requests";
import { ActionForm } from "@/components/action-form";
import { ActionMessage } from "@/components/action-message";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PERIOD_LABELS, TIME_SLOTS } from "@/lib/constants";
import { formatHours, hoursBetween } from "@/lib/format";
import type { ActionState, OtPeriod } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEFAULT_TIMES: Record<OtPeriod, { start: string; end: string }> = {
  before_work: { start: "07:00", end: "09:00" },
  after_work: { start: "18:00", end: "20:00" },
};
const PERIOD_ICONS = { before_work: Sunrise, after_work: Moon };

export function OtRequestForm({ today }: { today: string }) {
  const [state, action] = useActionState<ActionState, FormData>(submitOtRequest, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};

  // เก็บเวลาเริ่ม/สิ้นสุดแยกตามช่วงเวลา: สลับช่วงไปมาแล้วเวลาที่เลือกไว้ไม่หาย
  const [period, setPeriod] = useState<OtPeriod>("after_work");
  const [times, setTimes] = useState(DEFAULT_TIMES);
  const { start, end } = times[period];
  const setStart = (value: string) => setTimes((t) => ({ ...t, [period]: { ...t[period], start: value } }));
  const setEnd = (value: string) => setTimes((t) => ({ ...t, [period]: { ...t[period], end: value } }));
  const hours = hoursBetween(start, end);

  return (
    <ActionForm action={action} className="grid gap-6">
      <ActionMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="วันที่ขอ" htmlFor="request_date" error={e.request_date} required>
          <Input id="request_date" name="request_date" type="date" max={today} required defaultValue={v.request_date ?? today} />
        </FormField>
        <FormField label="วันที่ทำงาน (วันที่ทำ OT)" htmlFor="work_date" error={e.work_date} required>
          <Input id="work_date" name="work_date" type="date" required defaultValue={v.work_date ?? today} />
        </FormField>
      </div>

      <div className="grid gap-2">
        <Label>
          ช่วงเวลา<span className="text-destructive">*</span>
        </Label>
        {/* ค่าที่ส่งไปกับฟอร์มอยู่ใน hidden input (Radix ไม่ใส่ name เพื่อไม่ให้ค่าเด้งกลับเมื่อฟอร์มถูก reset หลัง error) */}
        <input type="hidden" name="period" value={period} />
        <RadioGroup
          value={period}
          onValueChange={(value) => setPeriod(value as OtPeriod)}
          className="grid gap-3 sm:grid-cols-2"
        >
          {(Object.keys(PERIOD_LABELS) as OtPeriod[]).map((p) => {
            const Icon = PERIOD_ICONS[p];
            return (
              <Label
                key={p}
                htmlFor={`period-${p}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-4 font-normal transition-colors",
                  period === p ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                )}
              >
                <RadioGroupItem value={p} id={`period-${p}`} />
                <Icon className="text-muted-foreground size-4" />
                {PERIOD_LABELS[p]}
              </Label>
            );
          })}
        </RadioGroup>
        {e.period?.map((m) => (
          <p key={m} className="text-destructive text-xs">
            {m}
          </p>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="เวลาเริ่ม" htmlFor="start_time" error={e.start_time} required>
          <input type="hidden" name="start_time" value={start} />
          <Select value={start} onValueChange={setStart}>
            <SelectTrigger id="start_time" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_SLOTS[period].slice(0, -1).map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="เวลาสิ้นสุด" htmlFor="end_time" error={e.end_time} required>
          <input type="hidden" name="end_time" value={end} />
          <Select value={end} onValueChange={setEnd}>
            <SelectTrigger id="end_time" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_SLOTS[period].slice(1).map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <div className="grid gap-2">
          <Label>จำนวนชั่วโมง</Label>
          <div
            data-testid="hours"
            className={cn(
              "flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium",
              hours > 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive",
            )}
          >
            <Timer className="size-4" />
            {hours > 0 ? formatHours(hours) : "เวลาไม่ถูกต้อง"}
          </div>
        </div>
      </div>

      <FormField label="รายละเอียด (ทำงานอะไร)" htmlFor="description" error={e.description} required>
        <Textarea
          id="description"
          name="description"
          required
          maxLength={1000}
          defaultValue={v.description}
          placeholder="เช่น ปิดงบประจำเดือน, เตรียมเอกสารลูกค้า ABC"
        />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/ot-requests">ยกเลิก</Link>
        </Button>
        <SubmitButton pendingText="กำลังส่ง...">
          <Send />
          ส่งคำขอ
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
