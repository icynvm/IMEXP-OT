import { X } from "lucide-react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PERIOD_SHORT_LABELS } from "@/lib/constants";
import { formatDate, formatHours, formatTime, fullName } from "@/lib/format";
import type { ActionState, OtRequest, OtRequestBalance, OtUsage, PersonRef } from "@/lib/types";

/**
 * ตารางที่ใช้ซ้ำหลายหน้า
 *   showEmployee = แสดงคอลัมน์ชื่อพนักงาน (หน้าของหัวหน้า/admin)
 *   onCancel     = แสดงปุ่มยกเลิกสำหรับรายการที่รออนุมัติ (หน้าของพนักงานเอง)
 */
type CancelAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

function Employee({ person }: { person?: PersonRef | null }) {
  return (
    <TableCell>
      <div className="font-medium">{fullName(person)}</div>
      <div className="text-muted-foreground text-xs">{person?.employee_code}</div>
    </TableCell>
  );
}

function Reviewer({ reviewer, note }: { reviewer?: string | null; note: string | null }) {
  if (!reviewer && !note) return <TableCell className="text-muted-foreground">-</TableCell>;
  return (
    <TableCell className="max-w-56 text-xs whitespace-normal">
      {reviewer && <div className="text-muted-foreground">โดย {reviewer}</div>}
      {note && <div>{note}</div>}
    </TableCell>
  );
}

function CancelCell({ id, action, what }: { id: string; action: CancelAction; what: string }) {
  return (
    <TableCell className="text-right">
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
            <X />
            ยกเลิก
          </Button>
        }
        title={`ยกเลิก${what}?`}
        description="เมื่อยกเลิกแล้วจะแก้กลับไม่ได้ ต้องยื่นคำขอใหม่หากต้องการ"
        confirmLabel="ยืนยันการยกเลิก"
        destructive
        action={action}
        fields={{ id }}
      />
    </TableCell>
  );
}

export function OtRequestTable({
  rows,
  showEmployee = false,
  onCancel,
}: {
  rows: OtRequest[];
  showEmployee?: boolean;
  onCancel?: CancelAction;
}) {
  if (rows.length === 0) return <EmptyState>ยังไม่มีคำขอทำ OT</EmptyState>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showEmployee && <TableHead>พนักงาน</TableHead>}
          <TableHead>วันที่ทำงาน</TableHead>
          <TableHead>ช่วงเวลา</TableHead>
          <TableHead className="text-right">ชั่วโมง</TableHead>
          <TableHead>รายละเอียดงาน</TableHead>
          <TableHead>สถานะ</TableHead>
          <TableHead>ผู้พิจารณา</TableHead>
          {onCancel && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            {showEmployee && <Employee person={r.employee} />}
            <TableCell>
              <div className="font-medium">{formatDate(r.work_date)}</div>
              <div className="text-muted-foreground text-xs">ขอเมื่อ {formatDate(r.request_date)}</div>
            </TableCell>
            <TableCell>
              <div>{PERIOD_SHORT_LABELS[r.period]}</div>
              <div className="text-muted-foreground text-xs">
                {formatTime(r.start_time)}–{formatTime(r.end_time)}
              </div>
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatHours(r.hours)}</TableCell>
            <TableCell className="max-w-64 whitespace-normal">{r.description}</TableCell>
            <TableCell>
              <StatusBadge status={r.status} />
            </TableCell>
            <Reviewer reviewer={r.reviewer_name} note={r.review_note} />
            {onCancel &&
              (r.status === "pending" ? <CancelCell id={r.id} action={onCancel} what="คำขอทำ OT" /> : <TableCell />)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function OtUsageTable({
  rows,
  showEmployee = false,
  onCancel,
}: {
  rows: OtUsage[];
  showEmployee?: boolean;
  onCancel?: CancelAction;
}) {
  if (rows.length === 0) return <EmptyState>ยังไม่มีคำขอใช้ชั่วโมง OT</EmptyState>;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showEmployee && <TableHead>พนักงาน</TableHead>}
          <TableHead>วันที่ใช้</TableHead>
          <TableHead className="text-right">ชั่วโมง</TableHead>
          <TableHead>ตัดจาก OT วันที่</TableHead>
          <TableHead>เหตุผล</TableHead>
          <TableHead>สถานะ</TableHead>
          <TableHead>ผู้พิจารณา</TableHead>
          {onCancel && <TableHead />}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((u) => (
          <TableRow key={u.id}>
            {showEmployee && <Employee person={u.employee} />}
            <TableCell>
              <div className="font-medium">{formatDate(u.use_date)}</div>
              <div className="text-muted-foreground text-xs">ยื่นเมื่อ {formatDate(u.request_date)}</div>
            </TableCell>
            <TableCell className="text-right font-medium tabular-nums">{formatHours(u.hours)}</TableCell>
            <TableCell className="text-xs">
              {u.allocations?.map((a) => (
                <div key={a.ot_request_id}>
                  {formatDate(a.ot_request?.work_date)} <span className="text-muted-foreground">· {formatHours(a.hours)}</span>
                </div>
              ))}
            </TableCell>
            <TableCell className="max-w-56 whitespace-normal">{u.reason ?? "-"}</TableCell>
            <TableCell>
              <StatusBadge status={u.status} />
            </TableCell>
            <Reviewer reviewer={u.reviewer_name} note={u.review_note} />
            {onCancel &&
              (u.status === "pending" ? <CancelCell id={u.id} action={onCancel} what="คำขอใช้ OT" /> : <TableCell />)}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** ยอดคงเหลือแยกตามคำขอ OT ที่อนุมัติแล้ว */
export function BalanceTable({ rows }: { rows: OtRequestBalance[] }) {
  if (rows.length === 0) return <EmptyState>ยังไม่มีชั่วโมง OT คงเหลือ</EmptyState>;
  const total = rows.reduce((s, b) => s + Number(b.remaining_hours), 0);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>วันที่ทำ OT</TableHead>
          <TableHead>งาน</TableHead>
          <TableHead className="text-right">ได้รับ</TableHead>
          <TableHead className="text-right">ใช้แล้ว</TableHead>
          <TableHead className="text-right">จองไว้</TableHead>
          <TableHead className="text-right">คงเหลือ</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((b) => (
          <TableRow key={b.ot_request_id}>
            <TableCell>
              <div className="font-medium">{formatDate(b.work_date)}</div>
              <div className="text-muted-foreground text-xs">
                {PERIOD_SHORT_LABELS[b.period]} {formatTime(b.start_time)}–{formatTime(b.end_time)}
              </div>
            </TableCell>
            <TableCell className="max-w-64 whitespace-normal">{b.description}</TableCell>
            <TableCell className="text-right tabular-nums">{formatHours(b.hours)}</TableCell>
            <TableCell className="text-muted-foreground text-right tabular-nums">{formatHours(b.used_hours)}</TableCell>
            <TableCell className="text-right text-amber-600 tabular-nums">{formatHours(b.reserved_hours)}</TableCell>
            <TableCell className="text-right font-semibold text-emerald-600 tabular-nums">
              {formatHours(b.remaining_hours)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={5} className="text-right">
            รวมคงเหลือ
          </TableCell>
          <TableCell className="text-right text-emerald-600 tabular-nums">{formatHours(total)}</TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
}
