"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitOtRequest } from "@/actions/ot-requests";
import { ActionMessage } from "@/components/ui/alert";
import { buttonClass } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { PERIOD_LABELS, TIME_SLOTS } from "@/lib/constants";
import { formatHours, hoursBetween } from "@/lib/format";
import type { ActionState, OtPeriod } from "@/lib/types";

const DEFAULT_TIMES: Record<OtPeriod, { start: string; end: string }> = {
  before_work: { start: "07:00", end: "09:00" },
  after_work: { start: "18:00", end: "20:00" },
};

export function OtRequestForm({ today }: { today: string }) {
  const [state, action] = useActionState<ActionState, FormData>(submitOtRequest, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};

  // ช่วงเวลาที่เลือก -> กำหนดตัวเลือกเวลาเริ่ม/สิ้นสุดให้ถูกช่วง
  const [period, setPeriod] = useState<OtPeriod>((v.period as OtPeriod) || "after_work");
  const [start, setStart] = useState(v.start_time || DEFAULT_TIMES[period].start);
  const [end, setEnd] = useState(v.end_time || DEFAULT_TIMES[period].end);
  const hours = hoursBetween(start, end);

  function changePeriod(next: OtPeriod) {
    setPeriod(next);
    setStart(DEFAULT_TIMES[next].start);
    setEnd(DEFAULT_TIMES[next].end);
  }

  return (
    <form action={action} className="space-y-5">
      <ActionMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="วันที่ขอ" htmlFor="request_date" error={e.request_date} required>
          <Input id="request_date" name="request_date" type="date" max={today} required defaultValue={v.request_date ?? today} />
        </Field>
        <Field label="วันที่ทำงาน (วันที่ทำ OT)" htmlFor="work_date" error={e.work_date} required>
          <Input id="work_date" name="work_date" type="date" required defaultValue={v.work_date ?? today} />
        </Field>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-800">
          ช่วงเวลา<span className="ml-0.5 text-red-600">*</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(PERIOD_LABELS) as OtPeriod[]).map((p) => (
            <label
              key={p}
              className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                period === p ? "border-blue-600 bg-blue-50 text-blue-800" : "border-gray-300"
              }`}
            >
              <input type="radio" name="period" value={p} checked={period === p} onChange={() => changePeriod(p)} />
              {PERIOD_LABELS[p]}
            </label>
          ))}
        </div>
        {e.period?.map((m) => (
          <p key={m} className="text-xs text-red-600">
            {m}
          </p>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="เวลาเริ่ม" htmlFor="start_time" error={e.start_time} required>
          <Select id="start_time" name="start_time" value={start} onChange={(ev) => setStart(ev.target.value)}>
            {TIME_SLOTS[period].slice(0, -1).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="เวลาสิ้นสุด" htmlFor="end_time" error={e.end_time} required>
          <Select id="end_time" name="end_time" value={end} onChange={(ev) => setEnd(ev.target.value)}>
            {TIME_SLOTS[period].slice(1).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-gray-800">จำนวนชั่วโมง</p>
          <p className={`rounded-md px-3 py-2 text-sm font-semibold ${hours > 0 ? "bg-blue-50 text-blue-800" : "bg-red-50 text-red-700"}`}>
            {hours > 0 ? formatHours(hours) : "เวลาไม่ถูกต้อง"}
          </p>
        </div>
      </div>

      <Field label="รายละเอียด (ทำงานอะไร)" htmlFor="description" error={e.description} required>
        <Textarea id="description" name="description" required maxLength={1000} defaultValue={v.description} placeholder="เช่น ปิดงบประจำเดือน, เตรียมเอกสารลูกค้า ABC" />
      </Field>

      <div className="flex gap-2">
        <SubmitButton pendingText="กำลังส่ง...">ส่งคำขอ</SubmitButton>
        <Link href="/ot-requests" className={buttonClass("secondary")}>
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
