import { CancelButton } from "@/components/cancel-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, Table, Td, Th } from "@/components/ui/table";
import { PERIOD_SHORT_LABELS } from "@/lib/constants";
import { formatDate, formatHours, formatTime, fullName } from "@/lib/format";
import type { ActionState, OtRequest, OtRequestBalance, OtUsage } from "@/lib/types";

/**
 * ตารางที่ใช้ซ้ำหลายหน้า
 *   showEmployee = แสดงคอลัมน์ชื่อพนักงาน (หน้าของหัวหน้า/admin)
 *   onCancel     = แสดงปุ่มยกเลิกสำหรับรายการที่รออนุมัติ (หน้าของพนักงานเอง)
 */

export function OtRequestTable({
  rows,
  showEmployee = false,
  onCancel,
}: {
  rows: OtRequest[];
  showEmployee?: boolean;
  onCancel?: (id: string) => Promise<ActionState>;
}) {
  if (rows.length === 0) return <EmptyState>ยังไม่มีคำขอทำ OT</EmptyState>;
  return (
    <Table>
      <thead>
        <tr>
          {showEmployee && <Th>พนักงาน</Th>}
          <Th>วันที่ขอ</Th>
          <Th>วันที่ทำงาน</Th>
          <Th>ช่วงเวลา</Th>
          <Th className="text-right">ชั่วโมง</Th>
          <Th>รายละเอียดงาน</Th>
          <Th>สถานะ</Th>
          <Th>หมายเหตุผู้พิจารณา</Th>
          {onCancel && <Th />}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((r) => (
          <tr key={r.id}>
            {showEmployee && (
              <Td className="whitespace-nowrap">
                {fullName(r.employee)}
                <span className="block text-xs text-gray-500">{r.employee?.employee_code}</span>
              </Td>
            )}
            <Td className="whitespace-nowrap">{formatDate(r.request_date)}</Td>
            <Td className="whitespace-nowrap">{formatDate(r.work_date)}</Td>
            <Td className="whitespace-nowrap">
              {PERIOD_SHORT_LABELS[r.period]} {formatTime(r.start_time)}-{formatTime(r.end_time)}
            </Td>
            <Td className="text-right tabular-nums">{formatHours(r.hours)}</Td>
            <Td className="min-w-48 whitespace-pre-line">{r.description}</Td>
            <Td>
              <StatusBadge status={r.status} />
            </Td>
            <Td className="min-w-40 text-xs text-gray-600">
              {r.reviewer && <span className="block">โดย {fullName(r.reviewer)}</span>}
              {r.review_note}
            </Td>
            {onCancel && <Td>{r.status === "pending" && <CancelButton id={r.id} onCancel={onCancel} />}</Td>}
          </tr>
        ))}
      </tbody>
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
  onCancel?: (id: string) => Promise<ActionState>;
}) {
  if (rows.length === 0) return <EmptyState>ยังไม่มีคำขอใช้ชั่วโมง OT</EmptyState>;
  return (
    <Table>
      <thead>
        <tr>
          {showEmployee && <Th>พนักงาน</Th>}
          <Th>วันที่ยื่น</Th>
          <Th>วันที่ใช้</Th>
          <Th className="text-right">ชั่วโมง</Th>
          <Th>ตัดจาก OT วันที่</Th>
          <Th>เหตุผล</Th>
          <Th>สถานะ</Th>
          <Th>หมายเหตุผู้พิจารณา</Th>
          {onCancel && <Th />}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((u) => (
          <tr key={u.id}>
            {showEmployee && (
              <Td className="whitespace-nowrap">
                {fullName(u.employee)}
                <span className="block text-xs text-gray-500">{u.employee?.employee_code}</span>
              </Td>
            )}
            <Td className="whitespace-nowrap">{formatDate(u.request_date)}</Td>
            <Td className="whitespace-nowrap">{formatDate(u.use_date)}</Td>
            <Td className="text-right tabular-nums">{formatHours(u.hours)}</Td>
            <Td className="whitespace-nowrap text-xs">
              {u.allocations?.map((a) => (
                <span key={a.ot_request_id} className="block">
                  {formatDate(a.ot_request?.work_date)} · {formatHours(a.hours)}
                </span>
              ))}
            </Td>
            <Td className="min-w-40 whitespace-pre-line">{u.reason ?? "-"}</Td>
            <Td>
              <StatusBadge status={u.status} />
            </Td>
            <Td className="min-w-40 text-xs text-gray-600">
              {u.reviewer && <span className="block">โดย {fullName(u.reviewer)}</span>}
              {u.review_note}
            </Td>
            {onCancel && <Td>{u.status === "pending" && <CancelButton id={u.id} onCancel={onCancel} />}</Td>}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/** ยอดคงเหลือแยกตามคำขอ OT ที่อนุมัติแล้ว */
export function BalanceTable({ rows }: { rows: OtRequestBalance[] }) {
  if (rows.length === 0) return <EmptyState>ยังไม่มีชั่วโมง OT คงเหลือ</EmptyState>;
  return (
    <Table>
      <thead>
        <tr>
          <Th>วันที่ทำ OT</Th>
          <Th>ช่วงเวลา</Th>
          <Th>งาน</Th>
          <Th className="text-right">ได้รับ</Th>
          <Th className="text-right">ใช้แล้ว</Th>
          <Th className="text-right">จองไว้ (รออนุมัติ)</Th>
          <Th className="text-right">คงเหลือ</Th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map((b) => (
          <tr key={b.ot_request_id}>
            <Td className="whitespace-nowrap">{formatDate(b.work_date)}</Td>
            <Td className="whitespace-nowrap">
              {PERIOD_SHORT_LABELS[b.period]} {formatTime(b.start_time)}-{formatTime(b.end_time)}
            </Td>
            <Td className="min-w-40">{b.description}</Td>
            <Td className="text-right tabular-nums">{formatHours(b.hours)}</Td>
            <Td className="text-right tabular-nums">{formatHours(b.used_hours)}</Td>
            <Td className="text-right tabular-nums text-amber-700">{formatHours(b.reserved_hours)}</Td>
            <Td className="text-right font-semibold tabular-nums text-emerald-700">
              {formatHours(b.remaining_hours)}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
