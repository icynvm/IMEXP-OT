import type { Metadata } from "next";
import Link from "next/link";
import { OtRequestTable, OtUsageTable } from "@/components/ot-tables";
import { buttonClass } from "@/components/ui/button";
import { Card, StatCard } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Table, Td, Th } from "@/components/ui/table";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS, STATUS_LABELS } from "@/lib/constants";
import { getHistory, getManagedSummaries } from "@/lib/data";
import { parseOverviewFilters } from "@/lib/filters";
import { formatHours, formatMonth } from "@/lib/format";

export const metadata: Metadata = { title: "ภาพรวม" };

const sum = (rows: { hours: number }[]) => rows.reduce((s, r) => s + Number(r.hours), 0);

export default async function OverviewPage({ searchParams }: PageProps<"/overview">) {
  const user = await requireUser(["admin", "supervisor"]);
  const filters = parseOverviewFilters(await searchParams);

  const [summaries, history] = await Promise.all([
    getManagedSummaries(user),
    getHistory(user, { from: filters.from, to: filters.to, employeeId: filters.employeeId }),
  ]);

  // ตัวเลขสรุปของเดือนที่เลือก
  const approvedRequests = history.requests.filter((r) => r.status === "approved");
  const approvedUsages = history.usages.filter((u) => u.status === "approved");
  const pendingRequests = history.requests.filter((r) => r.status === "pending");
  const pendingUsages = history.usages.filter((u) => u.status === "pending");

  // ตารางรายการ: กรองตามสถานะที่เลือก
  const requests = filters.status ? history.requests.filter((r) => r.status === filters.status) : history.requests;
  const usages = filters.status ? history.usages.filter((u) => u.status === filters.status) : history.usages;

  const exportQuery = new URLSearchParams({
    month: filters.month,
    ...(filters.status && { status: filters.status }),
    ...(filters.employeeId && { employee: filters.employeeId }),
  });

  return (
    <>
      <PageHeader
        title={user.role === "admin" ? "ภาพรวมทั้งหมด" : "ภาพรวมทีม"}
        description={`ข้อมูลประจำเดือน ${formatMonth(filters.month)}`}
      />

      {/* ตัวกรอง (ส่งผ่าน URL จึงกด back / แชร์ลิงก์ได้) */}
      <Card className="mb-6">
        <form className="grid items-end gap-3 sm:grid-cols-4">
          <Field label="เดือน" htmlFor="month">
            <Input id="month" name="month" type="month" defaultValue={filters.month} />
          </Field>
          <Field label="สถานะ" htmlFor="status">
            <Select id="status" name="status" defaultValue={filters.status ?? ""}>
              <option value="">ทั้งหมด</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="พนักงาน" htmlFor="employee">
            <Select id="employee" name="employee" defaultValue={filters.employeeId ?? ""}>
              <option value="">ทุกคน</option>
              {summaries.map((s) => (
                <option key={s.employee_id} value={s.employee_id}>
                  {s.employee_code} - {s.first_name} {s.last_name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2">
            <button type="submit" className={buttonClass()}>
              แสดงผล
            </button>
            <Link href="/overview" className={buttonClass("secondary")}>
              ล้าง
            </Link>
          </div>
        </form>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="OT ที่อนุมัติ (เดือนนี้)" value={formatHours(sum(approvedRequests))} tone="blue" hint={`${approvedRequests.length} รายการ`} />
        <StatCard label="ใช้ OT ที่อนุมัติ (เดือนนี้)" value={formatHours(sum(approvedUsages))} hint={`${approvedUsages.length} รายการ`} />
        <StatCard label="คำขอ OT รออนุมัติ" value={`${pendingRequests.length} รายการ`} tone="amber" hint={formatHours(sum(pendingRequests))} />
        <StatCard label="คำขอใช้ OT รออนุมัติ" value={`${pendingUsages.length} รายการ`} tone="amber" hint={formatHours(sum(pendingUsages))} />
      </div>

      <div className="space-y-6">
        <Card
          title="ยอดชั่วโมง OT สะสมรายบุคคล (ตั้งแต่เริ่มใช้ระบบ)"
          action={
            <a href={`/overview/export?type=balances`} className={buttonClass("secondary", "sm")}>
              ดาวน์โหลด CSV
            </a>
          }
        >
          {summaries.length === 0 ? (
            <EmptyState>ยังไม่มีพนักงานในความดูแล (ให้ admin กำหนดหัวหน้าในหน้าจัดการผู้ใช้)</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>รหัส</Th>
                  <Th>ชื่อ-นามสกุล</Th>
                  <Th>บทบาท</Th>
                  <Th className="text-right">ได้รับอนุมัติ</Th>
                  <Th className="text-right">ใช้แล้ว</Th>
                  <Th className="text-right">จองไว้</Th>
                  <Th className="text-right">คงเหลือ</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summaries.map((s) => (
                  <tr key={s.employee_id} className={s.is_active ? "" : "text-gray-400"}>
                    <Td className="whitespace-nowrap">{s.employee_code}</Td>
                    <Td className="whitespace-nowrap">
                      <Link
                        href={`/overview?${new URLSearchParams({ month: filters.month, employee: s.employee_id })}`}
                        className="text-blue-700 hover:underline"
                      >
                        {s.first_name} {s.last_name}
                      </Link>
                      {!s.is_active && <span className="ml-1 text-xs">(ปิดใช้งาน)</span>}
                    </Td>
                    <Td className="whitespace-nowrap">{ROLE_LABELS[s.role]}</Td>
                    <Td className="text-right tabular-nums">{formatHours(s.earned_hours)}</Td>
                    <Td className="text-right tabular-nums">{formatHours(s.used_hours)}</Td>
                    <Td className="text-right tabular-nums text-amber-700">{formatHours(s.reserved_hours)}</Td>
                    <Td className="text-right font-semibold tabular-nums text-emerald-700">
                      {formatHours(s.remaining_hours)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card
          title={`คำขอทำ OT (${requests.length})`}
          action={
            <a href={`/overview/export?type=requests&${exportQuery}`} className={buttonClass("secondary", "sm")}>
              ดาวน์โหลด CSV
            </a>
          }
        >
          <OtRequestTable rows={requests} showEmployee />
        </Card>

        <Card
          title={`การใช้ชั่วโมง OT (${usages.length})`}
          action={
            <a href={`/overview/export?type=usages&${exportQuery}`} className={buttonClass("secondary", "sm")}>
              ดาวน์โหลด CSV
            </a>
          }
        >
          <OtUsageTable rows={usages} showEmployee />
        </Card>
      </div>
    </>
  );
}
