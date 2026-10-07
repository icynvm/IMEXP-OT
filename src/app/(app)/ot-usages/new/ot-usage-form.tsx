"use client";

import { Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { submitOtUsage } from "@/actions/ot-usages";
import { ActionForm } from "@/components/action-form";
import { ActionMessage } from "@/components/action-message";
import { DatePicker } from "@/components/calendar/date-picker";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PERIOD_SHORT_LABELS } from "@/lib/constants";
import { formatDate, formatHours, formatTime } from "@/lib/format";
import type { ActionState, OtRequestBalance } from "@/lib/types";

/**
 * ฟอร์มขอใช้ OT
 * 1) กรอก "จำนวนชั่วโมงที่ต้องการใช้" แล้วกด "แบ่งให้อัตโนมัติ" -> ระบบตัดจาก OT เก่าสุดก่อน
 * 2) หรือกรอกเองทีละแถวว่าจะตัดจาก OT วันไหนกี่ชั่วโมง
 */
export function OtUsageForm({
  balances,
  today,
  holidays,
}: {
  balances: OtRequestBalance[];
  today: string;
  holidays: Record<string, string>;
}) {
  const [state, action] = useActionState<ActionState, FormData>(submitOtUsage, {});
  const v = state.values ?? {};
  const e = state.errors ?? {};

  const [useDate, setUseDate] = useState(today);
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
    <ActionForm action={action} className="grid gap-6">
      <ActionMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="วันที่ต้องการใช้" htmlFor="use_date" error={e.use_date} required>
          <DatePicker id="use_date" name="use_date" value={useDate} onChange={setUseDate} today={today} holidays={holidays} invalid={Boolean(e.use_date)} />
        </FormField>
        <FormField label="จำนวนชั่วโมงที่ต้องการใช้" htmlFor="wanted" hint={`ใช้ได้สูงสุด ${formatHours(totalAvailable)}`}>
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
            <Button type="button" variant="secondary" onClick={autoAllocate} className="shrink-0">
              <Sparkles />
              แบ่งให้อัตโนมัติ
            </Button>
          </div>
        </FormField>
      </div>

      <div className="grid gap-2">
        <Label>
          ตัดชั่วโมงจาก OT วันที่<span className="text-destructive">*</span>
        </Label>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่ทำ OT</TableHead>
                <TableHead>งาน</TableHead>
                <TableHead className="text-right">คงเหลือ</TableHead>
                <TableHead className="w-32">ใช้ (ชม.)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((b) => (
                <TableRow key={b.ot_request_id}>
                  <TableCell>
                    <div className="font-medium">{formatDate(b.work_date)}</div>
                    <div className="text-muted-foreground text-xs">
                      {PERIOD_SHORT_LABELS[b.period]} {formatTime(b.start_time)}–{formatTime(b.end_time)}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-56 whitespace-normal">{b.description}</TableCell>
                  <TableCell className="text-right text-emerald-600 tabular-nums">{formatHours(b.remaining_hours)}</TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-right">
                  รวมที่ใช้
                </TableCell>
                <TableCell className="text-primary tabular-nums">{formatHours(total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        {e.allocations?.map((m) => (
          <p key={m} className="text-destructive text-xs">
            {m}
          </p>
        ))}
      </div>

      <FormField label="เหตุผล / หมายเหตุ" htmlFor="reason" error={e.reason}>
        <Textarea id="reason" name="reason" maxLength={1000} defaultValue={v.reason} placeholder="เช่น ลากิจครึ่งวันเช้า" />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/ot-usages">ยกเลิก</Link>
        </Button>
        <SubmitButton pendingText="กำลังส่ง...">
          <Send />
          ส่งคำขอใช้ {formatHours(total)}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
