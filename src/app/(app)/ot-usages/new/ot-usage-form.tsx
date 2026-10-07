"use client";

import { ArrowLeft, ListChecks, Send } from "lucide-react";
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
 * ฟอร์มขอใช้ OT มี 2 แบบ
 * 1) แบบปกติ: กรอก "จำนวนชั่วโมง" ช่องเดียว -> ระบบแบ่งตัดจาก OT ที่เก่าที่สุดก่อนให้ทันที (แสดงให้ดูว่าตัดจากวันไหน)
 * 2) เลือกเอง: กด "เลือกเองว่าจะตัดจาก OT วันไหน" -> กรอกชั่วโมงทีละแถว (แถวที่เว้นว่าง = ข้าม OT วันนั้น)
 * ทั้งสองแบบส่งข้อมูลเหมือนกัน คือช่อง "alloc:<id คำขอ OT>" = ชั่วโมงที่ตัดจากคำขอนั้น
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
  const [manual, setManual] = useState(false);
  const [alloc, setAlloc] = useState<Record<string, string>>({});

  const totalAvailable = balances.reduce((sum, b) => sum + Number(b.remaining_hours), 0);

  // ตรวจจำนวนชั่วโมงที่กรอก (แบบปกติ) เพื่อแจ้งทันทีโดยไม่ต้องกดส่ง
  const wantedHours = Number(wanted);
  const wantedError =
    wanted === ""
      ? undefined
      : !(wantedHours > 0) || !Number.isInteger(wantedHours * 2)
        ? "กรอกเป็นทีละ 0.5 ชั่วโมง เช่น 1, 1.5, 4"
        : wantedHours > totalAvailable
          ? `ชั่วโมงไม่พอ: ใช้ได้สูงสุด ${formatHours(totalAvailable)}`
          : undefined;

  // แบบปกติ: ตัดจาก OT ที่เก่าที่สุดก่อน (balances เรียงวันที่ทำ OT จากเก่าไปใหม่แล้ว)
  const autoAlloc: Record<string, number> = {};
  if (wanted !== "" && !wantedError) {
    let left = wantedHours;
    for (const b of balances) {
      if (left <= 0) break;
      const take = Math.min(left, Number(b.remaining_hours));
      autoAlloc[b.ot_request_id] = take;
      left -= take;
    }
  }

  const manualTotal = Object.values(alloc).reduce((sum, h) => sum + (Number(h) || 0), 0);
  const total = manual ? manualTotal : wantedError ? 0 : wantedHours || 0;

  function switchToManual() {
    // เริ่มจากตัวเลขที่ระบบแบ่งไว้ แล้วค่อยแก้ / ล้างแถวที่อยากข้าม
    setAlloc(Object.fromEntries(Object.entries(autoAlloc).map(([id, h]) => [id, String(h)])));
    setManual(true);
  }

  function switchToAuto() {
    setWanted(manualTotal > 0 ? String(manualTotal) : "");
    setManual(false);
  }

  return (
    <ActionForm action={action} className="grid gap-6">
      <ActionMessage state={state} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="วันที่ต้องการใช้" htmlFor="use_date" error={e.use_date} required>
          <DatePicker id="use_date" name="use_date" value={useDate} onChange={setUseDate} today={today} holidays={holidays} invalid={Boolean(e.use_date)} />
        </FormField>
        {!manual && (
          <FormField
            label="จำนวนชั่วโมงที่ต้องการใช้"
            htmlFor="wanted"
            required
            error={wantedError ? [wantedError] : e.allocations}
            hint={`มีให้ใช้ ${formatHours(totalAvailable)} · ระบบตัดจาก OT ที่เก่าที่สุดก่อน`}
          >
            <Input
              id="wanted"
              type="number"
              inputMode="decimal"
              min={0.5}
              step={0.5}
              max={totalAvailable}
              value={wanted}
              onChange={(ev) => setWanted(ev.target.value)}
              placeholder="เช่น 4"
              aria-invalid={Boolean(wantedError)}
            />
          </FormField>
        )}
      </div>

      {manual ? (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>
              เลือกเองว่าจะตัดจาก OT วันไหน<span className="text-destructive">*</span>
            </Label>
            <Button type="button" variant="ghost" size="sm" onClick={switchToAuto}>
              <ArrowLeft />
              กลับไปให้ระบบแบ่งให้
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">เว้นว่างแถวที่ไม่ต้องการใช้ (ข้าม OT วันนั้น) ชั่วโมงที่เหลือเก็บไว้ใช้ครั้งต่อไปได้</p>
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
                        inputMode="decimal"
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
                  <TableCell className="text-primary tabular-nums">{formatHours(manualTotal)}</TableCell>
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
      ) : (
        <div className="bg-muted/40 grid gap-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">ตัดชั่วโมงจาก OT วันที่</p>
            <Button type="button" variant="outline" size="sm" onClick={switchToManual}>
              <ListChecks />
              เลือกเองว่าจะตัดจาก OT วันไหน
            </Button>
          </div>
          {Object.keys(autoAlloc).length === 0 ? (
            <p className="text-muted-foreground text-sm">กรอกจำนวนชั่วโมงด้านบน ระบบจะแสดงว่าตัดจาก OT วันไหนให้ที่นี่</p>
          ) : (
            <ul className="divide-y text-sm">
              {balances
                .filter((b) => autoAlloc[b.ot_request_id])
                .map((b) => {
                  const take = autoAlloc[b.ot_request_id];
                  return (
                    <li key={b.ot_request_id} className="flex items-center justify-between gap-3 py-2">
                      {/* ค่าที่ส่งจริงในแบบปกติ */}
                      <input type="hidden" name={`alloc:${b.ot_request_id}`} value={take} />
                      <div className="min-w-0">
                        <p className="font-medium">{formatDate(b.work_date)}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {PERIOD_SHORT_LABELS[b.period]} {formatTime(b.start_time)}–{formatTime(b.end_time)} · {b.description}
                        </p>
                      </div>
                      <div className="shrink-0 text-right tabular-nums">
                        <p className="text-primary font-medium">ใช้ {formatHours(take)}</p>
                        <p className="text-muted-foreground text-xs">เหลือ {formatHours(Number(b.remaining_hours) - take)}</p>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      )}

      <FormField label="เหตุผล / หมายเหตุ" htmlFor="reason" error={e.reason}>
        <Textarea id="reason" name="reason" maxLength={1000} defaultValue={v.reason} placeholder="เช่น ลากิจครึ่งวันเช้า" />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/ot-usages">ยกเลิก</Link>
        </Button>
        <SubmitButton pendingText="กำลังส่ง..." disabled={total <= 0}>
          <Send />
          ส่งคำขอใช้ {formatHours(total)}
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
