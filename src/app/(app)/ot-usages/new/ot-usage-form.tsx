"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitOtUsage } from "@/actions/ot-usages";
import { ActionMessage } from "@/components/ui/alert";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Table, Td, Th } from "@/components/ui/table";
import { PERIOD_SHORT_LABELS } from "@/lib/constants";
import { formatDate, formatHours, formatTime } from "@/lib/format";
import type { ActionState, OtRequestBalance } from "@/lib/types";

/**
 * ฟอร์มขอใช้ OT
 * 1) กรอก "จำนวนชั่วโมงที่ต้องการใช้" แล้วกด "แบ่งให้อัตโนมัติ" -> ระบบตัดจาก OT เก่าสุดก่อน
 * 2) หรือกรอกเองทีละแถวว่าจะตัดจาก OT วันไหนกี่ชั่วโมง
 */
export function OtUsageForm({ balances, today }: { balances: OtRequestBalance[]; today: string }) {
  const [state, action] = useActionState<ActionState, FormData>(submitOtUsage, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};

  const [wanted, setWanted] = useState("");
  const [alloc, setAlloc] = useState<Record<string, string>>({});

  const totalAvailable = balances.reduce((sum, b) => sum + Number(b.remaining_hours), 0);
  const total = Object.values(alloc).reduce((sum, h) => sum + (Number(h) || 0), 0);

  function autoAllocate() {
    let left = Math.max(0, Math.floor(Number(wanted) * 2) / 2); // ปัดลงทีละ 0.5
    const next: Record<string, string> = {};
    for (const b of balances) {
      if (left <= 0) break;
      const take = Math.min(left, Number(b.remaining_hours));
      next[b.ot_request_id] = String(take);
      left -= take;
    }
    setAlloc(next);
  }

  return (
    <form action={action} className="space-y-5">
      <ActionMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="วันที่ต้องการใช้" htmlFor="use_date" error={e.use_date} required>
          <Input id="use_date" name="use_date" type="date" required defaultValue={v.use_date ?? today} />
        </Field>
        <Field
          label="จำนวนชั่วโมงที่ต้องการใช้"
          htmlFor="wanted"
          hint={`ใช้ได้สูงสุด ${formatHours(totalAvailable)}`}
        >
          <div className="flex gap-2">
            <Input
              id="wanted"
              type="number"
              min={0.5}
              step={0.5}
              max={totalAvailable}
              value={wanted}
              onChange={(ev) => setWanted(ev.target.value)}
              placeholder="เช่น 4"
            />
            <Button variant="secondary" onClick={autoAllocate} className="shrink-0">
              แบ่งให้อัตโนมัติ
            </Button>
          </div>
        </Field>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-gray-800">
          ตัดชั่วโมงจาก OT วันที่<span className="ml-0.5 text-red-600">*</span>
        </p>
        <Table>
          <thead>
            <tr>
              <Th>วันที่ทำ OT</Th>
              <Th>ช่วงเวลา</Th>
              <Th>งาน</Th>
              <Th className="text-right">คงเหลือ</Th>
              <Th className="w-32">ใช้ (ชม.)</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {balances.map((b) => (
              <tr key={b.ot_request_id}>
                <Td className="whitespace-nowrap">{formatDate(b.work_date)}</Td>
                <Td className="whitespace-nowrap">
                  {PERIOD_SHORT_LABELS[b.period]} {formatTime(b.start_time)}-{formatTime(b.end_time)}
                </Td>
                <Td className="min-w-40">{b.description}</Td>
                <Td className="text-right tabular-nums text-emerald-700">{formatHours(b.remaining_hours)}</Td>
                <Td>
                  <Input
                    type="number"
                    name={`alloc:${b.ot_request_id}`}
                    aria-label={`ชั่วโมงที่ใช้จาก OT วันที่ ${formatDate(b.work_date)}`}
                    min={0}
                    step={0.5}
                    max={Number(b.remaining_hours)}
                    value={alloc[b.ot_request_id] ?? ""}
                    onChange={(ev) => setAlloc({ ...alloc, [b.ot_request_id]: ev.target.value })}
                    placeholder="0"
                  />
                </Td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200">
              <Td className="font-semibold" />
              <Td />
              <Td />
              <Td className="text-right font-semibold">รวมที่ใช้</Td>
              <Td className="font-semibold tabular-nums text-blue-700">{formatHours(total)}</Td>
            </tr>
          </tfoot>
        </Table>
        {e.allocations?.map((m) => (
          <p key={m} className="mt-1 text-xs text-red-600">
            {m}
          </p>
        ))}
      </div>

      <Field label="เหตุผล / หมายเหตุ" htmlFor="reason" error={e.reason}>
        <Textarea id="reason" name="reason" maxLength={1000} defaultValue={v.reason} placeholder="เช่น ลากิจครึ่งวันเช้า" />
      </Field>

      <div className="flex gap-2">
        <SubmitButton pendingText="กำลังส่ง...">ส่งคำขอใช้ {formatHours(total)}</SubmitButton>
        <Link href="/ot-usages" className={buttonClass("secondary")}>
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
